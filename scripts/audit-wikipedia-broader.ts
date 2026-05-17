/**
 * Audit phase 3: Cross-check Wikipedia "Public houses in London" articles.
 *
 * Many famous London pubs have Wikipedia articles. If they have coordinates
 * AND are in our central London box AND we don't already have them, add them
 * with the Wikipedia description as a bonus.
 *
 * This is a one-off check — most matches were caught by the original
 * enrich-wikipedia.ts script. This finds any we'd missed entirely.
 *
 * Run with: npx tsx scripts/audit-wikipedia-broader.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  description?: string;
  wikipediaUrl?: string;
  historic?: boolean;
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

const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = { "User-Agent": "FrierPubs/1.0" };

const CATEGORIES = [
  "Category:Pubs in London",
  "Category:Pubs in the City of London",
  "Category:Pubs in the City of Westminster",
  "Category:Pubs in the London Borough of Camden",
  "Category:Pubs in the London Borough of Hackney",
  "Category:Pubs in the London Borough of Hammersmith and Fulham",
  "Category:Pubs in the London Borough of Islington",
  "Category:Pubs in the Royal Borough of Kensington and Chelsea",
  "Category:Pubs in the London Borough of Lambeth",
  "Category:Pubs in the London Borough of Southwark",
  "Category:Pubs in the London Borough of Tower Hamlets",
  "Category:Pubs in the London Borough of Wandsworth",
];

const CENTRAL_BOX = { south: 51.47, north: 51.56, west: -0.22, east: 0.01 };

interface CategoryMember { pageid: number; ns: number; title: string }
interface PageData { title: string; lat?: number; lon?: number; extract?: string; fullurl?: string }

async function fetchCategoryMembers(cat: string): Promise<CategoryMember[]> {
  const all: CategoryMember[] = [];
  let cont: string | undefined;
  do {
    const params = new URLSearchParams({
      action: "query", list: "categorymembers",
      cmtitle: cat, cmlimit: "500", cmtype: "page", format: "json",
    });
    if (cont) params.set("cmcontinue", cont);
    const resp = await fetch(`${API}?${params}`, { headers: HEADERS });
    if (!resp.ok) break;
    const data = await resp.json();
    all.push(...(data.query?.categorymembers || []));
    cont = data.continue?.cmcontinue;
  } while (cont);
  return all;
}

async function fetchPageData(titles: string[]): Promise<PageData[]> {
  const results: PageData[] = [];
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const params = new URLSearchParams({
      action: "query", titles: batch.join("|"),
      prop: "coordinates|extracts|info",
      exintro: "1", explaintext: "1", exchars: "500",
      inprop: "url", format: "json",
    });
    const resp = await fetch(`${API}?${params}`, { headers: HEADERS });
    if (!resp.ok) continue;
    const data = await resp.json();
    const pages = data.query?.pages || {};
    for (const id in pages) {
      const p = pages[id];
      results.push({
        title: p.title,
        lat: p.coordinates?.[0]?.lat,
        lon: p.coordinates?.[0]?.lon,
        extract: p.extract,
        fullurl: p.fullurl,
      });
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
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

function inCentral(lat: number, lng: number): boolean {
  return lat >= CENTRAL_BOX.south && lat <= CENTRAL_BOX.north && lng >= CENTRAL_BOX.west && lng <= CENTRAL_BOX.east;
}

function findMatch(page: PageData, pubs: Pub[]): Pub | null {
  if (!page.lat || !page.lon) return null;
  const cleanTitle = page.title.split(",")[0].trim();
  const t = normalise(cleanTitle);
  for (const pub of pubs) {
    const d = distMetres(page.lat, page.lon, pub.lat, pub.lng);
    if (d > 80) continue;
    const n = normalise(pub.name);
    if (n === t || n.includes(t) || t.includes(n)) return pub;
    if (d < 30) return pub;
  }
  return null;
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
  console.log(`Starting with ${pubs.length} pubs`);

  console.log("\nFetching Wikipedia category members...");
  const seenTitles = new Set<string>();
  const allTitles: string[] = [];
  for (const cat of CATEGORIES) {
    try {
      const members = await fetchCategoryMembers(cat);
      for (const m of members) {
        if (m.ns !== 0) continue;
        if (m.title.startsWith("List of")) continue;
        if (seenTitles.has(m.title)) continue;
        seenTitles.add(m.title);
        allTitles.push(m.title);
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`Found ${allTitles.length} unique Wikipedia pub articles`);

  console.log("\nFetching coordinates + extracts...");
  const pageData = await fetchPageData(allTitles);

  let updated = 0;
  let added = 0;
  const additions: string[] = [];

  for (const page of pageData) {
    if (!page.lat || !page.lon) continue;
    if (!inCentral(page.lat, page.lon)) continue;

    const match = findMatch(page, pubs);
    if (match) {
      // Backfill any missing fields
      if (!match.description && page.extract) {
        match.description = trimDesc(page.extract);
        updated++;
      }
      if (!match.wikipediaUrl && page.fullurl) {
        match.wikipediaUrl = page.fullurl;
      }
      if (!match.historic) match.historic = true;
      continue;
    }

    // New pub from Wikipedia
    const cleanTitle = page.title.split(",")[0].trim();
    const wikiId = page.fullurl?.split("/").pop() ?? cleanTitle.toLowerCase().replace(/\s+/g, "_");
    const newPub: Pub = {
      id: `wiki-${wikiId}`,
      name: cleanTitle,
      lat: page.lat,
      lng: page.lon,
      description: page.extract ? trimDesc(page.extract) : undefined,
      wikipediaUrl: page.fullurl,
      historic: true,
      hasFood: false, hasLiveSport: false, hasPoolTable: false, hasDarts: false,
      hasBeerGarden: false, hasOutdoorSeating: false, hasDogFriendly: false,
      hasRealAle: false, hasQuizNight: false, hasLiveMusic: false,
      hasRealFire: false, hasWifi: false,
    };
    pubs.push(newPub);
    added++;
    additions.push(cleanTitle);
  }

  console.log(`\nUpdated ${updated} existing pubs with backfilled descriptions`);
  console.log(`Added ${added} new pubs from Wikipedia`);
  if (additions.length > 0) {
    console.log("Sample additions:");
    additions.slice(0, 15).forEach(n => console.log(`  + ${n}`));
  }

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`\nDataset now: ${pubs.length} venues`);
}

run().catch(err => { console.error("Failed:", err); process.exit(1); });
