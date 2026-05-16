/**
 * Fetches London pub data from OpenStreetMap's Overpass API.
 * Run with: npx tsx scripts/fetch-pubs.ts
 */

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
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
}

const OVERPASS_URL = "https://lz4.overpass-api.de/api/interpreter";
const LONDON_BBOX = "51.28,-0.51,51.69,0.33";

const OVERPASS_QUERY = `
[out:json][timeout:120];
(
  node["amenity"="pub"](${LONDON_BBOX});
  way["amenity"="pub"](${LONDON_BBOX});
);
out center body;
`;

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["yes", "true", "1"].includes(value.toLowerCase());
}

function hasFoodTag(tags: Record<string, string>): boolean {
  if (tags["food"] === "no") return false;
  if (parseBoolean(tags["food"])) return true;
  if (tags["cuisine"]) return true;
  if (tags["diet:vegetarian"] || tags["diet:vegan"]) return true;
  if (tags["opening_hours:kitchen"]) return true;
  if (tags["website:menu"]) return true;
  return false;
}

function hasSportTag(tags: Record<string, string>): boolean {
  const sportVal = (tags["sport"] || "").toLowerCase();
  if (sportVal && sportVal !== "no") {
    const sportTypes = sportVal.split(";").map((s) => s.trim());
    const viewingSports = ["soccer", "football", "rugby", "rugby_union", "cricket", "tennis", "boxing", "yes", "tv"];
    if (sportTypes.some((s) => viewingSports.includes(s))) return true;
  }

  if (parseBoolean(tags["tv"])) return true;
  if (parseBoolean(tags["live_sport"])) return true;
  if (parseBoolean(tags["live_sports"])) return true;
  if (tags["sport:television"]) return true;
  if (parseBoolean(tags["screening"])) return true;

  return false;
}

function hasPoolTag(tags: Record<string, string>): boolean {
  if (parseBoolean(tags["pool_table"])) return true;

  const sportVal = (tags["sport"] || "").toLowerCase();
  if (sportVal) {
    const types = sportVal.split(";").map((s) => s.trim());
    if (types.some((s) => ["billiards", "pool", "snooker"].includes(s))) return true;
  }

  return false;
}

function hasDartsTag(tags: Record<string, string>): boolean {
  if (parseBoolean(tags["darts"])) return true;

  const sportVal = (tags["sport"] || "").toLowerCase();
  if (sportVal) {
    const types = sportVal.split(";").map((s) => s.trim());
    if (types.includes("darts")) return true;
  }

  return false;
}

// Known pub chains and their typical amenities
const CHAIN_ENRICHMENT: Record<string, Partial<Pub>> = {};

const SPORT_CHAINS = [
  "wetherspoon", "j d wetherspoon", "jd wetherspoon",
  "walkabout", "o'neill", "o'neills", "oneills",
  "rileys", "sports bar",
];

function applyChainEnrichment(name: string, pub: Pub): Pub {
  const lower = name.toLowerCase();

  for (const chain of SPORT_CHAINS) {
    if (lower.includes(chain)) {
      pub.hasLiveSport = true;
      break;
    }
  }

  if (lower.includes("wetherspoon")) {
    pub.hasFood = true;
    pub.hasRealAle = true;
  }

  return pub;
}

function transformElement(el: OverpassElement): Pub | null {
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

  let pub: Pub = {
    id: `osm-${el.type}-${el.id}`,
    name,
    lat,
    lng,
    address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
    openingHours: tags["opening_hours"] || undefined,
    phone: tags["phone"] || tags["contact:phone"] || undefined,
    website: tags["website"] || tags["contact:website"] || undefined,
    hasFood: hasFoodTag(tags),
    hasLiveSport: hasSportTag(tags),
    hasPoolTable: hasPoolTag(tags),
    hasDarts: hasDartsTag(tags),
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

  pub = applyChainEnrichment(name, pub);

  return pub;
}

async function fetchPubs(): Promise<void> {
  console.log("Fetching London pubs from Overpass API...");

  const params = new URLSearchParams({ data: OVERPASS_QUERY });
  const response = await fetch(`${OVERPASS_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      "User-Agent": "FrierPubs/1.0",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Overpass API returned ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const elements: OverpassElement[] = data.elements;
  console.log(`Received ${elements.length} raw elements`);

  const pubs: Pub[] = [];
  for (const el of elements) {
    const pub = transformElement(el);
    if (pub) pubs.push(pub);
  }

  console.log(`Transformed ${pubs.length} pubs with valid names and locations`);

  const stats = {
    total: pubs.length,
    withFood: pubs.filter((p) => p.hasFood).length,
    withSport: pubs.filter((p) => p.hasLiveSport).length,
    withPool: pubs.filter((p) => p.hasPoolTable).length,
    withDarts: pubs.filter((p) => p.hasDarts).length,
    withBeerGarden: pubs.filter((p) => p.hasBeerGarden).length,
    withOutdoorSeating: pubs.filter((p) => p.hasOutdoorSeating).length,
    withDogFriendly: pubs.filter((p) => p.hasDogFriendly).length,
    withRealAle: pubs.filter((p) => p.hasRealAle).length,
    withQuizNight: pubs.filter((p) => p.hasQuizNight).length,
    withLiveMusic: pubs.filter((p) => p.hasLiveMusic).length,
    withRealFire: pubs.filter((p) => p.hasRealFire).length,
    withWifi: pubs.filter((p) => p.hasWifi).length,
    withOpeningHours: pubs.filter((p) => p.openingHours).length,
    withAddress: pubs.filter((p) => p.address).length,
  };
  console.log("\nData coverage stats:", JSON.stringify(stats, null, 2));

  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(process.cwd(), "src", "data", "pubs.json");
  fs.writeFileSync(outPath, JSON.stringify(pubs, null, 2));
  console.log(`\nWrote ${pubs.length} pubs to ${outPath}`);
}

fetchPubs().catch((err) => {
  console.error("Failed to fetch pubs:", err);
  process.exit(1);
});
