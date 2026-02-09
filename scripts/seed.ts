/**
 * Seed script for ScamBusterKE
 *
 * Populates the database with realistic scam reports based on
 * common fraud patterns in Kenya. All identifiers are fictional.
 *
 * Usage: npx tsx scripts/seed.ts
 */

const API_URL = process.env.SEED_API_URL || "https://scam-buster-ke.vercel.app";

interface SeedReport {
  identifier: string;
  identifier_type: "phone" | "paybill" | "till" | "website" | "company" | "email";
  scam_type: "mpesa" | "land" | "jobs" | "investment" | "tender" | "online" | "romance" | "other";
  description: string;
  amount_lost?: number;
  evidence_url?: string;
  transaction_id?: string;
  is_anonymous: boolean;
}

const reports: SeedReport[] = [
  // === M-PESA / MOBILE MONEY SCAMS ===
  {
    identifier: "0741982356",
    identifier_type: "phone",
    scam_type: "mpesa",
    description: "Received SMS claiming I won Safaricom promotion. Called number, was asked to send KES 1,500 'processing fee' via M-Pesa. Money gone, no prize. Classic advance fee scam.",
    amount_lost: 1500,
    is_anonymous: true,
  },
  {
    identifier: "0723456190",
    identifier_type: "phone",
    scam_type: "mpesa",
    description: "Someone called saying they sent M-Pesa to my number by mistake and asked me to return KES 5,000. I checked my account - no money received. They were trying to social engineer a reverse transaction.",
    amount_lost: 0,
    is_anonymous: true,
  },
  {
    identifier: "0756321847",
    identifier_type: "phone",
    scam_type: "mpesa",
    description: "Pretended to be Safaricom customer care. Asked me to dial a USSD code to 'upgrade my SIM.' Turned out to be a SIM swap attempt. They almost got access to my M-Pesa. Reported to Safaricom.",
    amount_lost: 0,
    is_anonymous: false,
  },
  {
    identifier: "0709183245",
    identifier_type: "phone",
    scam_type: "mpesa",
    description: "Sent me a fake M-Pesa confirmation message showing KES 25,000 deposit. Then called saying it was a mistake and I should send it back. The message was completely fake - my actual balance hadn't changed.",
    amount_lost: 25000,
    is_anonymous: true,
  },
  {
    identifier: "0738291056",
    identifier_type: "phone",
    scam_type: "mpesa",
    description: "WhatsApp message offering M-Pesa loan of up to 100K. Asked for KES 2,000 registration fee. After paying, was told I need to pay KES 5,000 more for 'insurance.' Clearly a pyramid of fees with no actual loan.",
    amount_lost: 7000,
    is_anonymous: true,
  },
  {
    identifier: "0711923847",
    identifier_type: "phone",
    scam_type: "mpesa",
    description: "Called claiming to be from KRA. Said I had unpaid taxes and would be arrested if I didn't pay immediately via M-Pesa. Very threatening tone. KRA does NOT collect taxes via M-Pesa to personal numbers.",
    amount_lost: 15000,
    is_anonymous: true,
  },
  {
    identifier: "174523",
    identifier_type: "paybill",
    scam_type: "mpesa",
    description: "Fake Paybill number shared on Facebook claiming to be KPLC token purchase. Paid KES 3,000 for electricity tokens that never arrived. The real KPLC paybill is 888880.",
    amount_lost: 3000,
    is_anonymous: true,
  },
  {
    identifier: "529301",
    identifier_type: "paybill",
    scam_type: "mpesa",
    description: "Paybill advertised on a poster in Nairobi CBD for cheap DStv subscriptions. Paid KES 2,500 for a 3-month package. No subscription activated. Number now unreachable.",
    amount_lost: 2500,
    is_anonymous: true,
  },

  // === LAND / PROPERTY SCAMS ===
  {
    identifier: "Greenfield Estates Ltd",
    identifier_type: "company",
    scam_type: "land",
    description: "Advertised plots in Konza Technopolis area at KES 350K per eighth acre. Paid deposit of KES 150K. When I went to visit the land, it belongs to someone else entirely. Company office in Westlands now closed. Phone goes straight to voicemail.",
    amount_lost: 150000,
    is_anonymous: false,
  },
  {
    identifier: "0724561938",
    identifier_type: "phone",
    scam_type: "land",
    description: "Broker selling land in Kitengela. Showed me a beautiful plot, rushed me to pay deposit. Title deed turned out to be fake - verified at Lands Ministry. Plot had already been sold to 3 other people by same broker.",
    amount_lost: 200000,
    is_anonymous: true,
  },
  {
    identifier: "Sunrise Properties Kenya",
    identifier_type: "company",
    scam_type: "land",
    description: "Instagram ads for affordable housing in Syokimau. Paid KES 500K towards a 2-bedroom apartment. Construction site doesn't exist. Company has no physical office. Director's phone is now off. Other victims found on Facebook group - over 50 people scammed.",
    amount_lost: 500000,
    is_anonymous: false,
  },
  {
    identifier: "0733182945",
    identifier_type: "phone",
    scam_type: "land",
    description: "Sold me a plot in Ruiru that he claimed was freehold. After paying full amount, discovered the land is under a road expansion project and will be compulsorily acquired. Seller knew this and deliberately hid it.",
    amount_lost: 800000,
    is_anonymous: true,
  },
  {
    identifier: "Pioneer Developers Kenya",
    identifier_type: "company",
    scam_type: "land",
    description: "Promised completion of townhouses in Athi River within 18 months. It's been 3 years, only foundation laid. Company keeps asking for more money for 'unforeseen costs.' Classic construction scam. KPDA has no record of this developer.",
    amount_lost: 2500000,
    is_anonymous: false,
  },

  // === JOBS / EMPLOYMENT SCAMS ===
  {
    identifier: "0745382916",
    identifier_type: "phone",
    scam_type: "jobs",
    description: "Posted fake job ads for Dubai hotel positions on Facebook. Required KES 30K for 'visa processing' and 'medical exam.' After paying, was given a fake visa number. No job exists. This is the Kazi Majuu scam.",
    amount_lost: 30000,
    is_anonymous: true,
  },
  {
    identifier: "Global Recruitment Solutions",
    identifier_type: "company",
    scam_type: "jobs",
    description: "Office in Moi Avenue building. Promised nursing jobs in Saudi Arabia. Charged KES 85K for processing. Gave fake calling letters with forged Ministry of Labour stamp. Over 30 nurses scammed. Reported to DCI.",
    amount_lost: 85000,
    is_anonymous: false,
  },
  {
    identifier: "0719283746",
    identifier_type: "phone",
    scam_type: "jobs",
    description: "WhatsApp job offer for 'online data entry' paying KES 5,000/day. Asked for KES 3,000 'registration fee' first. After paying, given a link to a fake website where you supposedly earn by clicking ads. Cannot withdraw any earnings.",
    amount_lost: 3000,
    is_anonymous: true,
  },
  {
    identifier: "careers@mikiramotors.net",
    identifier_type: "email",
    scam_type: "jobs",
    description: "Email claiming to be from a car dealership hiring sales reps. Very professional looking. Required KES 5,000 for 'background check' before interview. Real company confirmed they never sent such emails. Domain is fake - real company uses different email.",
    amount_lost: 5000,
    is_anonymous: true,
  },
  {
    identifier: "0752918374",
    identifier_type: "phone",
    scam_type: "jobs",
    description: "Telegram group advertising cargo ship jobs. Pay is USD 3,000/month supposedly. Registration fee KES 15,000. After paying, added to a 'waiting list' that never moves. When you complain, they block you.",
    amount_lost: 15000,
    is_anonymous: true,
  },
  {
    identifier: "0767123489",
    identifier_type: "phone",
    scam_type: "jobs",
    description: "Called me saying I'd been shortlisted for KDF recruitment. Needed to pay KES 20,000 for 'medical clearance.' KDF recruitment is free and done through the official channels at barracks. Complete scam.",
    amount_lost: 20000,
    is_anonymous: true,
  },

  // === INVESTMENT / PONZI SCAMS ===
  {
    identifier: "0736192845",
    identifier_type: "phone",
    scam_type: "investment",
    description: "Invited to join 'crypto trading group' on Telegram. Guaranteed 30% weekly returns. Deposited KES 50,000 through this number. Got 'returns' for 2 weeks (paid from new members' money). Then the group vanished overnight. Classic Ponzi.",
    amount_lost: 50000,
    is_anonymous: true,
  },
  {
    identifier: "wealthgrowth-ke.com",
    identifier_type: "website",
    scam_type: "investment",
    description: "Website promising forex trading with guaranteed 200% returns in 30 days. Very professional looking with fake testimonials. Deposited KES 100K. Dashboard showed 'growing profits.' When I tried to withdraw, asked for 'tax clearance fee.' Website now down.",
    amount_lost: 100000,
    is_anonymous: false,
  },
  {
    identifier: "0728374651",
    identifier_type: "phone",
    scam_type: "investment",
    description: "Instagram influencer promoting 'investment opportunity' in cryptocurrency mining. Minimum investment KES 10,000 with daily payouts. Paid KES 30,000. Received payouts for a week, then told to reinvest for 'higher tier.' Lost everything when they disappeared.",
    amount_lost: 30000,
    is_anonymous: true,
  },
  {
    identifier: "Prosperity Circle Kenya",
    identifier_type: "company",
    scam_type: "investment",
    description: "Chama-style investment group that recruited through churches. Each member pays KES 20K and recruits 3 others. Promised KES 160K return. Early members got paid. By the time I joined (5th wave), the founder had disappeared with millions. Pure pyramid scheme.",
    amount_lost: 20000,
    is_anonymous: true,
  },
  {
    identifier: "0714829356",
    identifier_type: "phone",
    scam_type: "investment",
    description: "Offered shares in a 'matatu SACCO' at KES 200K per share with monthly dividends of KES 15K. No actual matatus exist. The SACCO is not registered with SASRA. Multiple people from our estate were scammed.",
    amount_lost: 200000,
    is_anonymous: false,
  },
  {
    identifier: "quickprofit254.com",
    identifier_type: "website",
    scam_type: "investment",
    description: "Sports betting 'investment' site. Claims AI predicts matches with 95% accuracy. You deposit money, they 'place bets' for you. Initially shows profits. When you try to withdraw, account gets locked for 'verification.' Support stops responding.",
    amount_lost: 45000,
    is_anonymous: true,
  },

  // === TENDER / GOVERNMENT SCAMS ===
  {
    identifier: "0742918365",
    identifier_type: "phone",
    scam_type: "tender",
    description: "Called claiming to have inside information on a county government tender for medical supplies. Asked for KES 50K to 'secure the tender.' Provided fake tender documents with real-looking county letterhead. No such tender exists.",
    amount_lost: 50000,
    is_anonymous: true,
  },
  {
    identifier: "tenders@gov-procurement.co.ke",
    identifier_type: "email",
    scam_type: "tender",
    description: "Professional-looking email about a KES 15M road construction tender. Required KES 100K for 'tender processing fee.' Real government tenders are advertised on MyGov website and don't require upfront fees. Domain is fake.",
    amount_lost: 100000,
    is_anonymous: false,
  },
  {
    identifier: "0708291534",
    identifier_type: "phone",
    scam_type: "tender",
    description: "Broker promising to connect you with 'Nairobi County purchasing officer.' Says you can supply stationery worth KES 2M. Just need KES 30K for 'connection fee.' After paying, broker gives you a random number that's not a county officer.",
    amount_lost: 30000,
    is_anonymous: true,
  },

  // === ONLINE SHOPPING SCAMS ===
  {
    identifier: "shopnairobistore.com",
    identifier_type: "website",
    scam_type: "online",
    description: "Facebook-advertised online store selling electronics at 70% discount. Ordered iPhone 15 for KES 35,000. Received a cheap Chinese knockoff worth about KES 3,000. No return policy. WhatsApp support blocked me after I complained.",
    amount_lost: 35000,
    is_anonymous: true,
  },
  {
    identifier: "0729183746",
    identifier_type: "phone",
    scam_type: "online",
    description: "Selling PS5 consoles on OLX at 'clearance price' of KES 25,000. Sent M-Pesa as requested. Was told to wait for delivery. Got sent a tracking number that doesn't work. Seller stopped picking calls. Account deleted from OLX.",
    amount_lost: 25000,
    is_anonymous: true,
  },
  {
    identifier: "0753291847",
    identifier_type: "phone",
    scam_type: "online",
    description: "Instagram seller with 10K followers selling branded sneakers. Ordered Nike Air Force 1 for KES 8,500. Received obviously fake shoes that started falling apart after one week. Seller claims 'no refunds on sale items.'",
    amount_lost: 8500,
    is_anonymous: true,
  },
  {
    identifier: "759201",
    identifier_type: "till",
    scam_type: "online",
    description: "Online furniture store advertising sofas at half price. Paid KES 45,000 via till number. Was told delivery in 2 weeks. It's been 3 months. No furniture, no refund. When I visit the 'showroom' address, it doesn't exist.",
    amount_lost: 45000,
    is_anonymous: false,
  },
  {
    identifier: "0716293845",
    identifier_type: "phone",
    scam_type: "online",
    description: "WhatsApp seller offering cheap Jua Kali water tanks. Ordered 10,000L tank for KES 30,000 (market price ~55,000). Paid full amount. Delivery date keeps being pushed. Now says the 'factory has issues.' Obvious con.",
    amount_lost: 30000,
    is_anonymous: true,
  },

  // === ROMANCE / DATING SCAMS ===
  {
    identifier: "0748291635",
    identifier_type: "phone",
    scam_type: "romance",
    description: "Met on Facebook Dating. Claimed to be a Kenyan working as an engineer in Canada. After 3 months of daily communication, started asking for money for 'flight ticket home.' Sent KES 75,000 over several transactions. Person doesn't exist - photos were stolen from someone else's profile.",
    amount_lost: 75000,
    is_anonymous: true,
  },
  {
    identifier: "0731829456",
    identifier_type: "phone",
    scam_type: "romance",
    description: "Tinder match who quickly moved conversation to WhatsApp. Claimed to be a doctor at Kenyatta National Hospital. After 2 weeks, said mother was sick and needed KES 40K for hospital bill. Sent the money. Then 'car broke down' - needed 20K more. Blocked after I refused.",
    amount_lost: 40000,
    is_anonymous: true,
  },

  // === OTHER SCAMS ===
  {
    identifier: "0763291845",
    identifier_type: "phone",
    scam_type: "other",
    description: "Called claiming to be from CID. Said my ID was used in a crime and I need to 'clear my name' by paying KES 25,000. Very intimidating, threatened arrest. Real CID does not call and demand M-Pesa payments.",
    amount_lost: 25000,
    is_anonymous: true,
  },
  {
    identifier: "0707182934",
    identifier_type: "phone",
    scam_type: "other",
    description: "Fake car insurance renewal. Called with my exact car details (reg number, make, model) saying my insurance expired. Offered renewal at KES 15,000. Paid via M-Pesa. Received a fake insurance certificate. My real insurance hadn't expired.",
    amount_lost: 15000,
    is_anonymous: false,
  },
  {
    identifier: "0744928163",
    identifier_type: "phone",
    scam_type: "other",
    description: "Selling fake university certificates. Found on Telegram. Promised JKUAT degree for KES 50,000. Certificate looks real but has no verification code. Completely useless and illegal. Reported to CID.",
    amount_lost: 50000,
    is_anonymous: true,
  },
  {
    identifier: "0721839456",
    identifier_type: "phone",
    scam_type: "other",
    description: "Witch doctor / traditional healer scam. Promised to 'multiply my money' through spiritual means. Gave them KES 10,000 as 'seed money.' They performed some ritual and told me to wait 7 days. Money was never multiplied. Obviously.",
    amount_lost: 10000,
    is_anonymous: true,
  },

  // === MORE M-PESA (common, need density) ===
  {
    identifier: "0739284715",
    identifier_type: "phone",
    scam_type: "mpesa",
    description: "Fuliza scam. Called pretending to be Safaricom. Said my Fuliza limit would be increased to KES 100K if I send KES 5,000 for 'activation.' Real Fuliza limits are automatic based on usage. Lost KES 5,000.",
    amount_lost: 5000,
    is_anonymous: true,
  },
  {
    identifier: "0718394625",
    identifier_type: "phone",
    scam_type: "mpesa",
    description: "M-Shwari loan scam. Sent SMS that I qualified for KES 200K M-Shwari loan. Just needed to send KES 3,000 for 'clearance fee.' M-Shwari is automatic through Safaricom app - no fees required. Scammer was very convincing on the phone.",
    amount_lost: 3000,
    is_anonymous: true,
  },

  // === MORE INVESTMENT (very common in Kenya) ===
  {
    identifier: "0726183945",
    identifier_type: "phone",
    scam_type: "investment",
    description: "Binary options 'trader' on TikTok. Shows screenshots of huge profits. Promised to trade on my behalf for 50% profit share. Sent KES 20,000 as starting capital. Showed me fake trading dashboard for 2 weeks. Account 'wiped out' in a 'bad trade.' No refund possible.",
    amount_lost: 20000,
    is_anonymous: true,
  },
  {
    identifier: "digitalassets-ke.com",
    identifier_type: "website",
    scam_type: "investment",
    description: "Fake NFT marketplace targeting Kenyans. Claimed NFTs would 10x in value. Minimum buy-in KES 15,000. Bought 'NFTs' that are just random images. No blockchain verification. Can't sell or transfer. Site still up but no withdrawals possible.",
    amount_lost: 15000,
    is_anonymous: true,
  },

  // === MORE JOBS ===
  {
    identifier: "0758293146",
    identifier_type: "phone",
    scam_type: "jobs",
    description: "Telegram bot promising KES 2,000/day for watching YouTube videos and 'liking.' Initial 'earnings' deposited to build trust. Then asked to 'upgrade' account for KES 8,000 to unlock higher-paying tasks. After upgrading, account suspended. Classic task scam.",
    amount_lost: 8000,
    is_anonymous: true,
  },
  {
    identifier: "0704829135",
    identifier_type: "phone",
    scam_type: "jobs",
    description: "School bus driver recruitment scam. Advertised on Facebook for international school in Karen. Required KES 12,000 for 'DCI clearance' and 'medical.' Real international schools don't recruit through random Facebook posts or charge applicants.",
    amount_lost: 12000,
    is_anonymous: true,
  },

  // === A few more diverse ones ===
  {
    identifier: "298174",
    identifier_type: "paybill",
    scam_type: "other",
    description: "Fake NHIF payments. Received call that my NHIF card was expiring and needed to pay KES 6,000 to renew immediately through this paybill. Real NHIF doesn't call members to renew via random paybills. Lost the money.",
    amount_lost: 6000,
    is_anonymous: true,
  },
  {
    identifier: "0747182935",
    identifier_type: "phone",
    scam_type: "mpesa",
    description: "Airtel Money agent. Went to withdraw KES 30,000. Agent did something on his phone, showed me a 'failed transaction' screen. Told me to try again at another agent. When I checked my balance, KES 30,000 was already withdrawn. Fake failure screen.",
    amount_lost: 30000,
    is_anonymous: false,
  },
  {
    identifier: "Mega Discount Electronics",
    identifier_type: "company",
    scam_type: "online",
    description: "Shop in downtown Nairobi near Luthuli Avenue. Sells laptops and phones. Bought HP laptop for KES 38,000. Worked fine in shop during demo. Got home, different (older, slower) laptop in the box. When I returned, shop had 'moved.' Known swap scam on Luthuli.",
    amount_lost: 38000,
    is_anonymous: false,
  },
  {
    identifier: "0713928456",
    identifier_type: "phone",
    scam_type: "land",
    description: "Selling plots in Malindi near the beach. WhatsApp group with 'satisfied buyers' sharing testimonials. Paid KES 250,000 for quarter acre. Went to see the land - it's government land (beach setback area) that can't be privately owned. Title is completely forged.",
    amount_lost: 250000,
    is_anonymous: true,
  },
  {
    identifier: "Apex Financial Advisors",
    identifier_type: "company",
    scam_type: "investment",
    description: "Unlicensed financial advisor in Kisumu. Not registered with CMA. Collected KES 150,000 from me and several others for 'government bond investment' with 25% annual return. Government bonds don't work through random advisors. Money is gone. CMA confirmed they are not licensed.",
    amount_lost: 150000,
    is_anonymous: false,
  },
];

