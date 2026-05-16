/**
 * Enriches pub data using Google Places API (New) — cost-efficient approach.
 * Instead of looking up each pub individually (~$150), does area-based searches
 * for specific amenities across a London grid, then matches to existing pubs (~$8).
 *
 * Run with: GOOGLE_PLACES_API_KEY=... npx tsx scripts/enrich-pubs.ts
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
  openingHours?: string;
  phone?: string;
  website?: string;
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
  description?: string;
  [key: string]: unknown;
}

interface GooglePlace {
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  rating?: number;
}

// London grid: break into ~25 cells for good coverage
const LONDON_GRID = generateGrid(51.42, -0.35, 51.60, 0.15, 5, 5);

function generateGrid(
  southLat: number,
  westLng: number,
  northLat: number,
  eastLng: number,
  rows: number,
  cols: number
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
        circle: {
          center: { latitude: center.lat, longitude: center.lng },
          radius,
        },
      },
      maxResultCount: 20,
      languageCode: "en",
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429) {
      console.warn("  Rate limited, waiting 5s...");
      await sleep(5000);
      return [];
    }
    console.warn(`  API error ${resp.status}`);
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
    if (dist > 0.002) continue; // ~200m threshold

    const pubName = pub.name.toLowerCase();
    const nameMatch =
      pubName.includes(placeName) ||
      placeName.includes(pubName) ||
      nameSimilarity(pubName, placeName) > 0.5;

    if (nameMatch && dist < bestDist) {
      bestMatch = pub;
      bestDist = dist;
    }
  }

  return bestMatch;
}

function nameSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.replace(/[^a-z0-9\s]/g, "").split(/\s+/));
  const wordsB = new Set(b.replace(/[^a-z0-9\s]/g, "").split(/\s+/));
  const common = [...wordsA].filter((w) => wordsB.has(w) && w.length > 2);
  return common.length / Math.max(wordsA.size, wordsB.size);
}

interface AmenitySearch {
  queries: string[];
  field: keyof Pub;
}

const AMENITY_SEARCHES: AmenitySearch[] = [
  {
    queries: [
      "pub showing live sport",
      "pub with big screen sport",
      "pub showing football",
      "sports bar pub",
    ],
    field: "hasLiveSport",
  },
  {
    queries: ["pub with pool table", "pub with snooker table"],
    field: "hasPoolTable",
  },
  {
    queries: ["pub with darts", "pub with dartboard"],
    field: "hasDarts",
  },
  {
    queries: ["pub with beer garden"],
    field: "hasBeerGarden",
  },
  {
    queries: ["pub quiz night"],
    field: "hasQuizNight",
  },
  {
    queries: ["dog friendly pub"],
    field: "hasDogFriendly",
  },
];

async function enrichPubs() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  console.log(`Enriching ${pubs.length} pubs with Google Places data...`);
  console.log(`Using ${LONDON_GRID.length} grid cells x ${AMENITY_SEARCHES.length} amenity types`);

  let totalApiCalls = 0;
  const enrichmentCounts: Record<string, number> = {};

  for (const amenity of AMENITY_SEARCHES) {
    let matchCount = 0;
    console.log(`\nSearching for: ${amenity.field}`);

    for (const query of amenity.queries) {
      for (const cell of LONDON_GRID) {
        const places = await searchPlaces(`${query} London`, cell, cell.radius);
        totalApiCalls++;

        for (const place of places) {
          const match = findMatchingPub(place, pubs);
          if (match && !(match as Record<string, unknown>)[amenity.field]) {
            (match as Record<string, unknown>)[amenity.field] = true;
            matchCount++;

            if (place.rating && !match.rating) {
              match.rating = place.rating;
            }
          }
        }

        await sleep(200);
      }
    }

    enrichmentCounts[amenity.field] = matchCount;
    console.log(`  Found ${matchCount} new matches`);
  }

  // Also do a ratings pass for popular pubs without ratings
  console.log("\nFetching ratings for top pubs...");
  const pubsWithoutRatings = pubs
    .filter((p) => !p.rating && p.openingHours)
    .slice(0, 200);

  for (let i = 0; i < pubsWithoutRatings.length; i += 10) {
    const batch = pubsWithoutRatings.slice(i, i + 10);

    for (const pub of batch) {
      const places = await searchPlaces(
        `"${pub.name}" pub ${pub.address || "London"}`,
        { lat: pub.lat, lng: pub.lng },
        300
      );
      totalApiCalls++;

      if (places[0]?.rating) {
        const match = findMatchingPub(places[0], [pub]);
        if (match) {
          match.rating = places[0].rating;
        }
      }
    }

    await sleep(300);

    if (i % 50 === 0) {
      console.log(`  Ratings progress: ${i}/${pubsWithoutRatings.length}`);
    }
  }

  console.log(`\n=== Enrichment Complete ===`);
  console.log(`Total API calls: ${totalApiCalls}`);
  console.log(`Estimated cost: ~$${((totalApiCalls / 1000) * 32).toFixed(2)}`);
  console.log(`\nNew matches by amenity:`, JSON.stringify(enrichmentCounts, null, 2));

  const stats = {
    total: pubs.length,
    withFood: pubs.filter((p) => p.hasFood).length,
    withSport: pubs.filter((p) => p.hasLiveSport).length,
    withPool: pubs.filter((p) => p.hasPoolTable).length,
    withDarts: pubs.filter((p) => p.hasDarts).length,
    withBeerGarden: pubs.filter((p) => p.hasBeerGarden).length,
    withOutdoorSeating: pubs.filter((p) => p.hasOutdoorSeating).length,
    withDogFriendly: pubs.filter((p) => p.hasDogFriendly).length,
    withQuizNight: pubs.filter((p) => p.hasQuizNight).length,
    withRating: pubs.filter((p) => p.rating).length,
  };
  console.log("\nFinal data coverage:", JSON.stringify(stats, null, 2));

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`\nWrote enriched data to ${pubsPath}`);
}

enrichPubs().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
