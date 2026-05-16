/**
 * Borough-by-borough audit: checks our coverage against Google Places
 * for every London borough, adds missing venues.
 *
 * Run with: GOOGLE_PLACES_API_KEY=... npx tsx scripts/audit-boroughs.ts
 */

import fs from "fs";
import path from "path";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) { console.error("Set GOOGLE_PLACES_API_KEY"); process.exit(1); }

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
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
  [key: string]: unknown;
}

interface GooglePlace {
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  rating?: number;
  formattedAddress?: string;
}

// All 33 London boroughs with approximate center coordinates
const BOROUGHS: { name: string; lat: number; lng: number; radius: number }[] = [
  { name: "City of London", lat: 51.5155, lng: -0.0922, radius: 1000 },
  { name: "Camden", lat: 51.5517, lng: -0.1588, radius: 3000 },
  { name: "Greenwich", lat: 51.4769, lng: 0.0005, radius: 3500 },
  { name: "Hackney", lat: 51.5450, lng: -0.0553, radius: 3000 },
  { name: "Hammersmith and Fulham", lat: 51.4927, lng: -0.2339, radius: 3000 },
  { name: "Haringey", lat: 51.5906, lng: -0.1110, radius: 3500 },
  { name: "Islington", lat: 51.5465, lng: -0.1058, radius: 2500 },
  { name: "Kensington and Chelsea", lat: 51.4990, lng: -0.1938, radius: 2500 },
  { name: "Lambeth", lat: 51.4571, lng: -0.1231, radius: 3500 },
  { name: "Lewisham", lat: 51.4535, lng: -0.0205, radius: 3500 },
  { name: "Newham", lat: 51.5077, lng: 0.0469, radius: 3500 },
  { name: "Southwark", lat: 51.4734, lng: -0.0724, radius: 3500 },
  { name: "Tower Hamlets", lat: 51.5099, lng: -0.0290, radius: 3000 },
  { name: "Wandsworth", lat: 51.4567, lng: -0.1910, radius: 3500 },
  { name: "Westminster", lat: 51.4973, lng: -0.1372, radius: 3000 },
  { name: "Barking and Dagenham", lat: 51.5365, lng: 0.1313, radius: 4000 },
  { name: "Barnet", lat: 51.6252, lng: -0.1517, radius: 5000 },
  { name: "Bexley", lat: 51.4549, lng: 0.1505, radius: 4500 },
  { name: "Brent", lat: 51.5588, lng: -0.2597, radius: 4000 },
  { name: "Bromley", lat: 51.4039, lng: 0.0198, radius: 5000 },
  { name: "Croydon", lat: 51.3762, lng: -0.0982, radius: 5000 },
  { name: "Ealing", lat: 51.5130, lng: -0.3089, radius: 4000 },
  { name: "Enfield", lat: 51.6538, lng: -0.0799, radius: 5000 },
  { name: "Harrow", lat: 51.5898, lng: -0.3346, radius: 4000 },
  { name: "Havering", lat: 51.5779, lng: 0.2120, radius: 5000 },
  { name: "Hillingdon", lat: 51.5441, lng: -0.4760, radius: 5000 },
  { name: "Hounslow", lat: 51.4746, lng: -0.3680, radius: 4500 },
  { name: "Kingston upon Thames", lat: 51.3925, lng: -0.3057, radius: 4000 },
  { name: "Merton", lat: 51.4098, lng: -0.1949, radius: 3500 },
  { name: "Redbridge", lat: 51.5590, lng: 0.0741, radius: 4500 },
  { name: "Richmond upon Thames", lat: 51.4613, lng: -0.3037, radius: 4500 },
  { name: "Sutton", lat: 51.3618, lng: -0.1945, radius: 4000 },
  { name: "Waltham Forest", lat: 51.5886, lng: -0.0120, radius: 4000 },
];

