// Quick RSS reachability + keyword filter test — no API keys needed

const SOURCES = [
  { name: "Standard (Headlines)", url: "https://www.standardmedia.co.ke/rss/headlines.php" },
  { name: "Standard (Kenya)",     url: "https://www.standardmedia.co.ke/rss/kenya.php" },
  { name: "Business Daily",       url: "https://www.businessdailyafrica.com/bd/rss.xml" },
  { name: "Kenyans.co.ke",        url: "https://www.kenyans.co.ke/feeds/news" },
];

const KEYWORDS = ["scam","fraud","fraudster","con","swindl","fake","ponzi","pyramid","mpesa","m-pesa","cyber crime","cybercrime","defraud","phishing","impersonat","money laundering","fake job","fake land","investment scheme"];

function isFraudRelated(text) {
  const lower = text.toLowerCase();
  return KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function parseItems(xml) {
  const items = [];
  const blocks = xml.split(/<\/?(?:item|entry)[\s>]/i).filter((_, i) => i % 2 === 1);
  for (const block of blocks) {
    const url = block.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim()
             || block.match(/<link[^>]+href="([^"]+)"/i)?.[1]?.trim();
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim() ?? "";
    const summary = block.match(/<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/i)?.[1]
      ?.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,200) ?? "";
    if (url?.startsWith("http")) items.push({ url, title, summary });
  }
  return items;
}

console.log("Testing RSS feeds...\n");
let totalMatches = 0;

for (const source of SOURCES) {
  process.stdout.write(`  ${source.name.padEnd(20)}`);
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "ScamBusterKE/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.log(`✗ HTTP ${res.status}`); continue; }
    const xml = await res.text();
    const items = parseItems(xml);
    const matches = items.filter(i => isFraudRelated(i.title + " " + i.summary));
    totalMatches += matches.length;
    console.log(`✓  ${items.length} items, ${matches.length} fraud-related`);
    matches.slice(0, 2).forEach(m => console.log(`       → ${m.title.slice(0,80)}`));
  } catch (e) {
    console.log(`✗  ${e.message}`);
  }
}

console.log(`\nTotal fraud-related articles found: ${totalMatches}`);
console.log(`Would process: up to 8 per run`);
