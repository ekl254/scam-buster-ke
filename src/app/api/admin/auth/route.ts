import { NextRequest, NextResponse } from "next/server";
import { verifyAdminKey } from "@/lib/admin-auth";
import { checkRateLimitPersistent, RATE_LIMITS, getClientIP, addRateLimitHeaders } from "@/lib/rate-limit";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    // Rate limit admin auth attempts
    const clientIP = getClientIP(request);
    const supabase = createServerClient();

    // Strict rate limit for admin login: 5 attempts per 15 minutes
    const rateLimit = await checkRateLimitPersistent(
      `adminAuth:${clientIP}`,
      { limit: 5, windowSeconds: 15 * 60 },
      supabase
    );

    if (!rateLimit.allowed) {
      return addRateLimitHeaders(
        NextResponse.json(
          { error: "Too many authentication attempts. Please try again later." },
          { status: 429 }
        ),
        rateLimit
      );
    }

    const { key } = await request.json();

    if (!key || typeof key !== "string") {
      return addRateLimitHeaders(
        NextResponse.json({ valid: false }, { status: 400 }),
        rateLimit
      );
    }

    if (!process.env.ADMIN_API_KEY) {
      return addRateLimitHeaders(
        NextResponse.json(
          { error: "Admin access is not configured" },
          { status: 503 }
        ),
        rateLimit
      );
    }

    if (verifyAdminKey(key)) {
      return addRateLimitHeaders(
        NextResponse.json({ valid: true }),
        rateLimit
      );
    }

    return addRateLimitHeaders(
      NextResponse.json({ valid: false }, { status: 401 }),
      rateLimit
    );
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
