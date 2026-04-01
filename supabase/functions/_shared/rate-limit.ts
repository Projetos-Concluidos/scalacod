import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitConfig {
  action: string;
  windowSeconds: number;
  maxAttempts: number;
  silent?: boolean; // If true, return 200 instead of 429
}

/**
 * Check rate limit using the database function.
 * Returns { limited: boolean } — caller decides response.
 */
export async function checkRateLimit(
  req: Request,
  config: RateLimitConfig
): Promise<{ limited: boolean }> {
  const identifier =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_action: config.action,
    p_identifier: identifier,
    p_window_seconds: config.windowSeconds,
    p_max_attempts: config.maxAttempts,
  });

  if (error) {
    console.error("[rate-limit] DB error:", error.message);
    // Fail open — don't block on DB errors
    return { limited: false };
  }

  return { limited: !!data };
}

/**
 * Build a 429 response with retry-after header.
 */
export function rateLimitResponse(
  corsHeaders: Record<string, string>,
  windowSeconds: number
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retry_after: windowSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(windowSeconds),
      },
    }
  );
}
