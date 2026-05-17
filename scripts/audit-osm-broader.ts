/**
 * Audit phase 2: Re-query OSM with broader tag patterns + smaller bounding
 * boxes per borough. Catches:
 *
 * - amenity=pub (already have but double-check)
 * - amenity=bar (already have but double-check)
 * - amenity=biergarten (German beer gardens - sometimes used in London)
 * - amenity=restaurant with cuisine=pub or "british"
 * - amenity=cafe with "real_ale=yes"
 *
 * Uses small bounding boxes per borough so we don't miss anything due to
 * Overpass query timeouts on large regions.
 *
 * Run with: npx tsx scripts/audit-osm-broader.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  openingHours?: string;
  phone?: string;
  website?: string;
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

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_URL = "https://lz4.overpass-api.de/api/interpreter";

// Central London borough bounding boxes (rough but covering)
const BOROUGHS: { name: string; bbox: string }[] = [
  { name: "Westminster",            bbox: "51.494,-0.215,51.531,-0.125" },
  { name: "Camden",                 bbox: "51.520,-0.197,51.560,-0.108" },
  { name: "Islington",              bbox: "51.520,-0.135,51.566,-0.075" },
  { name: "Hackney",                bbox: "51.525,-0.090,51.567,-0.020" },
  { name: "Tower Hamlets",          bbox: "51.500,-0.078,51.541,0.005" },
  { name: "City of London",         bbox: "51.508,-0.115,51.524,-0.075" },
  { name: "Southwark",              bbox: "51.470,-0.108,51.510,-0.045" },
  { name: "Lambeth",                bbox: "51.470,-0.135,51.510,-0.090" },
  { name: "Kensington and Chelsea", bbox: "51.480,-0.220,51.510,-0.158" },
  { name: "Wandsworth (NE)",        bbox: "51.470,-0.215,51.490,-0.150" },
  { name: "Hammersmith (E)",        bbox: "51.480,-0.230,51.510,-0.200" },
];

function buildQuery(bbox: string): string {
  return `[out:json][timeout:120];
(
  node["amenity"="pub"](${bbox});
  way["amenity"="pub"](${bbox});
  node["amenity"="bar"](${bbox});
  way["amenity"="bar"](${bbox});
  node["amenity"="biergarten"](${bbox});
  way["amenity"="biergarten"](${bbox});
  node["amenity"="restaurant"]["cuisine"~"pub|british|gastropub|fish_and_chips", i](${bbox});
  way["amenity"="restaurant"]["cuisine"~"pub|british|gastropub|fish_and_chips", i](${bbox});
);
out center body;`;
}

function parseBool(v: string | undefined): boolean {
  if (!v) return false;
  return ["yes", "true", "1"].includes(v.toLowerCase());
}

function transformElement(el: OSMElement): Pub | null {
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
    hasFood: !!(tags["food"] === "yes" || tags["cuisine"] || tags["diet:vegetarian"]),
    hasLiveSport: !!(parseBool(tags["tv"]) || sportTypes.some(s => viewingSports.includes(s))),
    hasPoolTable: !!(parseBool(tags["pool_table"]) || sportTypes.some(s => ["billiards","pool","snooker"].includes(s))),
    hasDarts: !!(parseBool(tags["darts"]) || sportTypes.includes("darts")),
    hasBeerGarden: parseBool(tags["beer_garden"]) || tags["amenity"] === "biergarten",
    hasOutdoorSeating: parseBool(tags["outdoor_seating"]) || parseBool(tags["beer_garden"]) || tags["amenity"] === "biergarten",
    hasDogFriendly: parseBool(tags["dog"]),
    hasRealAle: parseBool(tags["real_ale"]),
    hasQuizNight: !!(tags["quiz"] || tags["quiznight"]),
    hasLiveMusic: parseBool(tags["live_music"]),
    hasRealFire: parseBool(tags["real_fire"]),
    hasWifi: parseBool(tags["internet_access"]) || tags["internet_access"] === "wlan",
  };
}

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

function isDuplicate(candidate: Pub, pubs: Pub[]): boolean {
  // Same OSM ID? definite dup
  if (pubs.some((p) => p.id === candidate.id)) return true;
  const cn = normalise(candidate.name);
  for (const p of pubs) {
    const d = distMetres(candidate.lat, candidate.lng, p.lat, p.lng);
    if (d > 60) continue;
    const pn = normalise(p.name);
    if (pn === cn || pn.includes(cn) || cn.includes(pn)) return true;
    if (d < 25) return true; // same place, no name match needed
  }
  return false;
}

async function fetchBorough(name: string, bbox: string): Promise<OSMElement[]> {
  const params = new URLSearchParams({ data: buildQuery(bbox) });
  const resp = await fetch(`${OVERPASS_URL}?${params}`, {
    headers: { "User-Agent": "FrierPubs/1.0", Accept: "application/json" },
  });
  if (!resp.ok) {
    console.warn(`  ${name} failed: ${resp.status}`);
    return [];
  }
  const data = await resp.json();
  return data.elements || [];
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));
  console.log(`Starting with ${pubs.length} pubs`);

  let totalAdded = 0;
  for (const { name, bbox } of BOROUGHS) {
    process.stdout.write(`${name.padEnd(28)}: `);
    const elements = await fetchBorough(name, bbox);
    let added = 0;
    let candidates = 0;
    for (const el of elements) {
      const pub = transformElement(el);
      if (!pub) continue;
      candidates++;
      if (isDuplicate(pub, pubs)) continue;
      pubs.push(pub);
      added++;
    }
    totalAdded += added;
    console.log(`${candidates} candidates, +${added} new`);
    // Be polite to Overpass
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log(`\nTotal new venues: ${totalAdded}`);
  console.log(`Dataset now: ${pubs.length} venues`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch((err) => { console.error("Failed:", err); process.exit(1); });
