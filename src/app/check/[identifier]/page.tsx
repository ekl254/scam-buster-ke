import { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { calculateCommunityAssessment } from "@/lib/verification";
import { formatKES } from "@/lib/utils";
import { ScamCard } from "@/components/ScamCard";
import { ShareButtons } from "@/components/ShareButtons";
import {
  CONCERN_LEVELS,
  IDENTIFIER_TYPES,
  type ScamReport,
  type ScamType,
  type VerificationTier,
  type ConcernLevel,
  type IdentifierType,
} from "@/types";

interface PageProps {
  params: Promise<{ identifier: string }>;
}

// --- Data fetching ---

async function getReportsForIdentifier(identifier: string) {
  const supabase = createServerClient();

  // Log lookup for analytics (non-blocking, fire-and-forget)
  supabase
    .from("lookups")
    .insert({ identifier, found_reports_count: 0 })
    .select()
    .then(() => {});

  const { data: reports, count } = await supabase
    .from("reports")
    .select(
      "id, identifier, identifier_type, scam_type, description, amount_lost, upvotes, is_anonymous, created_at, verification_tier, evidence_score, reporter_verified, is_expired, source_url",
      { count: "exact" }
    )
    .ilike("identifier", `%${identifier}%`)
    .or("is_expired.is.null,is_expired.eq.false")
    .order("verification_tier", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: disputes } = await supabase
    .from("disputes")
    .select("id")
    .ilike("identifier", `%${identifier}%`)
    .in("status", ["pending", "under_review"]);

  return {
    reports: (reports || []) as Array<{
      id: string;
      identifier: string;
      identifier_type: string;
      scam_type: string;
      description: string;
      amount_lost: number | null;
      is_anonymous: boolean;
      created_at: string;
      verification_tier: number | null;
      evidence_score: number | null;
      reporter_verified: boolean | null;
      is_expired: boolean | null;
      source_url: string | null;
    }>,
    totalCount: count || 0,
    hasDisputes: (disputes?.length || 0) > 0,
  };
}

// --- Dynamic metadata for SEO ---

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { identifier } = await params;
  const decoded = decodeURIComponent(identifier);
  const { reports, totalCount } = await getReportsForIdentifier(decoded);

  const hasReports = totalCount > 0;
  const totalLost = reports.reduce((sum, r) => sum + (r.amount_lost || 0), 0);

  const title = hasReports
    ? `Is ${decoded} a scam? ${totalCount} report${totalCount !== 1 ? "s" : ""} found - ScamBusterKE`
    : `Is ${decoded} a scam? Check on ScamBusterKE`;

  const description = hasReports
    ? `${decoded} has ${totalCount} scam report${totalCount !== 1 ? "s" : ""} on ScamBusterKE${totalLost > 0 ? ` with ${formatKES(totalLost)} total reported losses` : ""}. Check community reports before transacting.`
    : `Check if ${decoded} has been reported as a scam on ScamBusterKE. No reports found yet — search to verify before you transact.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_KE",
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: "ScamBusterKE - Protect Yourself from Scams in Kenya",
        },
      ],
    },
    alternates: {
      canonical: `/check/${encodeURIComponent(decoded)}`,
    },
  };
}

// --- Concern level styles ---

const concernBg: Record<ConcernLevel, string> = {
  no_reports: "bg-green-50",
  low: "bg-blue-50",
  moderate: "bg-yellow-50",
  high: "bg-orange-50",
  severe: "bg-red-50",
};

const concernText: Record<ConcernLevel, string> = {
  no_reports: "text-green-800",
  low: "text-blue-800",
  moderate: "text-yellow-800",
  high: "text-orange-800",
  severe: "text-red-800",
};

const concernSubtext: Record<ConcernLevel, string> = {
  no_reports: "text-green-600",
  low: "text-blue-600",
  moderate: "text-yellow-600",
  high: "text-orange-600",
  severe: "text-red-600",
};

const concernBadgeBg: Record<ConcernLevel, string> = {
  no_reports: "bg-green-50 text-green-800",
  low: "bg-blue-50 text-blue-800",
  moderate: "bg-yellow-50 text-yellow-800",
  high: "bg-orange-50 text-orange-800",
  severe: "bg-red-50 text-red-800",
};

// --- Page component ---

export default async function CheckIdentifierPage({ params }: PageProps) {
  const { identifier } = await params;
  const decoded = decodeURIComponent(identifier);

  const { reports: rawReports, totalCount, hasDisputes } = await getReportsForIdentifier(decoded);

  // Convert to ScamReport for assessment calculation
  const reports: ScamReport[] = rawReports.map((r) => ({
    id: r.id,
    identifier: r.identifier,
    identifier_type: r.identifier_type as IdentifierType,
    scam_type: r.scam_type as ScamType,
    description: r.description,
    amount_lost: r.amount_lost || undefined,
    is_anonymous: r.is_anonymous,
    created_at: r.created_at,
    status: "pending" as const,
    verification_tier: (r.verification_tier || 1) as VerificationTier,
    evidence_score: r.evidence_score || 0,
    reporter_verified: r.reporter_verified || false,
    is_expired: r.is_expired || false,
    source_url: r.source_url || undefined,
  }));

  const assessment = calculateCommunityAssessment(reports, hasDisputes);
  const concernInfo = CONCERN_LEVELS[assessment.concern_level];

  // Determine the most common identifier type
  const identifierType = rawReports.length > 0
    ? rawReports[0].identifier_type
    : "phone";
  const identifierLabel = IDENTIFIER_TYPES[identifierType as IdentifierType]?.label || "Identifier";

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/browse" className="hover:text-green-600">Reports</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{decoded}</span>
        </nav>

        {/* Main heading — this is what Google shows */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Is <span className="font-mono text-gray-700">{decoded}</span> a scam?
        </h1>
        <p className="text-gray-500 mb-8">
          {identifierLabel} checked against {totalCount.toLocaleString()} community report{totalCount !== 1 ? "s" : ""} on ScamBusterKE
        </p>

        {totalCount > 0 ? (
          <>
            {/* Community Assessment Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 capitalize mb-1">{identifierLabel}</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">{decoded}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg text-center ${concernBadgeBg[assessment.concern_level]}`}>
                  <p className="text-2xl font-bold">{assessment.concern_score}</p>
                  <p className="text-xs font-medium">Concern Score</p>
                </div>
              </div>

              {/* Concern Level */}
              <div className={`flex items-center gap-3 p-4 rounded-lg mb-4 ${concernBg[assessment.concern_level]}`}>
                <div>
                  <p className={`font-medium ${concernText[assessment.concern_level]}`}>
                    {concernInfo.label}
                  </p>
                  <p className={`text-sm ${concernSubtext[assessment.concern_level]}`}>
                    {concernInfo.description}
                  </p>
                </div>
              </div>

              {/* Active Disputes */}
              {hasDisputes && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg mb-4">
                  <p className="text-sm text-purple-800">
                    This identifier has active disputes under review.
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{assessment.total_reports}</p>
                  <p className="text-sm text-gray-500">Total Reports</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{assessment.verified_reports}</p>
                  <p className="text-sm text-gray-500">Verified</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{formatKES(assessment.total_amount_lost)}</p>
                  <p className="text-sm text-gray-500">Total Lost</p>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{assessment.disclaimer}</p>
            </div>

            {/* Actions: Share + Report */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <ShareButtons
                identifier={decoded}
                url={`/check/${encodeURIComponent(decoded)}`}
              />
              <Link
                href={`/report?identifier=${encodeURIComponent(decoded)}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Report This Scam
              </Link>
            </div>

            {/* Reports List */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Community Reports ({totalCount})
            </h2>
            <div className="space-y-4 mb-8">
              {reports.map((report) => (
                <ScamCard
                  key={report.id}
                  id={report.id}
                  identifier={report.identifier}
                  identifierType={report.identifier_type}
                  scamType={report.scam_type}
                  description={report.description}
                  amountLost={report.amount_lost}
                  createdAt={report.created_at}
                  isAnonymous={report.is_anonymous}
                  verificationTier={report.verification_tier}
                  evidenceScore={report.evidence_score}
                  reporterVerified={report.reporter_verified}
                  showReportToo={false}
                />
              ))}
            </div>

            {/* CTA to submit own report */}
            <div className="text-center py-6 bg-white border border-gray-100 rounded-xl">
              <p className="text-sm text-gray-600 mb-3">Were you also affected by this {identifierType}?</p>
              <Link
                href={`/report?identifier=${encodeURIComponent(decoded)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Report Your Experience
              </Link>
            </div>
          </>
        ) : (
          /* No reports found */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Reports Found</h2>
            <p className="text-gray-600 mb-2 max-w-md mx-auto">
              Good news! We don&apos;t have any scam reports for <strong className="font-mono">{decoded}</strong>.
            </p>
            <p className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
              No reports does not guarantee safety. Always verify before transacting.
            </p>
            <div className="flex justify-center mb-6">
              <ShareButtons
                identifier={decoded}
                url={`/check/${encodeURIComponent(decoded)}`}
              />
            </div>
          </div>
        )}

        {/* CTA — always shown */}
        <div className="p-6 bg-gray-50 rounded-xl text-center">
          <p className="text-gray-600 mb-4">
            Have you been scammed by this number/company?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/report?identifier=${encodeURIComponent(decoded)}`}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
            >
              Report This Scam
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(decoded)}`}
              className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-medium transition-colors"
            >
              Search Again
            </Link>
          </div>
        </div>

        {/* Structured data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: `Is ${decoded} a scam? - ScamBusterKE`,
              description: totalCount > 0
                ? `${decoded} has ${totalCount} scam reports on ScamBusterKE.`
                : `No scam reports found for ${decoded} on ScamBusterKE.`,
              url: `https://scambuster.co.ke/check/${encodeURIComponent(decoded)}`,
              mainEntity: {
                "@type": "Thing",
                name: decoded,
                description: totalCount > 0
                  ? `Reported ${totalCount} time${totalCount !== 1 ? "s" : ""} as a potential scam`
                  : "No scam reports found",
              },
            }),
          }}
        />
      </div>
    </div>
  );
}
