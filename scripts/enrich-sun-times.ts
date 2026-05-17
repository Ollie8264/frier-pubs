/**
 * Classifies each pub's sun pattern: morning, afternoon, all-day, etc.
 *
 * Uses PITS's sun_slots array (168 time slots from sunrise to sunset).
 * For each pub on a representative summer day, we look at where the sun
 * coverage is concentrated to derive:
 *   - sunPattern: "morning" | "midday" | "afternoon" | "all-day"
 *   - peakHourGuess: approximate clock hour (0-23) when sun peaks
 *
 * We use June 21 (day 172, summer solstice — longest day, clearest signal)
 * as the reference day. The pattern is mostly a property of the pub's
 * orientation, which doesn't change through the year.
 *
 * Output is merged into src/data/pubs.json on the existing pubs.
 *
 * Run with: npx tsx scripts/enrich-sun-times.ts
 */

import fs from "fs";
import path from "path";

interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sunPattern?: "morning" | "midday" | "afternoon" | "all-day";
  peakSunHour?: number;
  sunStartHour?: number;
  sunEndHour?: number;
  [key: string]: unknown;
}

interface PITSPub {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  sun_slots: number[];
  avg_sun_percentage?: number;
}

// Compute sunrise/sunset for a date + lat/lng (rough but good enough for UI).
// Returns hours since midnight (e.g. 5.13 for 5:08am).
function sunriseSunset(date: Date, lat: number, lng: number): { rise: number; set: number } {
  // Simplified NOAA algorithm — accurate within ~2 minutes for UK lats.
  const dayOfYear = Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000);
  const radDeg = Math.PI / 180;
  const latRad = lat * radDeg;

  // Solar declination (Bourges approximation)
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Equation of time (in minutes)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Hour angle for sunrise/sunset (90.833° accounts for refraction)
  const zenith = 90.833 * radDeg;
  const cosH = (Math.cos(zenith) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl));
  if (cosH > 1) return { rise: 12, set: 12 }; // Polar night
  if (cosH < -1) return { rise: 0, set: 24 }; // Polar day

  const H = Math.acos(cosH) / radDeg; // degrees
  const solarNoon = 720 - 4 * lng - eqTime; // minutes
  const rise = (solarNoon - 4 * H) / 60;
  const set = (solarNoon + 4 * H) / 60;

  // London is UTC+1 in summer (BST). For June, add 1 hour.
  // Crude but fine for UI purposes (we're not booking flights).
  const isBst = dayOfYear >= 87 && dayOfYear <= 304; // ~late Mar to late Oct
  const offset = isBst ? 1 : 0;
  return { rise: rise + offset, set: set + offset };
}

