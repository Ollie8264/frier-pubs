/**
 * Scrapes Time Out London "best of" pub lists and tags matching pubs as
 * Time Out recommended.
 *
 * Free — uses public Time Out web pages.
 *
 * Run with: npx tsx scripts/enrich-timeout.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  recognitions?: { source: string; type?: string; url?: string }[];
  [key: string]: unknown;
}

// Time Out list URLs to scrape — each represents an editorial pick
const TIMEOUT_LISTS: { url: string; type: string }[] = [
  { url: "https://www.timeout.com/london/bars-and-pubs/the-best-pubs-in-london", type: "Best pub" },
  { url: "https://www.timeout.com/london/bars-and-pubs/family-friendly-pubs-in-london", type: "Family-friendly" },
  { url: "https://www.timeout.com/london/bars-and-pubs/londons-best-historic-pubs", type: "Historic pub" },
  { url: "https://www.timeout.com/london/bars-pubs/londons-best-beer-gardens", type: "Best beer garden" },
  { url: "https://www.timeout.com/london/restaurants/londons-best-gastropubs", type: "Best gastropub" },
  { url: "https://www.timeout.com/london/bars-pubs/soho-pubs", type: "Best Soho pub" },
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
  "Accept-Language": "en-GB,en;q=0.9",
};

async function fetchAndExtractPubNames(url: string): Promise<string[]> {
  try {
    const resp = await fetch(url, { headers: HEADERS });
    if (!resp.ok) {
      console.warn(`  HTTP ${resp.status} for ${url}`);
      return [];
    }
    const html = await resp.text();

    // Time Out uses <h3> headings with pub names in their lists
    // Pattern: <h3 ...>(number\.)?\s*Pub Name</h3>
    const names = new Set<string>();

    // Capture h3 headings
    const h3Pattern = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    let match;
    while ((match = h3Pattern.exec(html)) !== null) {
      // Strip HTML tags
      let name = match[1].replace(/<[^>]+>/g, "").trim();
      // Decode common HTML entities
      name = name.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&rsquo;/g, "'");
      // Remove leading numbering like "1. " or "1 - "
      name = name.replace(/^\d+\.?\s*[-—]?\s*/, "").trim();
      // Skip junk
      if (name.length < 3 || name.length > 100) continue;
      if (/^(more|read|see|browse|sign up|newsletter|advertis|share|tags|featured|popular|trending|related|by |contact|terms|privacy)/i.test(name)) continue;
      names.add(name);
    }

    // Also try h2 (some list items use h2)
    const h2Pattern = /<h2[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/h2>/gi;
    while ((match = h2Pattern.exec(html)) !== null) {
      let name = match[1].replace(/<[^>]+>/g, "").trim();
      name = name.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&rsquo;/g, "'");
      name = name.replace(/^\d+\.?\s*[-—]?\s*/, "").trim();
      if (name.length < 3 || name.length > 100) continue;
      names.add(name);
    }

    return [...names];
  } catch (err) {
    console.warn(`  Error fetching ${url}: ${err}`);
    return [];
  }
}

function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingPubs(timeoutName: string, pubs: Pub[]): Pub[] {
  const normTo = normaliseForMatch(timeoutName);
  if (normTo.length < 4) return [];

  const matches: Pub[] = [];
  for (const pub of pubs) {
    const normPub = normaliseForMatch(pub.name);
    if (normPub === normTo || normPub.includes(normTo) || normTo.includes(normPub)) {
      matches.push(pub);
    }
  }
  return matches;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  console.log(`Scraping ${TIMEOUT_LISTS.length} Time Out lists...`);

  const listResults: { type: string; url: string; names: string[] }[] = [];

  for (const { url, type } of TIMEOUT_LISTS) {
    process.stdout.write(`  ${type}... `);
    const names = await fetchAndExtractPubNames(url);
    console.log(`${names.length} candidate headings`);
    listResults.push({ type, url, names });
    await new Promise(r => setTimeout(r, 800));
  }

  // Match and apply recognitions
  let totalRecognitions = 0;
  let uniquePubs = new Set<string>();

  for (const { type, url, names } of listResults) {
    let listMatches = 0;
    for (const name of names) {
      const matches = findMatchingPubs(name, pubs);
      // If too many matches, the name is probably too generic — skip
      if (matches.length > 3) continue;

      for (const pub of matches) {
        if (!pub.recognitions) pub.recognitions = [];
        // Don't duplicate
        const exists = pub.recognitions.some(r => r.source === "Time Out" && r.type === type);
        if (exists) continue;

        pub.recognitions.push({ source: "Time Out", type, url });
        listMatches++;
        uniquePubs.add(pub.id);
        totalRecognitions++;
      }
    }
    console.log(`  ${type}: ${listMatches} pubs tagged`);
  }

  console.log(`\nTotal recognitions added: ${totalRecognitions}`);
  console.log(`Unique pubs tagged: ${uniquePubs.size}`);

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`Wrote to ${pubsPath}`);
}

run().catch(err => { console.error("Failed:", err); process.exit(1); });
