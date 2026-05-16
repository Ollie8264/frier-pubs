/**
 * Fetches London bars from OSM (amenity=bar) and merges with existing pub data.
 * Also does a Google Places sweep to find venues missing from OSM entirely.
 *
 * Run with: GOOGLE_PLACES_API_KEY=... npx tsx scripts/fetch-bars.ts
 */

import fs from "fs";
import path from "path";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

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
  hygieneRating?: number | string;
  description?: string;
  [key: string]: unknown;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_URL = "https://lz4.overpass-api.de/api/interpreter";
const LONDON_BBOX = "51.28,-0.51,51.69,0.33";

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["yes", "true", "1"].includes(value.toLowerCase());
}

function transformBar(el: OverpassElement): Pub | null {
  const tags = el.tags || {};
  const name = tags["name"];
  if (!name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null;

  const addressParts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"] || tags["addr:suburb"],
    tags["addr:postcode"],
  ].filter(Boolean);

  const sportVal = (tags["sport"] || "").toLowerCase();
  const sportTypes = sportVal ? sportVal.split(";").map(s => s.trim()) : [];
  const viewingSports = ["soccer", "football", "rugby", "cricket", "tennis", "boxing", "yes", "tv"];

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    lat,
    lng,
    address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
    openingHours: tags["opening_hours"] || undefined,
    phone: tags["phone"] || tags["contact:phone"] || undefined,
    website: tags["website"] || tags["contact:website"] || undefined,
    hasFood: !!(tags["food"] === "yes" || tags["cuisine"] || tags["diet:vegetarian"] || tags["diet:vegan"]),
    hasLiveSport: !!(parseBoolean(tags["tv"]) || parseBoolean(tags["live_sport"]) || sportTypes.some(s => viewingSports.includes(s))),
    hasPoolTable: !!(parseBoolean(tags["pool_table"]) || sportTypes.some(s => ["billiards", "pool", "snooker"].includes(s))),
    hasDarts: !!(parseBoolean(tags["darts"]) || sportTypes.includes("darts")),
    hasBeerGarden: parseBoolean(tags["beer_garden"]),
    hasOutdoorSeating: parseBoolean(tags["outdoor_seating"]) || parseBoolean(tags["beer_garden"]),
    hasDogFriendly: parseBoolean(tags["dog"]) || tags["dog"] === "yes",
    hasRealAle: parseBoolean(tags["real_ale"]),
    hasQuizNight: !!(tags["quiz"] || tags["quiznight"]),
    hasLiveMusic: parseBoolean(tags["live_music"]),
    hasRealFire: parseBoolean(tags["real_fire"]),
    hasWifi: parseBoolean(tags["internet_access"]) || tags["internet_access"] === "wlan" || parseBoolean(tags["wifi"]),
    description: tags["description"] || undefined,
  };
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

async function searchPlaces(query: string, center: { lat: number; lng: number }, radius: number): Promise<GooglePlace[]> {
  if (!API_KEY) return [];
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
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
    if (resp.status === 429) await new Promise(r => setTimeout(r, 5000));
    return [];
  }
  const data = await resp.json();
  return data.places || [];
}

function isDuplicate(newPub: { lat: number; lng: number; name: string }, existingPubs: Pub[]): boolean {
  for (const pub of existingPubs) {
    const dist = Math.hypot(pub.lat - newPub.lat, pub.lng - newPub.lng);
    if (dist > 0.001) continue; // ~100m
    const a = pub.name.toLowerCase();
    const b = newPub.name.toLowerCase();
    if (a === b || a.includes(b) || b.includes(a)) return true;
    // Word overlap check
    const clean = (s: string) => s.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
    const wa = new Set(clean(a));
    const wb = new Set(clean(b));
    const common = [...wa].filter(w => wb.has(w));
    if (common.length / Math.max(wa.size, wb.size, 1) > 0.5) return true;
  }
  return false;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));
  console.log(`Starting with ${pubs.length} pubs`);

  // === Phase 1: Fetch bars from OSM ===
  console.log("\n=== Phase 1: Fetching bars from OSM ===");
  const query = `[out:json][timeout:120];(node["amenity"="bar"](${LONDON_BBOX});way["amenity"="bar"](${LONDON_BBOX}););out center body;`;
  const params = new URLSearchParams({ data: query });
  const resp = await fetch(`${OVERPASS_URL}?${params.toString()}`, {
    headers: { "User-Agent": "FrierPubs/1.0", Accept: "application/json" },
  });

  if (!resp.ok) {
    console.error(`OSM fetch failed: ${resp.status}`);
  } else {
    const data = await resp.json();
    const elements: OverpassElement[] = data.elements;
    console.log(`OSM returned ${elements.length} bar elements`);

    let added = 0;
    for (const el of elements) {
      const bar = transformBar(el);
      if (!bar) continue;
      if (isDuplicate(bar, pubs)) continue;
      pubs.push(bar);
      added++;
    }
    console.log(`Added ${added} new bars from OSM`);
  }

  // === Phase 2: Google Places sweep for missing venues ===
  if (API_KEY) {
    console.log("\n=== Phase 2: Google Places sweep ===");
    const GRID = generateGrid(51.42, -0.35, 51.60, 0.15, 5, 5);
    const queries = ["pub London", "bar London", "gastropub London", "craft beer bar London"];
    let apiCalls = 0;
    let googleAdded = 0;

    for (const q of queries) {
      for (const cell of GRID) {
        const places = await searchPlaces(q, cell, cell.radius);
        apiCalls++;

        for (const place of places) {
          if (!place.location || !place.displayName?.text) continue;
          const name = place.displayName.text;
          const lat = place.location.latitude;
          const lng = place.location.longitude;

          if (isDuplicate({ lat, lng, name }, pubs)) continue;

          // New venue! Add it
          const newPub: Pub = {
            id: `google-${lat.toFixed(5)}-${lng.toFixed(5)}`,
            name,
            lat,
            lng,
            rating: place.rating,
            hasFood: false,
            hasLiveSport: false,
            hasPoolTable: false,
            hasDarts: false,
            hasBeerGarden: false,
            hasOutdoorSeating: false,
            hasDogFriendly: false,
            hasRealAle: false,
            hasQuizNight: false,
            hasLiveMusic: false,
            hasRealFire: false,
            hasWifi: false,
          };
          pubs.push(newPub);
          googleAdded++;
        }

        await new Promise(r => setTimeout(r, 150));
      }
    }

    console.log(`Google Places: ${apiCalls} API calls, ${googleAdded} new venues added`);
    console.log(`Estimated cost: ~$${((apiCalls / 1000) * 32).toFixed(2)}`);
  }

  console.log(`\nTotal pubs now: ${pubs.length}`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch(err => { console.error("Failed:", err); process.exit(1); });
