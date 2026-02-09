import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase-server";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://scambuster.co.ke";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/browse`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/report`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/dispute`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/scam-types`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/how-to-protect`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Fetch all unique identifiers that have reports
  try {
    const supabase = createServerClient();
    const { data: reports } = await supabase
      .from("reports")
      .select("identifier, created_at")
      .or("is_expired.is.null,is_expired.eq.false")
      .order("created_at", { ascending: false });

    if (reports && reports.length > 0) {
      // Deduplicate by identifier (case-insensitive), keep most recent date
      const identifierMap = new Map<string, string>();
      for (const r of reports) {
        const key = r.identifier.toLowerCase();
        if (!identifierMap.has(key)) {
          identifierMap.set(key, r.created_at);
        }
      }

      const checkPages: MetadataRoute.Sitemap = Array.from(identifierMap.entries()).map(
        ([identifier, lastModified]) => ({
          url: `${BASE_URL}/check/${encodeURIComponent(identifier)}`,
          lastModified: new Date(lastModified),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })
      );

      return [...staticPages, ...checkPages];
    }
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }

  return staticPages;
}
