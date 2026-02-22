/**
 * Daily aggregation cron job.
 *
 * Called automatically by Vercel Cron (see vercel.json) at 06:00 EAT every day.
 * Can also be triggered manually via:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://scambuster.co.ke/api/cron/aggregate
 *
 * What it does:
 *  1. Fetches RSS feeds from curated Kenyan news sources (src/lib/seed-sources.ts)
 *  2. Filters items for scam/fraud keywords
 *  3. Skips URLs already in the database (source_url deduplication)
 *  4. Runs up to MAX_ARTICLES_PER_RUN new articles through the AI extract pipeline
 *  5. Saves extracted reports as "pending" (or "approved" for official sources)
 *
 * Requires env vars: ANTHROPIC_API_KEY, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { fetchArticleText, extractReportsFromArticle } from "@/lib/extract";
import { normalizePhone, looksLikeKenyanPhone, calculateEvidenceScore, calculateExpirationDate } from "@/lib/verification";
import { SOURCES, isFraudRelated, parseRssFeedUrls } from "@/lib/seed-sources";

// Maximum articles to process per cron invocation (keeps runtime under 60s)
const MAX_ARTICLES_PER_RUN = 8;

export const maxDuration = 300; // Vercel Pro: allow up to 5 min

export async function GET(request: NextRequest) {
  // --- Auth ---
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const startedAt = Date.now();

  // --- Get already-processed source URLs to avoid re-processing ---
  const { data: existing } = await supabase
    .from("reports")
    .select("source_url")
    .not("source_url", "is", null);

  const processedUrls = new Set((existing || []).map((r) => r.source_url as string));

  // --- Fetch all feeds in parallel, collect candidate articles ---
  const feedResults = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const res = await fetch(source.rssUrl, {
        headers: { "User-Agent": "ScamBusterKE/1.0 (+https://scambuster.co.ke)" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`${source.name}: HTTP ${res.status}`);
      const xml = await res.text();
      const items = parseRssFeedUrls(xml);
      return { source, items };
    })
  );

  // Collect fraud-related articles not yet in DB
  const candidates: Array<{ url: string; autoApprove: boolean; sourceName: string }> = [];

  for (const result of feedResults) {
    if (result.status === "rejected") continue;
    const { source, items } = result.value;
    for (const item of items) {
      if (processedUrls.has(item.url)) continue;
      if (!isFraudRelated(item.title + " " + item.summary)) continue;
      candidates.push({ url: item.url, autoApprove: source.autoApprove, sourceName: source.name });
    }
  }

  // Deduplicate candidates (same URL may appear across sources)
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter(({ url }) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  const toProcess = uniqueCandidates.slice(0, MAX_ARTICLES_PER_RUN);

  // --- Process each candidate article ---
  const results = {
    articlesChecked: uniqueCandidates.length,
    articlesProcessed: 0,
    reportsCreated: 0,
    errors: [] as string[],
  };

  for (const { url, autoApprove, sourceName } of toProcess) {
    try {
      // Fetch and extract
      const articleText = await fetchArticleText(url);
      if (articleText.length < 100) continue;

      const extracted = await extractReportsFromArticle(articleText, url);
      if (extracted.length === 0) continue;

      results.articlesProcessed++;

      // Save each extracted report
      for (const report of extracted) {
        // Normalize phone numbers
        let identifier = report.identifier;
        if (report.identifier_type === "phone" && looksLikeKenyanPhone(identifier)) {
          identifier = normalizePhone(identifier);
        }

        // Skip if a near-identical report already exists (source_url match)
        const { data: duplicate } = await supabase
          .from("reports")
          .select("id")
          .eq("source_url", url)
          .ilike("identifier", identifier)
          .limit(1)
          .single();

        if (duplicate) continue;

        const evidenceScore = calculateEvidenceScore({
          evidence_url: null,
          transaction_id: null,
          description: report.description,
          reporter_verified: false,
          amount_lost: report.amount_lost || null,
        });

        const expiresAt = calculateExpirationDate(evidenceScore, false);

        const { error } = await supabase.from("reports").insert({
          identifier,
          identifier_type: report.identifier_type,
          scam_type: report.scam_type,
          description: report.description,
          amount_lost: report.amount_lost || null,
          source_url: url,
          is_anonymous: true,
          reporter_verified: false,
          evidence_score: evidenceScore,
          verification_tier: 1,
          is_expired: false,
          expires_at: expiresAt,
          status: autoApprove ? "approved" : "pending",
        });

        if (!error) results.reportsCreated++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`${sourceName}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    ...results,
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
