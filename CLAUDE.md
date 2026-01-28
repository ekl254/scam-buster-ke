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

## Architecture

### Tech Stack
- Next.js 16 with App Router (React 19)
- Supabase for database and authentication
- Tailwind CSS 4 for styling
- TypeScript with strict mode

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (reports, search, stats)
│   ├── browse/            # Browse all reports page
│   ├── report/            # Submit report page
│   └── search/            # Search results page
├── components/            # React components
├── hooks/                 # Custom React hooks (pagination, stats)
├── lib/                   # Utilities and Supabase clients
└── types/                 # TypeScript types and constants
```

### Key Patterns

**Supabase Clients**: Two client configurations exist:
- `lib/supabase.ts` - Browser client for client-side operations
- `lib/supabase-server.ts` - Server client for API routes (no session persistence)

**Pagination**: The `usePaginatedData` hook provides infinite scroll functionality with abort controller support. API routes support cursor-based pagination with `page` and `pageSize` params.

**API Routes**: Located in `src/app/api/`. Each route attempts optimized RPC functions first, falling back to manual queries if RPC is unavailable.

**Type System**: Scam types and identifier types are defined as const objects in `src/types/index.ts` with derived TypeScript types.

### Database Schema

Tables: `reports`, `lookups` (search analytics), `upvotes`

Key RPC functions (defined in migrations):
- `get_reports_paginated` - Optimized paginated report fetching
- `search_reports` - Optimized search with total count
- `get_identifier_stats` - Aggregated stats for an identifier

Row Level Security (RLS) is enabled on all tables.

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Domain Context

Scam types specific to Kenya: mpesa (mobile money), land, jobs (Kazi Majuu), investment/ponzi, tender, online shopping, romance.

Identifier types: phone, paybill, till, website, company, email.

Trust score calculation: Based on report count (100=safe, 0=known scammer).
