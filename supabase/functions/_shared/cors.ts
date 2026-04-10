/**
 * CORS helper for Supabase Edge Functions.
 *
 * Configure allowed origins via the ALLOWED_ORIGINS environment variable
 * (comma-separated list). If the variable is absent, only localhost origins
 * are permitted so local development continues to work out of the box.
 *
 * Example .env / Supabase secret:
 *   ALLOWED_ORIGINS=https://your-app.com,https://www.your-app.com
 */

const DEFAULT_DEV_ORIGINS = ["http://localhost:8080", "http://127.0.0.1:8080"];

function getAllowedOrigins(): Set<string> {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  const configured = env
    ? env
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [];
  return new Set([...DEFAULT_DEV_ORIGINS, ...configured]);
}

/**
 * Returns CORS response headers for the given request origin.
 *
 * - If the origin is in the allowlist, `Access-Control-Allow-Origin` is set
 *   to that specific origin (not `*`), and `Vary: Origin` is added so
 *   caches keep per-origin copies.
 * - If the origin is NOT in the allowlist, the header is omitted entirely,
 *   which causes the browser to block the response.
 *
 * @param requestOrigin  The value of the `Origin` request header (may be null).
 */
export function getCorsHeaders(
  requestOrigin: string | null,
): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (!requestOrigin) return base;

  const allowed = getAllowedOrigins();
  if (allowed.has(requestOrigin)) {
    base["Access-Control-Allow-Origin"] = requestOrigin;
    base["Vary"] = "Origin";
  }

  return base;
}

/**
 * Convenience wrapper: returns a 204 preflight response for OPTIONS requests,
 * or null for all other methods (caller handles the actual response).
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}
