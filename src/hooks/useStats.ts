"use client";

import { useState, useEffect } from "react";

interface Stats {
  totalReports: number;
  totalAmountLost: number;
  totalLookups: number;
  updatedAt: string;
}

interface UseStatsResult {
  stats: Stats | null;
  isLoading: boolean;
  error: string | null;
}

const POLL_INTERVAL = 30_000; // 30 seconds

export function useStats(): UseStatsResult {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchStats() {
      try {
        const response = await fetch("/api/stats");

        if (!response.ok) {
          throw new Error("Failed to fetch stats");
        }

        const data = await response.json();
        if (mounted) setStats(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { stats, isLoading, error };
}
