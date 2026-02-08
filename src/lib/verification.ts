import { createHash } from "crypto";
import type { ScamReport, VerificationTier, ConcernLevel, CommunityAssessment } from "@/types";

function getSalt(): string {
  const salt = process.env.HASH_SALT;
  if (!salt) {
    console.warn("HASH_SALT environment variable is not set — using insecure default. Set HASH_SALT in production.");
  }
  return salt || "scambuster-dev-only";
}

// Hash phone numbers for privacy
export function hashPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return createHash("sha256").update(normalized + getSalt()).digest("hex");
}

// Hash IP addresses for privacy
export function hashIP(ip: string): string {
  return createHash("sha256").update(ip + getSalt()).digest("hex");
}

// Normalize Kenyan phone numbers
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("254")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.length === 9) {
    return `+254${cleaned}`;
  }

  return phone;
}

// Calculate evidence score for a report
export function calculateEvidenceScore(report: {
  evidence_url?: string | null;
  transaction_id?: string | null;
  description: string;
  reporter_verified?: boolean;
  amount_lost?: number | null;
}): number {
  let score = 0;

  // Evidence screenshot provided (+20)
  if (report.evidence_url && report.evidence_url.trim() !== "") {
    score += 20;
  }

  // Transaction ID provided (+15)
  if (report.transaction_id && report.transaction_id.trim() !== "") {
    score += 15;
  }

  // Detailed description (+10 for >100 chars, +5 for >50 chars)
  if (report.description.length > 100) {
    score += 10;
  } else if (report.description.length > 50) {
    score += 5;
  }

  // Reporter is phone-verified (+15)
  if (report.reporter_verified) {
    score += 15;
  }

  // Amount lost specified (+10)
  if (report.amount_lost && report.amount_lost > 0) {
    score += 10;
  }

  return score; // Max possible: 70
}

// Calculate verification tier based on evidence and corroboration
export function calculateVerificationTier(
  evidenceScore: number,
  independentReportCount: number,
  hasOfficialSource: boolean = false
): VerificationTier {
  // Tier 3: Verified
  if (hasOfficialSource) return 3;
  if (independentReportCount >= 5 && evidenceScore >= 30) return 3;

  // Tier 2: Corroborated
  if (independentReportCount >= 2) return 2;
  if (evidenceScore >= 30) return 2;

  // Tier 1: Unverified
  return 1;
}

// Calculate report weight with time decay
export function calculateReportWeight(
  createdAt: string | Date,
  verificationTier: VerificationTier,
  evidenceScore: number
): number {
  const created = new Date(createdAt);
  const now = new Date();
  const ageInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  // Base weight by tier
  let baseWeight: number;
  switch (verificationTier) {
    case 3:
      baseWeight = 1.0;
      break;
    case 2:
      baseWeight = 0.75;
      break;
    default:
      baseWeight = 0.5;
  }

  // Add evidence score bonus (0-0.3)
  baseWeight += (evidenceScore / 100) * 0.3;

  // Apply time decay
  let decayMultiplier: number;
  if (ageInDays <= 30) {
    decayMultiplier = 1.0;
  } else if (ageInDays <= 90) {
    decayMultiplier = 0.75;
  } else if (ageInDays <= 180) {
    decayMultiplier = 0.5;
  } else {
    decayMultiplier = 0.25;
  }

  return baseWeight * decayMultiplier;
}

// Check if a report should expire
export function shouldExpire(report: {
  verification_tier: VerificationTier;
  evidence_score: number;
  reporter_verified: boolean;
  created_at: string;
  expires_at?: string | null;
}): boolean {
  // Only tier 1 reports with low evidence expire
  if (report.verification_tier > 1) return false;
  if (report.evidence_score >= 30) return false;
  if (report.reporter_verified) return false;

  // Check if past expiration date
  if (report.expires_at) {
    return new Date(report.expires_at) < new Date();
  }

  // Default 90-day expiration for tier 1
  const created = new Date(report.created_at);
  const expirationDate = new Date(created.getTime() + 90 * 24 * 60 * 60 * 1000);
  return expirationDate < new Date();
}

// Calculate expiration date for a new report
export function calculateExpirationDate(
  evidenceScore: number,
  reporterVerified: boolean
): Date | null {
  // No expiration for verified reporters or high evidence
  if (reporterVerified || evidenceScore >= 30) {
    return null;
  }

  // 90 days from now
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 90);
  return expiration;
}

// Calculate community concern level from reports
export function calculateCommunityAssessment(
  reports: ScamReport[],
  hasDisputes: boolean = false
): CommunityAssessment {
  const activeReports = reports.filter(r => !r.is_expired);

  if (activeReports.length === 0) {
    return {
      concern_level: "no_reports",
      concern_score: 0,
      total_reports: 0,
      verified_reports: 0,
      total_amount_lost: 0,
      weighted_score: 0,
      has_disputes: hasDisputes,
      disclaimer: "Reports are user-submitted and not independently verified by ScamBusterKE. Use this information as one factor in your decision-making.",
    };
  }

  const totalReports = activeReports.length;
  const verifiedReports = activeReports.filter(r => r.verification_tier >= 2).length;
  const totalAmountLost = activeReports.reduce((sum, r) => sum + (r.amount_lost || 0), 0);

  const weightedScore = activeReports.reduce((sum, r) =>
    sum + calculateReportWeight(r.created_at, r.verification_tier, r.evidence_score), 0
  );

  // Determine concern level based on weighted score
  let concernLevel: ConcernLevel;
  let concernScore: number;

  if (weightedScore < 0.5) {
    concernLevel = "low";
    concernScore = 20;
  } else if (weightedScore < 1.5) {
    concernLevel = "moderate";
    concernScore = 40;
  } else if (weightedScore < 3.0) {
    concernLevel = "high";
    concernScore = 70;
  } else {
    concernLevel = "severe";
    concernScore = 90;
  }

  // Reduce score if there are active disputes
  if (hasDisputes && concernScore > 0) {
    concernScore = Math.max(0, concernScore - 10);
  }

  return {
    concern_level: concernLevel,
    concern_score: concernScore,
    total_reports: totalReports,
    verified_reports: verifiedReports,
    total_amount_lost: totalAmountLost,
    weighted_score: weightedScore,
    has_disputes: hasDisputes,
    disclaimer: "Reports are user-submitted and not independently verified by ScamBusterKE. Use this information as one factor in your decision-making.",
  };
}

// Get concern level color for UI
export function getConcernLevelColor(level: ConcernLevel): string {
  const colors: Record<ConcernLevel, string> = {
    no_reports: "text-green-600 bg-green-50 border-green-200",
    low: "text-blue-600 bg-blue-50 border-blue-200",
    moderate: "text-yellow-600 bg-yellow-50 border-yellow-200",
    high: "text-orange-600 bg-orange-50 border-orange-200",
    severe: "text-red-600 bg-red-50 border-red-200",
  };
  return colors[level];
}

// Get verification tier badge styling
export function getVerificationTierStyle(tier: VerificationTier): {
  bg: string;
  text: string;
  label: string;
} {
  switch (tier) {
    case 3:
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Verified",
      };
    case 2:
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Corroborated",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-600",
        label: "Unverified",
      };
  }
}
