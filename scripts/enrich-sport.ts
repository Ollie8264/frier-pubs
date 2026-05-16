/**
 * Targeted sport enrichment using dense grid + broadcaster-specific queries.
 * Uses basic fields only ($32/1000) to keep costs low.
 *
 * Run with: GOOGLE_PLACES_API_KEY=... npx tsx scripts/enrich-sport.ts
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
  address?: string;
  rating?: number;
  hasLiveSport: boolean;
  hasPoolTable: boolean;
  hasDarts: boolean;
  hasBeerGarden: boolean;
  hasOutdoorSeating: boolean;
  hasQuizNight: boolean;
  hasDogFriendly: boolean;
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
  const radius = Math.max(latStep, lngStep) * 111000 * 0.6;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        lat: southLat + latStep * (r + 0.5),
        lng: westLng + lngStep * (c + 0.5),
        radius: Math.min(radius, 3000),
      });
    }
  }
  return cells;
}

// Dense 10x10 grid across London
const GRID = generateGrid(51.42, -0.35, 51.60, 0.15, 10, 10);

const SPORT_QUERIES = [
  "pub with Sky Sports",
  "pub with TNT Sports",
  "pub showing live football",
  "pub showing Premier League",
  "pub showing live sport",
  "pub big screen sports",
];

const OTHER_QUERIES: { queries: string[]; field: string }[] = [
  { queries: ["pub with pool table billiards"], field: "hasPoolTable" },
  { queries: ["pub with dartboard darts"], field: "hasDarts" },
  { queries: ["pub beer garden outdoor seating"], field: "hasBeerGarden" },
  { queries: ["pub quiz night trivia"], field: "hasQuizNight" },
  { queries: ["dog friendly pub dogs welcome"], field: "hasDogFriendly" },
];

async function searchPlaces(
  query: string,
  center: { lat: number; lng: number },
  radius: number
): Promise<GooglePlace[]> {
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": "places.displayName,places.location,places.rating",
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: { center: { latitude: center.lat, longitude: center.lng }, radius },
      },
      maxResultCount: 20,
      languageCode: "en",
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429) {
      await sleep(5000);
      return [];
    }
    return [];
  }

  const data = await resp.json();
  return data.places || [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findMatchingPub(place: GooglePlace, pubs: Pub[]): Pub | null {
  if (!place.location || !place.displayName?.text) return null;

  const placeName = place.displayName.text.toLowerCase();
  const placeLat = place.location.latitude;
  const placeLng = place.location.longitude;

  let bestMatch: Pub | null = null;
  let bestDist = Infinity;

  for (const pub of pubs) {
    const dist = Math.hypot(pub.lat - placeLat, pub.lng - placeLng);
    if (dist > 0.003) continue;

    const pubName = pub.name.toLowerCase();
    const nameMatch =
      pubName.includes(placeName) ||
      placeName.includes(pubName) ||
      wordOverlap(pubName, placeName) > 0.4;

    if (nameMatch && dist < bestDist) {
      bestMatch = pub;
      bestDist = dist;
    }
  }

  return bestMatch;
}

function wordOverlap(a: string, b: string): number {
  const clean = (s: string) => s.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const wordsA = new Set(clean(a));
  const wordsB = new Set(clean(b));
  const common = [...wordsA].filter(w => wordsB.has(w));
  return common.length / Math.max(wordsA.size, wordsB.size, 1);
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  console.log(`Dense sport enrichment: ${GRID.length} grid cells`);
  console.log(`Sport queries: ${SPORT_QUERIES.length}, Other: ${OTHER_QUERIES.length}`);

  let apiCalls = 0;
  let sportMatches = 0;
  const seenSport = new Set<string>();

  // Sport enrichment
  for (const query of SPORT_QUERIES) {
    console.log(`\nQuery: "${query}"`);
    let queryMatches = 0;

    for (let i = 0; i < GRID.length; i++) {
      const cell = GRID[i];
      const places = await searchPlaces(query, cell, cell.radius);
      apiCalls++;

      for (const place of places) {
        const match = findMatchingPub(place, pubs);
        if (match && !match.hasLiveSport && !seenSport.has(match.id)) {
          match.hasLiveSport = true;
          seenSport.add(match.id);
          sportMatches++;
          queryMatches++;

          if (place.rating && !match.rating) {
            match.rating = place.rating;
          }
        }
      }

      await sleep(150);
    }

    console.log(`  +${queryMatches} sport pubs`);
  }

  // Other amenity enrichment
  for (const { queries, field } of OTHER_QUERIES) {
    let matches = 0;
    for (const query of queries) {
      for (const cell of GRID) {
        const places = await searchPlaces(query, cell, cell.radius);
        apiCalls++;

        for (const place of places) {
          const match = findMatchingPub(place, pubs);
          if (match && !match[field]) {
            (match as Record<string, unknown>)[field] = true;
            matches++;

            if (place.rating && !match.rating) {
              match.rating = place.rating;
            }
          }
        }

        await sleep(150);
      }
    }
    console.log(`\n${field}: +${matches}`);
  }

  const cost = (apiCalls / 1000) * 32;
  console.log(`\n=== Done ===`);
  console.log(`API calls: ${apiCalls}`);
  console.log(`Estimated cost: ~$${cost.toFixed(2)}`);
  console.log(`New sport pubs found: ${sportMatches}`);

  const stats = {
    total: pubs.length,
    withSport: pubs.filter(p => p.hasLiveSport).length,
    withPool: pubs.filter(p => p.hasPoolTable).length,
    withDarts: pubs.filter(p => p.hasDarts).length,
    withBeerGarden: pubs.filter(p => p.hasBeerGarden).length,
    withDogFriendly: pubs.filter(p => p.hasDogFriendly).length,
    withQuizNight: pubs.filter(p => p.hasQuizNight).length,
    withRating: pubs.filter(p => p.rating).length,
  };
  console.log("\nFinal coverage:", JSON.stringify(stats, null, 2));

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
