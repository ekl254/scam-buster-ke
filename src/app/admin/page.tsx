"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  SCAM_TYPES,
  IDENTIFIER_TYPES,
  type ScamType,
  type IdentifierType,
} from "@/types";
import { formatKES, getRelativeTime } from "@/lib/utils";
import { formatKenyanPhone } from "@/lib/verification";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Link,
  Trash2,
  Send,
  LogIn,
  Shield,
  BarChart3,
  Database,
  PlusCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Scale,
  XCircle,
  Eye,
  AlertTriangle,
  X,
  ZoomIn,
} from "lucide-react";

type Tab = "dashboard" | "reports" | "disputes" | "add" | "extract" | "flags";

interface ExtractedReport {
  identifier: string;
  identifier_type: IdentifierType;
  scam_type: ScamType;
  description: string;
  amount_lost: number;
  source_url: string;
}

interface AdminStats {
  totalReports: number;
  totalAmountLost: number;
  totalLookups: number;
  totalDisputes: number;
  recentReports24h: number;
  scamTypeCounts: Record<string, number>;
  tierCounts: Record<string, number>;
}

interface AdminReport {
  id: string;
  identifier: string;
  identifier_type: IdentifierType;
  scam_type: ScamType;
  description: string;
  amount_lost: number | null;
  verification_tier: number;
  evidence_url: string | null;
  status: string;
  created_at: string;
}

interface AdminDispute {
  id: string;
  identifier: string;
  reason: string;
  evidence_url: string | null;
  business_reg_number: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
}