async function seedReport(report: SeedReport, index: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });

    if (response.status === 429) {
      // Rate limited - wait and retry
      console.log(`  [${index + 1}] Rate limited, waiting 20s...`);
      await new Promise((r) => setTimeout(r, 20000));
      return seedReport(report, index);
    }

    if (!response.ok) {
      const err = await response.json();
      console.error(`  [${index + 1}] FAILED: ${report.identifier} - ${err.error}`);
      return false;
    }

    const data = await response.json();
    console.log(
      `  [${index + 1}] OK: ${report.identifier} (${report.scam_type}) tier=${data.data.verification_tier} score=${data.data.evidence_score}`
    );
    return true;
  } catch (error) {
    console.error(`  [${index + 1}] ERROR: ${report.identifier} - ${error}`);
    return false;
  }
}

async function main() {
  console.log(`\nSeeding ScamBusterKE database...`);
  console.log(`API: ${API_URL}`);
  console.log(`Reports to seed: ${reports.length}\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < reports.length; i++) {
    const ok = await seedReport(reports[i], i);
    if (ok) success++;
    else failed++;

    // Small delay between requests to avoid rate limiting
    if (i < reports.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log(`\nDone! ${success} seeded, ${failed} failed.`);

  // Verify final count
  try {
    const stats = await fetch(`${API_URL}/api/stats`).then((r) => r.json());
    console.log(`Total reports in database: ${stats.totalReports}`);
    console.log(`Total amount lost: KES ${stats.totalAmountLost?.toLocaleString()}`);
  } catch {
    // ignore
  }
}

main();
