import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get("x-admin-key");
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );
    const search = searchParams.get("search") || null;
    const scamType = searchParams.get("type") || null;
    const sortBy = searchParams.get("sort") || "recent";

    const supabase = createServerClient();

    let query = supabase
      .from("reports")
      .select(
        "id, identifier, identifier_type, scam_type, description, amount_lost, upvotes, is_anonymous, created_at, verification_tier, evidence_score, reporter_verified, is_expired, source_url",
        { count: "exact" }
      );

    if (search) {
      query = query.ilike("identifier", `%${search}%`);
    }

    if (scamType) {
      query = query.eq("scam_type", scamType);
    }

    switch (sortBy) {
      case "upvotes":
        query = query.order("upvotes", { ascending: false });
        break;
      case "amount":
        query = query.order("amount_lost", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "recent":
      default:
        query = query.order("created_at", { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching admin reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminKey = request.headers.get("x-admin-key");
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { report_id } = await request.json();

    if (!report_id || typeof report_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid report_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", report_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
