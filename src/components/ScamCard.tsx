"use client";

import { useState, useEffect, useCallback } from "react";
import { SCAM_TYPES, VERIFICATION_TIERS, type ScamType, type VerificationTier } from "@/types";
import { cn, formatKES, getRelativeTime } from "@/lib/utils";
import { getSessionId } from "@/lib/session";
import {
  Smartphone,
  MapPin,
  Briefcase,
  TrendingUp,
  FileText,
  ShoppingBag,
  Heart,
  AlertCircle,
  ThumbsUp,
  Shield,
  CheckCircle,
  Flag,
} from "lucide-react";
import Link from "next/link";

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
  upvotes: number;
  isAnonymous: boolean;
  verificationTier?: VerificationTier;
  evidenceScore?: number;
  reporterVerified?: boolean;
  showDisputeButton?: boolean;
}

export function ScamCard({
  id,
  identifier,
  identifierType,
  scamType,
  description,
  amountLost,
  createdAt,
  upvotes,
  isAnonymous,
  verificationTier = 1,
  evidenceScore = 0,
  reporterVerified = false,
  showDisputeButton = true,
}: ScamCardProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [upvoteCount, setUpvoteCount] = useState(upvotes);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    setRelativeTime(getRelativeTime(createdAt));
  }, [createdAt]);

  useEffect(() => {
    if (!id) return;
    try {
      const stored = localStorage.getItem("scambuster_upvoted");
      const set: string[] = stored ? JSON.parse(stored) : [];
      setHasVoted(set.includes(id));
    } catch {
      // ignore malformed localStorage
    }
  }, [id]);

  const handleUpvote = useCallback(async () => {
    if (!id || isVoting) return;
    const sessionId = getSessionId();
    if (!sessionId) return;

    const willUpvote = !hasVoted;

    // Optimistic update
    setHasVoted(willUpvote);
    setUpvoteCount((c) => c + (willUpvote ? 1 : -1));
    setIsVoting(true);

    try {
      const res = await fetch("/api/upvotes", {
        method: willUpvote ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ report_id: id }),
      });

      if (!res.ok) {
        // Revert optimistic update
        setHasVoted(!willUpvote);
        setUpvoteCount((c) => c + (willUpvote ? -1 : 1));
        return;
      }

      // Persist to localStorage
      try {
        const stored = localStorage.getItem("scambuster_upvoted");
        const set: string[] = stored ? JSON.parse(stored) : [];
        if (willUpvote) {
          if (!set.includes(id)) set.push(id);
        } else {
          const idx = set.indexOf(id);
          if (idx !== -1) set.splice(idx, 1);
        }
        localStorage.setItem("scambuster_upvoted", JSON.stringify(set));
      } catch {
        // ignore localStorage errors
      }
    } catch {
      // Revert optimistic update on network error
      setHasVoted(!willUpvote);
      setUpvoteCount((c) => c + (willUpvote ? -1 : 1));
    } finally {
      setIsVoting(false);
    }
  }, [id, hasVoted, isVoting]);

  const scamInfo = SCAM_TYPES[scamType];
  const IconComponent = iconMap[scamInfo.icon as keyof typeof iconMap];
  const tierInfo = VERIFICATION_TIERS[verificationTier];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
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
          {identifier}
        </Link>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{description}</p>

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
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-4">
          {amountLost && amountLost > 0 && (
            <span className="text-sm font-medium text-red-600">
              Lost: {formatKES(amountLost)}
            </span>
          )}
          <button
            onClick={handleUpvote}
            disabled={!id || isVoting}
            className={cn(
              "flex items-center gap-1 text-sm transition-colors",
              hasVoted
                ? "text-green-600"
                : "text-gray-400 hover:text-green-600",
              (!id || isVoting) && "opacity-50 cursor-not-allowed"
            )}
          >
            <ThumbsUp className={cn("h-4 w-4", hasVoted && "fill-current")} />
            <span>{upvoteCount}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {showDisputeButton && id && (
            <Link
              href={`/dispute?identifier=${encodeURIComponent(identifier)}&report_id=${id}`}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Flag className="h-3 w-3" />
              Dispute
            </Link>
          )}
          <span className="text-xs text-gray-400">
            {isAnonymous ? "Anonymous" : "Identified"}
          </span>
        </div>
      </div>
    </div>
  );
}
