/**
 * Server-side helpers for the Discover page.
 *
 * Matches curated content (neighbourhoods, pub crawls) to real pubs in our
 * dataset so we can show hero photos, working pub links, and route maps.
 */

import pubsData from "@/data/pubs.json";
import type { Pub } from "@/lib/types";
import type { Neighbourhood } from "@/data/neighbourhoods";
import type { PubCrawl, CrawlStop } from "@/data/pub-crawls";
import { injectSun } from "@/lib/sun";

const pubs = pubsData as Pub[];

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Find a single pub by name (closest fuzzy match, optionally near a point). */
export function findPubByName(
  name: string,
  near?: { lat: number; lng: number; radiusKm?: number }
): Pub | null {
  const target = normalise(name);
  let best: { pub: Pub; score: number } | null = null;

  for (const pub of pubs) {
    const candidate = normalise(pub.name);
    // Score: exact = 100, starts/ends/contains = 80, word overlap fallback
    let score = 0;
    if (candidate === target) score = 100;
    else if (candidate.startsWith(target) || candidate.endsWith(target)) score = 90;
    else if (candidate.includes(target) || target.includes(candidate)) score = 80;
    else {
      const ta = new Set(target.split(/\s+/).filter((w) => w.length > 2));
      const ca = new Set(candidate.split(/\s+/).filter((w) => w.length > 2));
      if (ta.size > 0 && ca.size > 0) {
        const common = [...ta].filter((w) => ca.has(w));
        const overlap = common.length / Math.min(ta.size, ca.size);
        if (overlap >= 0.6) score = Math.round(overlap * 70);
      }
    }
    if (score === 0) continue;

    if (near) {
      const radius = near.radiusKm ?? 2;
      const dKm = Math.hypot(pub.lat - near.lat, pub.lng - near.lng) * 111;
      if (dKm > radius) continue;
      // Closer match scores higher
      score += Math.max(0, 10 - dKm);
    }

    if (!best || score > best.score) best = { pub, score };
  }

  return best?.pub ?? null;
}

/** Pick the best hero image to show on a neighbourhood card. */
export function neighbourhoodHero(n: Neighbourhood): string | null {
  // First try the named featured pubs
  for (const name of n.heroPubNames) {
    const pub = findPubByName(name, { lat: n.center.lat, lng: n.center.lng, radiusKm: n.radiusKm + 0.5 });
    if (pub?.heroImageUrl) return pub.heroImageUrl;
  }
  // Fallback: any pub with a photo within the area
  const radius = n.radiusKm;
  const inArea = pubs.filter((p) => {
    const dKm = Math.hypot(p.lat - n.center.lat, p.lng - n.center.lng) * 111;
    return dKm <= radius && p.heroImageUrl;
  });
  if (inArea.length === 0) return null;
  // Prefer ones with higher ratings (lazy proxy for "actually good photo")
  inArea.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return inArea[0].heroImageUrl ?? null;
}

/** Count pubs in a neighbourhood radius — for the "X pubs nearby" stat */
export function neighbourhoodPubCount(n: Neighbourhood): number {
  let count = 0;
  for (const p of pubs) {
    const dKm = Math.hypot(p.lat - n.center.lat, p.lng - n.center.lng) * 111;
    if (dKm <= n.radiusKm) count++;
  }
  return count;
}

export interface ResolvedCrawlStop extends CrawlStop {
  pub?: Pub;
}

/** Resolve crawl stops against our pub data; returns stops in original order. */
export function resolveCrawl(crawl: PubCrawl): ResolvedCrawlStop[] {
  return crawl.stops.map((stop) => {
    const pub = findPubByName(stop.name, {
      lat: crawl.center.lat,
      lng: crawl.center.lng,
      radiusKm: 4,
    });
    if (pub) {
      const enriched = { ...pub };
      injectSun(enriched);
      return { ...stop, pub: enriched };
    }
    return stop;
  });
}

/** Hero image for a crawl card — first matched pub with a photo */
export function crawlHero(crawl: PubCrawl): string | null {
  for (const stop of crawl.stops) {
    const pub = findPubByName(stop.name, {
      lat: crawl.center.lat,
      lng: crawl.center.lng,
      radiusKm: 4,
    });
    if (pub?.heroImageUrl) return pub.heroImageUrl;
  }
  return null;
}
