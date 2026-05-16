/**
 * Seeds Supabase with all pubs from src/data/pubs.json.
 * Uses upsert so it's safe to re-run after data updates.
 *
 * Requires env vars (set in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY    (NOT the anon key — needs admin to write)
 *
 * Run with: npx tsx scripts/seed-supabase.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

interface PubJson {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  openingHours?: string;
  phone?: string;
  website?: string;
  rating?: number;
  hygieneRating?: number | string;
  description?: string;
  wikipediaUrl?: string;
  historic?: boolean;
  listedStatus?: string;
  yearEstablished?: number;
  hasFood?: boolean;
  hasLiveSport?: boolean;
  hasPoolTable?: boolean;
  hasDarts?: boolean;
  hasBeerGarden?: boolean;
  hasOutdoorSeating?: boolean;
  hasDogFriendly?: boolean;
  hasRealAle?: boolean;
  hasQuizNight?: boolean;
  hasLiveMusic?: boolean;
  hasRealFire?: boolean;
  hasWifi?: boolean;
  recognitions?: { source: string; type?: string; url?: string }[];
}

function toDbRow(p: PubJson) {
  return {
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    address: p.address ?? null,
    opening_hours: p.openingHours ?? null,
    phone: p.phone ?? null,
    website: p.website ?? null,
    rating: p.rating ?? null,
    hygiene_rating: p.hygieneRating !== undefined ? String(p.hygieneRating) : null,
    description: p.description ?? null,
    wikipedia_url: p.wikipediaUrl ?? null,
    historic: !!p.historic,
    listed_status: p.listedStatus ?? null,
    year_established: p.yearEstablished ?? null,
    has_food: !!p.hasFood,
    has_live_sport: !!p.hasLiveSport,
    has_pool_table: !!p.hasPoolTable,
    has_darts: !!p.hasDarts,
    has_beer_garden: !!p.hasBeerGarden,
    has_outdoor_seating: !!p.hasOutdoorSeating,
    has_dog_friendly: !!p.hasDogFriendly,
    has_real_ale: !!p.hasRealAle,
    has_quiz_night: !!p.hasQuizNight,
    has_live_music: !!p.hasLiveMusic,
    has_real_fire: !!p.hasRealFire,
    has_wifi: !!p.hasWifi,
    recognitions: p.recognitions ?? null,
  };
}

async function run() {
  const pubsPath = path.join(process.cwd(), "src", "data", "pubs.json");
  const pubs: PubJson[] = JSON.parse(fs.readFileSync(pubsPath, "utf-8"));
  console.log(`Seeding ${pubs.length} pubs to Supabase…`);

  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  // Upsert in batches of 500 (Supabase limit varies; 500 is safe)
  const BATCH = 500;
  let done = 0;
  for (let i = 0; i < pubs.length; i += BATCH) {
    const batch = pubs.slice(i, i + BATCH).map(toDbRow);
    const { error } = await supabase
      .from("pubs")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`Batch ${i}-${i + batch.length} failed:`, error.message);
      process.exit(1);
    }

    done += batch.length;
    process.stdout.write(`\r  ${done}/${pubs.length}`);
  }
  process.stdout.write("\n");

  // Verify count
  const { count, error } = await supabase
    .from("pubs")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error("Count check failed:", error.message);
  } else {
    console.log(`\nSupabase now contains ${count} pubs ✓`);
  }
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
