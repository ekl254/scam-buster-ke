import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateCommunityAssessment, calculateEvidenceScore, calculateExpirationDate, normalizePhone, hashPhone, looksLikeKenyanPhone } from "@/lib/verification";
import { sanitizeText, sanitizeIdentifier } from "@/lib/sanitize";
import { CONCERN_LEVELS, SCAM_TYPES } from "@/types";
import type { ScamReport, ScamType, IdentifierType, VerificationTier, ConcernLevel } from "@/types";

// Africa's Talking USSD handler
// USSD constraints: 182 characters max per screen, 180 second session timeout

// Abbreviated scam type labels for USSD (must fit 182 char limit)
const USSD_SCAM_TYPES: { key: ScamType; label: string }[] = [
  { key: "mpesa", label: "M-Pesa" },
  { key: "land", label: "Land" },
  { key: "jobs", label: "Jobs" },
  { key: "investment", label: "Investment" },
  { key: "tender", label: "Tender" },
  { key: "online", label: "Online Shop" },
  { key: "romance", label: "Romance" },
  { key: "other", label: "Other" },
];

// Format amount for USSD (short format)
function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${Math.round(amount / 1000)}K`;
  }
  return amount.toString();
}

// Get concern emoji for USSD
function getConcernSymbol(level: ConcernLevel): string {
  const symbols: Record<ConcernLevel, string> = {
    no_reports: "[OK]",
    low: "[!]",
    moderate: "[!!]",
    high: "[!!!]",
    severe: "[XXX]",
  };
  return symbols[level];
}

// Truncate text to fit USSD limits
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Auto-detect identifier type
function detectIdentifierType(value: string): IdentifierType {
  if (looksLikeKenyanPhone(value)) return "phone";
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 5 && digits.length <= 6) return "paybill";
  if (digits.length === 7) return "till";
  return "company";
}

// POST - Handle USSD callback from Africa's Talking
export async function POST(request: NextRequest) {
  try {
    // Africa's Talking sends form data
    const formData = await request.formData();

    const phoneNumber = formData.get("phoneNumber") as string;
    const text = formData.get("text") as string || "";

    // Parse the USSD input chain (inputs are separated by *)
    const inputs = text.split("*").filter(Boolean);
    const currentInput = inputs[inputs.length - 1] || "";
    const menuLevel = inputs.length;

    let response: string;

    // Main menu (no input yet)
    if (menuLevel === 0) {
      response = `CON ScamBusterKE
Check before you pay!

Enter number/paybill to check:`;
    }
    // User entered a search query
    else if (menuLevel === 1) {
      const query = currentInput.trim();

      if (query.length < 3) {
        response = "END Too short. Enter at least 3 characters.";
      } else {
        // Perform search
        const result = await searchIdentifier(query);
        response = result;
      }
    }
    // Handle menu selections after search
    else if (menuLevel === 2) {
      const query = inputs[0].trim();
      const selection = currentInput;

      switch (selection) {
        case "1":
          // More details
          response = await getMoreDetails(query);
          break;
        case "2":
          // Report this number — show scam type picker
          response = `CON Report ${truncate(query, 15)}
