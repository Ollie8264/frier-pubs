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
  searchQuery: string;
}
