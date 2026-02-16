import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

const BUCKET = "evidence";
const SIGNED_URL_EXPIRY = 3600; // 1 hour

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    // Prevent path traversal and restrict to uploads directory
    if (path.includes("..") || !path.startsWith("uploads/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_EXPIRY);

    if (error) {
      console.error("Signed URL error:", error);
      return NextResponse.json(
        { error: "Failed to generate URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error("Evidence URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate URL" },
      { status: 500 }
    );
  }
}
