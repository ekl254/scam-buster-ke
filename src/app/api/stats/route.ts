import { NextResponse } from "next/server";
import { createServerClient, type StatsResponse } from "@/lib/supabase-server";

// Cache stats for 10 seconds to keep homepage numbers fresh
export const revalidate = 10;

export async function GET() {
  try {
    const supabase = createServerClient();

    // Read from the stats table (kept in sync by DB triggers) for efficiency.
    // Fall back to direct counts if the stats row is missing.
    const { data: statsRow } = await supabase
      .from("stats")
      .select("total_reports, total_amount_lost, total_lookups")
      .eq("id", "global")
      .single();

    let totalReports: number;
    let totalAmountLost: number;
    let totalLookups: number;

    if (statsRow) {
      totalReports = statsRow.total_reports || 0;
      totalAmountLost = statsRow.total_amount_lost || 0;
      totalLookups = statsRow.total_lookups || 0;
    } else {
      // Fallback: count rows directly (head-only requests, no row data)
      const [reportsResult, lookupsResult] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("lookups").select("*", { count: "exact", head: true }),
      ]);
      totalReports = reportsResult.count || 0;
      totalLookups = lookupsResult.count || 0;
      totalAmountLost = 0; // Cannot efficiently sum without fetching all rows
    }

    const response: StatsResponse = {
      totalReports,
      totalAmountLost,
      totalLookups,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
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
