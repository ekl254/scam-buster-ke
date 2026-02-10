import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side Supabase client using anon key (subject to RLS)
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Admin Supabase client using service role key (bypasses RLS)
// Use this for admin operations like deleting reports
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Types for API responses
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface StatsResponse {
  totalReports: number;
  totalAmountLost: number;
  totalLookups: number;
  updatedAt: string;
}

export interface ReportRow {
  id: string;
  identifier: string;
  identifier_type: string;
  scam_type: string;
  description: string;
  amount_lost: number | null;
  upvotes: number;
  is_anonymous: boolean;
  created_at: string;
  total_count?: number;
}
