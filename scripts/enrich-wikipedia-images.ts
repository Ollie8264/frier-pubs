/**
 * Pull lead images from Wikipedia for famous pubs that don't have a hero
 * photo from PITS. Uses MediaWiki's free `pageimages` API.
 *
 * Wikipedia images are CC-licensed via Wikimedia Commons — fine to display
 * with appropriate attribution.
 *
 * Run with: npx tsx scripts/enrich-wikipedia-images.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  wikipediaUrl?: string;
  heroImageUrl?: string;
  [key: string]: unknown;
}

const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = { "User-Agent": "FrierPubs/1.0 (https://usefulpubmap.com)" };

function titleFromUrl(url: string): string | null {
  // https://en.wikipedia.org/wiki/Ye_Olde_Cheshire_Cheese → "Ye_Olde_Cheshire_Cheese"
  const m = url.match(/wikipedia\.org\/wiki\/([^?#]+)/);
  if (!m) return null;
  return decodeURIComponent(m[1]);
}

async function fetchPageImages(
  titles: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  // MediaWiki allows up to 50 titles per request
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const params = new URLSearchParams({
      action: "query",
      titles: batch.join("|"),
      prop: "pageimages",
      // Larger thumb so it looks good on the per-pub hero
      pithumbsize: "800",
      format: "json",
    });
    const resp = await fetch(`${API}?${params}`, { headers: HEADERS });
    if (!resp.ok) {
      console.warn(`  HTTP ${resp.status} on batch ${i}`);
      continue;
    }
    const data = await resp.json();
    const pages = data.query?.pages ?? {};
    for (const id of Object.keys(pages)) {
      const p = pages[id];
      if (p.thumbnail?.source) {
        out.set(p.title, p.thumbnail.source);
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  // Find pubs with Wikipedia URL but no hero image
  const candidates = pubs.filter(
    (p) => p.wikipediaUrl && !p.heroImageUrl
  );
  console.log(`${candidates.length} pubs with Wikipedia article but no photo`);

  const titleToPub = new Map<string, Pub>();
  for (const pub of candidates) {
    const title = titleFromUrl(pub.wikipediaUrl!);
    if (!title) continue;
    // Wikipedia API returns titles with spaces, not underscores
    const apiTitle = title.replace(/_/g, " ");
    titleToPub.set(apiTitle, pub);
  }

  console.log(`Fetching images for ${titleToPub.size} pages...`);
  const imageMap = await fetchPageImages([...titleToPub.keys()]);
  console.log(`Got ${imageMap.size} thumbnails back`);

  let added = 0;
  for (const [title, imageUrl] of imageMap.entries()) {
    const pub = titleToPub.get(title);
    if (!pub) continue;
    pub.heroImageUrl = imageUrl;
    added++;
    console.log(`  + ${pub.name}: ${imageUrl.split("/").pop()?.split("?")[0]}`);
  }

  console.log(`\nAdded ${added} hero images from Wikipedia`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
