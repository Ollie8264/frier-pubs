/**
 * Final enrichment pass:
 * 1. Chain pub discovery via Google Places (Wetherspoons, Greene King, etc.)
 * 2. Ratings for data-poor pubs
 * 3. Additional amenity queries we haven't tried yet
 *
 * Run with: GOOGLE_PLACES_API_KEY=... npx tsx scripts/enrich-final.ts
 */

import fs from "fs";
import path from "path";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("Set GOOGLE_PLACES_API_KEY env var");
  process.exit(1);
}

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  hasFood: boolean;
  hasLiveSport: boolean;
  hasPoolTable: boolean;
  hasDarts: boolean;
  hasBeerGarden: boolean;
  hasOutdoorSeating: boolean;
  hasDogFriendly: boolean;
  hasRealAle: boolean;
  hasQuizNight: boolean;
  hasLiveMusic: boolean;
  hasRealFire: boolean;
  hasWifi: boolean;
  [key: string]: unknown;
}

interface GooglePlace {
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  rating?: number;
}

function generateGrid(
  southLat: number, westLng: number, northLat: number, eastLng: number,
  rows: number, cols: number
): { lat: number; lng: number; radius: number }[] {
  const cells: { lat: number; lng: number; radius: number }[] = [];
  const latStep = (northLat - southLat) / rows;
  const lngStep = (eastLng - westLng) / cols;
  const radius = Math.max(latStep, lngStep) * 111000 * 0.7;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        lat: southLat + latStep * (r + 0.5),
        lng: westLng + lngStep * (c + 0.5),
        radius: Math.min(radius, 5000),
      });
    }
  }
  return cells;
}

const GRID_5x5 = generateGrid(51.42, -0.35, 51.60, 0.15, 5, 5);

async function searchPlaces(query: string, center: { lat: number; lng: number }, radius: number): Promise<GooglePlace[]> {
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": "places.displayName,places.location,places.rating",
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius } },
      maxResultCount: 20,
      languageCode: "en",
    }),
  });
  if (!resp.ok) {
    if (resp.status === 429) { await sleep(5000); return []; }
    return [];
  }
  const data = await resp.json();
  return data.places || [];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function findMatch(place: GooglePlace, pubs: Pub[]): Pub | null {
  if (!place.location || !place.displayName?.text) return null;
  const pName = place.displayName.text.toLowerCase();
  const pLat = place.location.latitude;
  const pLng = place.location.longitude;
  let best: Pub | null = null;
  let bestDist = Infinity;
  for (const pub of pubs) {
    const dist = Math.hypot(pub.lat - pLat, pub.lng - pLng);
    if (dist > 0.003) continue;
    const n = pub.name.toLowerCase();
    if (n.includes(pName) || pName.includes(n) || wordOverlap(n, pName) > 0.4) {
      if (dist < bestDist) { best = pub; bestDist = dist; }
    }
  }
  return best;
}

function wordOverlap(a: string, b: string): number {
  const clean = (s: string) => s.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const wa = new Set(clean(a));
  const wb = new Set(clean(b));
  const common = [...wa].filter(w => wb.has(w));
  return common.length / Math.max(wa.size, wb.size, 1);
}

// Chain amenity profiles
interface ChainSearch {
  queries: string[];
  amenities: Record<string, boolean>;
}

const CHAIN_SEARCHES: ChainSearch[] = [
  {
    queries: ["Wetherspoons pub", "JD Wetherspoon pub"],
    amenities: { hasFood: true, hasRealAle: true, hasWifi: true },
  },
  {
    queries: ["Greene King pub"],
    amenities: { hasFood: true, hasRealAle: true },
  },
  {
    queries: ["Stonegate pub London", "Slug and Lettuce London"],
    amenities: { hasFood: true, hasWifi: true },
  },
  {
    queries: ["Hungry Horse pub London"],
    amenities: { hasFood: true, hasLiveSport: true },
  },
  {
    queries: ["Craft Union pub London"],
    amenities: { hasLiveSport: true, hasPoolTable: true, hasDarts: true },
  },
];

