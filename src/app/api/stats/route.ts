import { NextResponse } from "next/server";
import { createServerClient, type StatsResponse } from "@/lib/supabase-server";

// Cache stats for 60 seconds to reduce database load
export const revalidate = 60;

export async function GET() {
  try {
    const supabase = createServerClient();

    // First try to get from stats table (fast)
    const { data: statsData, error: statsError } = await supabase
      .from("stats")
      .select("*")
      .eq("id", "global")
      .single();

    if (statsData && !statsError) {
      const response: StatsResponse = {
        totalReports: statsData.total_reports,
        totalAmountLost: statsData.total_amount_lost,
        totalLookups: statsData.total_lookups,
        updatedAt: statsData.updated_at,
      };

      return NextResponse.json(response, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    }

    // Fallback: Calculate stats directly (slower, for initial setup)
    const { count, error: countError } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true });

    const { data: sumData, error: sumError } = await supabase
      .from("reports")
      .select("amount_lost");

    if (countError || sumError) {
      throw new Error("Failed to fetch stats");
    }

    const totalAmountLost = sumData?.reduce((sum, r) => sum + (r.amount_lost || 0), 0) || 0;

    const response: StatsResponse = {
      totalReports: count || 0,
      totalAmountLost,
      totalLookups: 0,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
