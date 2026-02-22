/**
 * Curated Kenyan news and official sources for daily scam report aggregation.
 *
 * Each source has an RSS feed URL. The aggregator fetches these feeds, filters
 * items whose titles/descriptions contain fraud keywords, then runs matching
 * articles through the AI extraction pipeline (lib/extract.ts).
 *
 * To add a new source: append an entry to SOURCES and verify the RSS URL is
 * reachable. autoApprove should only be true for official government sources.
 */

export interface SeedSource {
  name: string;
  rssUrl: string;
  /** If true, extracted reports are saved as "approved". Use only for official sources. */
  autoApprove: boolean;
}

export const SOURCES: SeedSource[] = [
  {
    // Headlines feed — broad coverage, high article volume
    name: "The Standard (Headlines)",
    rssUrl: "https://www.standardmedia.co.ke/rss/headlines.php",
    autoApprove: false,
  },
  {
    // Kenya-specific news — more local coverage
    name: "The Standard (Kenya)",
    rssUrl: "https://www.standardmedia.co.ke/rss/kenya.php",
    autoApprove: false,
  },
  {
    // Business/financial fraud coverage
    name: "Business Daily Africa",
    rssUrl: "https://www.businessdailyafrica.com/bd/rss.xml",
    autoApprove: false,
  },
  {
    // General Kenyan news aggregator
    name: "Kenyans.co.ke",
    rssUrl: "https://www.kenyans.co.ke/feeds/news",
    autoApprove: false,
  },
];

/** Keywords used to decide whether an RSS item is scam-related. */
export const FRAUD_KEYWORDS = [
  "scam",
  "fraud",
  "fraudster",
  "con",
  "swindl",
  "fake",
  "ponzi",
  "pyramid",
  "mpesa",
  "m-pesa",
  "cyber crime",
  "cybercrime",
  "defraud",
  "phishing",
  "impersonat",
  "money laundering",
  "fake job",
  "fake land",
  "investment scheme",
  "Ponzi scheme",
];

/**
 * Returns true if the text mentions any fraud keyword (case-insensitive).
 */
export function isFraudRelated(text: string): boolean {
  const lower = text.toLowerCase();
  return FRAUD_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Minimal RSS/Atom parser — extracts item URLs from feed XML without
 * requiring an external dependency.
 *
 * Handles both:
 *  - RSS 2.0: <link>https://...</link> between <item> tags
 *  - Atom: <link href="https://..." />
 */
export function parseRssFeedUrls(xml: string): Array<{ url: string; title: string; summary: string }> {
  const items: Array<{ url: string; title: string; summary: string }> = [];

  // Split on item/entry boundaries
  const itemBlocks = xml.split(/<\/?(?:item|entry)[\s>]/i).filter((_, i) => i % 2 === 1);

  for (const block of itemBlocks) {
    // Extract URL: RSS <link>, Atom <link href="...">
    const rssLink = block.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim();
    const atomLink = block.match(/<link[^>]+href="([^"]+)"/i)?.[1]?.trim();
    const url = rssLink || atomLink;

    // Extract title
    const title = block
      .match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]
      ?.replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim() ?? "";

    // Extract description/summary snippet
    const summary = block
      .match(/<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300) ?? "";

    if (url && url.startsWith("http")) {
      items.push({ url, title, summary });
    }
  }

  return items;
}
