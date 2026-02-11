import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { verifyAdminKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get("x-admin-key");
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "pending";

    const supabase = createAdminClient();

    let query = supabase
      .from("disputes")
      .select("id, identifier, reason, evidence_url, business_reg_number, status, created_at, reviewed_at, admin_notes, report_id")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching admin disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}
