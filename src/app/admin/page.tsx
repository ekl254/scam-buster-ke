"use client";

import { useState } from "react";
import {
  SCAM_TYPES,
  IDENTIFIER_TYPES,
  type ScamType,
  type IdentifierType,
} from "@/types";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Link,
  Trash2,
  Send,
  LogIn,
  Shield,
} from "lucide-react";

interface ExtractedReport {
  identifier: string;
  identifier_type: IdentifierType;
  scam_type: ScamType;
  description: string;
  amount_lost: number;
  source_url: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [reports, setReports] = useState<ExtractedReport[]>([]);
  const [articleInfo, setArticleInfo] = useState("");

  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState<Record<number, string>>({});

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

  // Extract
  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setExtractError("");
    setReports([]);
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

      setReports(data.data || []);
      setArticleInfo(data.message);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  }

  // Edit a report field
  function updateReport(index: number, field: keyof ExtractedReport, value: string | number) {
    setReports((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  // Remove a report
  function removeReport(index: number) {
    setReports((prev) => prev.filter((_, i) => i !== index));
  }

  // Submit a single report
  async function handleSubmit(index: number) {
    const report = reports[index];
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

  // Submit all unsubmitted reports
  async function handleSubmitAll() {
    for (let i = 0; i < reports.length; i++) {
      if (!submitted[i]) {
        await handleSubmit(i);
      }
    }
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

  // Main admin page
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin: Extract Reports</h1>
            <p className="text-gray-400 text-sm mt-1">
              Paste a news article URL to extract scam reports using AI
            </p>
          </div>
          <button
            onClick={() => { setIsAuthed(false); setAdminKey(""); }}
            className="text-gray-400 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>

        {/* URL Input */}
        <form onSubmit={handleExtract} className="mb-8">
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
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <span>{extractError}</span>
          </div>
        )}

        {/* Article info */}
        {articleInfo && (
          <p className="mb-4 text-gray-400 text-sm">{articleInfo}</p>
        )}

        {/* Extracted Reports */}
        {reports.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Extracted Reports ({reports.length})
              </h2>
              <button
                onClick={handleSubmitAll}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" /> Submit All
              </button>
            </div>

            {reports.map((report, i) => (
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
                    <label className="block text-xs text-gray-400 mb-1">
                      Identifier
                    </label>
                    <input
                      type="text"
                      value={report.identifier}
                      onChange={(e) => updateReport(i, "identifier", e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Identifier Type
                    </label>
                    <select
                      value={report.identifier_type}
                      onChange={(e) => updateReport(i, "identifier_type", e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                    >
                      {Object.entries(IDENTIFIER_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Scam type + amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Scam Type
                    </label>
                    <select
                      value={report.scam_type}
                      onChange={(e) => updateReport(i, "scam_type", e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                    >
                      {Object.entries(SCAM_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Amount Lost (KES)
                    </label>
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
                  <label className="block text-xs text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={report.description}
                    onChange={(e) => updateReport(i, "description", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-red-500 resize-y"
                  />
                </div>

                {/* Source URL */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Source URL
                  </label>
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
                      className={`text-sm flex items-center gap-1 ${
                        submitted[i].startsWith("Error")
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
                    onClick={() => handleSubmit(i)}
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
    </div>
  );
}
