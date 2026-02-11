"use client";

import { useState, useEffect } from "react";
import { SCAM_TYPES, VERIFICATION_TIERS, type ScamType, type VerificationTier } from "@/types";
import { cn, formatKES, getRelativeTime } from "@/lib/utils";
import {
  Smartphone,
  MapPin,
  Briefcase,
  TrendingUp,
  FileText,
  ShoppingBag,
  Heart,
  AlertCircle,
  Shield,
  CheckCircle,
  Flag,
  AlertTriangle,
} from "lucide-react";
import { FlagButton } from "@/components/FlagButton";
import Link from "next/link";
import { formatKenyanPhone } from "@/lib/verification";

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

interface ScamCardProps {
  id?: string;
  identifier: string;
  identifierType: string;
  scamType: ScamType;
  description: string;
  amountLost?: number;
  createdAt: string;
  isAnonymous: boolean;
  verificationTier?: VerificationTier;
  evidenceScore?: number;
  reporterVerified?: boolean;
  showDisputeButton?: boolean;
  showReportToo?: boolean;
  clickable?: boolean;
  defaultExpanded?: boolean;
}

export function ScamCard({
  id,
  identifier,
  identifierType,
  scamType,
  description,
  amountLost,
  createdAt,
  isAnonymous,
  verificationTier = 1,
  evidenceScore = 0,
  reporterVerified = false,
  showDisputeButton = true,
  showReportToo = true,
  clickable = true,
  defaultExpanded = false,
}: ScamCardProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // ... (Effect and vars) ...

  const scamInfo = SCAM_TYPES[scamType];
  const IconComponent = iconMap[scamInfo.icon as keyof typeof iconMap];
  const tierInfo = VERIFICATION_TIERS[verificationTier];

  const isLong = description.length > 200;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow relative group/card">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        {/* ... (Header content: Icon, Badge, Time) ... */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            scamType === "mpesa" && "bg-green-50 text-green-600",
            scamType === "land" && "bg-blue-50 text-blue-600",
            scamType === "jobs" && "bg-purple-50 text-purple-600",
            scamType === "investment" && "bg-orange-50 text-orange-600",
            scamType === "tender" && "bg-gray-50 text-gray-600",
            scamType === "online" && "bg-pink-50 text-pink-600",
            scamType === "romance" && "bg-red-50 text-red-600",
            scamType === "other" && "bg-gray-50 text-gray-600",
          )}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
              {scamInfo.label}
            </span>
            {/* Verification Tier Badge */}
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
              verificationTier === 3 && "bg-red-100 text-red-800",
              verificationTier === 2 && "bg-yellow-100 text-yellow-800",
              verificationTier === 1 && "bg-gray-100 text-gray-600",
            )}>
              {verificationTier >= 2 && <Shield className="h-3 w-3" />}
              {tierInfo.label}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-400">{relativeTime || "..."}</span>
      </div>

      {/* Identifier */}
      <div className="mb-3">
        <p className="text-sm text-gray-500 capitalize">{identifierType}</p>
        <Link
          href={`/check/${encodeURIComponent(identifier)}`}
          className="text-lg font-semibold text-gray-900 font-mono hover:text-green-600 transition-colors"
        >
          {identifierType === "phone" ? formatKenyanPhone(identifier) : identifier}
        </Link>
      </div>

      {/* Description */}
      {clickable ? (
        <Link href={`/check/${encodeURIComponent(identifier)}`} className="block group">
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 group-hover:text-gray-900 transition-colors">
            {description}
          </p>
        </Link>
      ) : (
        <div className="mb-4">
          <p className={cn("text-gray-800 text-sm whitespace-pre-wrap", !isExpanded && "line-clamp-3")}>
            {description}
          </p>
          {isLong && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-green-600 text-xs font-medium mt-1 hover:underline focus:outline-none"
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Evidence indicators */}
      {(evidenceScore > 0 || reporterVerified) && (
        <div className="flex items-center gap-3 mb-3 text-xs">
          {reporterVerified && (
            <span className="inline-flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Verified Reporter
            </span>
          )}
          {evidenceScore >= 30 && (
            <span className="inline-flex items-center gap-1 text-blue-600">
              <Shield className="h-3 w-3" />
              Evidence Provided
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100/50">
        <div>
          {amountLost && amountLost > 0 ? (
            <span className="font-semibold text-red-600 text-sm">
              -{formatKES(amountLost)}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">No financial loss</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {showReportToo && (
            <Link
              href={`/report?identifier=${encodeURIComponent(identifier)}&type=${encodeURIComponent(identifierType)}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors mr-1"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Report
            </Link>
          )}

          {showDisputeButton && id && (
            <Link
              href={`/dispute?identifier=${encodeURIComponent(identifier)}&report_id=${id}`}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              title="Dispute this report"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="sr-only">Dispute</span>
            </Link>
          )}

          {id && <FlagButton reportId={id} />}
        </div>
      </div>
    </div>
  );
}
