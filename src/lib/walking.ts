/**
 * Walking distance + time helpers.
 *
 * Uses haversine for crow-flies distance, then applies a routing-factor
 * multiplier (London streets aren't grids — typical real walking route is
 * ~1.3× straight-line) and average walking speed.
 *
 * Pros: instant, no API calls, no rate limits, accurate within ±2 min
 * for sub-2km distances which is all we ever show.
 *
 * For longer routes or different city grids OSRM would be more accurate,
 * but at the scale of "find a pub near me" this estimate is fine.
 */

/** Walking speed in km/h. Brisk walk, urban environment. */
const WALK_SPEED_KMH = 4.8;

/** Real walking routes vs straight-line distance. */
const ROUTING_FACTOR = 1.3;

/** Haversine straight-line distance in km. */
export function crowFliesKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estimated walking distance in km (crow-flies × routing factor). */
export function walkingKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return crowFliesKm(lat1, lng1, lat2, lng2) * ROUTING_FACTOR;
}

/** Estimated walking time in minutes. */
export function walkingMinutes(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return (walkingKm(lat1, lng1, lat2, lng2) / WALK_SPEED_KMH) * 60;
}

/** Format walking time for display. "2 min walk", "12 min walk", "1h 5min walk". */
export function formatWalkingTime(minutes: number): string {
  if (minutes < 1) return "<1 min walk";
  if (minutes < 60) return `${Math.round(minutes)} min walk`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min walk` : `${h}h walk`;
}

/** Format distance for display. "180m", "1.2km". */
export function formatWalkingDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
