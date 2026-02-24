import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type PaginatedResponse } from "@/lib/supabase-server";
import { hashPhone, hashIP, calculateEvidenceScore, calculateExpirationDate, normalizePhone } from "@/lib/verification";
import { analyzeNewReport, countIndependentReports } from "@/lib/correlation";
import { sanitizeText, sanitizeIdentifier, sanitizeUrl } from "@/lib/sanitize";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";
import { verifyAdminKey } from "@/lib/admin-auth";
import { SCAM_TYPES, IDENTIFIER_TYPES } from "@/types";

// Cache for 30 seconds
export const revalidate = 30;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const DISCLAIMER = "Reports are user-submitted and not independently verified by ScamBusterKE. Use this information as one factor in your decision-making.";

interface EnhancedReportRow {
  id: string;
  identifier: string;
  identifier_type: string;
  scam_type: string;
  description: string;
  amount_lost: number | null;
  is_anonymous: boolean;
  created_at: string;
  verification_tier?: number;
  evidence_score?: number;
  reporter_verified?: boolean;
  is_expired?: boolean;
  total_count?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10))
    );
    const scamType = searchParams.get("type") || null;
    const sortBy = searchParams.get("sort") || "recent";
    const includeExpired = searchParams.get("includeExpired") === "true";

    const supabase = createServerClient();

    // Build query with verification fields
    let query = supabase
      .from("reports")
      .select("id, identifier, identifier_type, scam_type, description, amount_lost, is_anonymous, created_at, verification_tier, evidence_score, reporter_verified, is_expired", { count: "exact" });

    // Only show approved reports publicly
    query = query.eq("status", "approved");

    // Filter out expired reports unless requested
    if (!includeExpired) {
      query = query.or("is_expired.is.null,is_expired.eq.false");
    }

    // Apply filters
    if (scamType) {
      query = query.eq("scam_type", scamType);
    }

    // Apply sorting - prioritize verified reports
    switch (sortBy) {
      case "amount":
        query = query.order("amount_lost", { ascending: false, nullsFirst: false });
        break;
      case "verified":
        query = query.order("verification_tier", { ascending: false }).order("created_at", { ascending: false });
        break;
      case "recent":
      default:
        query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const response: PaginatedResponse<EnhancedReportRow> & { disclaimer: string } = {
      data: (data || []).map((r: EnhancedReportRow) => ({
        id: r.id,
        identifier: r.identifier,
        identifier_type: r.identifier_type,
        scam_type: r.scam_type,
        description: r.description,
        amount_lost: r.amount_lost,
        is_anonymous: r.is_anonymous,
        created_at: r.created_at,
        verification_tier: r.verification_tier || 1,
        evidence_score: r.evidence_score || 0,
        reporter_verified: r.reporter_verified || false,
        is_expired: r.is_expired || false,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      disclaimer: DISCLAIMER,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// POST - Create a new report with verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      identifier,
      identifier_type,
      scam_type,
      description,
      amount_lost,
      evidence_url,
      transaction_id,
      is_anonymous,
      reporter_phone,
      reporter_phone_verified,
      source_url,
    } = body;

    // Rate limit (bypass for admin)
    const isAdmin = verifyAdminKey(request.headers.get("x-admin-key"));
    if (!isAdmin) {
      const clientIP = getClientIP(request);
      const rateLimit = checkRateLimit(`report:${clientIP}`, RATE_LIMITS.reportCreate);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: "Too many reports submitted. Please try again later." },
          { status: 429 }
        );
      }
    }

    // Validate required fields
    if (!identifier || !identifier_type || !scam_type || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate scam_type and identifier_type
    if (!(scam_type in SCAM_TYPES)) {
      return NextResponse.json(
        { error: `Invalid scam type: ${scam_type}` },
        { status: 400 }
      );
    }

    if (!(identifier_type in IDENTIFIER_TYPES)) {
      return NextResponse.json(
        { error: `Invalid identifier type: ${identifier_type}` },
        { status: 400 }
      );
    }

    if (description.length < 20) {
      return NextResponse.json(
        { error: "Please provide a more detailed description (at least 20 characters)" },
        { status: 400 }
      );
    }

    // Validate amount_lost if provided
    if (amount_lost !== undefined && amount_lost !== null && amount_lost !== "") {
      const parsedAmount = parseInt(amount_lost, 10);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: "Amount lost must be a positive number" },
          { status: 400 }
        );
      }
    }

    // Sanitize inputs
    let cleanIdentifier = sanitizeIdentifier(identifier);
    // Normalize phone numbers to +254 format for consistent matching
    if (identifier_type === "phone") {
      cleanIdentifier = normalizePhone(cleanIdentifier);
    }
    const cleanDescription = sanitizeText(description);
    const cleanEvidenceUrl = evidence_url ? sanitizeUrl(evidence_url) : null;
    const cleanTransactionId = transaction_id ? sanitizeText(transaction_id, 100) : null;
    const cleanSourceUrl = source_url ? sanitizeUrl(source_url) : null;

    // Blocklist: reject reports targeting this platform itself or known troll identifiers
    const BLOCKED_IDENTIFIERS = ["scambuster.co.ke", "scambusterke.co.ke"];
    if (BLOCKED_IDENTIFIERS.some((b) => cleanIdentifier.toLowerCase().includes(b))) {
      return NextResponse.json(
        { error: "This identifier cannot be reported on this platform." },
        { status: 422 }
      );
    }

    const supabase = createServerClient();

    // Get reporter hashes
    const reporterPhoneHash = reporter_phone ? hashPhone(reporter_phone) : null;
    const reporterIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const reporterIPHash = hashIP(reporterIP);

    // Check if reporter is verified
    let isVerifiedReporter = reporter_phone_verified || false;
    if (reporterPhoneHash && !isVerifiedReporter) {
      const { data: verifiedReporter } = await supabase
        .from("verified_reporters")
        .select("phone_hash")
        .eq("phone_hash", reporterPhoneHash)
        .single();
      isVerifiedReporter = !!verifiedReporter;
    }

    // Calculate evidence score
    const evidenceScore = calculateEvidenceScore({
      evidence_url: cleanEvidenceUrl,
      transaction_id: cleanTransactionId,
      description: cleanDescription,
      reporter_verified: isVerifiedReporter,
      amount_lost: amount_lost ? parseInt(amount_lost, 10) : null,
    });

    // Get existing reports for this identifier to check for correlation + duplicates
    const { data: existingReports } = await supabase
      .from("reports")
      .select("id, identifier, scam_type, reporter_phone_hash, reporter_ip_hash, description, created_at")
      .ilike("identifier", cleanIdentifier)
      .eq("is_expired", false)
      .limit(100);

    // Duplicate detection: same identifier + scam_type + description >80% word overlap
    const isDuplicate = (existingReports || []).some((r) => {
      if (r.scam_type !== scam_type) return false;
      const wordsA = new Set(cleanDescription.toLowerCase().split(/\s+/));
      const wordsB = new Set((r.description as string).toLowerCase().split(/\s+/));
      const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      return union > 0 && intersection / union > 0.8;
    });
    if (isDuplicate) {
      return NextResponse.json(
        { error: "A very similar report already exists for this identifier. If your experience is different, please add more specific details." },
        { status: 409 }
      );
    }

    // Analyze the new report against existing ones
    const newReportMetadata = {
      id: "new",
      identifier: cleanIdentifier,
      reporter_phone_hash: reporterPhoneHash,
      reporter_ip_hash: reporterIPHash,
      description: cleanDescription,
      created_at: new Date().toISOString(),
    };

    const correlation = analyzeNewReport(
      newReportMetadata,
      existingReports || []
    );

    // Calculate verification tier
    const independentCount = countIndependentReports([
      ...(existingReports || []),
      newReportMetadata,
    ]);

    let verificationTier = 1;
    if (independentCount >= 5 && evidenceScore >= 30) {
      verificationTier = 3;
    } else if (independentCount >= 2 || evidenceScore >= 30) {
      verificationTier = 2;
    }

    // Calculate expiration date
    const expiresAt = calculateExpirationDate(evidenceScore, isVerifiedReporter);

    // Insert the report
    const { data, error } = await supabase
      .from("reports")
      .insert({
        identifier: cleanIdentifier,
        identifier_type,
        scam_type,
        description: cleanDescription,
        amount_lost: amount_lost ? (() => {
          const parsed = parseInt(amount_lost, 10);
          if (isNaN(parsed) || parsed < 0 || parsed > 999_999_999) return null;
          return parsed;
        })() : null,
        evidence_url: cleanEvidenceUrl,
        transaction_id: cleanTransactionId,
        is_anonymous: is_anonymous !== false,
        source_url: cleanSourceUrl,
        reporter_phone_hash: reporterPhoneHash,
        reporter_ip_hash: reporterIPHash,
        reporter_verified: isVerifiedReporter,
        evidence_score: evidenceScore,
        verification_tier: verificationTier,
        is_expired: false,
        status: isAdmin || isVerifiedReporter ? "approved" : "pending",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update reporter's report count if verified
    if (reporterPhoneHash && isVerifiedReporter) {
      try {
        await supabase.rpc("increment_reporter_count", { p_phone_hash: reporterPhoneHash });
      } catch {
        // Non-critical, ignore errors
      }
    }

    // Update verification tiers for all reports with this identifier
    if (existingReports && existingReports.length > 0) {
      const newTier = verificationTier;
      if (newTier > 1) {
        await supabase
          .from("reports")
          .update({ verification_tier: newTier })
          .ilike("identifier", cleanIdentifier)
          .lt("verification_tier", newTier);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        verification_tier: data.verification_tier,
        evidence_score: data.evidence_score,
        expires_at: data.expires_at,
        correlation_flags: correlation.correlationFlags,
      },
      message: verificationTier > 1
        ? "Report submitted and corroborated with existing reports."
        : "Report submitted. It will be corroborated when other users report the same identifier.",
      disclaimer: DISCLAIMER,
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
