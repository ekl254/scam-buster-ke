# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScamBusterKE is a community-driven platform for reporting and verifying scams in Kenya. Users can search phone numbers, paybills, companies, and other identifiers to check if they've been reported as scams, and submit reports when they encounter fraud.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Build for production
npm run lint     # Run ESLint
```

No test framework is configured yet.

## Architecture

### Tech Stack
- Next.js 16 with App Router (React 19)
- Supabase for database (no auth integration yet — reports are anonymous)
- Tailwind CSS 4 for styling
- TypeScript with strict mode
- Path alias: `@/*` maps to `./src/*`

### API Routes (`src/app/api/`)

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/reports` | GET, POST | List/create reports. GET supports filters (type, sort, includeExpired) and pagination. POST validates, calculates evidence score, runs correlation analysis. |
| `/api/search` | GET | Search by identifier. Returns community assessment with concern level. Logs lookups for analytics. |
| `/api/stats` | GET | Global stats from `stats` table with 60s cache. Falls back to direct queries. |
| `/api/disputes` | GET, POST, PATCH | Dispute false reports. PATCH is admin-only (requires `x-admin-key` header). |
| `/api/verify` | GET, POST | Phone OTP verification. Rate-limited (3/hour). Uses Africa's Talking SMS in production. |
| `/api/whatsapp` | GET, POST | WhatsApp Business API webhook (Meta + Africa's Talking). |
| `/api/ussd` | GET, POST | Africa's Talking USSD handler (182 char limit per screen). |

**API pattern**: Routes attempt optimized Supabase RPC functions first, falling back to manual queries if unavailable.

### Key Patterns

**Supabase Clients**: Two client configurations:
- `lib/supabase.ts` — Browser client for client components
- `lib/supabase-server.ts` — Server client for API routes (no session persistence)

**Verification System** (`lib/verification.ts`):
- Three-tier system: Unverified (1) → Corroborated (2) → Verified (3)
- Evidence scoring (0–70 points) based on: evidence URL, transaction ID, description length, reporter verification, amount lost
- Time-decay weighting: reports lose weight at 90/180 day thresholds
- Tier 1 reports expire after 90 days unless upgraded
- Community assessment generates concern levels: no_reports, low, moderate, high, severe

**Anti-Fraud Detection** (`lib/correlation.ts`):
- Detects coordinated reports by checking same phone hash, same IP hash, timing clusters, and text similarity (Jaccard index)
- `analyzeNewReport` runs on every POST to `/api/reports`

**Pagination**: `usePaginatedData` hook provides generic infinite scroll with abort controller. `useInfiniteScroll` uses Intersection Observer for trigger elements. API routes support `page` and `pageSize` params.

**Type System**: Scam types and identifier types are defined as `as const` objects in `src/types/index.ts` with derived TypeScript union types.

**Utility pattern** (`lib/utils.ts`): Uses `cn()` (clsx + tailwind-merge) for className composition. Kenyan phone formatting with `formatPhoneNumber` and `normalizePhone`.

### Database Schema (Supabase)

**Tables**: `reports`, `lookups` (search analytics), `upvotes`, `stats` (cached aggregates), `disputes`, `phone_verifications`, `verified_reporters`

**Key RPC functions** (in `supabase/migrations/`):
- `get_reports_paginated` — Paginated report fetching with filters
- `search_reports` / `search_reports_v2` — Search with total count
- `get_identifier_stats` — Aggregated stats per identifier
- `calculate_evidence_score`, `calculate_verification_tier`, `calculate_report_weight`
- `expire_old_reports` — Marks tier 1 reports past 90 days

**Triggers** auto-calculate evidence scores, set expiration dates, update verification tiers, and keep the `stats` table in sync.

Row Level Security (RLS) is enabled on all tables.

### Pages

- `/` — Homepage with search bar, stats, common scam types grid, recent reports
- `/browse` — Browse all reports with filters and infinite scroll
- `/search?q=` — Search results with community assessment and concern level
- `/report` — Multi-step form (4 steps: identifier → scam type → details → verification/submit)
- `/dispute` — Dispute form for false reports (pre-fills from URL params)

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optional (for phone verification):
```
AT_API_KEY=           # Africa's Talking
AT_USERNAME=
AT_SENDER_ID=
```

## Domain Context

Scam types specific to Kenya: mpesa (mobile money), land, jobs (Kazi Majuu), investment/ponzi, tender, online shopping, romance.

Identifier types: phone, paybill, till, website, company, email.

Phone numbers are normalized to +254 format via `normalizePhone()`. Hashing uses SHA-256 with a salt for reporter privacy.
