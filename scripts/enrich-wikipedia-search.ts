/**
 * Find Wikipedia articles for famous London pubs that didn't match during the
 * earlier category-traversal enrichment. Searches Wikipedia by pub name +
 * "London pub", verifies the match is geographically plausible (within 1km
 * of the pub's known coords), then pulls the lead image.
 *
 * Targets: pubs mentioned in our PUB_CRAWLS data that have no hero image and
 * no Wikipedia URL.
 *
 * Run with: npx tsx scripts/enrich-wikipedia-search.ts
 */

import fs from "fs";
import path from "path";
import { PUB_CRAWLS } from "../src/data/pub-crawls";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  wikipediaUrl?: string;
  heroImageUrl?: string;
  description?: string;
  historic?: boolean;
  [key: string]: unknown;
}

const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = { "User-Agent": "FrierPubs/1.0 (https://usefulpubmap.com)" };

interface SearchHit {
  pageid: number;
  title: string;
  snippet: string;
}

interface PageInfo {
  title: string;
  fullurl?: string;
  lat?: number;
  lon?: number;
  thumbnail?: { source: string };
  extract?: string;
}

async function searchPubs(query: string): Promise<SearchHit[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5",
    format: "json",
  });
  try {
    const resp = await fetch(`${API}?${params}`, { headers: HEADERS });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.query?.search ?? [];
  } catch {
    return [];
  }
}

async function fetchPageInfo(titles: string[]): Promise<Map<string, PageInfo>> {
  if (titles.length === 0) return new Map();
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
  const map = new Map<string, PageInfo>();
  try {
    const resp = await fetch(`${API}?${params}`, { headers: HEADERS });
    if (!resp.ok) return map;
    const data = await resp.json();
    const pages = data.query?.pages ?? {};
    for (const id of Object.keys(pages)) {
      const p = pages[id];
      map.set(p.title, {
        title: p.title,
        fullurl: p.fullurl,
        lat: p.coordinates?.[0]?.lat,
        lon: p.coordinates?.[0]?.lon,
        thumbnail: p.thumbnail,
        extract: p.extract,
      });
    }
  } catch {
    // ignore
  }
  return map;
}

function distMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 *
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/^the\s+/, "").replace(/&/g, "and").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function findLocalPub(name: string, pubs: Pub[]): Pub | null {
  const target = normalise(name);
  let best: { pub: Pub; score: number } | null = null;
  for (const pub of pubs) {
    const candidate = normalise(pub.name);
    let score = 0;
    if (candidate === target) score = 100;
    else if (candidate.includes(target) || target.includes(candidate)) score = 80;
    if (score === 0) continue;
    if (!best || score > best.score) best = { pub, score };
  }
  return best?.pub ?? null;
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

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  // Build set of pub names mentioned in crawls
  const crawlPubNames = new Set<string>();
  for (const c of PUB_CRAWLS) {
    for (const s of c.stops) crawlPubNames.add(s.name);
  }
  console.log(`${crawlPubNames.size} unique pub names mentioned in crawls`);

  // For each, find the local pub and check if it needs enrichment
  const targets: Pub[] = [];
  for (const name of crawlPubNames) {
    const pub = findLocalPub(name, pubs);
    if (!pub) continue;
    if (pub.heroImageUrl && pub.wikipediaUrl) continue; // fully enriched
    targets.push(pub);
  }
  console.log(`${targets.length} crawl pubs need enrichment\n`);

  let updated = 0;
  for (const pub of targets) {
    // Search Wikipedia
    const query = `${pub.name} pub London`;
    const hits = await searchPubs(query);
    if (hits.length === 0) {
      console.log(`  - ${pub.name}: no search results`);
      await new Promise((r) => setTimeout(r, 400));
      continue;
    }

    // Fetch coordinates + image for top 3 candidates
    const topTitles = hits.slice(0, 3).map((h) => h.title);
    const pages = await fetchPageInfo(topTitles);
    await new Promise((r) => setTimeout(r, 400));

    // Find one within 1km of our pub
    let match: PageInfo | null = null;
    for (const title of topTitles) {
      const page = pages.get(title);
      if (!page?.lat || !page?.lon) continue;
      const d = distMetres(pub.lat, pub.lng, page.lat, page.lon);
      if (d <= 1000) {
        match = page;
        break;
      }
    }

    if (!match) {
      console.log(`  - ${pub.name}: no geo match`);
      continue;
    }

    let changed = false;
    if (!pub.heroImageUrl && match.thumbnail?.source) {
      pub.heroImageUrl = match.thumbnail.source;
      changed = true;
    }
    if (!pub.wikipediaUrl && match.fullurl) {
      pub.wikipediaUrl = match.fullurl;
      changed = true;
    }
    if (!pub.description && match.extract) {
      pub.description = trimDesc(match.extract);
      changed = true;
    }
    if (!pub.historic) {
      pub.historic = true;
    }
    if (changed) {
      updated++;
      console.log(`  ✓ ${pub.name} → ${match.title}`);
    } else {
      console.log(`  - ${pub.name}: matched but no new fields`);
    }
  }

  console.log(`\nUpdated ${updated} pubs`);
  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch((err) => { console.error("Failed:", err); process.exit(1); });
