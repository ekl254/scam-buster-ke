"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

interface UsePaginatedDataOptions<T> {
  fetchUrl: string;
  pageSize?: number;
  initialData?: T[];
}

interface UsePaginatedDataResult<T> {
  data: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  loadMore: () => void;
  refresh: () => void;
}

export function usePaginatedData<T>({
  fetchUrl,
  pageSize = 20,
  initialData = [],
}: UsePaginatedDataOptions<T>): UsePaginatedDataResult<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (page: number, append: boolean = false) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const url = new URL(fetchUrl, window.location.origin);
        url.searchParams.set("page", String(page));
        url.searchParams.set("pageSize", String(pageSize));

        const response = await fetch(url.toString(), {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        const result = await response.json();

        if (append) {
          setData((prev) => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }

        setPagination(result.pagination);
        setCurrentPage(page);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Ignore abort errors
        }
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [fetchUrl, pageSize]
  );

  // Initial fetch
  useEffect(() => {
    fetchData(1, false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const loadMore = useCallback(() => {
    if (pagination?.hasMore && !isLoadingMore) {
      fetchData(currentPage + 1, true);
    }
  }, [pagination, isLoadingMore, currentPage, fetchData]);

  const refresh = useCallback(() => {
    setData([]);
    setCurrentPage(1);
    fetchData(1, false);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isLoadingMore,
    error,
    pagination,
    loadMore,
    refresh,
  };
}
