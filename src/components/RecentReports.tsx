import { createServerClient } from "@/lib/supabase-server";
import { ScamCard } from "@/components/ScamCard";

export async function RecentReports() {
  let recentScams: Array<{
    id: string;
    identifier: string;
    identifier_type: string;
    scam_type: string;
    description: string;
    amount_lost: number | null;
    is_anonymous: boolean;
    created_at: string;
    verification_tier: number;
    evidence_score: number;
    reporter_verified: boolean;
  }> = [];

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("reports")
      .select(
        "id, identifier, identifier_type, scam_type, description, amount_lost, is_anonymous, created_at, verification_tier, evidence_score, reporter_verified"
      )
      .eq("status", "approved")
      .or("is_expired.is.null,is_expired.eq.false")
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) recentScams = data;
  } catch (error) {
    console.error("Error fetching recent scams:", error);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recentScams.length > 0 ? (
        recentScams.map((scam) => (
          <ScamCard
            key={scam.id}
            id={scam.id}
            identifier={scam.identifier}
            identifierType={scam.identifier_type}
            scamType={
              scam.scam_type as
                | "mpesa"
                | "land"
                | "jobs"
                | "investment"
                | "tender"
                | "online"
                | "romance"
                | "other"
            }
            description={scam.description}
            amountLost={scam.amount_lost || undefined}
            createdAt={scam.created_at}
            isAnonymous={scam.is_anonymous}
            verificationTier={scam.verification_tier as 1 | 2 | 3}
            evidenceScore={scam.evidence_score}
            reporterVerified={scam.reporter_verified}
          />
        ))
      ) : (
        <p className="text-gray-500 col-span-3 text-center py-8">
          No scam reports yet. Be the first to report!
        </p>
      )}
    </div>
  );
}

export function RecentReportsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-gray-200 rounded-lg" />
            <div className="flex gap-2">
              <div className="w-16 h-5 bg-gray-200 rounded-full" />
              <div className="w-20 h-5 bg-gray-200 rounded-full" />
            </div>
          </div>
          <div className="mb-3">
            <div className="w-16 h-4 bg-gray-100 rounded mb-1" />
            <div className="w-36 h-6 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2 mb-4">
            <div className="w-full h-4 bg-gray-100 rounded" />
            <div className="w-full h-4 bg-gray-100 rounded" />
            <div className="w-2/3 h-4 bg-gray-100 rounded" />
          </div>
          <div className="pt-4 border-t border-gray-100/50 flex justify-between">
            <div className="w-20 h-4 bg-gray-200 rounded" />
            <div className="w-16 h-6 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
