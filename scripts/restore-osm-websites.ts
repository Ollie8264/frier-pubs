/**
 * Restores website fields from OSM by re-querying — useful after over-aggressive
 * URL validation. Only sets website if the pub doesn't already have one.
 *
 * Run with: npx tsx scripts/restore-osm-websites.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  website?: string;
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

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  const beforeCount = pubs.filter((p) => p.website).length;
  console.log(`Starting with ${beforeCount} pubs with websites`);

  // Fetch all OSM website tags for amenity=pub|bar in London
  const query = `[out:json][timeout:180];
(
  node["amenity"~"^(pub|bar)$"]["website"](${LONDON_BBOX});
  way["amenity"~"^(pub|bar)$"]["website"](${LONDON_BBOX});
  node["amenity"~"^(pub|bar)$"]["contact:website"](${LONDON_BBOX});
  way["amenity"~"^(pub|bar)$"]["contact:website"](${LONDON_BBOX});
);
out center tags;`;

  console.log("Fetching OSM website tags...");
  const resp = await fetch(`${OVERPASS_URL}?${new URLSearchParams({ data: query })}`, {
    headers: { "User-Agent": "FrierPubs/1.0", Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`OSM returned ${resp.status}`);

  const data = await resp.json();
  const elements: OverpassElement[] = data.elements;
  console.log(`OSM returned ${elements.length} pubs with website tags`);

  // Build a coord -> website map
  const websiteByCoord = new Map<string, string>();
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!lat || !lng) continue;
    const tags = el.tags || {};
    const site = tags["website"] || tags["contact:website"];
    if (site) {
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      websiteByCoord.set(key, site);
    }
  }

  let restored = 0;
  for (const pub of pubs) {
    if (pub.website) continue;
    const key = `${pub.lat.toFixed(5)},${pub.lng.toFixed(5)}`;
    const site = websiteByCoord.get(key);
    if (site) {
      pub.website = site;
      restored++;
    }
  }

  const afterCount = pubs.filter((p) => p.website).length;
  console.log(`\nRestored ${restored} websites`);
  console.log(`Total now: ${afterCount} (was ${beforeCount})`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