interface AdminFlag {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  report: {
    id: string;
    identifier: string;
    identifier_type: IdentifierType;
    scam_type: ScamType;
    description: string;
    evidence_url?: string | null;
  } | null;
}

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "reports", label: "Reports", icon: Database },
  { key: "flags", label: "Flags", icon: AlertTriangle },
  { key: "disputes", label: "Disputes", icon: Scale },
  { key: "add", label: "Add Report", icon: PlusCircle },
  { key: "extract", label: "Extract", icon: Link },
];

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Dashboard state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  // Reports tab state
  const [reportsList, setReportsList] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [reportsSearch, setReportsSearch] = useState("");
  const [reportsScamFilter, setReportsScamFilter] = useState("");
  const [reportsStatusFilter, setReportsStatusFilter] = useState("pending");

  // Add report tab state
  const [addForm, setAddForm] = useState({
    identifier: "",
    identifier_type: "phone" as IdentifierType,
    scam_type: "mpesa" as ScamType,
    description: "",
    amount_lost: "",
    evidence_url: "",
    source_url: "",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState("");
  const [addError, setAddError] = useState("");

  // Disputes tab state
  const [disputesList, setDisputesList] = useState<AdminDispute[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesError, setDisputesError] = useState("");
  const [disputesFilter, setDisputesFilter] = useState("pending");
  const [reviewingDispute, setReviewingDispute] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // Extract tab state
  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractedReports, setExtractedReports] = useState<ExtractedReport[]>([]);
  const [articleInfo, setArticleInfo] = useState("");
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState<Record<number, string>>({});

  // Flags tab state
  const [flagsList, setFlagsList] = useState<AdminFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagsError, setFlagsError] = useState("");
  const [flagsFilter, setFlagsFilter] = useState("pending");

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Abort controller for fetch deduplication
  const reportsFetchRef = useRef<AbortController | null>(null);

  // Auth
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthed(true);
      } else {
        setAuthError("Invalid admin key");
      }
    } catch {
      setAuthError("Authentication failed");
    }
  }

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      if (!res.ok) {
        setStatsError(data.error || "Failed to load stats");
        return;
      }
      setStats(data);
    } catch {
      setStatsError("Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  }, [adminKey]);

  // Fetch reports list (aborts stale in-flight requests)
  const fetchReports = useCallback(async () => {
    // Cancel any in-flight request to prevent stale data
    if (reportsFetchRef.current) {
      reportsFetchRef.current.abort();
    }
    const controller = new AbortController();
    reportsFetchRef.current = controller;

    setReportsLoading(true);
    setReportsError("");
    try {
      const params = new URLSearchParams({
        page: String(reportsPage),
        pageSize: "20",
      });
      if (reportsSearch) params.set("search", reportsSearch);
      if (reportsScamFilter) params.set("type", reportsScamFilter);
      if (reportsStatusFilter) params.set("status", reportsStatusFilter);

      const res = await fetch(`/api/admin/reports?${params}`, {
        headers: { "x-admin-key": adminKey },
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setReportsError(data.error || "Failed to load reports");
        return;
      }
      setReportsList(data.data || []);
      setReportsTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setReportsError("Failed to load reports");
    } finally {
      if (!controller.signal.aborted) {
        setReportsLoading(false);
      }
    }
  }, [adminKey, reportsPage, reportsSearch, reportsScamFilter, reportsStatusFilter]);

  // Fetch disputes
  const fetchDisputes = useCallback(async () => {
    setDisputesLoading(true);
    setDisputesError("");
    try {
      const res = await fetch(`/api/admin/disputes?status=${disputesFilter}`, {
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      if (!res.ok) {
        setDisputesError(data.error || "Failed to load disputes");
        return;
      }
      setDisputesList(data.data || []);
    } catch {
      setDisputesError("Failed to load disputes");
    } finally {
      setDisputesLoading(false);
    }
  }, [adminKey, disputesFilter]);

  // Fetch flags
  const fetchFlags = useCallback(async () => {
    setFlagsLoading(true);
    setFlagsError("");
    try {
      const res = await fetch(`/api/admin/flags?status=${flagsFilter}`, {
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      if (!res.ok) {
        setFlagsError(data.error || "Failed to load flags");
        return;
      }
      setFlagsList(data.data || []);
    } catch {
      setFlagsError("Failed to load flags");
    } finally {
      setFlagsLoading(false);
    }
  }, [adminKey, flagsFilter]);

  // Moderate flag (dismiss/resolve)
  async function handleModerateFlag(flagId: string, status: "resolved" | "dismissed") {
    try {
      const res = await fetch("/api/admin/flags", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ flag_id: flagId, status }),
      });
      if (res.ok) {
        fetchFlags();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update flag");
      }
    } catch {
      alert("Failed to update flag");
    }
  }

  // Load data when tab changes
  useEffect(() => {
    if (!isAuthed) return;
    if (activeTab === "dashboard") fetchStats();
    if (activeTab === "reports") fetchReports();
    if (activeTab === "disputes") fetchDisputes();
    if (activeTab === "flags") fetchFlags();
  }, [isAuthed, activeTab, fetchStats, fetchReports, fetchDisputes, fetchFlags]);

  // Delete report
  async function handleDeleteReport(reportId: string) {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      const res = await fetch("/api/admin/reports", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ report_id: reportId }),
      });
      if (res.ok) {
        fetchReports();
      } else {
        const data = await res.json();
        alert(data.error || "Delete failed");
      }
    } catch {
      alert("Delete failed");
    }
  }

  // Approve or reject report
  async function handleModerateReport(reportId: string, status: "approved" | "rejected") {
    // Optimistic update: remove from list if current filter doesn't match new status
    if (reportsStatusFilter && reportsStatusFilter !== status) {
      setReportsList((prev) => prev.filter((r) => r.id !== reportId));
    } else {
      // Update status in-place
      setReportsList((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
    }

    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ report_id: reportId, status }),
      });
      if (res.ok) {
        fetchReports();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update report");
        // Revert on failure
        fetchReports();
      }
    } catch {
      alert("Failed to update report");
      fetchReports();
    }
  }

  // Review dispute (uphold or reject)
  async function handleReviewDispute(disputeId: string, status: "upheld" | "rejected") {
    try {
      const res = await fetch("/api/disputes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          dispute_id: disputeId,
          status,
          admin_notes: adminNotes || undefined,
        }),
      });
      if (res.ok) {
        setReviewingDispute(null);
        setAdminNotes("");
        fetchDisputes();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update dispute");
      }
    } catch {
      alert("Failed to update dispute");
    }
  }

  // Add report submit
  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddSuccess("");
    setAddError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          identifier: addForm.identifier,
          identifier_type: addForm.identifier_type,
          scam_type: addForm.scam_type,
          description: addForm.description,
          amount_lost: addForm.amount_lost ? parseInt(addForm.amount_lost) : undefined,
          evidence_url: addForm.evidence_url || undefined,
          source_url: addForm.source_url || undefined,
          is_anonymous: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to submit report");
        return;
      }
      setAddSuccess(`Report created! ID: ${data.data?.id || "ok"}`);
      setAddForm({
        identifier: "",
        identifier_type: "phone",
        scam_type: "mpesa",
        description: "",
        amount_lost: "",
        evidence_url: "",
        source_url: "",
      });
    } catch {
      setAddError("Failed to submit report");
    } finally {
      setAddSubmitting(false);
    }
  }

  // Extract from URL
  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setExtractError("");
    setExtractedReports([]);
    setArticleInfo("");
    setSubmitted({});
    setIsExtracting(true);

    try {
      const res = await fetch("/api/admin/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setExtractError(data.error || "Extraction failed");
        return;
      }

      setExtractedReports(data.data || []);
      setArticleInfo(data.message);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  }

  // Edit extracted report field
  function updateReport(index: number, field: keyof ExtractedReport, value: string | number) {
    setExtractedReports((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  // Remove extracted report
  function removeReport(index: number) {
    setExtractedReports((prev) => prev.filter((_, i) => i !== index));
  }

  // Submit a single extracted report
  async function handleSubmitExtracted(index: number) {
    const report = extractedReports[index];
    setSubmitting((prev) => ({ ...prev, [index]: true }));

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          identifier: report.identifier,
          identifier_type: report.identifier_type,
          scam_type: report.scam_type,
          description: report.description,
          amount_lost: report.amount_lost,
          source_url: report.source_url,
          is_anonymous: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitted((prev) => ({ ...prev, [index]: `Error: ${data.error}` }));
        return;
      }

      setSubmitted((prev) => ({
        ...prev,
        [index]: `Submitted! ID: ${data.data?.id || "ok"}`,
      }));
    } catch (err) {
      setSubmitted((prev) => ({
        ...prev,
        [index]: `Error: ${err instanceof Error ? err.message : "Failed"}`,
      }));
    } finally {
      setSubmitting((prev) => ({ ...prev, [index]: false }));
    }
  }

  // Submit all extracted reports
  async function handleSubmitAll() {
    for (let i = 0; i < extractedReports.length; i++) {
      if (!submitted[i]) {
        await handleSubmitExtracted(i);
      }
    }
  }

  // Tier badge color
  function tierBadge(tier: number) {
    if (tier === 3) return "bg-red-900/50 text-red-300 border border-red-700";
    if (tier === 2) return "bg-yellow-900/50 text-yellow-300 border border-yellow-700";
    return "bg-gray-800 text-gray-400 border border-gray-700";
  }

  function tierLabel(tier: number) {
    if (tier === 3) return "Verified";
    if (tier === 2) return "Corroborated";
    return "Unverified";
  }

  // Login screen
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4">
          <div className="text-center mb-6">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white">ScamBusterKE Admin</h1>
            <p className="text-gray-400 text-sm mt-1">Enter admin key to continue</p>
          </div>

          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Admin API key"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            required
          />

          {authError && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> {authError}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <LogIn className="w-4 h-4" /> Login
          </button>
        </form>
      </div>
    );
  }

  // Main admin dashboard
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            <span className="font-bold text-lg">ScamBusterKE Admin</span>
          </div>
          <button
            onClick={() => { setIsAuthed(false); setAdminKey(""); }}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Tab 1: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Dashboard</h2>
              <button
                onClick={fetchStats}
                disabled={statsLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-900 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${statsLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {statsError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {statsError}
              </div>
            )}

            {statsLoading && !stats && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}

            {stats && (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total Reports</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalReports.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Amount Lost</p>
                    <p className="text-2xl font-bold mt-1">{formatKES(stats.totalAmountLost)}</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total Searches</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalLookups.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total Disputes</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalDisputes.toLocaleString()}</p>
                  </div>
                </div>

                {/* Scam type breakdown */}
                {stats.scamTypeCounts && Object.keys(stats.scamTypeCounts).length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-800">
                      <h3 className="font-semibold">Scam Type Breakdown</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-left text-xs uppercase tracking-wide">
                          <th className="px-5 py-3">Type</th>
                          <th className="px-5 py-3 text-right">Count</th>
                          <th className="px-5 py-3 text-right">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stats.scamTypeCounts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([scamType, count]) => {
                            const pct = stats.totalReports > 0
                              ? ((count / stats.totalReports) * 100).toFixed(1)
                              : "0";
                            const typeLabel = SCAM_TYPES[scamType as ScamType]?.label || scamType;
                            return (
                              <tr key={scamType} className="border-t border-gray-800 hover:bg-gray-800/50">
                                <td className="px-5 py-3">{typeLabel}</td>
                                <td className="px-5 py-3 text-right font-mono">{count}</td>
                                <td className="px-5 py-3 text-right text-gray-400">{pct}%</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Verification tiers */}
                {stats.tierCounts && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((tier) => (
                      <div key={tier} className={`rounded-lg p-5 border ${tierBadge(tier)}`}>
                        <p className="text-xs uppercase tracking-wide opacity-70">{tierLabel(tier)}</p>
                        <p className="text-2xl font-bold mt-1">{stats.tierCounts[tier] ?? 0}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Reports */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Reports</h2>
              <button
                onClick={fetchReports}
                disabled={reportsLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-900 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${reportsLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "pending", label: "Pending Review" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "", label: "All" },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setReportsStatusFilter(s.value);
                    setReportsPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${reportsStatusFilter === s.value
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={reportsSearch}
                  onChange={(e) => {
                    setReportsSearch(e.target.value);
                    setReportsPage(1);
                  }}
                  placeholder="Search by identifier..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <select
                value={reportsScamFilter}
                onChange={(e) => {
                  setReportsScamFilter(e.target.value);
                  setReportsPage(1);
                }}
                className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
              >
                <option value="">All Scam Types</option>
                {Object.entries(SCAM_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            {reportsError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {reportsError}
              </div>
            )}

            {reportsLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}

            {!reportsLoading && reportsList.length === 0 && (
              <div className="text-center py-16 text-gray-500">No reports found.</div>
            )}

            {!reportsLoading && reportsList.length > 0 && (
              <div className="space-y-4">
                {reportsList.map((report) => (
                  <div key={report.id} className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-sm text-white">
                            {report.identifier_type === "phone" ? formatKenyanPhone(report.identifier) : report.identifier}
                          </p>
                          <span className="text-xs text-gray-500">
                            {IDENTIFIER_TYPES[report.identifier_type]?.label || report.identifier_type}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tierBadge(report.verification_tier)}`}>
                            {tierLabel(report.verification_tier)}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${report.status === "approved" ? "bg-green-900/50 text-green-300 border border-green-700" :
                            report.status === "rejected" ? "bg-red-900/50 text-red-300 border border-red-700" :
                              "bg-yellow-900/50 text-yellow-300 border border-yellow-700"
                            }`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {SCAM_TYPES[report.scam_type]?.label || report.scam_type}
                          {report.amount_lost ? ` · ${formatKES(report.amount_lost)}` : ""}
                          {" · "}{getRelativeTime(report.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Description preview */}
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{report.description}</p>

                    {/* Evidence thumbnail */}
                    {report.evidence_url && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setLightboxUrl(report.evidence_url)}
                          className="shrink-0 block w-20 h-20 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 hover:border-gray-500 transition-colors relative group cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={report.evidence_url}
                            alt="Evidence"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-500"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                        <button
                          onClick={() => setLightboxUrl(report.evidence_url)}
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View evidence
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                      {report.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleModerateReport(report.id, "approved")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleModerateReport(report.id, "rejected")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {report.status === "rejected" && (
                        <button
                          onClick={() => handleModerateReport(report.id, "approved")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {report.status === "approved" && (
                        <button
                          onClick={() => handleModerateReport(report.id, "rejected")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-red-400 transition-colors ml-auto"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {reportsTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
                  disabled={reportsPage <= 1}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-sm text-gray-400">
                  Page {reportsPage} of {reportsTotalPages}
                </span>
                <button
                  onClick={() => setReportsPage((p) => Math.min(reportsTotalPages, p + 1))}
                  disabled={reportsPage >= reportsTotalPages}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-800 transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Flags */}
        {activeTab === "flags" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Flags</h2>
              <button
                onClick={fetchFlags}
                disabled={flagsLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-900 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${flagsLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2">
              {[
                { value: "pending", label: "Pending" },
                { value: "resolved", label: "Resolved" },
                { value: "dismissed", label: "Dismissed" },
                { value: "", label: "All" },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setFlagsFilter(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${flagsFilter === s.value
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {flagsError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {flagsError}
              </div>
            )}

            {flagsLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}

            {!flagsLoading && flagsList.length === 0 && (
              <div className="text-center py-16 text-gray-500">No flags found.</div>
            )}

            {!flagsLoading && flagsList.length > 0 && (
              <div className="space-y-4">
                {flagsList.map((flag) => (
                  <div key={flag.id} className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${flag.status === "resolved" ? "bg-green-900/50 text-green-300 border border-green-700" :
                            flag.status === "dismissed" ? "bg-gray-800 text-gray-400 border border-gray-700" :
                              "bg-yellow-900/50 text-yellow-300 border border-yellow-700"
                            }`}>
                            {flag.status}
                          </span>
                          <span className="text-xs text-gray-500">{getRelativeTime(flag.created_at)}</span>
                        </div>
                        <h3 className="font-semibold text-white mb-1">Reason: &quot;{flag.reason}&quot;</h3>

                        {flag.report ? (
                          <div className="bg-gray-950/50 rounded p-3 mt-3 border border-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">
                                {flag.report.identifier_type === "phone" ? formatKenyanPhone(flag.report.identifier) : flag.report.identifier}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({flag.report.scam_type})
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 whitespace-pre-wrap">{flag.report.description}</p>

                            {flag.report.evidence_url && (() => {
                              const imgUrl = flag.report.evidence_url!.startsWith('http') ? flag.report.evidence_url! : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${flag.report.evidence_url}`;
                              return (
                                <div className="mt-3 bg-gray-900 rounded p-2 border border-gray-800 inline-block">
                                  <button
                                    onClick={() => setLightboxUrl(imgUrl)}
                                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 hover:underline group cursor-pointer"
                                  >
                                    <div className="w-8 h-8 rounded bg-gray-800 border border-gray-700 overflow-hidden flex-shrink-0">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={imgUrl}
                                        alt="Evidence"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    View Evidence
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-red-400 italic mt-2">Report has been deleted</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                      {flag.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleModerateFlag(flag.id, "dismissed")}
                            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleModerateFlag(flag.id, "resolved")}
                            className="text-xs px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded border border-blue-800 transition-colors"
                          >
                            Resolve
                          </button>
                        </>
                      )}

                      {flag.report && (
                        <>
                          <a
                            href={`/check/${encodeURIComponent(flag.report.identifier)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View
                          </a>
                          <button
                            onClick={() => handleDeleteReport(flag.report!.id)}
                            className="text-xs px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded border border-red-800 transition-colors flex items-center gap-1 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" /> Delete Report
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Disputes */}
        {activeTab === "disputes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Disputes</h2>
              <button
                onClick={fetchDisputes}
                disabled={disputesLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-900 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${disputesLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Status filter */}
            <div className="flex gap-2">
              {["pending", "under_review", "upheld", "rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => setDisputesFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${disputesFilter === s
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
                    }`}
                >
                  {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>

            {disputesError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {disputesError}
              </div>
            )}

            {disputesLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}

            {!disputesLoading && disputesList.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                No {disputesFilter.replace("_", " ")} disputes.
              </div>
            )}

            {!disputesLoading && disputesList.length > 0 && (
              <div className="space-y-4">
                {disputesList.map((dispute) => (
                  <div key={dispute.id} className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm text-white">
                          {formatKenyanPhone(dispute.identifier)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Submitted {getRelativeTime(dispute.created_at)}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${dispute.status === "pending" ? "bg-yellow-900/50 text-yellow-300 border border-yellow-700" :
                        dispute.status === "under_review" ? "bg-blue-900/50 text-blue-300 border border-blue-700" :
                          dispute.status === "upheld" ? "bg-green-900/50 text-green-300 border border-green-700" :
                            "bg-red-900/50 text-red-300 border border-red-700"
                        }`}>
                        {dispute.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Reason</p>
                      <p className="text-sm text-gray-200">{dispute.reason}</p>
                    </div>

                    {dispute.evidence_url && (
                      <p className="text-xs text-gray-400">
                        Evidence: <a href={dispute.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{dispute.evidence_url}</a>
                      </p>
                    )}

                    {dispute.business_reg_number && (
                      <p className="text-xs text-gray-400">
                        Business Reg: <span className="text-gray-200">{dispute.business_reg_number}</span>
                      </p>
                    )}

                    {dispute.admin_notes && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Admin Notes</p>
                        <p className="text-sm text-gray-200">{dispute.admin_notes}</p>
                      </div>
                    )}

                    {/* Review actions for pending/under_review disputes */}
                    {(dispute.status === "pending" || dispute.status === "under_review") && (
                      <>
                        {reviewingDispute === dispute.id ? (
                          <div className="space-y-3 pt-2 border-t border-gray-800">
                            <textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="Admin notes (optional)..."
                              rows={2}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 resize-y"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReviewDispute(dispute.id, "upheld")}
                                className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" /> Uphold
                              </button>
                              <button
                                onClick={() => handleReviewDispute(dispute.id, "rejected")}
                                className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                <XCircle className="w-4 h-4" /> Reject
                              </button>
                              <button
                                onClick={() => { setReviewingDispute(null); setAdminNotes(""); }}
                                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-gray-800">
                            <button
                              onClick={() => setReviewingDispute(dispute.id)}
                              className="flex items-center gap-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              <Scale className="w-4 h-4" /> Review
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {dispute.reviewed_at && (
                      <p className="text-xs text-gray-500">
                        Reviewed {getRelativeTime(dispute.reviewed_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Add Report */}
        {activeTab === "add" && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-xl font-bold">Add Report</h2>

            {addSuccess && (
              <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-300 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                {addSuccess}
              </div>
            )}

            {addError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {addError}
              </div>
            )}

            <form onSubmit={handleAddReport} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Identifier *</label>
                  <input
                    type="text"
                    value={addForm.identifier}
                    onChange={(e) => setAddForm((f) => ({ ...f, identifier: e.target.value }))}
                    placeholder="e.g. 0712345678"
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Identifier Type</label>
                  <select
                    value={addForm.identifier_type}
                    onChange={(e) => setAddForm((f) => ({ ...f, identifier_type: e.target.value as IdentifierType }))}
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                  >
                    {Object.entries(IDENTIFIER_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Scam Type</label>
                  <select
                    value={addForm.scam_type}
                    onChange={(e) => setAddForm((f) => ({ ...f, scam_type: e.target.value as ScamType }))}
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                  >
                    {Object.entries(SCAM_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount Lost (KES)</label>
                  <input
                    type="number"
                    value={addForm.amount_lost}
                    onChange={(e) => setAddForm((f) => ({ ...f, amount_lost: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Description * (min 20 chars)</label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the scam..."
                  rows={4}
                  minLength={20}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 resize-y"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Evidence URL</label>
                  <input
                    type="url"
                    value={addForm.evidence_url}
                    onChange={(e) => setAddForm((f) => ({ ...f, evidence_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Source URL</label>
                  <input
                    type="url"
                    value={addForm.source_url}
                    onChange={(e) => setAddForm((f) => ({ ...f, source_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addSubmitting}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {addSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                {addSubmitting ? "Submitting..." : "Add Report"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Extract from URL */}
        {activeTab === "extract" && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h2 className="text-xl font-bold">Extract from URL</h2>
              <p className="text-gray-400 text-sm mt-1">
                Paste a news article URL to extract scam reports using AI
              </p>
            </div>

            {/* URL Input */}
            <form onSubmit={handleExtract}>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/scam-article"
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isExtracting}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Extracting...
                    </>
                  ) : (
                    "Extract"
                  )}
                </button>
              </div>
            </form>

            {/* Errors */}
            {extractError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <span>{extractError}</span>
              </div>
            )}

            {/* Article info */}
            {articleInfo && (
              <p className="text-gray-400 text-sm">{articleInfo}</p>
            )}

            {/* Extracted Reports */}
            {extractedReports.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Extracted Reports ({extractedReports.length})
                  </h3>
                  <button
                    onClick={handleSubmitAll}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" /> Submit All
                  </button>
                </div>

                {extractedReports.map((report, i) => (
                  <div
                    key={i}
                    className="p-5 bg-gray-900 border border-gray-800 rounded-lg space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-gray-500 font-mono">
                        Report #{i + 1}
                      </span>
                      <button
                        onClick={() => removeReport(i)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Identifier */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Identifier</label>
                        <input
                          type="text"
                          value={report.identifier}
                          onChange={(e) => updateReport(i, "identifier", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Identifier Type</label>
                        <select
                          value={report.identifier_type}
                          onChange={(e) => updateReport(i, "identifier_type", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                        >
                          {Object.entries(IDENTIFIER_TYPES).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Scam type + amount */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Scam Type</label>
                        <select
                          value={report.scam_type}
                          onChange={(e) => updateReport(i, "scam_type", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                        >
                          {Object.entries(SCAM_TYPES).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Amount Lost (KES)</label>
                        <input
                          type="number"
                          value={report.amount_lost}
                          onChange={(e) => updateReport(i, "amount_lost", parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Description</label>
                      <textarea
                        value={report.description}
                        onChange={(e) => updateReport(i, "description", e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500 resize-y"
                      />
                    </div>

                    {/* Source URL */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Source URL</label>
                      <input
                        type="url"
                        value={report.source_url}
                        onChange={(e) => updateReport(i, "source_url", e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>

                    {/* Submit button / status */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                      {submitted[i] ? (
                        <span
                          className={`text-sm flex items-center gap-1 ${submitted[i].startsWith("Error")
                            ? "text-red-400"
                            : "text-green-400"
                            }`}
                        >
                          {submitted[i].startsWith("Error") ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          {submitted[i]}
                        </span>
                      ) : (
                        <span />
                      )}
                      <button
                        onClick={() => handleSubmitExtracted(i)}
                        disabled={submitting[i] || !!submitted[i]?.startsWith("Submitted")}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        {submitting[i] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Approve & Submit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Evidence (enlarged)"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs rounded-lg transition-colors"
            >
              Open in new tab
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
