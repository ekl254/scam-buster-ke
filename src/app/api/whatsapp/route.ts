import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateCommunityAssessment } from "@/lib/verification";
import { CONCERN_LEVELS, VERIFICATION_TIERS } from "@/types";
import type { ScamReport, VerificationTier, ConcernLevel } from "@/types";

// WhatsApp Cloud API webhook handler
// Supports: Meta WhatsApp Business API, Africa's Talking, Twilio

const DISCLAIMER = "⚠️ User-submitted reports. Verify independently.";

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  type: string;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string };
        messages?: WhatsAppMessage[];
      };
      field: string;
    }>;
  }>;
  // Africa's Talking format
  from?: string;
  text?: string;
  id?: string;
}

// Format amount for display
function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return `KES ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `KES ${Math.round(amount / 1000)}K`;
  }
  return `KES ${amount.toLocaleString()}`;
}

// Get concern level emoji
function getConcernEmoji(level: ConcernLevel): string {
  const emojis: Record<ConcernLevel, string> = {
    no_reports: "✅",
    low: "ℹ️",
    moderate: "⚠️",
    high: "🚨",
    severe: "🛑",
  };
  return emojis[level];
}

// Format search result for WhatsApp
function formatWhatsAppResponse(
  query: string,
  reports: ScamReport[],
  assessment: ReturnType<typeof calculateCommunityAssessment>
): string {
  const emoji = getConcernEmoji(assessment.concern_level);
  const concernInfo = CONCERN_LEVELS[assessment.concern_level];

  if (assessment.concern_level === "no_reports") {
    return `${emoji} *No Reports Found*

Searched: ${query}

No community reports found for this identifier.

Stay vigilant! If you encounter a scam, report it at scambuster.co.ke/report

${DISCLAIMER}`;
  }

  // Get unique scam types
  const scamTypes = [...new Set(reports.map(r => r.scam_type))];

  // Get verification breakdown
  const verifiedCount = reports.filter(r => r.verification_tier >= 2).length;

  let response = `${emoji} *${concernInfo.label}*

*Searched:* ${query}
*Reports:* ${assessment.total_reports} (${verifiedCount} verified)
*Total Lost:* ${formatAmount(assessment.total_amount_lost)}
*Types:* ${scamTypes.join(", ")}

`;

  // Add top 3 reports summary
  const topReports = reports.slice(0, 3);
  topReports.forEach((report, index) => {
    const tierInfo = VERIFICATION_TIERS[report.verification_tier];
    const tierBadge = report.verification_tier >= 2 ? `[${tierInfo.label}]` : "";
    response += `${index + 1}. ${tierBadge} ${report.description.substring(0, 80)}${report.description.length > 80 ? "..." : ""}\n`;
    if (report.amount_lost) {
      response += `   Lost: ${formatAmount(report.amount_lost)}\n`;
    }
    response += "\n";
  });

  if (assessment.has_disputes) {
    response += `⚖️ _This identifier has active disputes_\n\n`;
  }

  response += `View full details: scambuster.co.ke/search?q=${encodeURIComponent(query)}

${DISCLAIMER}`;

  return response;
}

// Send WhatsApp message via Meta API
async function sendWhatsAppMessage(to: string, message: string, phoneNumberId: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    console.error("WhatsApp token not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp send error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return false;
  }
}

// Send WhatsApp message via Africa's Talking
async function sendATWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;

  if (!apiKey || !username) {
    console.error("Africa's Talking credentials not configured");
    return false;
  }

  try {
    const response = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "apiKey": apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: new URLSearchParams({
          username,
          to,
          message,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("AT WhatsApp send error:", error);
    return false;
  }
}

// GET - Webhook verification (Meta requires this)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST - Handle incoming messages
export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppWebhookPayload = await request.json();

    // Handle Meta WhatsApp Business API format
    if (body.object === "whatsapp_business_account" && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const messages = change.value.messages;
          const phoneNumberId = change.value.metadata.phone_number_id;

          if (messages) {
            for (const message of messages) {
              if (message.type === "text" && message.text?.body) {
                const query = message.text.body.trim();
                const from = message.from;

                // Process the query
                const response = await processQuery(query);
                await sendWhatsAppMessage(from, response, phoneNumberId);
              }
            }
          }
        }
      }

      return NextResponse.json({ status: "ok" });
    }

    // Handle Africa's Talking format
    if (body.from && body.text) {
      const response = await processQuery(body.text.trim());
      await sendATWhatsAppMessage(body.from, response);
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Process a search query
async function processQuery(query: string): Promise<string> {
  // Handle help command
  if (query.toLowerCase() === "help" || query === "?") {
    return `*ScamBusterKE* 🛡️

Check any phone number, paybill, or company name for scam reports.

*How to use:*
Just send the number or name you want to check.

*Examples:*
• 0712345678
• 522522
• XYZ Company Ltd

Report scams: scambuster.co.ke/report
Website: scambuster.co.ke`;
  }

  // Validate query length
  if (query.length < 3) {
    return "Please enter at least 3 characters to search.";
  }

  if (query.length > 100) {
    return "Query too long. Please enter a shorter search term.";
  }

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
      .limit(10);

    if (error) {
      throw error;
    }

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

    // Calculate assessment
    const assessment = calculateCommunityAssessment(reports, hasDisputes);

    // Log lookup
    supabase
      .from("lookups")
      .insert({ identifier: query, found_reports_count: reports.length })
      .then(() => {});

    return formatWhatsAppResponse(query, reports, assessment);
  } catch (error) {
    console.error("Query processing error:", error);
    return "Sorry, an error occurred. Please try again or visit scambuster.co.ke";
  }
}
