/**
 * Seed script for ScamBusterKE
 *
 * Phase 1: Inserts curated known scams from known-scams.json
 * Phase 2: Fetches news articles and extracts scam reports via AI
 * Phase 3: Inserts existing fictional seed data for density
 *
 * Usage:
 *   npx tsx scripts/seed.ts                    # Run all phases
 *   npx tsx scripts/seed.ts --known-only       # Phase 1 only
 *   npx tsx scripts/seed.ts --news-only        # Phase 2 only
 *   npx tsx scripts/seed.ts --fictional-only   # Phase 3 only
 *
 * Environment:
 *   SEED_API_URL    - API base URL (default: http://localhost:3000)
 *   ADMIN_API_KEY   - Admin key for bypassing rate limits
 *   ANTHROPIC_API_KEY - Required for Phase 2 (news extraction)
 */

import { readFileSync } from "fs";
import { join } from "path";

// Dynamic imports for extract functions (use relative paths for tsx)
async function loadExtractFunctions() {
  const { fetchArticleText, extractReportsFromArticle } = await import(
    "../src/lib/extract"
  );
  return { fetchArticleText, extractReportsFromArticle };
}

const API_URL = process.env.SEED_API_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

interface KnownScam {
  identifier: string;
  identifier_type: string;
  scam_type: string;
  description: string;
  amount_lost: number;
  source_url: string;
}

interface NewsUrl {
  url: string;
  topic: string;
}

interface SeedReport {
  identifier: string;
  identifier_type: string;
  scam_type: string;
  description: string;
  amount_lost?: number;
  evidence_url?: string;
  transaction_id?: string;
  is_anonymous: boolean;
  source_url?: string;
}

// ─── API submission ──────────────────────────────────────────

