/**
 * Sun-data helpers.
 *
 * sun-by-day.json structure:
 *   { [pubId]: { a: number[365], b: number[365], image?: string } }
 *
 * where:
 *   a[i] = avg sun % on day-of-year (i+1)
 *   b[i] = best (peak) sun % on day-of-year (i+1)
 *   image = hero photo URL (constant year-round)
 *
 * The file is loaded once at server startup. Today's value is computed
 * per-request from the current date.
 */

import type { Pub } from "@/lib/types";
import sunData from "@/data/sun-by-day.json";

interface SunEntry {
  a: number[];
  b: number[];
  image?: string;
}

type SunLookup = Record<string, SunEntry>;

// The JSON file is bundled at build time. While the enrichment script is
// still running, it'll be empty ({}) and sun features gracefully degrade.
const sunLookup: SunLookup = sunData as SunLookup;

/** Day-of-year 1..365 for a given Date (UTC, so it's consistent server-side). */
export function dayOfYear(date: Date = new Date()): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor((now - start) / oneDay);
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Approximate day-of-year for the middle of each month
const MONTH_MID_DOY = [16, 46, 75, 106, 136, 167, 197, 228, 259, 289, 320, 350];

export interface SunStats {
  /** Year average avg-sun % */
  yearAvg: number;
  /** Sunniest month index (0=Jan) and value */
  bestMonth: { name: string; avg: number };
  /** Bleakest month */
  worstMonth: { name: string; avg: number };
  /** 12 numbers, monthly avg of avg-sun % */
  monthly: number[];
}

function computeSunStats(entry: SunEntry): SunStats {
  // Group days by calendar month using approx month boundaries
  const monthlyTotals = new Array(12).fill(0);
  const monthlyCounts = new Array(12).fill(0);
  const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let day = 0;
  for (let m = 0; m < 12; m++) {
    for (let d = 0; d < daysPerMonth[m] && day < entry.a.length; d++, day++) {
      monthlyTotals[m] += entry.a[day];
      monthlyCounts[m]++;
    }
  }
  const monthly = monthlyTotals.map((t, i) =>
    monthlyCounts[i] > 0 ? Math.round(t / monthlyCounts[i]) : 0
  );

  const yearAvg =
    entry.a.reduce((s, v) => s + v, 0) / Math.max(entry.a.length, 1);

  let bestIdx = 0;
  let worstIdx = 0;
  for (let i = 0; i < 12; i++) {
    if (monthly[i] > monthly[bestIdx]) bestIdx = i;
    if (monthly[i] < monthly[worstIdx]) worstIdx = i;
  }

  return {
    yearAvg: Math.round(yearAvg),
    bestMonth: { name: MONTH_LABELS[bestIdx], avg: monthly[bestIdx] },
    worstMonth: { name: MONTH_LABELS[worstIdx], avg: monthly[worstIdx] },
    monthly,
  };
}

/**
 * Inject today's (or a given day's) sun rating into a pub object.
 * Returns the same pub mutated with avgSunPercentage/bestSunPercentage.
 *
 * @param pub the pub to enrich
 * @param day day-of-year (1..365). Defaults to today.
 */
export function injectSun(pub: Pub, day?: number): Pub {
  const entry = sunLookup[pub.id];
  if (!entry) return pub;

  const d = day ?? dayOfYear();
  const idx = Math.max(0, Math.min(364, d - 1));

  pub.avgSunPercentage = entry.a[idx];
  pub.bestSunPercentage = entry.b[idx];
  pub.sunSource = "pubsinthesun.com";
  if (entry.image && !pub.heroImageUrl) {
    pub.heroImageUrl = entry.image;
  }
  return pub;
}

/** Bulk-inject sun for many pubs efficiently (computes day once). */
export function injectSunMany(pubs: Pub[], day?: number): Pub[] {
  const d = day ?? dayOfYear();
  const idx = Math.max(0, Math.min(364, d - 1));
  for (const pub of pubs) {
    const entry = sunLookup[pub.id];
    if (!entry) continue;
    pub.avgSunPercentage = entry.a[idx];
    pub.bestSunPercentage = entry.b[idx];
    pub.sunSource = "pubsinthesun.com";
    if (entry.image && !pub.heroImageUrl) {
      pub.heroImageUrl = entry.image;
    }
  }
  return pubs;
}

/** Get year-round stats for a single pub (for detail panel). */
export function getSunStatsFor(pubId: string): SunStats | null {
  const entry = sunLookup[pubId];
  if (!entry) return null;
  return computeSunStats(entry);
}

/** Does this pub have any year sun data at all? */
export function hasSunData(pubId: string): boolean {
  return pubId in sunLookup;
}
