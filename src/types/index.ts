// Scam types commonly seen in Kenya
export const SCAM_TYPES = {
  mpesa: {
    label: "M-Pesa/Mobile Money",
    description: "Fake M-Pesa messages, wrong number refunds, SIM swap",
    icon: "Smartphone",
  },
  land: {
    label: "Land/Property",
    description: "Fake land companies, multiple sales, fake title deeds",
    icon: "MapPin",
  },
  jobs: {
    label: "Jobs/Employment",
    description: "Fake job offers, Kazi Majuu scams, fake calling letters",
    icon: "Briefcase",
  },
  investment: {
    label: "Investment/Ponzi",
    description: "Pyramid schemes, fake crypto, get-rich-quick schemes",
    icon: "TrendingUp",
  },
  tender: {
    label: "Tender/Government",
    description: "Fake government tenders, fake procurement",
    icon: "FileText",
  },
  online: {
    label: "Online Shopping",
    description: "Fake online stores, non-delivery of goods",
    icon: "ShoppingBag",
  },
  romance: {
    label: "Romance/Dating",
    description: "Catfishing, fake relationships for money",
    icon: "Heart",
  },
  other: {
    label: "Other",
    description: "Other types of scams",
    icon: "AlertCircle",
  },
} as const;

export type ScamType = keyof typeof SCAM_TYPES;

export const IDENTIFIER_TYPES = {
  phone: { label: "Phone Number", placeholder: "0712345678 or +254712345678" },
  paybill: { label: "Paybill Number", placeholder: "123456" },
  till: { label: "Till Number", placeholder: "1234567" },
  website: { label: "Website", placeholder: "example.com" },
  company: { label: "Company Name", placeholder: "Company Ltd" },
  email: { label: "Email Address", placeholder: "scammer@email.com" },
} as const;

export type IdentifierType = keyof typeof IDENTIFIER_TYPES;

// Verification tiers
export const VERIFICATION_TIERS = {
  1: {
    label: "Unverified",
    description: "Single report, awaiting corroboration",
    color: "gray",
  },
  2: {
    label: "Corroborated",
    description: "Multiple independent reports or evidence provided",
    color: "yellow",
  },
  3: {
    label: "Verified",
    description: "Confirmed by official sources or 5+ independent reports",
    color: "red",
  },
} as const;

export type VerificationTier = keyof typeof VERIFICATION_TIERS;

// Community concern levels
export const CONCERN_LEVELS = {
  no_reports: {
    label: "No Reports",
    description: "No community reports found",
    color: "green",
    icon: "CheckCircle",
  },
  low: {
    label: "Low Concern",
    description: "Limited reports, use normal caution",
    color: "blue",
    icon: "Info",
  },
  moderate: {
    label: "Moderate Concern",
    description: "Some reports exist, verify before transacting",
    color: "yellow",
    icon: "AlertTriangle",
  },
  high: {
    label: "High Concern",
    description: "Multiple reports, exercise extreme caution",
    color: "orange",
    icon: "AlertOctagon",
  },
  severe: {
    label: "Severe Concern",
    description: "Many verified reports, avoid transacting",
    color: "red",
    icon: "XOctagon",
  },
} as const;

export type ConcernLevel = keyof typeof CONCERN_LEVELS;

// Dispute statuses
export const DISPUTE_STATUSES = {
  pending: { label: "Pending Review", color: "gray" },
  under_review: { label: "Under Review", color: "yellow" },
  upheld: { label: "Report Upheld", color: "red" },
  rejected: { label: "Dispute Accepted", color: "green" },
} as const;

export type DisputeStatus = keyof typeof DISPUTE_STATUSES;

export interface ScamReport {
  id: string;
  identifier: string;
  identifier_type: IdentifierType;
  scam_type: ScamType;
  description: string;
  amount_lost?: number;
  evidence_url?: string;
  transaction_id?: string;
  reporter_id?: string;
  reporter_verified: boolean;
  is_anonymous: boolean;
  created_at: string;
  status: "pending" | "verified" | "disputed";
  verification_tier: VerificationTier;
  evidence_score: number;
  is_expired: boolean;
  expires_at?: string;
  source_url?: string;
}

export interface Dispute {
  id: string;
  report_id?: string;
  identifier: string;
  reason: string;
  evidence_url?: string;
  business_reg_number?: string;
  status: DisputeStatus;
  admin_notes?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface CommunityAssessment {
  concern_level: ConcernLevel;
  concern_score: number;
  total_reports: number;
  verified_reports: number;
  total_amount_lost: number;
  weighted_score: number;
  has_disputes: boolean;
  disclaimer: string;
}

export interface SearchResult {
  identifier: string;
  identifier_type: IdentifierType;
  report_count: number;
  total_amount_lost: number;
  scam_types: ScamType[];
  latest_report: string;
  reports: ScamReport[];
  assessment: CommunityAssessment;
}

export interface PhoneVerification {
  phone: string;
  otp_sent: boolean;
  verified: boolean;
  expires_at: string;
}

export interface ReportSubmission {
  identifier: string;
  identifier_type: IdentifierType;
  scam_type: ScamType;
  description: string;
  amount_lost?: number;
  evidence_url?: string;
  transaction_id?: string;
  is_anonymous: boolean;
  reporter_phone?: string;
  reporter_phone_verified?: boolean;
}

export interface DisputeSubmission {
  report_id?: string;
  identifier: string;
  reason: string;
  evidence_url?: string;
  business_reg_number?: string;
  contact_phone: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  disclaimer?: string;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  disclaimer?: string;
}