// Additional amenity queries we haven't tried
const EXTRA_AMENITY_SEARCHES: { queries: string[]; field: string }[] = [
  { queries: ["pub karaoke London"], field: "hasLiveMusic" },
  { queries: ["pub with jukebox London"], field: "hasLiveMusic" },
  { queries: ["pub garden heated London", "pub terrace London"], field: "hasBeerGarden" },
  { queries: ["cask ale pub London", "CAMRA pub London", "real ale pub London"], field: "hasRealAle" },
  { queries: ["pub with TV screens London", "pub showing Champions League"], field: "hasLiveSport" },
  { queries: ["pub with board games London"], field: "hasQuizNight" },
];

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));
  let apiCalls = 0;

  // === Phase 1: Chain discovery ===
  console.log("=== Phase 1: Chain pub discovery ===");
  for (const chain of CHAIN_SEARCHES) {
    let found = 0;
    for (const query of chain.queries) {
      for (const cell of GRID_5x5) {
        const places = await searchPlaces(query, cell, cell.radius);
        apiCalls++;
        for (const place of places) {
          const match = findMatch(place, pubs);
          if (!match) continue;
          let changed = false;
          for (const [field, val] of Object.entries(chain.amenities)) {
            if (val && !match[field]) {
              match[field] = true;
              changed = true;
            }
          }
          if (place.rating && !match.rating) {
            match.rating = place.rating;
          }
          if (changed) found++;
        }
        await sleep(150);
      }
    }
    console.log(`  ${chain.queries[0]}: +${found} enriched`);
  }

  // === Phase 2: Extra amenity queries ===
  console.log("\n=== Phase 2: Extra amenity queries ===");
  for (const { queries, field } of EXTRA_AMENITY_SEARCHES) {
    let matches = 0;
    const seen = new Set<string>();
    for (const query of queries) {
      for (const cell of GRID_5x5) {
        const places = await searchPlaces(query, cell, cell.radius);
        apiCalls++;
        for (const place of places) {
          const match = findMatch(place, pubs);
          if (match && !match[field] && !seen.has(match.id)) {
            match[field] = true;
            seen.add(match.id);
            matches++;
            if (place.rating && !match.rating) match.rating = place.rating;
          }
        }
        await sleep(150);
      }
    }
    console.log(`  ${field}: +${matches}`);
  }

  // === Phase 3: Ratings for data-poor pubs ===
  console.log("\n=== Phase 3: Ratings for data-poor pubs ===");
  const noRating = pubs.filter(p => !p.rating).slice(0, 300);
  let ratingsAdded = 0;

  for (let i = 0; i < noRating.length; i++) {
    const pub = noRating[i];
    const places = await searchPlaces(
      `"${pub.name}" pub`,
      { lat: pub.lat, lng: pub.lng },
      500
    );
    apiCalls++;

    if (places[0]?.rating) {
      const match = findMatch(places[0], [pub]);
      if (match) {
        match.rating = places[0].rating;
        ratingsAdded++;
      }
    }

    if (i % 50 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${noRating.length}, ratings added: ${ratingsAdded}`);
    }
    await sleep(100);
  }
  console.log(`  Ratings added: ${ratingsAdded}`);

  // === Summary ===
  const cost = (apiCalls / 1000) * 32;
  console.log(`\n=== Final Summary ===`);
  console.log(`API calls: ${apiCalls}`);
  console.log(`Estimated cost: ~$${cost.toFixed(2)}`);

  const stats = {
    total: pubs.length,
    withFood: pubs.filter(p => p.hasFood).length,
    withSport: pubs.filter(p => p.hasLiveSport).length,
    withPool: pubs.filter(p => p.hasPoolTable).length,
    withDarts: pubs.filter(p => p.hasDarts).length,
    withBeerGarden: pubs.filter(p => p.hasBeerGarden).length,
    withOutdoorSeating: pubs.filter(p => p.hasOutdoorSeating).length,
    withDogFriendly: pubs.filter(p => p.hasDogFriendly).length,
    withRealAle: pubs.filter(p => p.hasRealAle).length,
    withQuizNight: pubs.filter(p => p.hasQuizNight).length,
    withWifi: pubs.filter(p => p.hasWifi).length,
    withLiveMusic: pubs.filter(p => p.hasLiveMusic).length,
    withRealFire: pubs.filter(p => p.hasRealFire).length,
    withRating: pubs.filter(p => p.rating).length,
    withHygieneRating: pubs.filter(p => p.hygieneRating !== undefined).length,
    withZeroAmenities: pubs.filter(p =>
      !p.hasFood && !p.hasLiveSport && !p.hasPoolTable && !p.hasDarts &&
      !p.hasBeerGarden && !p.hasOutdoorSeating && !p.hasDogFriendly &&
      !p.hasRealAle && !p.hasQuizNight && !p.hasLiveMusic && !p.hasRealFire && !p.hasWifi
    ).length,
  };
  console.log("\nCoverage:", JSON.stringify(stats, null, 2));

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`\nWrote to ${pubsPath}`);
}

run().catch(err => { console.error("Failed:", err); process.exit(1); });
