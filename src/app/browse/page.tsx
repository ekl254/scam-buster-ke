"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ScamCard } from "@/components/ScamCard";
import { SearchBar } from "@/components/SearchBar";
import { SCAM_TYPES, type ScamType } from "@/types";
import { useInfiniteScroll } from "@/hooks";
import { cn } from "@/lib/utils";
import { Filter, SlidersHorizontal, Loader2 } from "lucide-react";

interface ScamReport {
  id: string;
  identifier: string;
  identifier_type: string;
  scam_type: string;
  description: string;
  amount_lost: number | null;
  upvotes: number;
  is_anonymous: boolean;
  created_at: string;
  verification_tier: number;
  evidence_score: number;
  reporter_verified: boolean;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

function BrowseContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") as ScamType | null;

  const [selectedType, setSelectedType] = useState<ScamType | "all">(initialType || "all");
  const [sortBy, setSortBy] = useState<"recent" | "upvotes" | "amount">("recent");
  const [scams, setScams] = useState<ScamReport[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchScams = useCallback(
    async (page: number, append: boolean = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
          sort: sortBy,
        });

        if (selectedType !== "all") {
          params.set("type", selectedType);
        }

        const response = await fetch(`/api/reports?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }

        const data = await response.json();

        if (append) {
          setScams((prev) => [...prev, ...data.data]);
        } else {
          setScams(data.data);
        }

        setPagination(data.pagination);
      } catch (error) {
        console.error("Error fetching scams:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedType, sortBy]
  );

  // Fetch when filters change
  useEffect(() => {
    fetchScams(1, false);
  }, [fetchScams]);

  const loadMore = useCallback(() => {
    if (pagination?.hasMore && !isLoadingMore) {
      fetchScams(pagination.page + 1, true);
    }
  }, [pagination, isLoadingMore, fetchScams]);

  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: pagination?.hasMore || false,
    isLoading: isLoadingMore,
  });

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Scam Reports
          </h1>
          <p className="text-gray-600">
            Search and filter through community-reported scams
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <SearchBar />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Type Filter */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by type</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType("all")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  selectedType === "all"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                All
              </button>
              {Object.entries(SCAM_TYPES).map(([key, scam]) => (
                <button
                  key={key}
                  onClick={() => setSelectedType(key as ScamType)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    selectedType === key
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {scam.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="sm:w-48">
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Sort by</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white text-gray-900"
            >
              <option value="recent">Most Recent</option>
              <option value="upvotes">Most Upvoted</option>
              <option value="amount">Highest Amount Lost</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-sm text-gray-500 mb-4">
          {isLoading
            ? "Loading..."
            : `Showing ${scams.length} of ${pagination?.totalCount || 0} reports`}
        </p>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : (
          <>
            {/* Scam Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scams.map((scam) => (
                <ScamCard
                  key={scam.id}
                  id={scam.id}
                  identifier={scam.identifier}
                  identifierType={scam.identifier_type}
                  scamType={scam.scam_type as "mpesa" | "land" | "jobs" | "investment" | "tender" | "online" | "romance" | "other"}
                  description={scam.description}
                  amountLost={scam.amount_lost || undefined}
                  createdAt={scam.created_at}
                  upvotes={scam.upvotes}
                  isAnonymous={scam.is_anonymous}
                  verificationTier={scam.verification_tier as 1 | 2 | 3}
                  evidenceScore={scam.evidence_score}
                  reporterVerified={scam.reporter_verified}
                />
              ))}
            </div>

            {scams.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No scams found matching your criteria.</p>
              </div>
            )}

            {/* Infinite scroll trigger */}
            {pagination?.hasMore && (
              <div
                ref={loadMoreRef}
                className="flex items-center justify-center py-8"
              >
                {isLoadingMore && (
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                )}
              </div>
            )}

            {/* End of results message */}
            {!pagination?.hasMore && scams.length > 0 && (
              <p className="text-center text-gray-400 text-sm py-8">
                You&apos;ve reached the end of the results
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="h-12 bg-gray-200 rounded mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
