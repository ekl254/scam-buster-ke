import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type-safe database types (will be generated from Supabase later)
export type Database = {
  public: {
    Tables: {
      reports: {
        Row: {
          id: string;
          identifier: string;
          identifier_type: string;
          scam_type: string;
          description: string;
          amount_lost: number | null;
          evidence_url: string | null;
          reporter_id: string | null;
          is_anonymous: boolean;
          created_at: string;
          status: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
      };
      lookups: {
        Row: {
          id: string;
          identifier: string;
          searched_at: string;
          found_reports_count: number;
        };
        Insert: Omit<Database["public"]["Tables"]["lookups"]["Row"], "id" | "searched_at">;
        Update: Partial<Database["public"]["Tables"]["lookups"]["Insert"]>;
      };
    };
  };
};