function classifyPattern(
  slots: number[],
  sunrise: number,
  sunset: number
): { pattern: Pub["sunPattern"]; peakHour: number; startHour: number; endHour: number } {
  const SUN_THRESHOLD = 40;

  // PITS slots span sunrise → sunset. Total slots = 168.
  // (Empirically the array length doesn't change with day length; the slot
  // values just go to 0 outside the pub's sunny window.)
  const totalSlots = slots.length;
  const dayLength = sunset - sunrise;
  const slotToHour = (slotIdx: number) => sunrise + (slotIdx / (totalSlots - 1)) * dayLength;

  // Find sunny slot bounds (≥40% threshold)
  let firstSlot = -1;
  let lastSlot = -1;
  let maxVal = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] > maxVal) maxVal = slots[i];
    if (slots[i] >= SUN_THRESHOLD) {
      if (firstSlot === -1) firstSlot = i;
      lastSlot = i;
    }
  }

  if (firstSlot === -1 || maxVal < SUN_THRESHOLD) {
    return { pattern: undefined, peakHour: 12, startHour: 0, endHour: 0 };
  }

  // Peak = weighted centre-of-mass of the sunny period.
  // Avoids picking the first slot when a long flat peak exists.
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = firstSlot; i <= lastSlot; i++) {
    const w = Math.max(0, slots[i] - SUN_THRESHOLD);
    weightedSum += i * w;
    weightTotal += w;
  }
  const peakSlot = weightTotal > 0 ? weightedSum / weightTotal : (firstSlot + lastSlot) / 2;

  const startHour = slotToHour(firstSlot);
  const endHour = slotToHour(lastSlot);
  const peakHour = slotToHour(peakSlot);

  // Classify based on where the peak sits in the day
  // Use solar noon as the centre — anything notably before/after is morning/afternoon
  const solarNoon = (sunrise + sunset) / 2;
  const sunHours = endHour - startHour;

  let pattern: Pub["sunPattern"];
  if (sunHours >= dayLength * 0.65) {
    pattern = "all-day";
  } else if (peakHour < solarNoon - 1.5) {
    pattern = "morning";
  } else if (peakHour > solarNoon + 1.5) {
    pattern = "afternoon";
  } else {
    pattern = "midday";
  }

  return {
    pattern,
    peakHour: Math.round(peakHour * 10) / 10,
    startHour: Math.round(startHour * 10) / 10,
    endHour: Math.round(endHour * 10) / 10,
  };
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/^the\s+/, "").replace(/&/g, "and").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function namesSimilar(a: string, b: string): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return true;
  if (na.length < 3 || nb.length < 3) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(na.split(/\s+/).filter((w) => w.length > 2));
  const wb = new Set(nb.split(/\s+/).filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return false;
  const common = [...wa].filter((w) => wb.has(w));
  return common.length / Math.min(wa.size, wb.size) > 0.6;
}

function distMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function run() {
  const REFERENCE_DAY = 172; // June 21 — summer solstice
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: Pub[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));

  console.log(`Fetching PITS data for day ${REFERENCE_DAY} (Jun 21)...`);
  const resp = await fetch(
    `https://www.pubsinthesun.com/api/pubs?includeSunData=true&dayOfYear=${REFERENCE_DAY}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    }
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const pitsList: PITSPub[] = await resp.json();
  console.log(`Got ${pitsList.length} PITS pubs`);

  const refDate = new Date(Date.UTC(2026, 0, 0));
  refDate.setUTCDate(REFERENCE_DAY);

  let enriched = 0;
  const patternCounts: Record<string, number> = {};

  for (const pits of pitsList) {
    if (!pits.sun_slots || pits.sun_slots.length === 0) continue;

    // Find matching local pub
    let match: Pub | null = null;
    let bestDist = Infinity;
    for (const pub of pubs) {
      const d = distMetres(pits.latitude, pits.longitude, pub.lat, pub.lng);
      if (d > 80) continue;
      const pitsName = pits.name.split(",")[0].trim();
      if (namesSimilar(pub.name, pitsName) && d < bestDist) {
        match = pub;
        bestDist = d;
      }
    }
    if (!match) continue;

    const { rise, set } = sunriseSunset(refDate, pits.latitude, pits.longitude);
    const { pattern, peakHour, startHour, endHour } = classifyPattern(pits.sun_slots, rise, set);
    if (!pattern) continue;

    match.sunPattern = pattern;
    match.peakSunHour = peakHour;
    match.sunStartHour = startHour;
    match.sunEndHour = endHour;
    enriched++;
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  }

  console.log(`\nEnriched ${enriched} pubs with sun timing`);
  console.log("Pattern distribution:", patternCounts);

  // Sample for sanity check
  const samples = pubs.filter((p) => p.sunPattern).slice(0, 5);
  console.log("\nSample pubs:");
  for (const p of samples) {
    const fmt = (h?: number) => h === undefined ? "?" : `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
    console.log(`  ${p.name}: ${p.sunPattern}, sun ${fmt(p.sunStartHour)}–${fmt(p.sunEndHour)}, peak ${fmt(p.peakSunHour)}`);
  }

  fs.writeFileSync(pubsPath, JSON.stringify(pubs, null, 2));
  console.log(`\nWrote to ${pubsPath}`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
