import { NextRequest } from "next/server";
import pubs from "@/data/pubs.json";
import { Pub, SUNNY_THRESHOLD } from "@/lib/types";
import { injectSunMany } from "@/lib/sun";
import { typicalOpenWindow } from "@/lib/opening-hours";

// Fields excluded from list response to keep payload small.
// Full detail is fetched on-demand via /api/pubs/[id].
// heroImageUrl is INCLUDED so cards can show a thumbnail.
const HEAVY_FIELDS = [
  "description",
  "wikipediaUrl",
  "yearEstablished",
  "listedStatus",
  "hygieneRating",
  "phone",
  "sunStats", // year-round sun stats only used in detail chart
] as const;

type PubSummary = Omit<Pub, typeof HEAVY_FIELDS[number]>;

function toSummary(p: Pub): PubSummary {
  // Build a shallow copy with the heavy fields stripped
  const {
    description, wikipediaUrl, yearEstablished, listedStatus,
    hygieneRating, phone, sunStats, ...rest
  } = p;
  void description; void wikipediaUrl; void yearEstablished;
  void listedStatus; void hygieneRating; void phone;
  void sunStats;
  return rest;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const hasFood = searchParams.get("hasFood");
  const hasLiveSport = searchParams.get("hasLiveSport");
  const hasPoolTable = searchParams.get("hasPoolTable");
  const hasDarts = searchParams.get("hasDarts");
  const hasBeerGarden = searchParams.get("hasBeerGarden");
  const hasDogFriendly = searchParams.get("hasDogFriendly");
  const hasRealAle = searchParams.get("hasRealAle");
  const hasQuizNight = searchParams.get("hasQuizNight");
  const hasLiveMusic = searchParams.get("hasLiveMusic");
  const isSunny = searchParams.get("isSunny");
  const isTimeOutPick = searchParams.get("isTimeOutPick");
  const sunnyAfterParam = searchParams.get("sunnyAfter");
  const sunnyAfter = sunnyAfterParam ? parseFloat(sunnyAfterParam) : null;
  const openAfterParam = searchParams.get("openAfter");
  const openAfter = openAfterParam ? parseFloat(openAfterParam) : null;
  const search = searchParams.get("search")?.toLowerCase();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius");
  const dayParam = searchParams.get("day");
  const day = dayParam ? Math.max(1, Math.min(365, parseInt(dayParam, 10))) : undefined;

  // Make a shallow copy of each pub so we don't mutate the imported JSON
  // (Next.js can cache the import between requests on the same instance)
  let filtered = (pubs as Pub[]).map((p) => ({ ...p }));

  // Inject today's (or requested day's) sun values BEFORE the sunny filter,
  // so filtering uses up-to-date numbers rather than the stale Jan baseline.
  injectSunMany(filtered, day);

  if (hasFood === "true") filtered = filtered.filter((p) => p.hasFood);
  if (hasLiveSport === "true") filtered = filtered.filter((p) => p.hasLiveSport);
  if (hasPoolTable === "true") filtered = filtered.filter((p) => p.hasPoolTable);
  if (hasDarts === "true") filtered = filtered.filter((p) => p.hasDarts);
  if (hasBeerGarden === "true")
    filtered = filtered.filter((p) => p.hasBeerGarden || p.hasOutdoorSeating);
  if (hasDogFriendly === "true") filtered = filtered.filter((p) => p.hasDogFriendly);
  if (hasRealAle === "true") filtered = filtered.filter((p) => p.hasRealAle);
  if (hasQuizNight === "true") filtered = filtered.filter((p) => p.hasQuizNight);
  if (hasLiveMusic === "true") filtered = filtered.filter((p) => p.hasLiveMusic);
  if (isSunny === "true")
    filtered = filtered.filter(
      (p) => (p.avgSunPercentage ?? 0) >= SUNNY_THRESHOLD
    );
  if (isTimeOutPick === "true")
    filtered = filtered.filter((p) =>
      p.recognitions?.some((r) => r.source === "Time Out")
    );
  if (sunnyAfter !== null && !Number.isNaN(sunnyAfter)) {
    filtered = filtered.filter(
      (p) => p.sunEndHour !== undefined && p.sunEndHour > sunnyAfter
    );
  }
  if (openAfter !== null && !Number.isNaN(openAfter)) {
    // Only include pubs whose latest closing time is past `openAfter` AND that
    // actually have opening hours (don't surface unknowns as false positives).
    filtered = filtered.filter((p) => {
      if (!p.openingHours) return false;
      const { close } = typicalOpenWindow(p.openingHours);
      return close >= openAfter;
    });
  }

  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.address?.toLowerCase().includes(search)
    );
  }

  // Geo radius filter: when lat/lng/radius supplied, only return pubs within
  // radius km. Powers the "Near me" and "Find pubs in area" features.
  if (lat && lng && radius) {
    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (!Number.isNaN(centerLat) && !Number.isNaN(centerLng) && !Number.isNaN(radiusKm)) {
      filtered = filtered.filter((p) => {
        const dist = haversineDistance(centerLat, centerLng, p.lat, p.lng);
        return dist <= radiusKm;
      });
    }
  }

  // Strip heavy fields — list response should be lean
  const summaries = filtered.map(toSummary);

  return Response.json(
    {
      pubs: summaries,
      total: pubs.length,
      filtered: summaries.length,
    },
    {
      headers: {
        // Vercel CDN edge caches for 60s, browsers for 30s; stale-while-revalidate
        // lets the CDN serve a stale response for up to 5min while it fetches fresh.
        // Massively reduces function invocations under load.
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
