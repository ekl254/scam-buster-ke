import { createServerClient } from "@/lib/supabase-server";
import { SCAM_TYPES, type ScamType } from "@/types";
import { BrowseContent, type ScamReport, type PaginationInfo } from "./BrowseContent";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ type?: string; sort?: string }>;
}

export default async function BrowsePage({ searchParams }: PageProps) {
  const { type, sort } = await searchParams;

  const validType =
    type && type in SCAM_TYPES ? (type as ScamType) : undefined;
  const validSort =
    sort === "amount" ? ("amount" as const) : ("recent" as const);

  // Pre-fetch first page server-side to eliminate client-side waterfall
  const supabase = createServerClient();

  let query = supabase
    .from("reports")
    .select(
      "id, identifier, identifier_type, scam_type, description, amount_lost, is_anonymous, created_at, verification_tier, evidence_score, reporter_verified",
      { count: "exact" }
    )
    .eq("status", "approved")
    .or("is_expired.is.null,is_expired.eq.false");

  if (validType) {
    query = query.eq("scam_type", validType);
  }

  if (validSort === "amount") {
    query = query.order("amount_lost", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, count } = await query.range(0, PAGE_SIZE - 1);

  const initialReports: ScamReport[] = (data || []).map((r) => ({
    id: r.id,
    identifier: r.identifier,
    identifier_type: r.identifier_type,
    scam_type: r.scam_type,
    description: r.description,
    amount_lost: r.amount_lost,
    is_anonymous: r.is_anonymous,
    created_at: r.created_at,
    verification_tier: r.verification_tier ?? 1,
    evidence_score: r.evidence_score ?? 0,
    reporter_verified: r.reporter_verified ?? false,
  }));

  const totalCount = count || 0;
  const initialPagination: PaginationInfo = {
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
    hasMore: totalCount > PAGE_SIZE,
  };

  return (
    <BrowseContent
      initialReports={initialReports}
      initialPagination={initialPagination}
      initialType={validType ?? "all"}
      initialSort={validSort}
    />
  );
}
