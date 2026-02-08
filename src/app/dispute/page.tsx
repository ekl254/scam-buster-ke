"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Scale,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Phone,
  Upload,
  Building,
  Info,
} from "lucide-react";

function DisputeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [identifier, setIdentifier] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [businessRegNumber, setBusinessRegNumber] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Pre-fill from URL params
  useEffect(() => {
    const urlIdentifier = searchParams.get("identifier");
    const urlReportId = searchParams.get("report_id");
    if (urlIdentifier) setIdentifier(urlIdentifier);
    if (urlReportId) setReportId(urlReportId);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          report_id: reportId,
          reason: reason.trim(),
          evidence_url: evidenceUrl.trim() || null,
          business_reg_number: businessRegNumber.trim() || null,
          contact_phone: contactPhone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit dispute");
      }

      setIsSuccess(true);

      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit dispute");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Dispute Submitted
          </h2>
          <p className="text-gray-600 mb-4">
            We will review your dispute within 48-72 hours. You will be contacted if we need additional information.
          </p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scale className="h-7 w-7 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dispute a Report
          </h1>
          <p className="text-gray-600">
            If you believe a report about you or your business is false, you can submit a dispute for review.
          </p>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800 font-medium mb-1">Before you dispute</p>
            <p className="text-sm text-yellow-700">
              Only dispute if the report is genuinely false. False dispute claims may result in your account being flagged.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          {/* Identifier */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Identifier Being Disputed *
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Phone number, Paybill, Company name"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
              required
            />
          </div>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Dispute *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this report is false. Be specific and provide details. (Minimum 20 characters)"
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 bg-white"
              required
              minLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/20 characters minimum
            </p>
          </div>

          {/* Evidence URL */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence URL (optional)
            </label>
            <div className="relative">
              <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://... Link to supporting evidence"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              E.g., proof of legitimate business, resolved transaction, etc.
            </p>
          </div>

          {/* Business Registration */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Registration Number (optional)
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={businessRegNumber}
                onChange={(e) => setBusinessRegNumber(e.target.value)}
                placeholder="PVT-XXXXXX or BN-XXXXXX"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              If disputing on behalf of a registered business
            </p>
          </div>

          {/* Contact Phone */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Contact Phone *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="0712345678"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              We may contact you for additional verification
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mb-6 p-3 bg-blue-50 rounded-lg flex gap-2">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              By submitting, you confirm the information provided is accurate. False disputes may affect your credibility.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || reason.length < 20 || !contactPhone.trim()}
            className={cn(
              "w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
              isSubmitting || reason.length < 20 || !contactPhone.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Dispute"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DisputePage() {
  return (
    <Suspense
      fallback={
        <div className="py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-14 w-14 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-10"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      }
    >
      <DisputeForm />
    </Suspense>
  );
}
