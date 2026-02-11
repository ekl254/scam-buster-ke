import { NextRequest, NextResponse } from "next/server";
import { verifyAdminKey } from "@/lib/admin-auth";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit admin auth attempts
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`adminAuth:${clientIP}`, RATE_LIMITS.adminAuth);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many authentication attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { key } = await request.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    if (!process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: "Admin access is not configured" },
        { status: 503 }
      );
    }

    if (verifyAdminKey(key)) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false }, { status: 401 });
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
