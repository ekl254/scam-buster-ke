import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { RATE_LIMITS, checkRateLimitPersistent, getClientIP, addRateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

export async function POST(request: Request) {
    try {
        const ip = getClientIP(request);
        const rateLimit = await checkRateLimitPersistent(
            `flag:${ip}`,
            { limit: 10, windowSeconds: 3600 }, // 10 flags per hour
            createServerClient()
        );

        if (!rateLimit.allowed) {
            return addRateLimitHeaders(
                NextResponse.json({ error: "Too many flags submitted" }, { status: 429 }),
                rateLimit
            );
        }

        const { reportId, reason } = await request.json();

        if (!reportId || !reason) {
            return NextResponse.json({ error: "Report ID and reason are required" }, { status: 400 });
        }

        const cleanReason = sanitizeText(reason, 500);

        const supabase = createServerClient();
        const { error } = await supabase
            .from("flags")
            .insert({
                report_id: reportId,
                reason: cleanReason,
            });

        if (error) throw error;

        return addRateLimitHeaders(
            NextResponse.json({ success: true }),
            rateLimit
        );
    } catch (error) {
        console.error("Error submitting flag:", error);
        return NextResponse.json({ error: "Failed to submit flag" }, { status: 500 });
    }
}
