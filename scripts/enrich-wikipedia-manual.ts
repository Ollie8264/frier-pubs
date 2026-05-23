/**
 * Manual Wikipedia article overrides for famous London pubs that automated
 * search misses (e.g. The Black Friar's article is "The Black Friar, London"
 * which doesn't surface as the top result for "Black Friar pub London").
 *
 * Run with: npx tsx scripts/enrich-wikipedia-manual.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  wikipediaUrl?: string;
  heroImageUrl?: string;
  description?: string;
  historic?: boolean;
  [key: string]: unknown;
}

const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = { "User-Agent": "FrierPubs/1.0 (https://usefulpubmap.com)" };

// Hand-curated: pub name + postcode hint → Wikipedia article title
// Postcode disambiguates pubs with the same name in different locations.
const OVERRIDES: { name: string; postcode: string; wikiTitle: string }[] = [
  // Fleet Street
  { name: "The Tipperary", postcode: "EC4Y", wikiTitle: "The Tipperary, London" },
  { name: "The Old Bell", postcode: "EC4Y", wikiTitle: "The Old Bell Tavern, London" },
  { name: "Black Friar", postcode: "EC4V", wikiTitle: "The Black Friar" },
  // Soho
  { name: "The Lyric", postcode: "W1", wikiTitle: "The Lyric, Soho" },
  { name: "The Coach and Horses", postcode: "W1D 5DH", wikiTitle: "Coach and Horses, Soho" },
  // Borough
  { name: "The Market Porter", postcode: "SE1", wikiTitle: "The Market Porter" },
  { name: "Southwark Tavern", postcode: "SE1", wikiTitle: "The Southwark Tavern" },
  // Bloomsbury / Holborn
  { name: "Princess Louise", postcode: "WC1", wikiTitle: "Princess Louise (pub)" },
  { name: "The Lamb", postcode: "WC1", wikiTitle: "The Lamb, Lamb's Conduit Street" },
  // City of London
  { name: "Hoop & Grapes", postcode: "EC3N", wikiTitle: "The Hoop and Grapes" },
  { name: "The Hand and Shears", postcode: "EC1A", wikiTitle: "Hand and Shears" },
  { name: "The Old Doctor Butler's Head", postcode: "EC2V", wikiTitle: "Old Doctor Butler's Head" },
  { name: "Ye Olde Watling", postcode: "EC4M", wikiTitle: "Ye Olde Watling" },
  // Westminster
  { name: "The Red Lion", postcode: "SW1A", wikiTitle: "The Red Lion, Westminster" },
  // Bankside
  { name: "The Globe Tavern", postcode: "SE1", wikiTitle: "The Globe Tavern, Borough" },
];

async function fetchPageInfo(titles: string[]) {
  const params = new URLSearchParams({
    action: "query",
    titles: titles.join("|"),
    prop: "coordinates|pageimages|info|extracts",
    pithumbsize: "800",
    inprop: "url",
    exintro: "1",
    explaintext: "1",
    exchars: "400",
    format: "json",
  });
  const resp = await fetch(`${API}?${params}`, { headers: HEADERS });
  if (!resp.ok) return {} as Record<string, unknown>;
  const data = await resp.json();
  return data.query?.pages ?? {};
}

function trimDesc(text: string): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  let result = "";
  for (const s of sentences) {
    if ((result + s).length > 280) break;
    result += s;
  }
  return result.trim() || cleaned.slice(0, 250);
}

function normaliseName(s: string): string {
  return s.toLowerCase().replace(/^the\s+/, "").replace(/&/g, "and").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  const titles = OVERRIDES.map((o) => o.wikiTitle);
  console.log(`Fetching ${titles.length} Wikipedia pages...`);
  const pagesObj = (await fetchPageInfo(titles)) as Record<string, {
    title: string;
    pageid: number;
    missing?: string;
    fullurl?: string;
    coordinates?: { lat: number; lon: number }[];
    thumbnail?: { source: string };
    extract?: string;
  }>;

  // Index page data by title
  const byTitle = new Map<string, typeof pagesObj[string]>();
  for (const id of Object.keys(pagesObj)) {
    byTitle.set(pagesObj[id].title, pagesObj[id]);
  }

  let updated = 0;
  for (const override of OVERRIDES) {
    const page = byTitle.get(override.wikiTitle);
    if (!page || page.missing !== undefined) {
      console.log(`  ✗ ${override.wikiTitle}: page not found`);
      continue;
    }

    const targetName = normaliseName(override.name);
    // Find the local pub by name + postcode
    const candidates = pubs.filter((p) => {
      const local = normaliseName(p.name);
      if (local !== targetName && !local.includes(targetName) && !targetName.includes(local)) return false;
      if (!p.address) return false;
      return p.address.toUpperCase().includes(override.postcode);
    });
    if (candidates.length === 0) {
      console.log(`  ✗ ${override.name} (${override.postcode}): no local pub matched`);
      continue;
    }
    const pub = candidates[0];

    let changed = false;
    if (!pub.heroImageUrl && page.thumbnail?.source) {
      pub.heroImageUrl = page.thumbnail.source;
      changed = true;
    }
    if (!pub.wikipediaUrl && page.fullurl) {
      pub.wikipediaUrl = page.fullurl;
      changed = true;
    }
    if (!pub.description && page.extract) {
      pub.description = trimDesc(page.extract);
      changed = true;
    }
    if (!pub.historic) {
      pub.historic = true;
      changed = true;
    }
    if (changed) {
      updated++;
      console.log(`  ✓ ${pub.name} (${override.postcode}) → ${page.title}`);
    }
  }

  console.log(`\nUpdated ${updated} pubs`);
  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
}

run().catch((err) => { console.error("Failed:", err); process.exit(1); });
