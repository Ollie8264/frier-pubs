-- Frier's Useful Pub Map — Supabase schema
-- Run this once in the Supabase SQL editor to create the pubs table.

-- Pub data table
CREATE TABLE IF NOT EXISTS public.pubs (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  address       TEXT,
  opening_hours TEXT,
  phone         TEXT,
  website       TEXT,
  rating        REAL,
  hygiene_rating TEXT,
  description   TEXT,
  wikipedia_url TEXT,
  historic      BOOLEAN DEFAULT FALSE,
  listed_status TEXT,
  year_established INT,

  has_food      BOOLEAN DEFAULT FALSE,
  has_live_sport BOOLEAN DEFAULT FALSE,
  has_pool_table BOOLEAN DEFAULT FALSE,
  has_darts     BOOLEAN DEFAULT FALSE,
  has_beer_garden BOOLEAN DEFAULT FALSE,
  has_outdoor_seating BOOLEAN DEFAULT FALSE,
  has_dog_friendly BOOLEAN DEFAULT FALSE,
  has_real_ale  BOOLEAN DEFAULT FALSE,
  has_quiz_night BOOLEAN DEFAULT FALSE,
  has_live_music BOOLEAN DEFAULT FALSE,
  has_real_fire BOOLEAN DEFAULT FALSE,
  has_wifi      BOOLEAN DEFAULT FALSE,

  recognitions  JSONB,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geo queries (lat/lng range scans)
CREATE INDEX IF NOT EXISTS pubs_lat_idx ON public.pubs (lat);
CREATE INDEX IF NOT EXISTS pubs_lng_idx ON public.pubs (lng);

-- Index for name search
CREATE INDEX IF NOT EXISTS pubs_name_lower_idx ON public.pubs (lower(name));

-- Indexes for the most-filtered fields
CREATE INDEX IF NOT EXISTS pubs_has_food_idx ON public.pubs (has_food) WHERE has_food = true;
CREATE INDEX IF NOT EXISTS pubs_has_sport_idx ON public.pubs (has_live_sport) WHERE has_live_sport = true;
CREATE INDEX IF NOT EXISTS pubs_has_real_ale_idx ON public.pubs (has_real_ale) WHERE has_real_ale = true;

-- ─────────────────────────────────────────────────────────────────────
-- Edit suggestions table — for the "Report incorrect info" feature
CREATE TABLE IF NOT EXISTS public.edit_suggestions (
  id            BIGSERIAL PRIMARY KEY,
  pub_id        TEXT REFERENCES public.pubs(id) ON DELETE CASCADE,
  field         TEXT NOT NULL,
  old_value     TEXT,
  suggested_value TEXT NOT NULL,
  note          TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'))
);

-- ─────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Anyone can READ pubs (public-facing data)
-- Only authenticated users (or service role) can INSERT/UPDATE/DELETE

ALTER TABLE public.pubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pubs are publicly readable" ON public.pubs;
CREATE POLICY "pubs are publicly readable"
  ON public.pubs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "anyone can submit edit suggestions" ON public.edit_suggestions;
CREATE POLICY "anyone can submit edit suggestions"
  ON public.edit_suggestions FOR INSERT
  WITH CHECK (true);

-- Suggestions are write-only for the public; admins read via service role
