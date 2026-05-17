/**
 * Audit phase 4: Cross-check Wetherspoons pub list against our data.
 *
 * Fetches the Wetherspoons sitemap, extracts London pub names, and looks
 * for any that we're missing. Their sitemap doesn't give coordinates, so
 * we can only check by name — and we have to fetch each pub's page to get
 * the address (expensive). Approach:
 *
 * 1. Get list of London-suffixed Wetherspoons URLs from sitemap
 * 2. For each, do a fuzzy name match against our existing data
 * 3. Log unmatched ones — these need manual investigation
 *
 * Run with: npx tsx scripts/audit-wetherspoons.ts
 */

import fs from "fs";
import path from "path";

interface Pub { id: string; name: string; lat: number; lng: number; address?: string; [key: string]: unknown }

const SITEMAP = "https://www.jdwetherspoon.com/pubs-sitemap.xml";

function slugToName(slug: string): string {
  // "the-cheshire-cheese-london" → "The Cheshire Cheese London" → "The Cheshire Cheese"
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/^the\s+/, "").replace(/&/g, "and").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return true;
  if (na.length < 3 || nb.length < 3) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(na.split(/\s+/).filter(w => w.length > 2));
  const wb = new Set(nb.split(/\s+/).filter(w => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return false;
  const common = [...wa].filter(w => wb.has(w));
  return common.length / Math.min(wa.size, wb.size) > 0.6;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  console.log("Fetching Wetherspoons sitemap...");
  const resp = await fetch(SITEMAP, {
    headers: { "User-Agent": "Mozilla/5.0 (FrierPubs/1.0)" },
  });
  if (!resp.ok) throw new Error(`Sitemap HTTP ${resp.status}`);
  const xml = await resp.text();
  console.log(`Got ${xml.length} bytes of XML`);

  // Extract all /pubs/{slug}/ URLs
  const urlMatches = xml.matchAll(/<loc>https:\/\/www\.jdwetherspoon\.com\/pubs\/([^<]+?)\/<\/loc>/g);
  const allSlugs = [...urlMatches].map((m) => m[1]);
  console.log(`Found ${allSlugs.length} pub URLs`);

  // Filter to ones suffixed with central London area names
  const londonSuffixes = [
    "-london", "-london-bridge", "-camden", "-islington", "-hackney",
    "-westminster", "-southwark", "-lambeth", "-shoreditch",
    "-bethnal-green", "-pimlico", "-victoria", "-tooting", "-clapham",
    "-vauxhall", "-kennington", "-borough", "-southbank", "-soho",
    "-chelsea", "-fulham", "-paddington", "-marylebone", "-hammersmith",
    "-kensington", "-bayswater", "-holborn", "-bloomsbury", "-strand",
    "-charing-cross", "-leicester-square", "-city-of-london",
    "-tower-bridge", "-farringdon", "-mayfair", "-fitzrovia", "-aldgate",
    "-liverpool-street", "-king-s-cross", "-st-pancras", "-euston",
    "-old-street", "-angel", "-clerkenwell", "-spitalfields",
    "-whitechapel", "-canary-wharf", "-bermondsey", "-elephant-and-castle",
    "-waterloo", "-pancras", "-canada-water", "-rotherhithe",
  ];
  const londonSlugs = allSlugs.filter((s) =>
    londonSuffixes.some((suf) => s.endsWith(suf) || s.includes(suf))
  );
  console.log(`Filtered to ${londonSlugs.length} potentially-London slugs`);

  // Cross-reference
  let matched = 0;
  const unmatched: string[] = [];
  for (const slug of londonSlugs) {
    // Best-guess name: drop the city suffix
    let nameSlug = slug;
    for (const suf of londonSuffixes) {
      if (nameSlug.endsWith(suf)) {
        nameSlug = nameSlug.slice(0, -suf.length);
        break;
      }
    }
    const candidateName = slugToName(nameSlug);
    const match = pubs.find((p) => namesMatch(p.name, candidateName));
    if (match) {
      matched++;
    } else {
      unmatched.push(`${candidateName}  (slug: ${slug})`);
    }
  }

  console.log(`\nMatched ${matched} / ${londonSlugs.length}`);
  console.log(`Unmatched (likely missing from our data): ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log("\nUnmatched Wetherspoons:");
    unmatched.forEach((n) => console.log(`  - ${n}`));
  }
}

run().catch((err) => { console.error("Failed:", err); process.exit(1); });