async function submitReport(
  report: SeedReport,
  label: string
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (ADMIN_KEY) {
      headers["x-admin-key"] = ADMIN_KEY;
    }

    const response = await fetch(`${API_URL}/api/reports`, {
      method: "POST",
      headers,
      body: JSON.stringify(report),
    });

    if (response.status === 429) {
      console.log(`  ⏳ ${label} — rate limited, waiting 20s...`);
      await sleep(20000);
      return submitReport(report, label);
    }

    if (!response.ok) {
      const err = await response.json();
      console.error(`  ✗ ${label} — ${err.error}`);
      return false;
    }

    const data = await response.json();
    console.log(
      `  ✓ ${label} — tier=${data.data.verification_tier} score=${data.data.evidence_score}`
    );
    return true;
  } catch (error) {
    console.error(`  ✗ ${label} — ${error}`);
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Phase 1: Known Scams ────────────────────────────────────

async function seedKnownScams(): Promise<{ success: number; failed: number }> {
  console.log("\n═══ Phase 1: Known Scams ═══");

  const filePath = join(__dirname, "known-scams.json");
  let scams: KnownScam[];
  try {
    scams = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    console.error("Could not read scripts/known-scams.json");
    return { success: 0, failed: 0 };
  }

  console.log(`Loading ${scams.length} known scams...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < scams.length; i++) {
    const scam = scams[i];
    const report: SeedReport = {
      identifier: scam.identifier,
      identifier_type: scam.identifier_type,
      scam_type: scam.scam_type,
      description: scam.description,
      amount_lost: scam.amount_lost,
      evidence_url: scam.source_url,
      is_anonymous: true,
      source_url: scam.source_url,
    };

    const ok = await submitReport(
      report,
      `[${i + 1}/${scams.length}] ${scam.identifier}`
    );
    if (ok) success++;
    else failed++;

    if (i < scams.length - 1) await sleep(500);
  }

  console.log(`\nPhase 1 complete: ${success} inserted, ${failed} failed`);
  return { success, failed };
}

// ─── Phase 2: News Extraction ────────────────────────────────

async function seedFromNews(): Promise<{ success: number; failed: number }> {
  console.log("\n═══ Phase 2: News Article Extraction ═══");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("Skipping — ANTHROPIC_API_KEY not set");
    return { success: 0, failed: 0 };
  }

  const filePath = join(__dirname, "news-urls.json");
  let urls: NewsUrl[];
  try {
    urls = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    console.error("Could not read scripts/news-urls.json");
    return { success: 0, failed: 0 };
  }

  let extract: Awaited<ReturnType<typeof loadExtractFunctions>>;
  try {
    extract = await loadExtractFunctions();
  } catch (err) {
    console.error("Could not load extract functions:", err);
    return { success: 0, failed: 0 };
  }

  console.log(`Processing ${urls.length} news articles...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i++) {
    const { url, topic } = urls[i];
    console.log(`\n[${i + 1}/${urls.length}] ${topic}`);
    console.log(`  URL: ${url}`);

    try {
      // Fetch article text
      const text = await extract.fetchArticleText(url);
      console.log(`  Fetched ${text.length} chars`);

      // Extract reports via AI
      const reports = await extract.extractReportsFromArticle(text, url);
      console.log(`  Extracted ${reports.length} reports`);

      // Submit each extracted report
      for (let j = 0; j < reports.length; j++) {
        const report: SeedReport = {
          ...reports[j],
          is_anonymous: true,
        };

        const ok = await submitReport(
          report,
          `  → ${reports[j].identifier} (${reports[j].scam_type})`
        );
        if (ok) success++;
        else failed++;

        if (j < reports.length - 1) await sleep(300);
      }
    } catch (err) {
      console.error(`  ✗ Failed to process: ${err}`);
      failed++;
    }

    // Delay between URLs to avoid AI API rate limiting
    if (i < urls.length - 1) {
      console.log("  Waiting 2s before next article...");
      await sleep(2000);
    }
  }

  console.log(`\nPhase 2 complete: ${success} inserted, ${failed} failed`);
  return { success, failed };
}

// ─── Phase 3: Fictional Seed Data ────────────────────────────

const fictionalReports: SeedReport[] = [
  // M-PESA / MOBILE MONEY SCAMS
  {
    identifier: "0741982356",
    identifier_type: "phone",
    scam_type: "mpesa",
    description:
      "Received SMS claiming I won Safaricom promotion. Called number, was asked to send KES 1,500 'processing fee' via M-Pesa. Money gone, no prize. Classic advance fee scam.",
    amount_lost: 1500,
    is_anonymous: true,
  },
  {
    identifier: "0723456190",
    identifier_type: "phone",
    scam_type: "mpesa",
    description:
      "Someone called saying they sent M-Pesa to my number by mistake and asked me to return KES 5,000. I checked my account - no money received. They were trying to social engineer a reverse transaction.",
    amount_lost: 0,
    is_anonymous: true,
  },
  {
    identifier: "0756321847",
    identifier_type: "phone",
    scam_type: "mpesa",
    description:
      "Pretended to be Safaricom customer care. Asked me to dial a USSD code to 'upgrade my SIM.' Turned out to be a SIM swap attempt. They almost got access to my M-Pesa. Reported to Safaricom.",
    amount_lost: 0,
    is_anonymous: false,
  },
  {
    identifier: "0709183245",
    identifier_type: "phone",
    scam_type: "mpesa",
    description:
      "Sent me a fake M-Pesa confirmation message showing KES 25,000 deposit. Then called saying it was a mistake and I should send it back. The message was completely fake - my actual balance hadn't changed.",
    amount_lost: 25000,
    is_anonymous: true,
  },
  {
    identifier: "0738291056",
    identifier_type: "phone",
    scam_type: "mpesa",
    description:
      "WhatsApp message offering M-Pesa loan of up to 100K. Asked for KES 2,000 registration fee. After paying, was told I need to pay KES 5,000 more for 'insurance.' Clearly a pyramid of fees with no actual loan.",
    amount_lost: 7000,
    is_anonymous: true,
  },
  {
    identifier: "0711923847",
    identifier_type: "phone",
    scam_type: "mpesa",
    description:
      "Called claiming to be from KRA. Said I had unpaid taxes and would be arrested if I didn't pay immediately via M-Pesa. Very threatening tone. KRA does NOT collect taxes via M-Pesa to personal numbers.",
    amount_lost: 15000,
    is_anonymous: true,
  },
  {
    identifier: "174523",
    identifier_type: "paybill",
    scam_type: "mpesa",
    description:
      "Fake Paybill number shared on Facebook claiming to be KPLC token purchase. Paid KES 3,000 for electricity tokens that never arrived. The real KPLC paybill is 888880.",
    amount_lost: 3000,
    is_anonymous: true,
  },
  {
    identifier: "529301",
    identifier_type: "paybill",
    scam_type: "mpesa",
    description:
      "Paybill advertised on a poster in Nairobi CBD for cheap DStv subscriptions. Paid KES 2,500 for a 3-month package. No subscription activated. Number now unreachable.",
    amount_lost: 2500,
    is_anonymous: true,
  },
  // LAND / PROPERTY SCAMS
  {
    identifier: "Greenfield Estates Ltd",
    identifier_type: "company",
    scam_type: "land",
    description:
      "Advertised plots in Konza Technopolis area at KES 350K per eighth acre. Paid deposit of KES 150K. When I went to visit the land, it belongs to someone else entirely. Company office in Westlands now closed.",
    amount_lost: 150000,
    is_anonymous: false,
  },
  {
    identifier: "0724561938",
    identifier_type: "phone",
    scam_type: "land",
    description:
      "Broker selling land in Kitengela. Showed me a beautiful plot, rushed me to pay deposit. Title deed turned out to be fake - verified at Lands Ministry. Plot had already been sold to 3 other people by same broker.",
    amount_lost: 200000,
    is_anonymous: true,
  },
  {
    identifier: "Sunrise Properties Kenya",
    identifier_type: "company",
    scam_type: "land",
    description:
      "Instagram ads for affordable housing in Syokimau. Paid KES 500K towards a 2-bedroom apartment. Construction site doesn't exist. Company has no physical office. Over 50 people scammed.",
    amount_lost: 500000,
    is_anonymous: false,
  },
  {
    identifier: "Pioneer Developers Kenya",
    identifier_type: "company",
    scam_type: "land",
    description:
      "Promised completion of townhouses in Athi River within 18 months. It's been 3 years, only foundation laid. Company keeps asking for more money for 'unforeseen costs.' KPDA has no record of this developer.",
    amount_lost: 2500000,
    is_anonymous: false,
  },
  // JOBS / EMPLOYMENT SCAMS
  {
    identifier: "0745382916",
    identifier_type: "phone",
    scam_type: "jobs",
    description:
      "Posted fake job ads for Dubai hotel positions on Facebook. Required KES 30K for 'visa processing' and 'medical exam.' After paying, was given a fake visa number. No job exists. This is the Kazi Majuu scam.",
    amount_lost: 30000,
    is_anonymous: true,
  },
  {
    identifier: "Global Recruitment Solutions",
    identifier_type: "company",
    scam_type: "jobs",
    description:
      "Office in Moi Avenue building. Promised nursing jobs in Saudi Arabia. Charged KES 85K for processing. Gave fake calling letters with forged Ministry of Labour stamp. Over 30 nurses scammed. Reported to DCI.",
    amount_lost: 85000,
    is_anonymous: false,
  },
  {
    identifier: "0719283746",
    identifier_type: "phone",
    scam_type: "jobs",
    description:
      "WhatsApp job offer for 'online data entry' paying KES 5,000/day. Asked for KES 3,000 'registration fee' first. After paying, given a link to a fake website where you supposedly earn by clicking ads.",
    amount_lost: 3000,
    is_anonymous: true,
  },
  {
    identifier: "careers@mikiramotors.net",
    identifier_type: "email",
    scam_type: "jobs",
    description:
      "Email claiming to be from a car dealership hiring sales reps. Very professional looking. Required KES 5,000 for 'background check' before interview. Real company confirmed they never sent such emails.",
    amount_lost: 5000,
    is_anonymous: true,
  },
  {
    identifier: "0767123489",
    identifier_type: "phone",
    scam_type: "jobs",
    description:
      "Called me saying I'd been shortlisted for KDF recruitment. Needed to pay KES 20,000 for 'medical clearance.' KDF recruitment is free and done through the official channels at barracks. Complete scam.",
    amount_lost: 20000,
    is_anonymous: true,
  },
  // INVESTMENT / PONZI SCAMS
  {
    identifier: "0736192845",
    identifier_type: "phone",
    scam_type: "investment",
    description:
      "Invited to join 'crypto trading group' on Telegram. Guaranteed 30% weekly returns. Deposited KES 50,000. Got 'returns' for 2 weeks (paid from new members' money). Then the group vanished overnight. Classic Ponzi.",
    amount_lost: 50000,
    is_anonymous: true,
  },
  {
    identifier: "wealthgrowth-ke.com",
    identifier_type: "website",
    scam_type: "investment",
    description:
      "Website promising forex trading with guaranteed 200% returns in 30 days. Deposited KES 100K. Dashboard showed 'growing profits.' When I tried to withdraw, asked for 'tax clearance fee.' Website now down.",
    amount_lost: 100000,
    is_anonymous: false,
  },
  {
    identifier: "Prosperity Circle Kenya",
    identifier_type: "company",
    scam_type: "investment",
    description:
      "Chama-style investment group that recruited through churches. Each member pays KES 20K and recruits 3 others. Promised KES 160K return. By the time I joined, the founder had disappeared with millions. Pure pyramid scheme.",
    amount_lost: 20000,
    is_anonymous: true,
  },
  {
    identifier: "quickprofit254.com",
    identifier_type: "website",
    scam_type: "investment",
    description:
      "Sports betting 'investment' site. Claims AI predicts matches with 95% accuracy. You deposit money, they 'place bets' for you. When you try to withdraw, account gets locked for 'verification.'",
    amount_lost: 45000,
    is_anonymous: true,
  },
  // TENDER SCAMS
  {
    identifier: "0742918365",
    identifier_type: "phone",
    scam_type: "tender",
    description:
      "Called claiming to have inside information on a county government tender for medical supplies. Asked for KES 50K to 'secure the tender.' Provided fake tender documents with real-looking county letterhead.",
    amount_lost: 50000,
    is_anonymous: true,
  },
  {
    identifier: "tenders@gov-procurement.co.ke",
    identifier_type: "email",
    scam_type: "tender",
    description:
      "Professional-looking email about a KES 15M road construction tender. Required KES 100K for 'tender processing fee.' Real government tenders are advertised on MyGov website and don't require upfront fees.",
    amount_lost: 100000,
    is_anonymous: false,
  },
  // ONLINE SHOPPING SCAMS
  {
    identifier: "shopnairobistore.com",
    identifier_type: "website",
    scam_type: "online",
    description:
      "Facebook-advertised online store selling electronics at 70% discount. Ordered iPhone 15 for KES 35,000. Received a cheap Chinese knockoff worth about KES 3,000. No return policy.",
    amount_lost: 35000,
    is_anonymous: true,
  },
  {
    identifier: "0729183746",
    identifier_type: "phone",
    scam_type: "online",
    description:
      "Selling PS5 consoles on OLX at 'clearance price' of KES 25,000. Sent M-Pesa as requested. Got sent a tracking number that doesn't work. Seller stopped picking calls. Account deleted from OLX.",
    amount_lost: 25000,
    is_anonymous: true,
  },
  {
    identifier: "759201",
    identifier_type: "till",
    scam_type: "online",
    description:
      "Online furniture store advertising sofas at half price. Paid KES 45,000 via till number. Was told delivery in 2 weeks. It's been 3 months. No furniture, no refund. 'Showroom' address doesn't exist.",
    amount_lost: 45000,
    is_anonymous: false,
  },
  // ROMANCE SCAMS
  {
    identifier: "0748291635",
    identifier_type: "phone",
    scam_type: "romance",
    description:
      "Met on Facebook Dating. Claimed to be a Kenyan working as an engineer in Canada. After 3 months, started asking for money for 'flight ticket home.' Sent KES 75,000. Photos were stolen from someone else's profile.",
    amount_lost: 75000,
    is_anonymous: true,
  },
  {
    identifier: "0731829456",
    identifier_type: "phone",
    scam_type: "romance",
    description:
      "Tinder match who quickly moved to WhatsApp. Claimed to be a doctor at KNH. After 2 weeks, said mother was sick and needed KES 40K for hospital bill. Sent the money. Then 'car broke down' - needed 20K more. Blocked after I refused.",
    amount_lost: 40000,
    is_anonymous: true,
  },
  // OTHER SCAMS
  {
    identifier: "0763291845",
    identifier_type: "phone",
    scam_type: "other",
    description:
      "Called claiming to be from CID. Said my ID was used in a crime and I need to 'clear my name' by paying KES 25,000. Very intimidating, threatened arrest. Real CID does not call and demand M-Pesa payments.",
    amount_lost: 25000,
    is_anonymous: true,
  },
  {
    identifier: "0707182934",
    identifier_type: "phone",
    scam_type: "other",
    description:
      "Fake car insurance renewal. Called with my exact car details. Offered renewal at KES 15,000. Paid via M-Pesa. Received a fake insurance certificate. My real insurance hadn't expired.",
    amount_lost: 15000,
    is_anonymous: false,
  },
  {
    identifier: "Mega Discount Electronics",
    identifier_type: "company",
    scam_type: "online",
    description:
      "Shop near Luthuli Avenue. Bought HP laptop for KES 38,000. Worked fine during demo. Got home, different (older, slower) laptop in the box. When I returned, shop had 'moved.' Known swap scam on Luthuli.",
    amount_lost: 38000,
    is_anonymous: false,
  },
  {
    identifier: "Apex Financial Advisors",
    identifier_type: "company",
    scam_type: "investment",
    description:
      "Unlicensed financial advisor in Kisumu. Not registered with CMA. Collected KES 150,000 from me for 'government bond investment' with 25% annual return. Government bonds don't work through random advisors.",
    amount_lost: 150000,
    is_anonymous: false,
  },
  {
    identifier: "298174",
    identifier_type: "paybill",
    scam_type: "other",
    description:
      "Fake NHIF payments. Received call that my NHIF card was expiring and needed to pay KES 6,000 to renew immediately through this paybill. Real NHIF doesn't call members to renew via random paybills.",
    amount_lost: 6000,
    is_anonymous: true,
  },
];

async function seedFictional(): Promise<{ success: number; failed: number }> {
  console.log("\n═══ Phase 3: Fictional Seed Data ═══");
  console.log(`Loading ${fictionalReports.length} fictional reports...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < fictionalReports.length; i++) {
    const report = {
      ...fictionalReports[i],
      evidence_url: "https://scambuster.co.ke",
    };
    const ok = await submitReport(
      report,
      `[${i + 1}/${fictionalReports.length}] ${report.identifier}`
    );
    if (ok) success++;
    else failed++;

    if (i < fictionalReports.length - 1) await sleep(500);
  }

  console.log(`\nPhase 3 complete: ${success} inserted, ${failed} failed`);
  return { success, failed };
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const knownOnly = args.includes("--known-only");
  const newsOnly = args.includes("--news-only");
  const fictionalOnly = args.includes("--fictional-only");
  const runAll = !knownOnly && !newsOnly && !fictionalOnly;

  console.log("╔══════════════════════════════════════╗");
  console.log("║     ScamBusterKE Data Seeder         ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`API: ${API_URL}`);
  console.log(`Admin key: ${ADMIN_KEY ? "configured" : "NOT SET (will be rate-limited)"}`);
  console.log(`Anthropic key: ${process.env.ANTHROPIC_API_KEY ? "configured" : "NOT SET (news extraction disabled)"}`);

  let totalSuccess = 0;
  let totalFailed = 0;

  // Phase 1: Known scams
  if (runAll || knownOnly) {
    const r = await seedKnownScams();
    totalSuccess += r.success;
    totalFailed += r.failed;
  }

  // Phase 2: News extraction
  if (runAll || newsOnly) {
    const r = await seedFromNews();
    totalSuccess += r.success;
    totalFailed += r.failed;
  }

  // Phase 3: Fictional data
  if (runAll || fictionalOnly) {
    const r = await seedFictional();
    totalSuccess += r.success;
    totalFailed += r.failed;
  }

  // Summary
  console.log("\n══════════════════════════════════════");
  console.log(`Total: ${totalSuccess} reports inserted, ${totalFailed} failed`);

  // Verify final count
  try {
    const stats = await fetch(`${API_URL}/api/stats`).then((r) => r.json());
    console.log(`Database total reports: ${stats.totalReports}`);
    console.log(`Database total amount lost: KES ${stats.totalAmountLost?.toLocaleString()}`);
  } catch {
    // ignore
  }
}

main().catch(console.error);
