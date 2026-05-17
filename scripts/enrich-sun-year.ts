/**
 * Fetches sun-exposure data for EVERY day of the year from pubsinthesun.com,
 * then stores it in a compact per-pub lookup keyed by day-of-year.
 *
 * Why: PITS's sun ratings change dramatically by date (a pub might be 0% sunny
 * in December but 70% in June). One snapshot isn't enough. We fetch all 365
 * days once, then the live app serves today's value automatically — no runtime
 * calls to PITS.
 *
 * Output: src/data/sun-by-day.json
 *   Shape: { [pubId]: { a: number[365], b: number[365], image?: string } }
 *   where a = avg sun %, b = best sun %, image = hero photo URL
 *
 * Takes ~20 minutes (365 requests with 3s delays — respectful of their API).
 *
 * Run with: npx tsx scripts/enrich-sun-year.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  [key: string]: unknown;
}

interface PITSPub {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  google_place_id?: string | null;
  hero_image_url?: string;
  avg_sun_percentage?: number;
  best_sun_percentage?: number;
}

interface SunLookup {
  [pubId: string]: {
    a: number[]; // avg sun %, one per day-of-year (length 365)
    b: number[]; // best sun %
    image?: string;
  };
}

const API_BASE = "https://www.pubsinthesun.com/api/pubs?includeSunData=true&dayOfYear=";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};
const REQUEST_DELAY_MS = 3000; // Be polite — 3s between requests
const MAX_RETRIES = 3;

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

function buildMatchIndex(
  pitsList: PITSPub[],
  pubs: Pub[]
): Map<number, string> {
  // For each PITS pub, find best matching local pub and record pubId
  const map = new Map<number, string>();
  for (const pits of pitsList) {
    let best: { pubId: string; dist: number } | null = null;
    for (const pub of pubs) {
      const d = distMetres(pits.latitude, pits.longitude, pub.lat, pub.lng);
      if (d > 80) continue;
      const pitsName = pits.name.split(",")[0].trim();
      if (namesSimilar(pub.name, pitsName)) {
        if (!best || d < best.dist) best = { pubId: pub.id, dist: d };
      }
    }
    if (best) map.set(pits.id, best.pubId);
  }
  return map;
}

async function fetchDay(dayOfYear: number): Promise<PITSPub[]> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(`${API_BASE}${dayOfYear}`, {
        headers: HEADERS,
      });
      if (resp.status === 429) {
        const wait = 10 * attempt;
        console.warn(`  Rate limited on day ${dayOfYear}, waiting ${wait}s...`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const wait = 5 * attempt;
      console.warn(`  Day ${dayOfYear} attempt ${attempt} failed: ${err}. Retrying in ${wait}s...`);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  }
  return [];
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const sunOutPath = path.join(process.cwd(), "src", "data", "sun-by-day.json");

  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));
  console.log(`Loaded ${pubs.length} local pubs`);

  // ── First pass: get any day, build PITS→local pub ID map ──
  console.log("\nBuilding match index from a single PITS fetch...");
  const seedList = await fetchDay(137);
  console.log(`PITS returned ${seedList.length} pubs`);

  const matchIndex = buildMatchIndex(seedList, pubs);
  console.log(`Matched ${matchIndex.size} / ${seedList.length} PITS pubs to our data`);

  // Initialise lookup with empty arrays
  const lookup: SunLookup = {};
  for (const pitsId of matchIndex.keys()) {
    const localId = matchIndex.get(pitsId)!;
    lookup[localId] = {
      a: new Array(365).fill(0),
      b: new Array(365).fill(0),
    };
  }

  // Capture hero image from seed pass (it doesn't vary by day)
  for (const pits of seedList) {
    const localId = matchIndex.get(pits.id);
    if (localId && pits.hero_image_url) {
      lookup[localId].image = pits.hero_image_url;
    }
  }

  // ── Second pass: fetch every day, fill in the arrays ──
  console.log(`\nFetching all 365 days (with ${REQUEST_DELAY_MS}ms delay between requests)...`);
  console.log(`Estimated total time: ~${Math.round((365 * REQUEST_DELAY_MS) / 60000)} minutes\n`);

  const startTime = Date.now();
  // Process day 137 first using the seed data we already have
  for (const pits of seedList) {
    const localId = matchIndex.get(pits.id);
    if (!localId) continue;
    if (pits.avg_sun_percentage !== undefined) {
      lookup[localId].a[136] = pits.avg_sun_percentage; // dayOfYear is 1-indexed → array idx
    }
    if (pits.best_sun_percentage !== undefined) {
      lookup[localId].b[136] = pits.best_sun_percentage;
    }
  }

  let failures = 0;
  for (let day = 1; day <= 365; day++) {
    if (day === 137) continue; // already populated from seed

    try {
      const list = await fetchDay(day);
      for (const pits of list) {
        const localId = matchIndex.get(pits.id);
        if (!localId) continue;
        const idx = day - 1; // dayOfYear is 1-indexed
        if (pits.avg_sun_percentage !== undefined) {
          lookup[localId].a[idx] = pits.avg_sun_percentage;
        }
        if (pits.best_sun_percentage !== undefined) {
          lookup[localId].b[idx] = pits.best_sun_percentage;
        }
      }
    } catch (err) {
      failures++;
      console.warn(`Day ${day} failed permanently: ${err}`);
    }

    // Progress
    if (day % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = day / elapsed;
      const eta = Math.round((365 - day) / rate);
      process.stdout.write(
        `\r  Day ${day}/365 — ${Math.round(elapsed)}s elapsed, ETA ${eta}s${failures > 0 ? `, ${failures} failures` : ""}`
      );
    }

    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }
  process.stdout.write("\n");

  console.log(`\nCompleted in ${Math.round((Date.now() - startTime) / 1000)}s with ${failures} failed days`);

  // ── Compact JSON output ──
  fs.writeFileSync(sunOutPath, JSON.stringify(lookup));
  const stats = fs.statSync(sunOutPath);
  console.log(`Wrote ${Object.keys(lookup).length} pubs × 365 days to ${sunOutPath}`);
  console.log(`File size: ${Math.round(stats.size / 1024)}KB`);

  // ── Compute & print summary stats per pub for sanity check ──
  console.log("\nSample data:");
  const samples = Object.entries(lookup).slice(0, 3);
  for (const [id, data] of samples) {
    const pub = pubs.find((p) => p.id === id);
    const yearAvg = data.a.reduce((s, v) => s + v, 0) / data.a.length;
    const bestMonth = data.a.indexOf(Math.max(...data.a));
    const worstMonth = data.a.indexOf(Math.min(...data.a));
    console.log(
      `  ${pub?.name}: year avg ${yearAvg.toFixed(1)}%, peak day ${bestMonth + 1} (${data.a[bestMonth]}%), worst day ${worstMonth + 1} (${data.a[worstMonth]}%)`
    );
  }
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
