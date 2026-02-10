import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

export async function POST(request: Request) {
  const sessionId = request.headers.get("x-session-id");
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing x-session-id header" },
      { status: 400 }
    );
  }

  const rateCheck = checkRateLimit(`upvote:${sessionId}`, RATE_LIMITS.upvote);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  let body: { report_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reportId = body.report_id;
  if (!reportId || typeof reportId !== "string") {
    return NextResponse.json(
      { error: "report_id is required" },
      { status: 400 }
    );
  }

  const cleanSessionId = sanitizeText(sessionId, 200);
  const supabase = createServerClient();

  const { error: insertError } = await supabase
    .from("upvotes")
    .insert({ report_id: reportId, session_id: cleanSessionId });

  if (insertError) {
    if (
      insertError.code === "23505" ||
      insertError.message?.includes("duplicate") ||
      insertError.message?.includes("unique")
    ) {
      return NextResponse.json(
        { error: "Already upvoted" },
        { status: 409 }
      );
    }
    console.error("Upvote insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to upvote" },
      { status: 500 }
    );
  }

  const { data: report, error: fetchError } = await supabase
    .from("reports")
    .select("upvotes")
    .eq("id", reportId)
    .single();

  if (fetchError) {
    console.error("Fetch upvote count error:", fetchError);
    return NextResponse.json({ success: true, upvotes: null });
  }

  return NextResponse.json({ success: true, upvotes: report.upvotes });
}

export async function DELETE(request: Request) {
  const sessionId = request.headers.get("x-session-id");
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing x-session-id header" },
      { status: 400 }
    );
  }

  let body: { report_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reportId = body.report_id;
  if (!reportId || typeof reportId !== "string") {
    return NextResponse.json(
      { error: "report_id is required" },
      { status: 400 }
    );
  }

  const cleanSessionId = sanitizeText(sessionId, 200);
  const supabase = createServerClient();

  const { error: deleteError } = await supabase
    .from("upvotes")
    .delete()
    .eq("report_id", reportId)
    .eq("session_id", cleanSessionId);

  if (deleteError) {
    console.error("Upvote delete error:", deleteError);
    return NextResponse.json(
      { error: "Failed to remove upvote" },
      { status: 500 }
    );
  }

  const { data: report, error: fetchError } = await supabase
    .from("reports")
    .select("upvotes")
    .eq("id", reportId)
    .single();

  if (fetchError) {
    console.error("Fetch upvote count error:", fetchError);
    return NextResponse.json({ success: true, upvotes: null });
  }

  return NextResponse.json({ success: true, upvotes: report.upvotes });
}
