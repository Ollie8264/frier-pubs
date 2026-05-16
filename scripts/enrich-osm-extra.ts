/**
 * Re-queries OSM for extra tags we missed: historic, heritage, listed_status,
 * description, start_date, etc. Adds historic flag, listedStatus and description.
 *
 * Run with: npx tsx scripts/enrich-osm-extra.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  historic?: boolean;
  listedStatus?: string;
  yearEstablished?: number;
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

async function fetchOSMTags(): Promise<Map<string, Record<string, string>>> {
  const query = `
[out:json][timeout:180];
(
  node["amenity"~"^(pub|bar)$"](${LONDON_BBOX});
  way["amenity"~"^(pub|bar)$"](${LONDON_BBOX});
);
out center tags;
`;
  const params = new URLSearchParams({ data: query });
  const resp = await fetch(`${OVERPASS_URL}?${params}`, {
    headers: { "User-Agent": "FrierPubs/1.0", Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`Overpass returned ${resp.status}`);
  const data = await resp.json();
  const elements: OverpassElement[] = data.elements;

  const map = new Map<string, Record<string, string>>();
  for (const el of elements) {
    const tags = el.tags;
    if (!tags) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!lat || !lng) continue;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    map.set(key, tags);
  }
  return map;
}

function parseYear(value: string | undefined): number | undefined {
  if (!value) return undefined;
  // Try ISO year, or just "1700", "c. 1850"
  const m = value.match(/(\d{4})/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1000 && n <= new Date().getFullYear()) return n;
  }
  return undefined;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));
  console.log(`Re-querying OSM tags for ${pubs.length} pubs...`);

  const tagsByCoord = await fetchOSMTags();
  console.log(`OSM returned ${tagsByCoord.size} entries with tags`);

  let descriptionsAdded = 0;
  let historicAdded = 0;
  let listedAdded = 0;
  let yearsAdded = 0;

  for (const pub of pubs) {
    const key = `${pub.lat.toFixed(5)},${pub.lng.toFixed(5)}`;
    const tags = tagsByCoord.get(key);
    if (!tags) continue;

    // Description
    if (!pub.description && tags["description"]) {
      pub.description = tags["description"];
      descriptionsAdded++;
    }

    // Historic / heritage
    const isHistoric =
      !!(tags["historic"] && tags["historic"] !== "no") ||
      !!(tags["heritage"]) ||
      !!(tags["listed_status"]) ||
      !!(tags["building"] && /historic|heritage/i.test(tags["building"]));

    if (isHistoric && !pub.historic) {
      pub.historic = true;
      historicAdded++;
    }

    // Listed building status
    const listed =
      tags["listed_status"] ||
      tags["heritage:listed_status"] ||
      tags["heritage:operator"];
    if (listed && !pub.listedStatus) {
      pub.listedStatus = listed;
      listedAdded++;
    } else if (tags["heritage"] === "2" && !pub.listedStatus) {
      pub.listedStatus = "Listed";
      listedAdded++;
    }

    // Year established
    const year =
      parseYear(tags["start_date"]) ||
      parseYear(tags["built"]) ||
      parseYear(tags["construction_date"]) ||
      parseYear(tags["opening_date"]);
    if (year && !pub.yearEstablished) {
      pub.yearEstablished = year;
      yearsAdded++;
    }
  }

  console.log(`\nDescriptions added: ${descriptionsAdded}`);
  console.log(`Historic flags added: ${historicAdded}`);
  console.log(`Listed status added: ${listedAdded}`);
  console.log(`Years established added: ${yearsAdded}`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch(err => { console.error("Failed:", err); process.exit(1); });
