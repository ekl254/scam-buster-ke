"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SCAM_TYPES, IDENTIFIER_TYPES, VERIFICATION_TIERS, type ScamType, type IdentifierType, type VerificationTier } from "@/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Smartphone,
  MapPin,
  Briefcase,
  TrendingUp,
  FileText,
  ShoppingBag,
  Heart,
  AlertCircle,
  Shield,
  Upload,
  Phone,
  Info,
} from "lucide-react";

const iconMap = {
  Smartphone,
  MapPin,
  Briefcase,
  TrendingUp,
  FileText,
  ShoppingBag,
  Heart,
  AlertCircle,
};

function ReportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    verification_tier: VerificationTier;
    evidence_score: number;
    expires_at: string | null;
  } | null>(null);

  // Form state
  const [identifierType, setIdentifierType] = useState<IdentifierType>("phone");
  const [identifier, setIdentifier] = useState("");
  const [scamType, setScamType] = useState<ScamType | null>(null);
  const [description, setDescription] = useState("");
  const [amountLost, setAmountLost] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Evidence upload state
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Phone verification state
  const [reporterPhone, setReporterPhone] = useState("");
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Pre-fill identifier and type from URL params
  useEffect(() => {
    const urlIdentifier = searchParams.get("identifier");
    if (urlIdentifier) {
      setIdentifier(urlIdentifier);
    }
    const urlType = searchParams.get("type");
    if (urlType && urlType in IDENTIFIER_TYPES) {
      setIdentifierType(urlType as IdentifierType);
    }
  }, [searchParams]);

  // Send OTP
  const handleSendOTP = async () => {
    if (!reporterPhone || reporterPhone.length < 9) {
      setVerificationError("Please enter a valid phone number");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: reporterPhone, action: "send" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setOtpSent(true);
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setVerificationError("Please enter the 6-digit code");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: reporterPhone, action: "verify", otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setIsPhoneVerified(true);
      setShowPhoneVerification(false);
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (!file) {
      setEvidenceFile(null);
      setEvidencePreview(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setUploadError("Please upload a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 5MB.");
      return;
    }

    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
  };

  // Upload evidence file and return URL
  const uploadEvidence = async (): Promise<string | null> => {
    if (!evidenceFile) return evidenceUrl.trim() || null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", evidenceFile);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data.url;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to upload screenshot");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Upload evidence file first if one was selected
      const uploadedUrl = await uploadEvidence();

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          identifier_type: identifierType,
          scam_type: scamType,
          description: description.trim(),
          amount_lost: amountLost ? parseInt(amountLost, 10) : 0,
          transaction_id: transactionId.trim() || null,
          evidence_url: uploadedUrl,
          is_anonymous: isAnonymous,
          reporter_phone: isPhoneVerified ? reporterPhone : null,
          reporter_phone_verified: isPhoneVerified,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit report");
      }

      setSuccessData(data.data);
      setIsSuccess(true);

      // Redirect after success
      setTimeout(() => {
        router.push("/browse");
      }, 3000);
    } catch (err) {
      console.error("Error submitting report:", err);
      setError(err instanceof Error ? err.message : "Failed to submit report. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess && successData) {
    const tierInfo = VERIFICATION_TIERS[successData.verification_tier];
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Report Submitted!
          </h2>
          <p className="text-gray-600 mb-4">
            Thank you for helping protect fellow Kenyans.
          </p>

          {/* Verification status */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">Report Status</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Verification Tier:</span>
                <span className={cn(
                  "font-medium px-2 py-0.5 rounded",
                  successData.verification_tier === 3 ? "bg-red-100 text-red-800" :
                  successData.verification_tier === 2 ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {tierInfo.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Evidence Score:</span>
                <span className="font-medium text-gray-900">{successData.evidence_score}/70</span>
              </div>
              {successData.expires_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Expires:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(successData.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            {successData.verification_tier === 1 && (
              <p className="text-xs text-gray-500 mt-2">
                Your report will be upgraded when others corroborate it.
              </p>
            )}
          </div>

          <p className="text-sm text-gray-500">Redirecting to browse page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Report a Scam
          </h1>
          <p className="text-gray-600">
            Your report helps protect others from falling victim to the same scam.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step >= s
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    "w-12 h-1 mx-2 transition-colors",
                    step > s ? "bg-green-600" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Identifier */}
          {step === 1 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Who scammed you?
              </h2>

              {/* Identifier Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type of identifier
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(IDENTIFIER_TYPES).map(([key, type]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIdentifierType(key as IdentifierType)}
                      className={cn(
                        "p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left",
                        identifierType === key
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Identifier Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {IDENTIFIER_TYPES[identifierType].label}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={IDENTIFIER_TYPES[identifierType].placeholder}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!identifier.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Scam Type */}
          {step === 2 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                What type of scam?
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.entries(SCAM_TYPES).map(([key, scam]) => {
                  const IconComponent = iconMap[scam.icon as keyof typeof iconMap];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setScamType(key as ScamType)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-colors",
                        scamType === key
                          ? "border-green-600 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <IconComponent
                        className={cn(
                          "h-5 w-5 mb-2",
                          scamType === key ? "text-green-600" : "text-gray-400"
                        )}
                      />
                      <p className="font-medium text-gray-900 text-sm">
                        {scam.label}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!scamType}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Details & Evidence */}
          {step === 3 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Tell us what happened
              </h2>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe how the scam happened. Include any relevant details that could help others avoid it. (Minimum 20 characters)"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-gray-900 bg-white"
                  required
                  minLength={20}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/20 characters minimum
                </p>
              </div>

              {/* Amount Lost */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount lost (KES)
                </label>
                <input
                  type="number"
                  value={amountLost}
                  onChange={(e) => setAmountLost(e.target.value)}
                  placeholder="e.g., 50000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              {/* Transaction ID */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  M-Pesa Transaction ID
                  <span className="text-green-600 ml-1">(+15 evidence points)</span>
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                  placeholder="e.g., QJK2ABC123"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white font-mono"
                />
              </div>

              {/* Evidence Screenshot Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidence Screenshot
                  <span className="text-green-600 ml-1">(+20 evidence points)</span>
                </label>

                {evidencePreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={evidencePreview}
                      alt="Evidence preview"
                      className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenceFile(null);
                        setEvidencePreview(null);
                        setEvidenceUrl("");
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-green-600 mt-1">
                      {evidenceFile?.name} ({(evidenceFile?.size ?? 0 / 1024).toFixed(0)} KB)
                    </p>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload screenshot</span>
                    <span className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF up to 5MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}

                {uploadError && (
                  <p className="text-sm text-red-600 mt-1">{uploadError}</p>
                )}

                {/* Fallback: paste URL */}
                {!evidenceFile && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Or paste a link to your evidence:</p>
                    <input
                      type="url"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={description.trim().length < 20}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Verification & Submit */}
          {step === 4 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Verify & Submit
              </h2>

              {/* Phone Verification */}
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-green-900 mb-1">
                      Verify your phone number
                      <span className="text-green-600 ml-1">(+15 evidence points)</span>
                    </h3>
                    <p className="text-sm text-green-700 mb-3">
                      Verified reporters&apos; reports carry more weight and don&apos;t expire.
                    </p>

                    {isPhoneVerified ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Phone verified!</span>
                      </div>
                    ) : showPhoneVerification ? (
                      <div className="space-y-3">
                        {!otpSent ? (
                          <>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                  type="tel"
                                  value={reporterPhone}
                                  onChange={(e) => setReporterPhone(e.target.value)}
                                  placeholder="0712345678"
                                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleSendOTP}
                                disabled={isVerifying}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Code"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-green-700">
                              Enter the 6-digit code sent to {reporterPhone}
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="123456"
                                maxLength={6}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white text-center font-mono text-lg tracking-widest"
                              />
                              <button
                                type="button"
                                onClick={handleVerifyOTP}
                                disabled={isVerifying || otp.length !== 6}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setOtpSent(false); setOtp(""); }}
                              className="text-sm text-green-700 hover:text-green-800 underline"
                            >
                              Use different number
                            </button>
                          </>
                        )}
                        {verificationError && (
                          <p className="text-sm text-red-600">{verificationError}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPhoneVerification(true)}
                        className="text-sm text-green-700 hover:text-green-800 underline font-medium"
                      >
                        Verify my phone (optional but recommended)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Anonymous Toggle */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-700">
                    Submit anonymously
                  </span>
                </label>
                <p className="text-sm text-gray-500 mt-1 ml-8">
                  Your identity will not be shown publicly
                </p>
              </div>

              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Report Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Identifier:</span>
                    <span className="font-medium text-gray-900">{identifier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-900">{IDENTIFIER_TYPES[identifierType].label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scam Type:</span>
                    <span className="font-medium text-gray-900">{scamType ? SCAM_TYPES[scamType].label : "-"}</span>
                  </div>
                  {amountLost && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Lost:</span>
                      <span className="font-medium text-gray-900">KES {parseInt(amountLost).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mb-6 p-3 bg-blue-50 rounded-lg flex gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  By submitting, you confirm this report is truthful. False reports may result in legal action.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting || isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {isUploading ? "Uploading evidence..." : "Submitting..."}
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Tips */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Tips for a stronger report:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Verify your phone</strong> - Reports from verified users carry more weight</li>
            <li>• <strong>Add transaction ID</strong> - Proves you actually transacted</li>
            <li>• <strong>Upload evidence</strong> - Screenshots help confirm the scam</li>
            <li>• <strong>Be detailed</strong> - Longer descriptions help others recognize the scam</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-14 w-14 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-10"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      }
    >
      <ReportForm />
    </Suspense>
  );
}
