/**
 * Enriches pub data with FHRS (Food Hygiene Rating Scheme) data.
 * Free API, no key needed. Adds hygiene ratings and confirms food-serving status.
 *
 * Run with: npx tsx scripts/enrich-fhrs.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hasFood: boolean;
  hygieneRating?: number | string;
  [key: string]: unknown;
}

interface FHRSEstablishment {
  BusinessName: string;
  RatingValue: string;
  geocode: { latitude: string; longitude: string };
  AddressLine1?: string;
  PostCode?: string;
}

const API_BASE = "https://api.ratings.food.gov.uk";
const HEADERS = { "x-api-version": "2", "accept": "application/json" };

async function fetchAllFHRSPubs(): Promise<FHRSEstablishment[]> {
  const allPubs: FHRSEstablishment[] = [];
  const pageSize = 200;
  let page = 1;
  let totalPages = 1;

  console.log("Fetching FHRS data for London pubs...");

  while (page <= totalPages) {
    const url = `${API_BASE}/Establishments?latitude=51.509&longitude=-0.118&maxDistanceLimit=25&businessTypeId=7843&pageSize=${pageSize}&pageNumber=${page}`;

    const resp = await fetch(url, { headers: HEADERS });
    if (!resp.ok) {
      console.warn(`Page ${page} failed: ${resp.status}`);
      break;
    }

    const data = await resp.json();
    totalPages = data.meta.totalPages;
    allPubs.push(...data.establishments);

    if (page % 5 === 0) {
      console.log(`  Page ${page}/${totalPages} (${allPubs.length} pubs so far)`);
    }

    page++;
    await new Promise((r) => setTimeout(r, 200));
  }

  return allPubs;
}

function matchFHRSToPub(fhrs: FHRSEstablishment, pubs: Pub[]): Pub | null {
  const lat = parseFloat(fhrs.geocode?.latitude);
  const lng = parseFloat(fhrs.geocode?.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  const fhrsName = fhrs.BusinessName.toLowerCase();

  let bestMatch: Pub | null = null;
  let bestDist = Infinity;

  for (const pub of pubs) {
    const dist = Math.hypot(pub.lat - lat, pub.lng - lng);
    if (dist > 0.002) continue;

    const pubName = pub.name.toLowerCase();
    const nameMatch =
      pubName.includes(fhrsName) ||
      fhrsName.includes(pubName) ||
      wordOverlap(pubName, fhrsName) > 0.4;

    if (nameMatch && dist < bestDist) {
      bestMatch = pub;
      bestDist = dist;
    }
  }

  return bestMatch;
}

function wordOverlap(a: string, b: string): number {
  const clean = (s: string) =>
    s.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
  const wordsA = new Set(clean(a));
  const wordsB = new Set(clean(b));
  const common = [...wordsA].filter((w) => wordsB.has(w));
  return common.length / Math.max(wordsA.size, wordsB.size, 1);
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  const fhrsPubs = await fetchAllFHRSPubs();
  console.log(`\nFetched ${fhrsPubs.length} FHRS establishments`);

  let matched = 0;
  let hygieneAdded = 0;
  let foodConfirmed = 0;

  for (const fhrs of fhrsPubs) {
    const match = matchFHRSToPub(fhrs, pubs);
    if (!match) continue;

    matched++;

    const rating = fhrs.RatingValue;
    if (rating && !match.hygieneRating) {
      match.hygieneRating = isNaN(Number(rating)) ? rating : Number(rating);
      hygieneAdded++;
    }

    if (!match.hasFood) {
      match.hasFood = true;
      foodConfirmed++;
    }
  }

  console.log(`\nMatched ${matched} FHRS entries to our pubs`);
  console.log(`Hygiene ratings added: ${hygieneAdded}`);
  console.log(`Food status confirmed: ${foodConfirmed}`);

  const stats = {
    total: pubs.length,
    withHygieneRating: pubs.filter((p) => p.hygieneRating !== undefined).length,
    withFood: pubs.filter((p) => p.hasFood).length,
  };
  console.log("\nCoverage:", JSON.stringify(stats, null, 2));

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
