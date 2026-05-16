/**
 * Validates pub website URLs:
 *   - Removes malformed URLs
 *   - Probes each URL with a HEAD request (falls back to GET if HEAD fails)
 *   - Removes the website field if the URL doesn't respond with a success status
 *
 * Runs ~10 in parallel, total time ~3-5 minutes for 1300 URLs.
 *
 * Run with: npx tsx scripts/validate-websites.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  website?: string;
  [key: string]: unknown;
}

const CONCURRENCY = 10;
const TIMEOUT_MS = 10000;
// Browser-like UA — many pub sites use Cloudflare/WAF that block obvious bots
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Statuses that indicate "site is up but blocking us" — keep the URL since
// a real browser will probably succeed.
const KEEP_BLOCKED_STATUSES = new Set([401, 403, 429]);

interface Result {
  pub: Pub;
  status: "ok" | "removed" | "fixed";
  reason?: string;
  newUrl?: string;
}

function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  // Add https:// if missing protocol
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = "https://" + candidate;
  }

  try {
    const u = new URL(candidate);
    // Reject anything obviously not a website
    if (!u.hostname.includes(".")) return null;
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function probe(url: string): Promise<{ ok: boolean; status: number; reason?: string }> {
  const browserHeaders = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
  };

  async function attempt(method: "HEAD" | "GET"): Promise<Response | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        signal: controller.signal,
        headers: browserHeaders,
        redirect: "follow",
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    let resp = await attempt("HEAD");

    // Some servers don't support HEAD — retry with GET
    if (!resp || resp.status === 405 || resp.status === 501 || resp.status === 400) {
      resp = await attempt("GET");
    }

    if (!resp) {
      return { ok: false, status: 0, reason: "unreachable" };
    }

    // Site responded with a "blocking us" status — assume real browser succeeds
    if (KEEP_BLOCKED_STATUSES.has(resp.status)) {
      return { ok: true, status: resp.status };
    }

    return {
      ok: resp.ok || (resp.status >= 200 && resp.status < 400),
      status: resp.status,
    };
  } catch (err) {
    const reason = (err as Error).name === "AbortError" ? "timeout" : (err as Error).message;
    return { ok: false, status: 0, reason };
  }
}

async function processPub(pub: Pub): Promise<Result> {
  if (!pub.website) return { pub, status: "ok" };

  const normalised = normaliseUrl(pub.website);
  if (!normalised) {
    return { pub, status: "removed", reason: "malformed" };
  }

  const probe1 = await probe(normalised);
  if (probe1.ok) {
    // Update if we changed the URL
    if (normalised !== pub.website) {
      return { pub, status: "fixed", newUrl: normalised };
    }
    return { pub, status: "ok" };
  }

  return {
    pub,
    status: "removed",
    reason: probe1.status ? `HTTP ${probe1.status}` : probe1.reason ?? "unreachable",
  };
}

async function runBatched<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function workerLoop() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
      completed++;
      if (onProgress && completed % 50 === 0) onProgress(completed, items.length);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, workerLoop));
  return results;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  const pubsWithSite = pubs.filter((p) => p.website);
  console.log(`Validating ${pubsWithSite.length} website URLs (concurrency: ${CONCURRENCY})...`);

  const start = Date.now();
  const results = await runBatched(
    pubsWithSite,
    processPub,
    CONCURRENCY,
    (done, total) => {
      const pct = Math.round((done / total) * 100);
      const elapsed = Math.round((Date.now() - start) / 1000);
      process.stdout.write(`\r  ${done}/${total} (${pct}%) — ${elapsed}s elapsed`);
    }
  );
  process.stdout.write("\n");

  let removed = 0;
  let fixed = 0;
  const reasonCounts: Record<string, number> = {};

  for (const r of results) {
    if (r.status === "removed") {
      delete r.pub.website;
      removed++;
      const reason = r.reason ?? "unknown";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    } else if (r.status === "fixed" && r.newUrl) {
      r.pub.website = r.newUrl;
      fixed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`URLs probed: ${pubsWithSite.length}`);
  console.log(`URLs removed (broken): ${removed}`);
  console.log(`URLs fixed (added protocol): ${fixed}`);
  console.log(`URLs OK: ${pubsWithSite.length - removed - fixed}`);
  console.log(`\nBreakdown of removed:`);
  Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([reason, count]) => console.log(`  ${reason}: ${count}`));

  const remaining = pubs.filter((p) => p.website).length;
  console.log(`\nPubs with website after cleanup: ${remaining} (was ${pubsWithSite.length})`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
