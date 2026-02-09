# Admin Extract Pipeline Setup

## Overview

The admin tool lets you paste a news article URL, extract structured scam report data using AI, review/edit it, and approve insertion into the database.

## Environment Variables

Add to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_API_KEY=your-secret-key
```

## Usage

1. Visit `/admin`
2. Enter your admin key
3. Paste a news article URL → click **Extract**
4. Review/edit the AI-extracted reports (identifier, type, scam type, description, amount)
5. Click **Approve & Submit** on each report, or **Submit All**

## Files

| File | Purpose |
|---|---|
| `src/lib/extract.ts` | Article fetcher + Claude AI extraction logic |
| `src/app/api/admin/auth/route.ts` | Simple key validation endpoint |
| `src/app/api/admin/extract/route.ts` | AI extraction endpoint (admin-protected) |
| `src/app/admin/page.tsx` | Admin UI page |

## Notes

- The `/admin` page is unlisted — no links point to it from the main site
- Auth is a simple shared secret (`ADMIN_API_KEY`), not a full auth system
- Admin requests bypass the report creation rate limit via the `x-admin-key` header
- AI extraction uses Claude Sonnet 4.5; extracted data is always reviewed before submission
- Reports are submitted through the same `POST /api/reports` endpoint, so all validation/sanitization applies
