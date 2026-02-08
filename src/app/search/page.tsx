"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { ScamCard } from "@/components/ScamCard";
import { useInfiniteScroll } from "@/hooks";
import { cn, formatKES } from "@/lib/utils";
import { CONCERN_LEVELS, type ConcernLevel, type VerificationTier } from "@/types";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XOctagon,
  Loader2,
  Info,
  AlertOctagon,
  Scale,
} from "lucide-react";
import Link from "next/link";

interface Report {
  id: string;
  identifier: string;
  identifier_type: string;
  scam_type: string;
  description: string;
  amount_lost: number | null;
  upvotes: number;
  is_anonymous: boolean;
  created_at: string;
  verification_tier: VerificationTier;
  evidence_score: number;
  reporter_verified: boolean;
}

interface CommunityAssessment {
  concern_level: ConcernLevel;
  concern_score: number;
  total_reports: number;
  verified_reports: number;
  total_amount_lost: number;
  weighted_score: number;
  has_disputes: boolean;
  disclaimer: string;
}

interface SearchResult {
  query: string;
  assessment: CommunityAssessment;
  data: Report[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  disclaimer: string;
}

const concernIcons: Record<ConcernLevel, typeof CheckCircle> = {
  no_reports: CheckCircle,
  low: Info,
  moderate: AlertTriangle,
  high: AlertOctagon,
  severe: XOctagon,
};

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchResults = useCallback(
    async (page: number, append: boolean = false) => {
      if (!query.trim()) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setSearched(true);
      }

      try {
        const params = new URLSearchParams({
          q: query,
          page: String(page),
          pageSize: "20",
        });

        const response = await fetch(`/api/search?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data: SearchResult = await response.json();

        if (append && result) {
          setResult({
            ...data,
            data: [...result.data, ...data.data],
          });
        } else {
          setResult(data);
        }
      } catch (error) {
        console.error("Error searching:", error);
        setResult(null);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query, result]
  );

  // Search when query changes
  useEffect(() => {
    if (query.trim()) {
      fetchResults(1, false);
    } else {
      setResult(null);
      setSearched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const loadMore = useCallback(() => {
    if (result?.pagination.hasMore && !isLoadingMore) {
      fetchResults(result.pagination.page + 1, true);
    }
  }, [result, isLoadingMore, fetchResults]);

  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: result?.pagination.hasMore || false,
    isLoading: isLoadingMore,
  });

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Search Results
            </h1>
            <SearchBar />
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-3 text-gray-600">Searching...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Search Results
          </h1>
          <SearchBar />
        </div>

        {/* Results */}
        {result && result.data.length > 0 ? (
          <div>
            {/* Community Assessment Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 capitalize mb-1">
                    Search Query
                  </p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">
                    {result.query}
                  </p>
                </div>
                <div
                  className={cn(
                    "px-4 py-2 rounded-lg text-center",
                    result.assessment.concern_level === "no_reports" && "bg-green-50 text-green-800",
                    result.assessment.concern_level === "low" && "bg-blue-50 text-blue-800",
                    result.assessment.concern_level === "moderate" && "bg-yellow-50 text-yellow-800",
                    result.assessment.concern_level === "high" && "bg-orange-50 text-orange-800",
                    result.assessment.concern_level === "severe" && "bg-red-50 text-red-800",
                  )}
                >
                  <p className="text-2xl font-bold">{result.assessment.concern_score}</p>
                  <p className="text-xs font-medium">Concern Score</p>
                </div>
              </div>

              {/* Concern Level Status */}
              {(() => {
                const concernInfo = CONCERN_LEVELS[result.assessment.concern_level];
                const ConcernIcon = concernIcons[result.assessment.concern_level];
                return (
                  <div className={cn(
                    "flex items-center gap-3 p-4 rounded-lg mb-4",
                    result.assessment.concern_level === "no_reports" && "bg-green-50",
                    result.assessment.concern_level === "low" && "bg-blue-50",
                    result.assessment.concern_level === "moderate" && "bg-yellow-50",
                    result.assessment.concern_level === "high" && "bg-orange-50",
                    result.assessment.concern_level === "severe" && "bg-red-50",
                  )}>
                    <ConcernIcon className={cn(
                      "h-6 w-6",
                      result.assessment.concern_level === "no_reports" && "text-green-600",
                      result.assessment.concern_level === "low" && "text-blue-600",
                      result.assessment.concern_level === "moderate" && "text-yellow-600",
                      result.assessment.concern_level === "high" && "text-orange-600",
                      result.assessment.concern_level === "severe" && "text-red-600",
                    )} />
                    <div>
                      <p className={cn(
                        "font-medium",
                        result.assessment.concern_level === "no_reports" && "text-green-800",
                        result.assessment.concern_level === "low" && "text-blue-800",
                        result.assessment.concern_level === "moderate" && "text-yellow-800",
                        result.assessment.concern_level === "high" && "text-orange-800",
                        result.assessment.concern_level === "severe" && "text-red-800",
                      )}>
                        {concernInfo.label}
                      </p>
                      <p className={cn(
                        "text-sm",
                        result.assessment.concern_level === "no_reports" && "text-green-600",
                        result.assessment.concern_level === "low" && "text-blue-600",
                        result.assessment.concern_level === "moderate" && "text-yellow-600",
                        result.assessment.concern_level === "high" && "text-orange-600",
                        result.assessment.concern_level === "severe" && "text-red-600",
                      )}>
                        {concernInfo.description}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Active Disputes Warning */}
              {result.assessment.has_disputes && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg mb-4">
                  <Scale className="h-5 w-5 text-purple-600" />
                  <p className="text-sm text-purple-800">
                    This identifier has active disputes under review.
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {result.assessment.total_reports}
                  </p>
                  <p className="text-sm text-gray-500">Total Reports</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {result.assessment.verified_reports}
                  </p>
                  <p className="text-sm text-gray-500">Verified</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {formatKES(result.assessment.total_amount_lost)}
                  </p>
                  <p className="text-sm text-gray-500">Total Lost</p>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg flex gap-2">
              <Info className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">
                {result.disclaimer}
              </p>
            </div>

            {/* Reports */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Community Reports ({result.pagination.totalCount})
              </h2>
              <div className="space-y-4">
                {result.data.map((report) => (
                  <ScamCard
                    key={report.id}
                    id={report.id}
                    identifier={report.identifier}
                    identifierType={report.identifier_type}
                    scamType={report.scam_type as "mpesa" | "land" | "jobs" | "investment" | "tender" | "online" | "romance" | "other"}
                    description={report.description}
                    amountLost={report.amount_lost || undefined}
                    createdAt={report.created_at}
                    upvotes={report.upvotes}
                    isAnonymous={report.is_anonymous}
                    verificationTier={report.verification_tier}
                    evidenceScore={report.evidence_score}
                    reporterVerified={report.reporter_verified}
                  />
                ))}
              </div>

              {/* Infinite scroll trigger */}
              {result.pagination.hasMore && (
                <div
                  ref={loadMoreRef}
                  className="flex items-center justify-center py-8"
                >
                  {isLoadingMore && (
                    <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                  )}
                </div>
              )}
            </div>

            {/* Report CTA */}
            <div className="mt-8 p-6 bg-gray-50 rounded-xl text-center">
              <p className="text-gray-600 mb-4">
                Have you been scammed by this number/company?
              </p>
              <Link
                href={`/report?identifier=${encodeURIComponent(result.query)}`}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
              >
                <AlertTriangle className="h-5 w-5" />
                Add Your Report
              </Link>
            </div>
          </div>
        ) : searched && query ? (
          /* No Results */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Reports Found
            </h2>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Good news! We don&apos;t have any scam reports for &quot;{query}&quot;.
              However, always proceed with caution.
            </p>

            {/* Disclaimer for no results */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg inline-block text-left max-w-md">
              <p className="text-xs text-gray-500">
                No reports does not guarantee safety. Always verify before transacting.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-full font-medium transition-colors"
              >
                Browse All Reports
              </Link>
              <Link
                href={`/report?identifier=${encodeURIComponent(query)}`}
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
              >
                Report This Number
              </Link>
            </div>
          </div>
        ) : (
          /* No Query */
          <div className="text-center py-12">
            <p className="text-gray-500">Enter a phone number, Paybill, or company name to search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-12 bg-gray-200 rounded mb-8"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
