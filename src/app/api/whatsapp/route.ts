import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateCommunityAssessment, calculateEvidenceScore, calculateExpirationDate, normalizePhone, hashPhone, looksLikeKenyanPhone } from "@/lib/verification";
import { sanitizeText, sanitizeIdentifier } from "@/lib/sanitize";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { CONCERN_LEVELS, VERIFICATION_TIERS, SCAM_TYPES, IDENTIFIER_TYPES } from "@/types";
import type { ScamReport, ScamType, IdentifierType, VerificationTier, ConcernLevel } from "@/types";

// WhatsApp Cloud API webhook handler
// Supports: Meta WhatsApp Business API, Africa's Talking, Twilio

const DISCLAIMER = "⚠️ User-submitted reports. Verify independently.";

// --- Report session types ---
type ReportStep = "identifier" | "scam_type" | "description" | "amount";

interface ReportSession {
  step: ReportStep;
  identifier?: string;
  identifierType?: IdentifierType;
  scamType?: ScamType;
  description?: string;
  createdAt: number;
}

// In-memory sessions keyed by sender phone. 10-min TTL.
const reportSessions = new Map<string, ReportSession>();
const SESSION_TTL_MS = 10 * 60 * 1000;

// Cleanup expired sessions periodically
function cleanupSessions() {
  const now = Date.now();
  for (const [key, session] of reportSessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      reportSessions.delete(key);
    }
  }
}

// Scam type menu for WhatsApp
const SCAM_TYPE_KEYS = Object.keys(SCAM_TYPES) as ScamType[];
function scamTypeMenu(): string {
  return SCAM_TYPE_KEYS.map((key, i) => `${i + 1}. ${SCAM_TYPES[key].label}`).join("\n");
}

// Auto-detect identifier type
function detectIdentifierType(value: string): IdentifierType {
  if (looksLikeKenyanPhone(value)) return "phone";
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return "email";
  if (/^(https?:\/\/)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value)) return "website";
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 5 && digits.length <= 6) return "paybill";
  if (digits.length === 7) return "till";
  return "company";
}

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

Stay vigilant! Send *report* to submit a scam report.

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

