import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rate limiter that works correctly on serverless platforms (Vercel).
 *
 * Uses a Map as a best-effort in-process cache. Since serverless functions
 * may spin up fresh instances, the Map only reduces DB calls — it is NOT
 * the source of truth. The real check comes from `checkRateLimitPersistent`,
 * which uses Supabase to count recent requests.
 *
 * For simple deployments without a persistent store, the in-memory fallback
 * still provides protection within a single warm invocation.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory cache — best-effort only on serverless
const memoryStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * In-memory rate limit check. Works within a single warm instance.
 * On serverless, this is a best-effort check — the real enforcement
 * should use a persistent store.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = memoryStore.get(key);

  // Clean expired entry
  if (entry && now > entry.resetAt) {
    memoryStore.delete(key);
  }

  const current = memoryStore.get(key);

  if (!current) {
    // New window
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  if (current.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count++;
  return { allowed: true, remaining: config.limit - current.count, resetAt: current.resetAt };
}

/**
 * Persistent rate limit check using Supabase lookups table.
 * Falls back to in-memory if Supabase is unavailable.
 */
export async function checkRateLimitPersistent(
  key: string,
  config: RateLimitConfig,
  supabase: SupabaseClient
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(now - windowMs).toISOString();

  try {
    // Count recent entries for this key in the rate_limits table
    const { count, error } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", windowStart);

    if (error) {
      // Table may not exist yet — fall back to in-memory
      return checkRateLimit(key, config);
    }

    const currentCount = count || 0;
    const resetAt = now + windowMs;

    if (currentCount >= config.limit) {
      return { allowed: false, remaining: 0, resetAt };
    }

    // Record this request
    await supabase
      .from("rate_limits")
      .insert({ key, created_at: new Date().toISOString() });

    return {
      allowed: true,
      remaining: config.limit - currentCount - 1,
      resetAt,
    };
  } catch {
    // If anything fails, fall back to in-memory
    return checkRateLimit(key, config);
  }
}

// Pre-configured limiters for different endpoints
export const RATE_LIMITS = {
  /** Report creation: 10 per 15 minutes per IP */
  reportCreate: { limit: 10, windowSeconds: 900 },
  /** Search: 60 per minute per IP */
  search: { limit: 60, windowSeconds: 60 },
  /** Dispute creation: 5 per hour per IP */
  disputeCreate: { limit: 5, windowSeconds: 3600 },
  /** Admin auth: 10 per 15 minutes per IP */
  adminAuth: { limit: 10, windowSeconds: 900 },
} as const;

/** Extract client IP from request headers */
export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Add rate limit headers to a response.
 * Clients can use these to adjust their behavior gracefully.
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
