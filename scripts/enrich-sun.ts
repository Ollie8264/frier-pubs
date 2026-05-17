/**
 * Enriches pub data with sun-exposure ratings from pubsinthesun.com.
 *
 * Their public API returns per-pub ray-traced sun coverage data — what
 * percentage of the pub's outdoor area is in direct sunlight on average,
 * the peak percentage, and the time of peak sun.
 *
 * We snapshot the avg/peak values into our data so the live app can filter
 * for "sunny pubs" without ever hitting their API.
 *
 * Credit: data from https://www.pubsinthesun.com
 *
 * Run with: npx tsx scripts/enrich-sun.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  avgSunPercentage?: number;
  bestSunPercentage?: number;
  sunSource?: string;
  heroImageUrl?: string;
  [key: string]: unknown;
}

interface PITSPub {
  id: number;
  name: string;
  address_text?: string;
  latitude: number;
  longitude: number;
  google_place_id?: string | null;
  hero_image_url?: string;
  avg_sun_percentage?: number;
  best_sun_percentage?: number;
  best_sun_time?: [number, number];
}

const API_URL = "https://www.pubsinthesun.com/api/pubs?includeSunData=true&dayOfYear=137";

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function namesSimilar(a: string, b: string): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return true;
  if (na.length < 3 || nb.length < 3) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  // word overlap
  const wa = new Set(na.split(/\s+/).filter((w) => w.length > 2));
  const wb = new Set(nb.split(/\s+/).filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return false;
  const common = [...wa].filter((w) => wb.has(w));
  return common.length / Math.min(wa.size, wb.size) > 0.6;
}

function distMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 *
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findMatch(pits: PITSPub, pubs: Pub[]): Pub | null {
  // Step 1: try strict proximity + name match
  let best: { pub: Pub; dist: number } | null = null;
  for (const pub of pubs) {
    const d = distMetres(pits.latitude, pits.longitude, pub.lat, pub.lng);
    if (d > 80) continue;
    // Strip the leading address (some PITS names have ", Oxford Street" appended)
    const pitsName = pits.name.split(",")[0].trim();
    if (namesSimilar(pub.name, pitsName)) {
      if (!best || d < best.dist) best = { pub, dist: d };
    }
  }
  return best?.pub ?? null;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  console.log(`Fetching sun data from pubsinthesun.com...`);
  const resp = await fetch(API_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const pitsList: PITSPub[] = await resp.json();
  console.log(`Got ${pitsList.length} pubs with sun data`);

  let matched = 0;
  let updated = 0;
  let withImage = 0;
  const unmatched: string[] = [];

  for (const pits of pitsList) {
    const pub = findMatch(pits, pubs);
    if (!pub) {
      unmatched.push(pits.name);
      continue;
    }
    matched++;

    if (pits.avg_sun_percentage !== undefined && pub.avgSunPercentage === undefined) {
      pub.avgSunPercentage = pits.avg_sun_percentage;
      updated++;
    }
    if (pits.best_sun_percentage !== undefined && pub.bestSunPercentage === undefined) {
      pub.bestSunPercentage = pits.best_sun_percentage;
    }
    if (pits.hero_image_url && !pub.heroImageUrl) {
      pub.heroImageUrl = pits.hero_image_url;
      withImage++;
    }
    pub.sunSource = "pubsinthesun.com";
  }

  console.log(`\nMatched: ${matched} / ${pitsList.length}`);
  console.log(`Updated with sun data: ${updated}`);
  console.log(`Updated with hero image: ${withImage}`);
  console.log(`Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0 && unmatched.length < 30) {
    console.log("\nSample unmatched:");
    unmatched.slice(0, 10).forEach((n) => console.log("  - " + n));
  }

  // Sun coverage summary
  const withSun = pubs.filter((p) => p.avgSunPercentage !== undefined);
  console.log(`\nTotal pubs with sun data: ${withSun.length}`);
  const sunny = pubs.filter((p) => (p.avgSunPercentage ?? 0) >= 70);
  const verySunny = pubs.filter((p) => (p.avgSunPercentage ?? 0) >= 85);
  console.log(`Sunny (>=70% avg): ${sunny.length}`);
  console.log(`Very sunny (>=85% avg): ${verySunny.length}`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`\nWrote to ${pubsPath}`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
