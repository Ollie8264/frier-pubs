/**
 * Audit phase 1: PITS unmatched pubs.
 *
 * We have 1000 PITS pubs but only matched 629. The remaining 371 might be
 * pubs in central London that we're missing entirely (or that didn't match
 * by name despite being in our area).
 *
 * For each unmatched PITS pub in our central London bounding box, add it
 * to pubs.json with PITS-sourced fields (name, lat/lng, hero image, sun
 * data, etc.).
 *
 * Run with: npx tsx scripts/audit-missing-pits.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  rating?: number;
  heroImageUrl?: string;
  avgSunPercentage?: number;
  bestSunPercentage?: number;
  sunSource?: string;
  hasFood?: boolean;
  hasLiveSport?: boolean;
  hasPoolTable?: boolean;
  hasDarts?: boolean;
  hasBeerGarden?: boolean;
  hasOutdoorSeating?: boolean;
  hasDogFriendly?: boolean;
  hasRealAle?: boolean;
  hasQuizNight?: boolean;
  hasLiveMusic?: boolean;
  hasRealFire?: boolean;
  hasWifi?: boolean;
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
  venue_type?: string;
}

const CENTRAL_BOX = {
  south: 51.47, north: 51.56, west: -0.22, east: 0.01,
};

const inCentralLondon = (lat: number, lng: number) =>
  lat >= CENTRAL_BOX.south && lat <= CENTRAL_BOX.north &&
  lng >= CENTRAL_BOX.west && lng <= CENTRAL_BOX.east;

function normalise(s: string): string {
  return s.toLowerCase().replace(/^the\s+/, "").replace(/&/g, "and").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function distMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function alreadyExists(pits: PITSPub, pubs: Pub[]): boolean {
  // ANY existing pub within 50m with similar name = match (avoid duplicates)
  const pitsName = normalise(pits.name.split(",")[0].trim());
  for (const pub of pubs) {
    const d = distMetres(pits.latitude, pits.longitude, pub.lat, pub.lng);
    if (d > 60) continue;
    const localName = normalise(pub.name);
    if (
      localName === pitsName ||
      localName.includes(pitsName) ||
      pitsName.includes(localName) ||
      wordOverlap(localName, pitsName) > 0.5
    ) return true;
    // Within 30m without name match → still likely same place
    if (d < 30) return true;
  }
  return false;
}

function wordOverlap(a: string, b: string): number {
  const clean = (s: string) => s.split(/\s+/).filter((w) => w.length > 2);
  const wa = new Set(clean(a));
  const wb = new Set(clean(b));
  if (wa.size === 0 || wb.size === 0) return 0;
  const common = [...wa].filter((w) => wb.has(w));
  return common.length / Math.min(wa.size, wb.size);
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));
  console.log(`Loaded ${pubs.length} existing pubs`);

  console.log("Fetching PITS catalogue...");
  const resp = await fetch(
    "https://www.pubsinthesun.com/api/pubs?includeSunData=true&dayOfYear=137",
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    }
  );
  if (!resp.ok) throw new Error(`PITS HTTP ${resp.status}`);
  const pitsList: PITSPub[] = await resp.json();
  console.log(`Got ${pitsList.length} PITS pubs`);

  // Filter to ones in our central London box
  const centralPITS = pitsList.filter((p) => inCentralLondon(p.latitude, p.longitude));
  console.log(`In central London box: ${centralPITS.length}`);

  // Find ones we don't already have
  let added = 0;
  const newAdditions: { name: string; address?: string }[] = [];

  for (const pits of centralPITS) {
    if (alreadyExists(pits, pubs)) continue;

    // Clean up name — strip trailing ", Some Street" if present (common PITS pattern)
    const cleanName = pits.name.split(",")[0].trim();

    const newPub: Pub = {
      id: `pits-${pits.id}`,
      name: cleanName,
      lat: pits.latitude,
      lng: pits.longitude,
      address: pits.address_text,
      heroImageUrl: pits.hero_image_url,
      avgSunPercentage: pits.avg_sun_percentage,
      bestSunPercentage: pits.best_sun_percentage,
      sunSource: "pubsinthesun.com",
      hasFood: false,
      hasLiveSport: false,
      hasPoolTable: false,
      hasDarts: false,
      hasBeerGarden: false,
      hasOutdoorSeating: true, // PITS only catalogues pubs with outdoor space
      hasDogFriendly: false,
      hasRealAle: false,
      hasQuizNight: false,
      hasLiveMusic: false,
      hasRealFire: false,
      hasWifi: false,
    };
    pubs.push(newPub);
    added++;
    newAdditions.push({ name: cleanName, address: pits.address_text });
  }

  console.log(`\nAdded ${added} new pubs from PITS`);
  console.log("\nSample additions:");
  newAdditions.slice(0, 15).forEach((p) =>
    console.log(`  + ${p.name}${p.address ? " · " + p.address.substring(0, 60) : ""}`)
  );
  if (newAdditions.length > 15) console.log(`  ... and ${newAdditions.length - 15} more`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`\nWrote to ${pubsPath} — now ${pubs.length} venues`);
}

run().catch((err) => { console.error("Failed:", err); process.exit(1); });