async function searchPlaces(query: string, center: { lat: number; lng: number }, radius: number): Promise<GooglePlace[]> {
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": "places.displayName,places.location,places.rating,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius } },
      maxResultCount: 20,
      languageCode: "en",
    }),
  });
  if (!resp.ok) {
    if (resp.status === 429) await sleep(5000);
    return [];
  }
  const data = await resp.json();
  return data.places || [];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function isDuplicate(place: GooglePlace, pubs: Pub[]): Pub | null {
  if (!place.location || !place.displayName?.text) return null;
  const pName = place.displayName.text.toLowerCase();
  const pLat = place.location.latitude;
  const pLng = place.location.longitude;

  for (const pub of pubs) {
    const dist = Math.hypot(pub.lat - pLat, pub.lng - pLng);
    if (dist > 0.002) continue; // ~200m
    const n = pub.name.toLowerCase();
    if (n === pName || n.includes(pName) || pName.includes(n) || wordOverlap(n, pName) > 0.4) {
      return pub;
    }
  }
  return null;
}

function wordOverlap(a: string, b: string): number {
  const clean = (s: string) => s.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const wa = new Set(clean(a));
  const wb = new Set(clean(b));
  const common = [...wa].filter(w => wb.has(w));
  return common.length / Math.max(wa.size, wb.size, 1);
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));
  console.log(`Starting with ${pubs.length} venues\n`);

  let totalApiCalls = 0;
  let totalAdded = 0;
  let totalUpdated = 0;
  const boroughStats: { name: string; existing: number; found: number; added: number; updated: number }[] = [];

  const queries = [
    "pub in {borough} London",
    "bar in {borough} London",
    "gastropub in {borough} London",
    "sports pub in {borough} London",
    "craft beer {borough} London",
  ];

  for (const borough of BOROUGHS) {
    const existing = pubs.filter(p =>
      Math.hypot(p.lat - borough.lat, p.lng - borough.lng) < borough.radius / 111000
    ).length;

    let boroughAdded = 0;
    let boroughUpdated = 0;
    const seen = new Set<string>();

    for (const queryTemplate of queries) {
      const query = queryTemplate.replace("{borough}", borough.name);
      const places = await searchPlaces(query, borough, borough.radius);
      totalApiCalls++;

      for (const place of places) {
        if (!place.location || !place.displayName?.text) continue;
        const key = `${place.location.latitude.toFixed(5)},${place.location.longitude.toFixed(5)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const match = isDuplicate(place, pubs);

        if (match) {
          // Update rating if we don't have one
          if (place.rating && !match.rating) {
            match.rating = place.rating;
            boroughUpdated++;
          }
        } else {
          // New venue
          const newPub: Pub = {
            id: `gp-${place.location.latitude.toFixed(5)}-${place.location.longitude.toFixed(5)}`,
            name: place.displayName.text,
            lat: place.location.latitude,
            lng: place.location.longitude,
            address: place.formattedAddress || undefined,
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
          boroughAdded++;
        }
      }

      await sleep(150);
    }

    boroughStats.push({
      name: borough.name,
      existing,
      found: seen.size,
      added: boroughAdded,
      updated: boroughUpdated,
    });
    totalAdded += boroughAdded;
    totalUpdated += boroughUpdated;

    const marker = boroughAdded > 0 ? `+${boroughAdded} new` : "✓ complete";
    console.log(
      `${borough.name.padEnd(30)} | had ${String(existing).padStart(4)} | Google found ${String(seen.size).padStart(3)} | ${marker}${boroughUpdated > 0 ? `, ${boroughUpdated} ratings` : ""}`
    );
  }

  const cost = (totalApiCalls / 1000) * 32;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Total venues: ${pubs.length} (was ${pubs.length - totalAdded})`);
  console.log(`New venues added: ${totalAdded}`);
  console.log(`Ratings updated: ${totalUpdated}`);
  console.log(`API calls: ${totalApiCalls}`);
  console.log(`Estimated cost: ~$${cost.toFixed(2)}`);

  // Show boroughs with most additions
  const topAdds = boroughStats.filter(b => b.added > 0).sort((a, b) => b.added - a.added);
  if (topAdds.length > 0) {
    console.log(`\nBoroughs with most new additions:`);
    topAdds.slice(0, 10).forEach(b => console.log(`  ${b.name}: +${b.added}`));
  }

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`\nWrote to ${pubsPath}`);
}

run().catch(err => { console.error("Failed:", err); process.exit(1); });
