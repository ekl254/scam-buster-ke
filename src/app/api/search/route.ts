import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateCommunityAssessment, normalizePhone, looksLikeKenyanPhone } from "@/lib/verification";
import { sanitizeIdentifier, escapePostgrestFilter } from "@/lib/sanitize";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";
import type { ScamReport, VerificationTier } from "@/types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const DISCLAIMER = "Reports are user-submitted and not independently verified by ScamBusterKE. Use this information as one factor in your decision-making.";

interface ReportRow {
  id: string;
  identifier: string;
  identifier_type: string;
  scam_type: string;
  description: string;
  amount_lost: number | null;
  is_anonymous: boolean;
  created_at: string;
  verification_tier: number | null;
  evidence_score: number | null;
  reporter_verified: boolean | null;
  is_expired: boolean | null;
  total_count?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Rate limit
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`search:${clientIP}`, RATE_LIMITS.search);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many searches. Please try again shortly." },
        { status: 429 }
      );
    }

    const rawQuery = searchParams.get("q")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10))
    );

    if (!rawQuery) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const query = sanitizeIdentifier(rawQuery);

    // If it looks like a Kenyan phone number, normalize it for consistent matching
    const isPhone = looksLikeKenyanPhone(query);
    const normalizedQuery = isPhone ? normalizePhone(query) : query;

    const supabase = createServerClient();

    // Log the lookup for analytics (non-blocking)
    void supabase
      .from("lookups")
      .insert({ identifier: normalizedQuery, found_reports_count: 0 })
      .then(() => { }, console.error);

    // Search with verification fields, excluding expired reports
    // For phone numbers, search both the normalized form and raw query to catch legacy data
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let reportQuery = supabase
      .from("reports")
      .select("id, identifier, identifier_type, scam_type, description, amount_lost, is_anonymous, created_at, verification_tier, evidence_score, reporter_verified, is_expired", { count: "exact" });

    if (isPhone && normalizedQuery !== query) {
      // Search for both normalized (+254...) and raw (07..., 254...) forms
      const safeNormalized = escapePostgrestFilter(normalizedQuery);
      const safeRaw = escapePostgrestFilter(query);
      reportQuery = reportQuery.or(`identifier.ilike.%${safeNormalized}%,identifier.ilike.%${safeRaw}%`);
    } else {
      const safeQuery = escapePostgrestFilter(normalizedQuery);
      reportQuery = reportQuery.ilike("identifier", `%${safeQuery}%`);
    }

    const { data, count, error } = await reportQuery
      .eq("status", "approved")
      .or("is_expired.is.null,is_expired.eq.false")
      .order("verification_tier", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Check for active disputes
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id")
      .ilike("identifier", `%${query}%`)
      .in("status", ["pending", "under_review"]);

    const hasDisputes = (disputes?.length || 0) > 0;

    // Convert to ScamReport format for assessment calculation
    const reports: ScamReport[] = (data || []).map((r: ReportRow) => ({
      id: r.id,
      identifier: r.identifier,
      identifier_type: r.identifier_type as ScamReport["identifier_type"],
      scam_type: r.scam_type as ScamReport["scam_type"],
      description: r.description,
      amount_lost: r.amount_lost || undefined,
      is_anonymous: r.is_anonymous,
      created_at: r.created_at,
      status: "pending" as const,
      verification_tier: (r.verification_tier || 1) as VerificationTier,
      evidence_score: r.evidence_score || 0,
      reporter_verified: r.reporter_verified || false,
      is_expired: r.is_expired || false,
    }));

    // Calculate community assessment
    const assessment = calculateCommunityAssessment(reports, hasDisputes);

    // Update lookup count (non-blocking)
    void supabase
      .from("lookups")
      .update({ found_reports_count: totalCount })
      .eq("identifier", normalizedQuery)
      .then(() => { }, console.error);

    const response = {
      query: normalizedQuery,
      assessment,
      data: reports.map(r => ({
        id: r.id,
        identifier: r.identifier,
        identifier_type: r.identifier_type,
        scam_type: r.scam_type,
        description: r.description,
        amount_lost: r.amount_lost,
        is_anonymous: r.is_anonymous,
        created_at: r.created_at,
        verification_tier: r.verification_tier,
        evidence_score: r.evidence_score,
        reporter_verified: r.reporter_verified,
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

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error searching reports:", error);
    return NextResponse.json(
      { error: "Failed to search reports" },
      { status: 500 }
    );
  }
}
