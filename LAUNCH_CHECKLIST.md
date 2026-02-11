# ScamBusterKE Launch Checklist

## Phase 1: Pre-Launch (This Week)

### Data Seeding
- [ ] Use `/admin` extract to pull 50+ real scam reports from:
  - Twitter/X: search "M-Pesa scam", "fake Paybill", "scammed Kenya"
  - Reddit r/Kenya scam threads
  - Safaricom community forums
  - Consumer complaints on Helb, KPLC, NTSA fake Paybills
- [ ] Ensure mix of scam types: M-Pesa, Paybill, till, fake companies, job scams
- [ ] Verify reports display correctly on `/browse` and `/check/` pages

### Technical Checks
- [x] Google Search Console verified + sitemap submitted (57 pages)
- [x] GA4 tracking live
- [x] Vercel Analytics + Speed Insights
- [x] OG image preview working on WhatsApp
- [x] Share buttons on check pages
- [ ] Submit sitemap to Bing Webmaster Tools (bing.com/webmasters)
- [ ] Test all flows end-to-end: search, report, dispute
- [ ] Test on mobile (majority of Kenyan users)
- [ ] Check page load speed on 3G (Chrome DevTools throttling)

---

## Phase 2: Soft Launch (Week 1-2)

### Personal Network
- [ ] Share on your personal WhatsApp status
- [ ] Send to 5-10 WhatsApp groups you're in (family, friends, work)
- [ ] Post on your Twitter/X with a real scam example
- [ ] Share on your LinkedIn

### Sample Messages
**WhatsApp status:**
> Ever been sent a fake Paybill? Now you can check before you pay. scambuster.co.ke

**WhatsApp group message:**
> Guys, I built something to help Kenyans avoid scams. You can check any phone number, Paybill, or company before transacting. Try it: https://scambuster.co.ke
> If you've been scammed, report it to warn others.

**Twitter/X:**
> Just launched ScamBusterKE — check any phone number, Paybill, or company against community scam reports before you send money.
> https://scambuster.co.ke
> Built for Kenyans, by Kenyans. RT to protect someone.

---

## Phase 3: Community Growth (Week 2-4)

### Kenyan Tech/Finance Communities
- [ ] Post on r/Kenya subreddit
- [ ] Share in Kenyan tech Twitter spaces
- [ ] Post in Facebook groups: "Kenyans on Facebook", "M-Pesa Users", consumer protection groups
- [ ] Reach out to KOT (Kenyans on Twitter) influencers who cover fraud
- [ ] Share in Telegram groups focused on Kenyan fintech

### Content Marketing (SEO)
- [ ] Write 3-5 blog posts targeting high-search keywords:
  - "How to check if a Paybill is legit"
  - "Common M-Pesa scams in Kenya 2026"
  - "How to report a scammer in Kenya"
  - "Fake job scams (Kazi Majuu) — how to spot them"
  - "Is [trending scam] legit? What Kenyans need to know"
- [ ] Add `/blog` route with these articles

### Partnerships
- [ ] Contact Safaricom customer care Twitter — suggest they link to ScamBusterKE
- [ ] Reach out to Kenya consumer protection bloggers
- [ ] Contact local media (The Star, Nation, Standard) tech reporters
- [ ] Reach out to DCI (Directorate of Criminal Investigations) digital team

---

## Phase 4: Channel Expansion (Month 2)

### WhatsApp Bot
- [ ] Get WhatsApp Business API number (Meta Business Manager)
- [ ] Connect to existing `/api/whatsapp` endpoint
- [ ] Users text a number/Paybill to the bot, get instant scam check
- [ ] This is the highest-impact channel for Kenya

### USSD
- [ ] Get USSD short code from Africa's Talking
- [ ] Connect to existing `/api/ussd` endpoint
- [ ] Enables feature phone users to check scams (huge rural reach)

### SMS
- [ ] Africa's Talking SMS integration for alerts
- [ ] "New report on a number you checked" notifications

---

## Phase 5: Growth & Trust (Month 2-3)

### Credibility
- [ ] Add "About Us" / team page
- [ ] Add stats counter on homepage (X scams reported, X searches)
- [ ] Testimonials from users who avoided scams
- [ ] Media mentions / press section

### Features
- [ ] Trending scams section on homepage
- [ ] Email alerts: "Get notified when new reports match your search"
- [ ] Browser extension for checking numbers
- [ ] API for third-party integrations

### Technical
- [ ] Add error monitoring (Sentry)
- [ ] Add basic test suite
- [ ] Set up uptime monitoring (BetterUptime or similar)
- [ ] Database backups strategy

---

## Key Metrics to Track

| Metric | Tool | Week 1 Target |
|--------|------|---------------|
| Daily visitors | GA4 / Vercel Analytics | 50+ |
| Searches performed | Supabase `lookups` table | 100+ |
| Reports submitted | Supabase `reports` table | 20+ |
| Pages indexed | Google Search Console | 57+ |
| WhatsApp shares | GA4 events (if tracked) | 10+ |

---

## The #1 Priority

**Seed real data.** An empty database = no one comes back. Spend the first few days using the admin extract tool to populate with known scams from Twitter, forums, and news. Aim for 100+ reports across different scam types before promoting heavily.
