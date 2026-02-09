/**
 * Article fetching and AI extraction for scam reports.
 * Uses Claude API to extract structured scam data from news articles.
 */

import Anthropic from "@anthropic-ai/sdk";
import { type ScamType, type IdentifierType } from "@/types";

export interface ExtractedReport {
  identifier: string;
  identifier_type: IdentifierType;
  scam_type: ScamType;
  description: string;
  amount_lost: number;
  source_url: string;
}

/**
 * Fetch article content from a URL and convert to plain text.
 */
export async function fetchArticleText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ScamBusterKE/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Strip HTML to plain text
  let text = html
    // Remove script and style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    // Convert block elements to newlines
    .replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote)[^>]*>/gi, "\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

  // Limit to ~8000 chars to stay within reasonable prompt size
  if (text.length > 8000) {
    text = text.slice(0, 8000) + "\n[...truncated]";
  }

  return text;
}

const EXTRACTION_PROMPT = `You are a data extraction assistant for ScamBusterKE, a Kenyan scam reporting platform.

Given a news article about scams in Kenya, extract structured scam report data.

For each distinct scam entity mentioned (company, phone number, website, person running a scam, etc.), extract:
- identifier: The scam entity (company name, phone number, website, paybill, email, etc.)
- identifier_type: One of: phone, paybill, till, website, company, email
- scam_type: One of: mpesa, land, jobs, investment, tender, online, romance, other
  - mpesa: M-Pesa/mobile money scams, SIM swap, fake messages
  - land: Fake land companies, fake title deeds
  - jobs: Fake job offers, Kazi Majuu scams
  - investment: Pyramid schemes, Ponzi, fake crypto
  - tender: Fake government tenders
  - online: Fake online shops, non-delivery
  - romance: Catfishing, fake relationships
  - other: Anything else
- description: A factual 2-4 sentence summary of the scam, written as a report. Do not use sensationalist language.
- amount_lost: Total amount in KES mentioned (number only, 0 if unknown)

Rules:
- Extract ONLY entities clearly identified as scammers/fraudulent in the article
- If the article mentions multiple distinct scam entities, return multiple reports
- Phone numbers should be in +254 format if Kenyan
- For companies, use the exact name as written
- Descriptions should be factual and concise — state what happened, who was affected, and how
- Do NOT fabricate information not present in the article

Respond with a JSON array of objects. If no scam entities can be extracted, return an empty array.
Example: [{"identifier": "QuickCash Ltd", "identifier_type": "company", "scam_type": "investment", "description": "QuickCash Ltd operated a Ponzi scheme promising 50% monthly returns. Over 2,000 investors lost funds when the company collapsed in January 2024.", "amount_lost": 50000000}]`;

/**
 * Extract scam reports from article text using Claude AI.
 */
export async function extractReportsFromArticle(
  articleText: string,
  sourceUrl: string
): Promise<ExtractedReport[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nArticle URL: ${sourceUrl}\n\nArticle content:\n${articleText}`,
      },
    ],
  });

  // Extract text from response
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = textBlock.text.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error("AI response is not an array");
  }

  // Validate and attach source_url
  const validIdentifierTypes = ["phone", "paybill", "till", "website", "company", "email"];
  const validScamTypes = ["mpesa", "land", "jobs", "investment", "tender", "online", "romance", "other"];

  return parsed
    .filter(
      (item: Record<string, unknown>) =>
        item.identifier &&
        validIdentifierTypes.includes(item.identifier_type as string) &&
        validScamTypes.includes(item.scam_type as string) &&
        item.description
    )
    .map((item: Record<string, unknown>) => ({
      identifier: String(item.identifier),
      identifier_type: item.identifier_type as IdentifierType,
      scam_type: item.scam_type as ScamType,
      description: String(item.description),
      amount_lost: typeof item.amount_lost === "number" ? item.amount_lost : 0,
      source_url: sourceUrl,
    }));
}
