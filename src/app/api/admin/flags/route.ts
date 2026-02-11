import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { verifyAdminKey } from "@/lib/admin-auth";

// GET /api/admin/flags - List flags
export async function GET(request: NextRequest) {
    try {
        const adminKey = request.headers.get("x-admin-key");
        if (!verifyAdminKey(adminKey)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "pending";
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "20");
        const offset = (page - 1) * pageSize;

        const supabase = createServerClient();

        // Fetch flags with related report data
        const query = supabase
            .from("flags")
            .select(`
        id,
        reason,
        status,
        created_at,
        report:reports (
          id,
          identifier,
          identifier_type,
          scam_type,
          description,
          evidence_url
        )
      `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (status) {
            query.eq("status", status);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return NextResponse.json({
            data,
            pagination: {
                page,
                pageSize,
                totalItems: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize),
            },
        });
    } catch (error) {
        console.error("Error fetching flags:", error);
        return NextResponse.json(
            { error: "Failed to fetch flags" },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/flags - Update flag status
export async function PATCH(request: NextRequest) {
    try {
        const adminKey = request.headers.get("x-admin-key");
        if (!verifyAdminKey(adminKey)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { flag_id, status } = await request.json();

        if (!flag_id || !["pending", "resolved", "dismissed"].includes(status)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        const supabase = createServerClient();
        const { error } = await supabase
            .from("flags")
            .update({ status })
            .eq("id", flag_id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating flag:", error);
        return NextResponse.json(
            { error: "Failed to update flag" },
            { status: 500 }
        );
    }
}
