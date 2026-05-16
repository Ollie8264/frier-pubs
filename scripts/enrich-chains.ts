/**
 * Enriches pub data using OSM brand/operator tags and known chain amenity profiles.
 * Free — re-queries OSM for brand data, then applies known amenities per chain.
 *
 * Run with: npx tsx scripts/enrich-chains.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
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

interface ChainProfile {
  namePatterns: RegExp[];
  osmBrands: string[];
  amenities: Partial<Record<keyof Pub, boolean>>;
}

const CHAINS: ChainProfile[] = [
  {
    namePatterns: [/wetherspoon/i, /j\.?d\.?\s*wetherspoon/i],
    osmBrands: ["wetherspoons", "j d wetherspoon", "jd wetherspoon"],
    amenities: {
      hasFood: true,
      hasRealAle: true,
      hasWifi: true,
      hasDogFriendly: false,
    },
  },
  {
    namePatterns: [/o'?neill'?s?/i],
    osmBrands: ["o'neill's", "o'neills", "oneills"],
    amenities: {
      hasFood: true,
      hasLiveSport: true,
      hasWifi: true,
    },
  },
  {
    namePatterns: [/walkabout/i],
    osmBrands: ["walkabout"],
    amenities: {
      hasFood: true,
      hasLiveSport: true,
    },
  },
  {
    namePatterns: [/slug\s*(&|and)\s*lettuce/i],
    osmBrands: ["slug & lettuce", "slug and lettuce"],
    amenities: {
      hasFood: true,
      hasWifi: true,
    },
  },
  {
    namePatterns: [/all\s*bar\s*one/i],
    osmBrands: ["all bar one"],
    amenities: {
      hasFood: true,
      hasWifi: true,
    },
  },
  {
    namePatterns: [/pitcher\s*(&|and)\s*piano/i],
    osmBrands: ["pitcher & piano"],
    amenities: {
      hasFood: true,
      hasWifi: true,
    },
  },
  {
    namePatterns: [/brewdog/i],
    osmBrands: ["brewdog"],
    amenities: {
      hasFood: true,
      hasWifi: true,
      hasDogFriendly: true,
    },
  },
  {
    namePatterns: [/greene\s*king/i],
    osmBrands: ["greene king"],
    amenities: {
      hasFood: true,
      hasRealAle: true,
    },
  },
  {
    namePatterns: [/fuller'?s?/i, /fuller,?\s*smith/i],
    osmBrands: ["fuller's", "fullers", "fuller's brewery", "fuller, smith & turner"],
    amenities: {
      hasFood: true,
      hasRealAle: true,
    },
  },
  {
    namePatterns: [/young'?s?(\s|$)/i],
    osmBrands: ["young's", "youngs", "young's brewery", "young & co"],
    amenities: {
      hasFood: true,
      hasRealAle: true,
      hasDogFriendly: true,
    },
  },
  {
    namePatterns: [/nicholson'?s?/i],
    osmBrands: ["nicholson's", "nicholsons"],
    amenities: {
      hasFood: true,
      hasRealAle: true,
    },
  },
  {
    namePatterns: [/samuel\s*smith/i],
    osmBrands: ["samuel smith", "samuel smith's"],
    amenities: {
      hasRealAle: true,
    },
  },
  {
    namePatterns: [/shepherd\s*neame/i],
    osmBrands: ["shepherd neame"],
    amenities: {
      hasFood: true,
      hasRealAle: true,
    },
  },
  {
    namePatterns: [/mcmullen/i],
    osmBrands: ["mcmullen", "mcmullen & sons"],
    amenities: {
      hasFood: true,
      hasRealAle: true,
    },
  },
  {
    namePatterns: [/harvester/i],
    osmBrands: ["harvester"],
    amenities: {
      hasFood: true,
    },
  },
  {
    namePatterns: [/hungry\s*horse/i],
    osmBrands: ["hungry horse"],
    amenities: {
      hasFood: true,
      hasLiveSport: true,
    },
  },
  {
    namePatterns: [/ember\s*inn/i],
    osmBrands: ["ember inns"],
    amenities: {
      hasFood: true,
      hasLiveSport: true,
      hasQuizNight: true,
    },
  },
  {
    namePatterns: [/craft\s*union/i],
    osmBrands: ["craft union"],
    amenities: {
      hasLiveSport: true,
      hasPoolTable: true,
      hasDarts: true,
    },
  },
  {
    namePatterns: [/rileys/i],
    osmBrands: ["rileys"],
    amenities: {
      hasLiveSport: true,
      hasPoolTable: true,
      hasDarts: true,
    },
  },
  {
    namePatterns: [/be\s*at\s*one/i],
    osmBrands: ["be at one"],
    amenities: {
      hasFood: false,
    },
  },
  {
    namePatterns: [/revolution/i],
    osmBrands: ["revolution", "revolution bars"],
    amenities: {
      hasFood: true,
      hasWifi: true,
    },
  },
  {
    namePatterns: [/metropolitan\s*pub/i],
    osmBrands: ["metropolitan pub company"],
    amenities: {
      hasFood: true,
      hasRealAle: true,
    },
  },
];

interface OSMBrandEntry {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_URL = "https://lz4.overpass-api.de/api/interpreter";
const LONDON_BBOX = "51.28,-0.51,51.69,0.33";

async function fetchOSMBrands(): Promise<Map<string, { brand: string; operator: string }>> {
  const query = `
[out:json][timeout:120];
(
  node["amenity"="pub"](${LONDON_BBOX});
  way["amenity"="pub"](${LONDON_BBOX});
);
out center body;
`;

  console.log("Fetching OSM brand/operator data...");
  const params = new URLSearchParams({ data: query });
  const resp = await fetch(`${OVERPASS_URL}?${params.toString()}`, {
    headers: { "User-Agent": "FrierPubs/1.0", Accept: "application/json" },
  });

  if (!resp.ok) throw new Error(`Overpass returned ${resp.status}`);

  const data = await resp.json();
  const elements: OSMBrandEntry[] = data.elements;
  const brandMap = new Map<string, { brand: string; operator: string }>();

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags["name"];
    if (!name) continue;

    const brand = tags["brand"] || tags["brand:wikidata"] || "";
    const operator = tags["operator"] || "";
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;

    if (lat && lng && (brand || operator)) {
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      brandMap.set(key, { brand: brand.toLowerCase(), operator: operator.toLowerCase() });
    }
  }

  console.log(`Found ${brandMap.size} pubs with brand/operator tags`);
  return brandMap;
}

function matchChain(pub: Pub, brandInfo?: { brand: string; operator: string }): ChainProfile | null {
  if (brandInfo) {
    const { brand, operator } = brandInfo;
    for (const chain of CHAINS) {
      for (const osmBrand of chain.osmBrands) {
        if (brand.includes(osmBrand) || operator.includes(osmBrand)) {
          return chain;
        }
      }
    }
  }

  const name = pub.name.toLowerCase();
  for (const chain of CHAINS) {
    for (const pattern of chain.namePatterns) {
      if (pattern.test(name)) {
        return chain;
      }
    }
  }

  return null;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  const brandMap = await fetchOSMBrands();

  const chainCounts: Record<string, number> = {};
  let totalEnriched = 0;
  const fieldCounts: Record<string, number> = {};

  for (const pub of pubs) {
    const key = `${pub.lat.toFixed(5)},${pub.lng.toFixed(5)}`;
    const brandInfo = brandMap.get(key);
    const chain = matchChain(pub, brandInfo);

    if (!chain) continue;

    const chainName = chain.osmBrands[0];
    chainCounts[chainName] = (chainCounts[chainName] || 0) + 1;

    let changed = false;
    for (const [field, value] of Object.entries(chain.amenities)) {
      if (value === true && !pub[field]) {
        pub[field] = true;
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        changed = true;
      }
    }

    if (changed) totalEnriched++;
  }

  console.log("\n=== Chain Detection ===");
  console.log(JSON.stringify(chainCounts, null, 2));

  console.log("\n=== New Amenities Added ===");
  console.log(JSON.stringify(fieldCounts, null, 2));
  console.log(`\nTotal pubs enriched: ${totalEnriched}`);

  const stats = {
    total: pubs.length,
    withFood: pubs.filter((p) => p.hasFood).length,
    withSport: pubs.filter((p) => p.hasLiveSport).length,
    withPool: pubs.filter((p) => p.hasPoolTable).length,
    withDarts: pubs.filter((p) => p.hasDarts).length,
    withBeerGarden: pubs.filter((p) => p.hasBeerGarden).length,
    withDogFriendly: pubs.filter((p) => p.hasDogFriendly).length,
    withRealAle: pubs.filter((p) => p.hasRealAle).length,
    withQuizNight: pubs.filter((p) => p.hasQuizNight).length,
    withWifi: pubs.filter((p) => p.hasWifi).length,
    withLiveMusic: pubs.filter((p) => p.hasLiveMusic).length,
  };
  console.log("\nFinal coverage:", JSON.stringify(stats, null, 2));

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`\nWrote to ${pubsPath}`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
