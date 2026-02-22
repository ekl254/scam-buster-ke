import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format Kenyan phone number to standard format
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle different formats
  if (cleaned.startsWith("254")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // Validate length (should be 9 digits for Kenyan numbers)
  if (cleaned.length !== 9) {
    return phone; // Return original if invalid
  }

  return `+254${cleaned}`;
}

// Format currency in KES
export function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Calculate trust score based on reports
export function calculateTrustScore(reportCount: number, totalAmount: number): number {
  if (reportCount === 0) return 100;
  if (reportCount === 1) return 70;
  if (reportCount <= 3) return 40;
  if (reportCount <= 5) return 20;
  return 0;
}

// Get trust score color
export function getTrustScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 50) return "text-yellow-600 bg-yellow-50";
  if (score >= 20) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}

// Get trust score label
export function getTrustScoreLabel(score: number): string {
  if (score >= 80) return "Likely Safe";
  if (score >= 50) return "Use Caution";
  if (score >= 20) return "High Risk";
  return "Known Scammer";
}

// Format a date as "10 Feb 2026"
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Relative time formatting
export function getRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  return then.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}
