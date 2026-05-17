export interface Pub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  openingHours?: string;
  phone?: string;
  website?: string;
  rating?: number;
  hasFood: boolean;
  hasLiveSport: boolean;
  hasPoolTable: boolean;
  hasDarts: boolean;
  hasBeerGarden: boolean;
  hasOutdoorSeating: boolean;
  hasDogFriendly: boolean;
  hasRealAle: boolean;
  hasQuizNight: boolean;
  hasLiveMusic: boolean;
  hasRealFire: boolean;
  hasWifi: boolean;
  hygieneRating?: number | string;
  description?: string;
  historic?: boolean;
  listedStatus?: string;
  yearEstablished?: number;
  recognitions?: { source: string; type?: string; url?: string }[];
  wikipediaUrl?: string;
  // Sun-exposure rating (% of outdoor area in direct sun on average)
  // Sourced from pubsinthesun.com — ray-traced data
  avgSunPercentage?: number;
  bestSunPercentage?: number;
  sunSource?: string;
  heroImageUrl?: string;
  sunStats?: SunStats;
}

export interface SunStats {
  yearAvg: number;
  bestMonth: { name: string; avg: number };
  worstMonth: { name: string; avg: number };
  monthly: number[]; // 12 entries, Jan→Dec
}

export type SortOption = "distance" | "rating" | "name";

export interface Filters {
  hasFood: boolean | null;
  hasLiveSport: boolean | null;
  hasPoolTable: boolean | null;
  hasDarts: boolean | null;
  hasBeerGarden: boolean | null;
  hasDogFriendly: boolean | null;
  hasRealAle: boolean | null;
  hasQuizNight: boolean | null;
  hasLiveMusic: boolean | null;
  isSunny: boolean | null;
  searchQuery: string;
}

// Threshold (avg sun %) for the "Sunny" filter
export const SUNNY_THRESHOLD = 60;
