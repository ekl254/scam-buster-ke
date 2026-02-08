import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateCommunityAssessment } from "@/lib/verification";
import { CONCERN_LEVELS } from "@/types";
import type { ScamReport, VerificationTier, ConcernLevel } from "@/types";

// Africa's Talking USSD handler
// USSD constraints: 182 characters max per screen, 180 second session timeout

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

// POST - Handle USSD callback from Africa's Talking
export async function POST(request: NextRequest) {
  try {
    // Africa's Talking sends form data
    const formData = await request.formData();

    const sessionId = formData.get("sessionId") as string;
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
          // Report this number
          response = `END Report at:
scambuster.co.ke/report

Or SMS "SCAM ${query}" to 40222`;
          break;
        case "0":
          // New search
          response = `CON Enter number/paybill to check:`;
          break;
        default:
          response = "END Invalid option. Dial again to restart.";
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

// Search for an identifier
async function searchIdentifier(query: string): Promise<string> {
  try {
    const supabase = createServerClient();

    // Search for reports
    const { data, error } = await supabase
      .from("reports")
      .select("id, identifier, identifier_type, scam_type, description, amount_lost, upvotes, is_anonymous, created_at, verification_tier, evidence_score, reporter_verified, is_expired")
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
      upvotes: r.upvotes,
      status: "pending" as const,
      verification_tier: (r.verification_tier || 1) as VerificationTier,
      evidence_score: r.evidence_score || 0,
      reporter_verified: r.reporter_verified || false,
      is_expired: r.is_expired || false,
    }));

    // Log lookup
    supabase
      .from("lookups")
      .insert({ identifier: query, found_reports_count: reports.length })
      .then(() => {});

    // Calculate assessment
    const assessment = calculateCommunityAssessment(reports, hasDisputes);
    const concernInfo = CONCERN_LEVELS[assessment.concern_level];
    const symbol = getConcernSymbol(assessment.concern_level);

    if (assessment.concern_level === "no_reports") {
      return `END ${symbol} NO REPORTS FOUND

${query}

No scam reports found.
Stay vigilant!

Report: scambuster.co.ke`;
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
