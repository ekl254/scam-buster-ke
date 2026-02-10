import { NextResponse } from "next/server";
import { createServerClient, type StatsResponse } from "@/lib/supabase-server";

// Cache stats for 60 seconds to reduce database load
export const revalidate = 60;

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get live counts directly from tables for accuracy
    const [reportsResult, lookupsResult, sumResult] = await Promise.all([
      supabase.from("reports").select("*", { count: "exact", head: true }),
      supabase.from("lookups").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("amount_lost"),
    ]);

    let totalLookups = lookupsResult.count || 0;

    // If lookups count is 0, RLS may be blocking SELECT — fall back to stats table
    if (totalLookups === 0) {
      const { data: statsRow } = await supabase
        .from("stats")
        .select("total_lookups")
        .eq("id", "global")
        .single();
      if (statsRow?.total_lookups) {
        totalLookups = statsRow.total_lookups;
      }
    }

    const totalReports = reportsResult.count || 0;
    const totalAmountLost =
      sumResult.data?.reduce((sum, r) => sum + (r.amount_lost || 0), 0) || 0;

    const response: StatsResponse = {
      totalReports,
      totalAmountLost,
      totalLookups,
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
