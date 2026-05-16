/**
 * Enriches the ~500 data-poorest pubs (zero amenities) via individual Google Places lookups.
 * Uses Advanced fields to get reviews text, then mines keywords for amenities.
 * Basic field mask for displayName + location + rating = $32/1000.
 *
 * Run with: GOOGLE_PLACES_API_KEY=... npx tsx scripts/enrich-poor-pubs.ts
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
  [key: string]: unknown;
}

interface GoogleDetailPlace {
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  rating?: number;
  reviews?: { text?: { text: string } }[];
  editorialSummary?: { text: string };
  dineIn?: boolean;
  servesFood?: boolean;
  outdoorSeating?: boolean;
  liveMusic?: boolean;
  goodForGroups?: boolean;
  servesBeer?: boolean;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function wordOverlap(a: string, b: string): number {
  const clean = (s: string) => s.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const wa = new Set(clean(a));
  const wb = new Set(clean(b));
  const common = [...wa].filter(w => wb.has(w));
  return common.length / Math.max(wa.size, wb.size, 1);
}

async function searchAndEnrich(pub: Pub): Promise<{ apiCalls: number; enriched: boolean }> {
  // Search for this specific pub
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": "places.displayName,places.location,places.rating,places.reviews,places.editorialSummary,places.outdoorSeating,places.liveMusic,places.servesBeer,places.dineIn",
    },
    body: JSON.stringify({
      textQuery: `"${pub.name}" pub ${pub.address || "London"}`,
      locationBias: {
        circle: { center: { latitude: pub.lat, longitude: pub.lng }, radius: 300 },
      },
      maxResultCount: 3,
      languageCode: "en",
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429) await sleep(5000);
    return { apiCalls: 1, enriched: false };
  }

  const data = await resp.json();
  const places: GoogleDetailPlace[] = data.places || [];

  // Find best match
  let bestPlace: GoogleDetailPlace | null = null;
  let bestDist = Infinity;
  for (const place of places) {
    if (!place.location || !place.displayName?.text) continue;
    const dist = Math.hypot(pub.lat - place.location.latitude, pub.lng - place.location.longitude);
    if (dist > 0.003) continue;
    const pName = place.displayName.text.toLowerCase();
    const n = pub.name.toLowerCase();
    if (n.includes(pName) || pName.includes(n) || wordOverlap(n, pName) > 0.4) {
      if (dist < bestDist) { bestPlace = place; bestDist = dist; }
    }
  }

  if (!bestPlace) return { apiCalls: 1, enriched: false };

  let enriched = false;

  // Rating
  if (bestPlace.rating && !pub.rating) {
    pub.rating = bestPlace.rating;
    enriched = true;
  }

  // Structured fields
  if (bestPlace.outdoorSeating && !pub.hasOutdoorSeating) {
    pub.hasOutdoorSeating = true;
    pub.hasBeerGarden = true;
    enriched = true;
  }
  if (bestPlace.liveMusic && !pub.hasLiveMusic) {
    pub.hasLiveMusic = true;
    enriched = true;
  }
  if (bestPlace.dineIn && !pub.hasFood) {
    pub.hasFood = true;
    enriched = true;
  }

  // Mine reviews for keywords
  const allText = [
    bestPlace.editorialSummary?.text || "",
    ...(bestPlace.reviews || []).map(r => r.text?.text || ""),
  ].join(" ").toLowerCase();

  if (allText.length > 0) {
    const keywords: { pattern: RegExp; field: keyof Pub }[] = [
      { pattern: /\b(food|menu|kitchen|burger|pizza|roast|fish and chips|pie|meal|lunch|dinner|brunch|breakfast)\b/, field: "hasFood" },
      { pattern: /\b(sky sports?|tnt sports?|bt sport|premier league|football|rugby|big screen|live sport|showing the match)\b/, field: "hasLiveSport" },
      { pattern: /\b(pool table|billiards?|snooker)\b/, field: "hasPoolTable" },
      { pattern: /\b(dart(s|board)?)\b/, field: "hasDarts" },
      { pattern: /\b(beer garden|garden area|outdoor area|patio|terrace|courtyard)\b/, field: "hasBeerGarden" },
      { pattern: /\b(dog[- ]?friendly|dogs? (welcome|allowed)|bring your dog)\b/, field: "hasDogFriendly" },
      { pattern: /\b(real ale|cask ale|hand[ -]?pull|camra)\b/, field: "hasRealAle" },
      { pattern: /\b(quiz night|pub quiz|trivia)\b/, field: "hasQuizNight" },
      { pattern: /\b(live music|live band|acoustic|open mic|dj|karaoke|jukebox)\b/, field: "hasLiveMusic" },
      { pattern: /\b(real fire|log fire|fireplace|wood[- ]?burn|open fire)\b/, field: "hasRealFire" },
      { pattern: /\b(free wi-?fi|wifi|wi-fi)\b/, field: "hasWifi" },
      { pattern: /\b(outdoor seating|outside seating|pavement|al ?fresco)\b/, field: "hasOutdoorSeating" },
    ];

    for (const { pattern, field } of keywords) {
      if (!pub[field] && pattern.test(allText)) {
        (pub as Record<string, unknown>)[field] = true;
        enriched = true;
      }
    }
  }

  return { apiCalls: 1, enriched };
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  // Target pubs with zero amenities
  const poorPubs = pubs.filter(p =>
    !p.hasFood && !p.hasLiveSport && !p.hasPoolTable && !p.hasDarts &&
    !p.hasBeerGarden && !p.hasOutdoorSeating && !p.hasDogFriendly &&
    !p.hasRealAle && !p.hasQuizNight && !p.hasLiveMusic && !p.hasRealFire && !p.hasWifi
  );

  console.log(`Enriching ${poorPubs.length} data-poor pubs via review mining...`);

  let apiCalls = 0;
  let enrichedCount = 0;

  for (let i = 0; i < poorPubs.length; i++) {
    const result = await searchAndEnrich(poorPubs[i]);
    apiCalls += result.apiCalls;
    if (result.enriched) enrichedCount++;

    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${poorPubs.length} processed, ${enrichedCount} enriched`);
    }
    await sleep(120);
  }

  // NOTE: reviews field is "Advanced" tier = $40/1000 requests
  const cost = (apiCalls / 1000) * 40;
  console.log(`\n=== Done ===`);
  console.log(`API calls: ${apiCalls}`);
  console.log(`Estimated cost: ~$${cost.toFixed(2)}`);
  console.log(`Enriched: ${enrichedCount}/${poorPubs.length}`);

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
    withZeroAmenities: pubs.filter(p =>
      !p.hasFood && !p.hasLiveSport && !p.hasPoolTable && !p.hasDarts &&
      !p.hasBeerGarden && !p.hasOutdoorSeating && !p.hasDogFriendly &&
      !p.hasRealAle && !p.hasQuizNight && !p.hasLiveMusic && !p.hasRealFire && !p.hasWifi
    ).length,
  };
  console.log("\nCoverage:", JSON.stringify(stats, null, 2));

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch(err => { console.error("Failed:", err); process.exit(1); });
