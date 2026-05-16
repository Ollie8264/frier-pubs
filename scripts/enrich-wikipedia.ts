/**
 * Enriches pub data with Wikipedia descriptions.
 * Crawls the "Pubs in London" category and its subcategories, fetches the lead
 * paragraph for each pub article, and matches to our data by name + proximity.
 *
 * Free — uses Wikipedia's public MediaWiki API.
 *
 * Run with: npx tsx scripts/enrich-wikipedia.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  wikipediaUrl?: string;
  yearEstablished?: number;
  historic?: boolean;
  [key: string]: unknown;
}

const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = { "User-Agent": "FrierPubs/1.0 (https://github.com/frier-pubs)" };

interface CategoryMember {
  pageid: number;
  ns: number;
  title: string;
}

interface PageCoords {
  pageid: number;
  title: string;
  lat?: number;
  lon?: number;
  extract?: string;
  fullurl?: string;
}

async function fetchCategoryMembers(category: string): Promise<CategoryMember[]> {
  const all: CategoryMember[] = [];
  let cmcontinue: string | undefined;

  do {
    const params = new URLSearchParams({
      action: "query",
      list: "categorymembers",
      cmtitle: category,
      cmlimit: "500",
      cmtype: "page|subcat",
      format: "json",
    });
    if (cmcontinue) params.set("cmcontinue", cmcontinue);

    const resp = await fetch(`${API}?${params}`, { headers: HEADERS });
    if (!resp.ok) break;
    const data = await resp.json();
    all.push(...(data.query?.categorymembers || []));
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);

  return all;
}

async function fetchPageData(titles: string[]): Promise<PageCoords[]> {
  // Batch up to 50 titles
  const results: PageCoords[] = [];
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const params = new URLSearchParams({
      action: "query",
      titles: batch.join("|"),
      prop: "coordinates|extracts|info",
      exintro: "1",
      explaintext: "1",
      exchars: "500",
      inprop: "url",
      format: "json",
    });

    const resp = await fetch(`${API}?${params}`, { headers: HEADERS });
    if (!resp.ok) continue;
    const data = await resp.json();
    const pages = data.query?.pages || {};

    for (const id in pages) {
      const p = pages[id];
      results.push({
        pageid: p.pageid,
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

function wordOverlap(a: string, b: string): number {
  const clean = (s: string) => s.replace(/[^a-z0-9\s]/gi, "").toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wa = new Set(clean(a));
  const wb = new Set(clean(b));
  const common = [...wa].filter(w => wb.has(w));
  return common.length / Math.max(wa.size, wb.size, 1);
}

function findMatchingPub(page: PageCoords, pubs: Pub[]): Pub | null {
  if (!page.lat || !page.lon) return null;

  // Title may have ", London" or ", Bermondsey" etc. — strip after comma
  const cleanTitle = page.title.split(",")[0].trim();

  let best: Pub | null = null;
  let bestDist = Infinity;

  for (const pub of pubs) {
    const dist = Math.hypot(pub.lat - page.lat, pub.lng - page.lon);
    if (dist > 0.005) continue; // ~500m

    const n = pub.name.toLowerCase();
    const t = cleanTitle.toLowerCase();
    if (n === t || n.includes(t) || t.includes(n) || wordOverlap(n, t) > 0.5) {
      if (dist < bestDist) {
        best = pub;
        bestDist = dist;
      }
    }
  }

  return best;
}

function trimDescription(text: string): string {
  // Take first 1-2 sentences, max ~250 chars
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  // Split into sentences
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  let result = "";
  for (const s of sentences) {
    if ((result + s).length > 280) break;
    result += s;
  }
  return result.trim() || cleaned.slice(0, 250);
}

function extractYear(text: string): number | undefined {
  if (!text) return undefined;
  // Look for "founded in 1742", "dates from 1666", "since 1888", "rebuilt in 1872"
  const patterns = [
    /(?:founded|established|opened|built|dates? from|since)\s+(?:in\s+)?(\d{4})/i,
    /(\d{4})\s*(?:by|and)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const year = parseInt(m[1], 10);
      if (year >= 1000 && year <= new Date().getFullYear()) return year;
    }
  }
  return undefined;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  console.log("Fetching Wikipedia 'Pubs in London' category and subcategories...");

  // All London borough subcategories from "Category:Pubs in London by borough"
  const categories = [
    "Category:Pubs in London",
    "Category:Pubs in the City of London",
    "Category:Pubs in the City of Westminster",
    "Category:Pubs in the London Borough of Barking and Dagenham",
    "Category:Pubs in the London Borough of Barnet",
    "Category:Pubs in the London Borough of Bexley",
    "Category:Pubs in the London Borough of Brent",
    "Category:Pubs in the London Borough of Bromley",
    "Category:Pubs in the London Borough of Camden",
    "Category:Pubs in the London Borough of Croydon",
    "Category:Pubs in the London Borough of Ealing",
    "Category:Pubs in the London Borough of Enfield",
    "Category:Pubs in the Royal Borough of Greenwich",
    "Category:Pubs in the London Borough of Hackney",
    "Category:Pubs in the London Borough of Hammersmith and Fulham",
    "Category:Pubs in the London Borough of Haringey",
    "Category:Pubs in the London Borough of Harrow",
    "Category:Pubs in the London Borough of Hillingdon",
    "Category:Pubs in the London Borough of Hounslow",
    "Category:Pubs in the London Borough of Islington",
    "Category:Pubs in the Royal Borough of Kensington and Chelsea",
    "Category:Pubs in the Royal Borough of Kingston upon Thames",
    "Category:Pubs in the London Borough of Lambeth",
    "Category:Pubs in the London Borough of Lewisham",
    "Category:Pubs in the London Borough of Merton",
    "Category:Pubs in the London Borough of Newham",
    "Category:Pubs in the London Borough of Richmond upon Thames",
    "Category:Pubs in the London Borough of Southwark",
    "Category:Pubs in the London Borough of Tower Hamlets",
    "Category:Pubs in the London Borough of Waltham Forest",
    "Category:Pubs in the London Borough of Wandsworth",
  ];

  const seenTitles = new Set<string>();
  const allPubPages: string[] = [];

  for (const cat of categories) {
    try {
      const members = await fetchCategoryMembers(cat);
      for (const m of members) {
        // Skip subcategories (ns=14) and lists
        if (m.ns !== 0) continue;
        if (m.title.startsWith("List of")) continue;
        if (seenTitles.has(m.title)) continue;
        seenTitles.add(m.title);
        allPubPages.push(m.title);
      }
      console.log(`  ${cat}: +${members.filter(m => m.ns === 0).length}`);
    } catch (err) {
      console.warn(`  Failed: ${cat}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nTotal unique pub articles: ${allPubPages.length}`);

  console.log("\nFetching coordinates + extracts...");
  const pageDataArr = await fetchPageData(allPubPages);
  console.log(`Got data for ${pageDataArr.length} pages`);

  let matched = 0;
  let descAdded = 0;
  let urlAdded = 0;
  let yearAdded = 0;

  for (const page of pageDataArr) {
    const pub = findMatchingPub(page, pubs);
    if (!pub) continue;
    matched++;

    if (!pub.description && page.extract) {
      pub.description = trimDescription(page.extract);
      descAdded++;
    }
    if (!pub.wikipediaUrl && page.fullurl) {
      pub.wikipediaUrl = page.fullurl;
      urlAdded++;
    }
    if (!pub.yearEstablished) {
      const year = extractYear(page.extract || "");
      if (year) {
        pub.yearEstablished = year;
        yearAdded++;
      }
    }
    // Wiki article generally implies historic
    if (!pub.historic) {
      pub.historic = true;
    }
  }

  console.log(`\nMatched ${matched} Wikipedia articles to our pubs`);
  console.log(`Descriptions added: ${descAdded}`);
  console.log(`Wikipedia URLs added: ${urlAdded}`);
  console.log(`Years established added: ${yearAdded}`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch(err => { console.error("Failed:", err); process.exit(1); });