Select scam type:
${USSD_SCAM_TYPES.map((t, i) => `${i + 1}.${t.label}`).join("\n")}`;
          break;
        case "0":
          // New search
          response = `CON Enter number/paybill to check:`;
          break;
        default:
          response = "END Invalid option. Dial again to restart.";
      }
    }
    // Report flow: scam type selected (level 3, after query -> "2" -> type)
    else if (menuLevel === 3 && inputs[1] === "2") {
      const typeNum = parseInt(currentInput, 10);
      if (isNaN(typeNum) || typeNum < 1 || typeNum > USSD_SCAM_TYPES.length) {
        response = "END Invalid scam type. Dial again.";
      } else {
        response = `CON Describe the scam briefly:`;
      }
    }
    // Report flow: description entered (level 4, after query -> "2" -> type -> description)
    else if (menuLevel === 4 && inputs[1] === "2") {
      const query = inputs[0].trim();
      const typeNum = parseInt(inputs[2], 10);
      const description = currentInput.trim();

      if (description.length < 5) {
        response = "END Description too short. Dial again.";
      } else if (isNaN(typeNum) || typeNum < 1 || typeNum > USSD_SCAM_TYPES.length) {
        response = "END Invalid scam type. Dial again.";
      } else {
        const scamType = USSD_SCAM_TYPES[typeNum - 1].key;
        response = await submitUSSDReport(query, scamType, description, phoneNumber);
      }
    }
    else {
      response = "END Session ended. Dial again to restart.";
    }

    // Return plain text response (Africa's Talking format)
    return new NextResponse(response, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("USSD error:", error);
    return new NextResponse("END Error occurred. Try again.", {
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Submit a report from USSD
async function submitUSSDReport(
  identifier: string,
  scamType: ScamType,
  description: string,
  reporterPhone: string
): Promise<string> {
  try {
    const supabase = createServerClient();

    const identifierType = detectIdentifierType(identifier);
    let cleanIdentifier = sanitizeIdentifier(identifier);
    if (identifierType === "phone") {
      cleanIdentifier = normalizePhone(cleanIdentifier);
    }
    const cleanDescription = sanitizeText(description);

    const evidenceScore = calculateEvidenceScore({
      description: cleanDescription,
      reporter_verified: false,
      amount_lost: null,
    });

    const expiresAt = calculateExpirationDate(evidenceScore, false);
    const reporterHash = hashPhone(reporterPhone);

    const { error } = await supabase
      .from("reports")
      .insert({
        identifier: cleanIdentifier,
        identifier_type: identifierType,
        scam_type: scamType,
        description: cleanDescription,
        amount_lost: null,
        is_anonymous: true,
        status: "pending",
        verification_tier: 1,
        evidence_score: evidenceScore,
        reporter_verified: false,
        reporter_id: reporterHash,
        is_expired: false,
        expires_at: expiresAt?.toISOString() || null,
      });

    if (error) throw error;

    const typeLabel = SCAM_TYPES[scamType].label;
    return truncate(
      `END Report submitted!\n${identifier}\nType: ${typeLabel}\nPending review.\nThank you!`,
      182
    );
  } catch (error) {
    console.error("USSD report error:", error);
    return "END Error submitting report. Try again.";
  }
}

// Search for an identifier
async function searchIdentifier(query: string): Promise<string> {
  try {
    const supabase = createServerClient();

    // Search for reports
    const { data, error } = await supabase
      .from("reports")
      .select("id, identifier, identifier_type, scam_type, description, amount_lost, is_anonymous, created_at, verification_tier, evidence_score, reporter_verified, is_expired")
      .ilike("identifier", `%${query}%`)
      .or("is_expired.is.null,is_expired.eq.false")
      .order("verification_tier", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    // Check for disputes
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id")
      .ilike("identifier", `%${query}%`)
      .in("status", ["pending", "under_review"]);

    const hasDisputes = (disputes?.length || 0) > 0;

    // Convert to ScamReport format
    const reports: ScamReport[] = (data || []).map(r => ({
      id: r.id,
      identifier: r.identifier,
      identifier_type: r.identifier_type,
      scam_type: r.scam_type,
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

    // Log lookup
    void supabase
      .from("lookups")
      .insert({ identifier: query, found_reports_count: reports.length })
      .then(() => {}, console.error);

    // Calculate assessment
    const assessment = calculateCommunityAssessment(reports, hasDisputes);
    const concernInfo = CONCERN_LEVELS[assessment.concern_level];
    const symbol = getConcernSymbol(assessment.concern_level);

    if (assessment.concern_level === "no_reports") {
      return `CON ${symbol} NO REPORTS

${truncate(query, 20)}
No scam reports found.

1. More details
2. Report this number
0. New search`;
    }

    // Build response (max 182 chars for CON, but we continue session)
    const scamTypes = [...new Set(reports.map(r => r.scam_type))].slice(0, 2);
    const verifiedCount = reports.filter(r => r.verification_tier >= 2).length;

    let result = `CON ${symbol} ${concernInfo.label.toUpperCase()}

${truncate(query, 20)}
Reports: ${assessment.total_reports}`;

    if (verifiedCount > 0) {
      result += ` (${verifiedCount} verified)`;
    }

    result += `
Lost: KES ${formatAmount(assessment.total_amount_lost)}
Type: ${scamTypes.join(", ")}`;

    if (hasDisputes) {
      result += `
*Disputed*`;
    }

    result += `

1. More details
2. Report this number
0. New search`;

    return result;
  } catch (error) {
    console.error("USSD search error:", error);
    return "END Error searching. Try again.";
  }
}

// Get more details about reports
async function getMoreDetails(query: string): Promise<string> {
  try {
    const supabase = createServerClient();

    const { data } = await supabase
      .from("reports")
      .select("description, amount_lost, scam_type, verification_tier")
      .ilike("identifier", `%${query}%`)
      .or("is_expired.is.null,is_expired.eq.false")
      .order("verification_tier", { ascending: false })
      .limit(3);

    if (!data || data.length === 0) {
      return "END No details available.";
    }

    let response = "END REPORTS:\n\n";

    data.forEach((report, index) => {
      const verified = report.verification_tier >= 2 ? "[V]" : "";
      const desc = truncate(report.description, 50);
      response += `${index + 1}.${verified} ${desc}\n`;
      if (report.amount_lost) {
        response += `   KES ${formatAmount(report.amount_lost)}\n`;
      }
    });

    response += `\nFull details:\nscambuster.co.ke`;

    return truncate(response, 182);
  } catch {
    return "END Error loading details.";
  }
}

// GET - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ScamBusterKE USSD",
    provider: "Africa's Talking",
  });
}
