/**
 * Cleans the pubs dataset — removes:
 *   - Pubs with unusable names (<3 chars, single symbol, all-numeric)
 *   - Near-duplicates (within 30m + similar name)
 *   - Permanently closed pubs (opening hours say "closed")
 *
 * Run with: npx tsx scripts/cleanup-data.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  openingHours?: string;
  address?: string;
  rating?: number;
  hygieneRating?: number | string;
  description?: string;
  [key: string]: unknown;
}

function normaliseName(s: string): string {
  return s.toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function namesSimilar(a: string, b: string): boolean {
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (na === nb) return true;
  if (na.length < 3 || nb.length < 3) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Word overlap > 50% of the shorter name
  const wa = new Set(na.split(/\s+/).filter((w) => w.length > 2));
  const wb = new Set(nb.split(/\s+/).filter((w) => w.length > 2));
  const common = [...wa].filter((w) => wb.has(w));
  const minSize = Math.min(wa.size, wb.size) || 1;
  return common.length / minSize > 0.6;
}

function distMetres(a: Pub, b: Pub): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function isPermanentlyClosed(h: string): boolean {
  const lower = h.toLowerCase().trim();
  if (lower === "closed") return true;
  if (lower === "by appointment") return true;
  if (/^(mo-su\s+)?closed$/i.test(lower)) return true;
  if (/^off$/i.test(lower)) return true;
  return false;
}

function isUnusableName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 3) return true;
  if (/^[0-9]+$/.test(trimmed)) return true;
  // Single non-alphanumeric character or 2 single tokens
  if (!/[a-zA-Z]/.test(trimmed)) return true;
  return false;
}

function mergePub(keep: Pub, drop: Pub): void {
  // Fill in missing fields from the dropped pub
  for (const key of Object.keys(drop) as (keyof Pub)[]) {
    if (key === "id" || key === "name" || key === "lat" || key === "lng") continue;
    if (keep[key] === undefined || keep[key] === null || keep[key] === "" || keep[key] === false) {
      const dropVal = drop[key];
      if (dropVal !== undefined && dropVal !== null && dropVal !== "" && dropVal !== false) {
        keep[key] = dropVal;
      }
    }
  }
}

function richness(p: Pub): number {
  // Score based on how much real data a pub has — higher is better
  let s = 0;
  if (p.address) s += 3;
  if (p.openingHours) s += 2;
  if (p.rating) s += 2;
  if (p.hygieneRating !== undefined) s += 2;
  if (p.description) s += 3;
  if (p["website"]) s += 1;
  if (p["phone"]) s += 1;
  return s;
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));
  console.log(`Starting with ${pubs.length} venues`);

  // ───── Pass 1: drop unusable names ─────
  let droppedName = 0;
  const namedPubs = pubs.filter((p) => {
    if (isUnusableName(p.name)) {
      droppedName++;
      return false;
    }
    return true;
  });
  console.log(`Removed ${droppedName} with unusable names`);

  // ───── Pass 2: drop permanently closed ─────
  let droppedClosed = 0;
  const openPubs = namedPubs.filter((p) => {
    if (p.openingHours && isPermanentlyClosed(p.openingHours)) {
      droppedClosed++;
      return false;
    }
    return true;
  });
  console.log(`Removed ${droppedClosed} permanently closed`);

  // ───── Pass 3: dedupe near-duplicates ─────
  // Sort by latitude so we only need to compare close neighbours
  openPubs.sort((a, b) => a.lat - b.lat);
  const dropped = new Set<string>();
  let mergedCount = 0;
  for (let i = 0; i < openPubs.length; i++) {
    if (dropped.has(openPubs[i].id)) continue;
    for (
      let j = i + 1;
      j < openPubs.length && openPubs[j].lat - openPubs[i].lat < 0.0005; // ~55m lat window
      j++
    ) {
      if (dropped.has(openPubs[j].id)) continue;
      const d = distMetres(openPubs[i], openPubs[j]);
      if (d > 30) continue;
      if (!namesSimilar(openPubs[i].name, openPubs[j].name)) continue;

      // Keep the richer one; merge fields from the other
      const a = openPubs[i];
      const b = openPubs[j];
      if (richness(a) >= richness(b)) {
        mergePub(a, b);
        dropped.add(b.id);
      } else {
        mergePub(b, a);
        dropped.add(a.id);
      }
      mergedCount++;
    }
  }
  const dedupedPubs = openPubs.filter((p) => !dropped.has(p.id));
  console.log(`Merged ${mergedCount} near-duplicates (${dropped.size} entries dropped)`);

  // ───── Summary ─────
  console.log(`\nFinal count: ${dedupedPubs.length} venues`);
  console.log(`Total removed: ${pubs.length - dedupedPubs.length}`);

  // Verify no obvious bad entries remain
  const stillBad = dedupedPubs.filter((p) =>
    isUnusableName(p.name) || (p.openingHours && isPermanentlyClosed(p.openingHours))
  );
  if (stillBad.length > 0) {
    console.warn("Bad entries still present:", stillBad.map((p) => p.name));
  } else {
    console.log("✓ No bad entries remaining");
  }

  fs.writeFileSync(pubsPath, JSON.stringify(dedupedPubs, null, 2));
  console.log(`\nWrote to ${pubsPath}`);
}

run().catch((err) => { console.error("Failed:", err); process.exit(1); });
