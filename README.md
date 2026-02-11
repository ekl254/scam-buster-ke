# 🛡️ ScamBusterKE

**Community-driven platform for reporting and verifying scams in Kenya.**

Check phone numbers, Paybills, till numbers, and companies before transacting. Report scams to protect others.

🔗 **Live:** [scambuster.co.ke](https://scambuster.co.ke)

---

## Features

- **Search any identifier** — Phone numbers, Paybills, tills, websites, emails, companies
- **Report scams** — Multi-step form with evidence upload, transaction IDs, and phone verification
- **Community assessment** — Aggregated concern level based on weighted reports and verification tiers
- **Anti-fraud detection** — Correlation analysis detects coordinated fake reports
- **Dispute system** — Falsely reported entities can file disputes with evidence
- **USSD & WhatsApp** — Access via feature phones and messaging

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Styling | Tailwind CSS v4 |
| SMS | Africa's Talking |
| Hosting | Vercel |
| Analytics | Vercel Analytics + Google Analytics |

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-username/scam-buster-ke.git
cd scam-buster-ke
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor (fresh setup) or apply migrations individually
3. Copy your project URL and keys

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `HASH_SALT` | ✅ prod | Long random string for hashing phone/IP |
| `ADMIN_API_KEY` | ✅ prod | Admin authentication key |
| `AT_API_KEY` | Optional | Africa's Talking API key |
| `AT_USERNAME` | Optional | Africa's Talking username |
| `NEXT_PUBLIC_GA_ID` | Optional | Google Analytics ID |

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run tests

```bash
npm test            # Run once
npm run test:watch  # Watch mode
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── reports/     # CRUD for scam reports
│   │   ├── search/      # Identifier search + community assessment
│   │   ├── verify/      # Phone OTP verification
│   │   ├── disputes/    # Dispute management
│   │   ├── stats/       # Aggregated statistics
│   │   ├── ussd/        # USSD gateway
│   │   └── whatsapp/    # WhatsApp webhook
│   ├── report/          # Report submission form
│   ├── search/          # Search results page
│   ├── browse/          # Browse all reports
│   └── page.tsx         # Homepage (SSR)
├── components/          # Reusable UI components
├── hooks/               # Custom React hooks
├── lib/
│   ├── verification.ts  # Evidence scoring, tiers, community assessment
│   ├── correlation.ts   # Anti-fraud coordination detection
│   ├── sanitize.ts      # Input sanitization (XSS prevention)
│   ├── rate-limit.ts    # Serverless-safe rate limiting
│   ├── admin-auth.ts    # Admin key verification
│   ├── supabase.ts      # Client-side Supabase
│   └── supabase-server.ts # Server-side Supabase
├── types/               # TypeScript type definitions
└── __tests__/           # Unit tests (Vitest)
```

## Security

- **Input sanitization** on all user inputs (XSS prevention)
- **Rate limiting** with serverless-safe persistence
- **Row Level Security (RLS)** on all Supabase tables
- **Phone/IP hashing** with salted SHA-256
- **Timing-safe admin key comparison**
- **OTP verification** with salted hashes

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source. See [LICENSE](LICENSE) for details.
