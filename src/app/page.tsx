"use client";

import { useState, useEffect } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ScamCard } from "@/components/ScamCard";
import { SCAM_TYPES } from "@/types";
import { useStats } from "@/hooks";
import {
  Shield,
  Users,
  AlertTriangle,
  TrendingUp,
  Smartphone,
  MapPin,
  Briefcase,
  Loader2,
} from "lucide-react";
import Link from "next/link";

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

function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return `KES ${(amount / 1000000).toFixed(1)}M+`;
  } else if (amount >= 1000) {
    return `KES ${(amount / 1000).toFixed(0)}K+`;
  }
  return `KES ${amount.toLocaleString()}`;
}

export default function Home() {
  const { stats, isLoading: statsLoading } = useStats();
  const [recentScams, setRecentScams] = useState<ScamReport[]>([]);
  const [scamsLoading, setScamsLoading] = useState(true);

  // Fetch recent scams (just 3 for homepage)
  useEffect(() => {
    async function fetchRecentScams() {
      try {
        const response = await fetch("/api/reports?page=1&pageSize=3&sort=recent");
        if (response.ok) {
          const data = await response.json();
          setRecentScams(data.data);
        }
      } catch (error) {
        console.error("Error fetching recent scams:", error);
      } finally {
        setScamsLoading(false);
      }
    }

    fetchRecentScams();
  }, []);

  const statsDisplay = [
    {
      label: "Scams Reported",
      value: statsLoading ? "..." : (stats?.totalReports || 0).toLocaleString(),
      icon: AlertTriangle,
    },
    {
      label: "Money Lost (Total)",
      value: statsLoading ? "..." : formatAmount(stats?.totalAmountLost || 0),
      icon: TrendingUp,
    },
    {
      label: "Searches Performed",
      value: statsLoading ? "..." : (stats?.totalLookups || 0).toLocaleString(),
      icon: Users,
    },
  ];

  return (
    <div>
      {/* Organization structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "ScamBusterKE",
            url: "https://scambuster.co.ke",
            description: "Community-driven platform for reporting and verifying scams in Kenya.",
            areaServed: { "@type": "Country", name: "Kenya" },
            sameAs: [],
          }),
        }}
      />
      {/* WebSite structured data for sitelinks search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "ScamBusterKE",
            url: "https://scambuster.co.ke",
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: "https://scambuster.co.ke/search?q={search_term_string}",
              },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Protecting Kenyans from fraud</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Check Before You Pay.
              <br />
              <span className="text-green-200">Report When You&apos;re Played.</span>
            </h1>
            <p className="text-lg md:text-xl text-green-100 mb-10 max-w-2xl mx-auto">
              Verify phone numbers, Paybills, and companies before transacting.
              Join thousands of Kenyans protecting each other from scams.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <SearchBar size="large" />
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white/10 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-3 gap-8">
              {statsDisplay.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="h-5 w-5 text-green-200" />
                    <span className="text-2xl md:text-3xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-green-200 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Common Scam Types */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Common Scam Types in Kenya
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Learn to recognize these common scams targeting Kenyans
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(SCAM_TYPES).slice(0, 4).map(([key, scam]) => (
              <Link
                key={key}
                href={`/browse?type=${key}`}
                className="group p-6 bg-gray-50 rounded-xl hover:bg-green-50 transition-colors text-center"
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-100 transition-colors">
                  {key === "mpesa" && <Smartphone className="h-6 w-6 text-green-600" />}
                  {key === "land" && <MapPin className="h-6 w-6 text-blue-600" />}
                  {key === "jobs" && <Briefcase className="h-6 w-6 text-purple-600" />}
                  {key === "investment" && <TrendingUp className="h-6 w-6 text-orange-600" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{scam.label}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{scam.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Reports */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Recent Scam Reports
              </h2>
              <p className="text-gray-600">
                Latest reports from the community
              </p>
            </div>
            <Link
              href="/browse"
              className="hidden md:inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
            >
              View all reports
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {scamsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentScams.length > 0 ? (
                recentScams.map((scam) => (
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
                ))
              ) : (
                <p className="text-gray-500 col-span-3 text-center py-8">
                  No scam reports yet. Be the first to report!
                </p>
              )}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
            >
              View all reports
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Been Scammed? Report It.
            </h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Your report could save someone else from losing their hard-earned
              money. Together, we can make Kenya safer.
            </p>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors"
            >
              <AlertTriangle className="h-5 w-5" />
              Report a Scam
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
