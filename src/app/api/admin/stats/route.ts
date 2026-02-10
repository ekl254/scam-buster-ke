import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get("x-admin-key");
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    const [
      totalReportsResult,
      scamTypeResult,
      tierResult,
      amountResult,
      lookupsResult,
      disputesResult,
      recentResult,
    ] = await Promise.all([
      supabase.from("reports").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("scam_type"),
      supabase.from("reports").select("verification_tier"),
      supabase.from("reports").select("amount_lost"),
      supabase.from("lookups").select("*", { count: "exact", head: true }),
      supabase.from("disputes").select("*", { count: "exact", head: true }),
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    ]);

    // Aggregate scam type counts
    const scamTypeCounts: Record<string, number> = {};
    if (scamTypeResult.data) {
      for (const row of scamTypeResult.data) {
        const type = row.scam_type as string;
        scamTypeCounts[type] = (scamTypeCounts[type] || 0) + 1;
      }
    }

    // Aggregate verification tier counts
    const tierCounts: Record<number, number> = {};
    if (tierResult.data) {
      for (const row of tierResult.data) {
        const tier = (row.verification_tier as number) || 1;
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      }
    }

    // Sum total amount lost
    let totalAmountLost = 0;
    if (amountResult.data) {
      for (const row of amountResult.data) {
        totalAmountLost += (row.amount_lost as number) || 0;
      }
    }

    return NextResponse.json({
      totalReports: totalReportsResult.count || 0,
      totalAmountLost,
      totalLookups: lookupsResult.count || 0,
      totalDisputes: disputesResult.count || 0,
      recentReports24h: recentResult.count || 0,
      scamTypeCounts,
      tierCounts,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