// Submit a report to the database
async function submitReport(session: ReportSession & { amountLost: number | null }, reporterPhone: string): Promise<string> {
  try {
    const supabase = createServerClient();

    const identifier = session.identifier!;
    const identifierType = session.identifierType!;
    const scamType = session.scamType!;
    const description = session.description!;
    const amountLost = session.amountLost;

    // Sanitize inputs
    let cleanIdentifier = sanitizeIdentifier(identifier);
    if (identifierType === "phone") {
      cleanIdentifier = normalizePhone(cleanIdentifier);
    }
    const cleanDescription = sanitizeText(description);

    const evidenceScore = calculateEvidenceScore({
      description: cleanDescription,
      reporter_verified: false,
      amount_lost: amountLost,
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
        amount_lost: amountLost,
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

    let confirmMsg = `✅ *Report Submitted!*

*Identifier:* ${identifier}
*Type:* ${SCAM_TYPES[scamType].label}`;
    if (amountLost) {
      confirmMsg += `\n*Amount Lost:* KES ${amountLost.toLocaleString()}`;
    }
    confirmMsg += `

Your report is pending review. It helps protect the community!

${DISCLAIMER}`;
    return confirmMsg;
  } catch (error) {
    console.error("Report submission error:", error);
    return "Sorry, there was an error submitting your report. Please try again or visit scambuster.co.ke/report";
  }
}

// Process the report flow state machine
// Returns completed session data when done, or a prompt response when not
function processReportFlow(senderPhone: string, input: string): { response: string; completedSession?: ReportSession & { amountLost: number | null } } {
  cleanupSessions();
  const session = reportSessions.get(senderPhone);

  if (!session) {
    // Starting a new report session
    reportSessions.set(senderPhone, { step: "identifier", createdAt: Date.now() });
    return {
      response: `📝 *Report a Scam*

Enter the phone number, paybill, till, email, website, or company name of the scammer:`,
    };
  }

  switch (session.step) {
    case "identifier": {
      const cleaned = input.trim();
      if (cleaned.length < 3) {
        return { response: "Too short. Please enter at least 3 characters." };
      }
      if (cleaned.length > 200) {
        return { response: "Too long. Please enter a shorter identifier." };
      }
      session.identifier = cleaned;
      session.identifierType = detectIdentifierType(cleaned);
      session.step = "scam_type";
      return {
        response: `Detected: *${IDENTIFIER_TYPES[session.identifierType].label}*

Select scam type (reply with number):
${scamTypeMenu()}`,
      };
    }

    case "scam_type": {
      const num = parseInt(input.trim(), 10);
      if (isNaN(num) || num < 1 || num > SCAM_TYPE_KEYS.length) {
        return {
          response: `Invalid choice. Reply with a number 1-${SCAM_TYPE_KEYS.length}:
${scamTypeMenu()}`,
        };
      }
      session.scamType = SCAM_TYPE_KEYS[num - 1];
      session.step = "description";
      return {
        response: `Selected: *${SCAM_TYPES[session.scamType].label}*

Describe what happened (at least 20 characters):`,
      };
    }

    case "description": {
      const desc = input.trim();
      if (desc.length < 20) {
        return { response: "Description too short. Please provide at least 20 characters." };
      }
      if (desc.length > 2000) {
        return { response: "Description too long. Please keep it under 2000 characters." };
      }
      session.description = desc;
      session.step = "amount";
      return {
        response: `How much money was lost? (enter amount in KES, or *skip*):`,
      };
    }

    case "amount": {
      const trimmed = input.trim().toLowerCase();
      let amountLost: number | null = null;
      if (trimmed !== "skip") {
        const parsed = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed) && parsed > 0) {
          amountLost = parsed;
        }
      }
      // Capture completed session data before deleting
      const completed = { ...session, amountLost };
      reportSessions.delete(senderPhone);
      return { response: "", completedSession: completed };
    }
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

                const response = await processMessage(from, query);
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
      const response = await processMessage(body.from, body.text.trim());
      await sendATWhatsAppMessage(body.from, response);
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Main message processor — handles sessions, commands, then search
async function processMessage(senderPhone: string, input: string): Promise<string> {
  const lower = input.toLowerCase();

  // Handle cancel — clear session
  if (lower === "cancel") {
    reportSessions.delete(senderPhone);
    return "Report cancelled. Send a number or name to search, or *report* to start a new report.";
  }

  // Handle menu
  if (lower === "menu") {
    reportSessions.delete(senderPhone);
    return `*ScamBusterKE* 🛡️

*Commands:*
• Send a number/name to search
• *report* — Report a scam
• *help* — How to use
• *cancel* — Cancel current report`;
  }

  // Handle help
  if (lower === "help" || lower === "?") {
    return `*ScamBusterKE* 🛡️

Check any phone number, paybill, or company name for scam reports.

*How to use:*
Just send the number or name you want to check.

*To report a scam:*
Send *report* to start the report flow.

*Commands:*
• *report* — Start a scam report
• *cancel* — Cancel current report
• *menu* — Show main menu
• *help* — Show this message

*Examples:*
• 0712345678
• 522522
• XYZ Company Ltd`;
  }

  // Check if user has an active report session
  if (reportSessions.has(senderPhone)) {
    const result = processReportFlow(senderPhone, input);
    if (result.completedSession) {
      // Rate limit report submissions
      const rateCheck = checkRateLimit(`wa-report:${senderPhone}`, RATE_LIMITS.reportCreate);
      if (!rateCheck.allowed) {
        return "You've submitted too many reports recently. Please try again later.";
      }
      return await submitReport(result.completedSession, senderPhone);
    }
    return result.response;
  }

  // Start new report flow
  if (lower === "report") {
    const result = processReportFlow(senderPhone, input);
    return result.response;
  }

  // Default: search
  return await processSearch(input);
}

// Process a search query
async function processSearch(query: string): Promise<string> {
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
