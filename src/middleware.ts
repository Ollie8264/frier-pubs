/**
 * Edge middleware — rate-limiting + scraper deterrents for /api/* routes.
 *
 * For a hobby-scale app this is intentionally simple: in-memory sliding
 * window per IP, no external dependencies. Each Vercel function instance
 * gets its own counter (resets on cold start), so determined scrapers can
 * still get through eventually, but casual abuse is throttled fine.
 *
 * If traffic ever grows enough that we need shared state, upgrade to
 * Vercel KV + @upstash/ratelimit.
 */

import { NextRequest, NextResponse } from "next/server";

// Sliding window: max N requests per WINDOW_MS per IP
const RATE_LIMIT = 120;        // requests
const WINDOW_MS = 60_000;      // per 60s
const BLOCK_MS = 60_000;       // 429 cooldown when limit exceeded

// In-memory per-instance map. Cleared periodically to avoid leaks.
type Hit = { count: number; resetAt: number };
const hits = new Map<string, Hit>();

// Sweep stale entries every minute or so
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of hits) {
    if (v.resetAt < now) hits.delete(k);
  }
}

function ipFromHeaders(req: NextRequest): string {
  // Vercel sets x-real-ip + x-forwarded-for. Fall back to "anon".
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const now = Date.now();
  sweep(now);

  const ip = ipFromHeaders(req);
  const entry = hits.get(ip);

  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
    if (entry.count > RATE_LIMIT) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          retryAfter,
          message: `Slow down a bit — limit is ${RATE_LIMIT} req/min.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(RATE_LIMIT),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
          },
        }
      );
    }
  }

  const finalEntry = hits.get(ip)!;
  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
  res.headers.set("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT - finalEntry.count)));
  res.headers.set("X-RateLimit-Reset", String(Math.ceil(finalEntry.resetAt / 1000)));
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
