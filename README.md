# Frier's Useful Pub Map

A pub finder for central London. 2,470 pubs and bars filterable by what actually matters — food, live sport, beer gardens, real ale, pool tables, quiz nights, dog-friendly, and more.

Live: _(set `NEXT_PUBLIC_SITE_URL` after deploy)_

## Stack

- **Next.js 16** App Router + TypeScript
- **Tailwind CSS v4** for styling
- **Leaflet** + CARTO Voyager tiles for the map
- **Supabase** Postgres for pub data (currently static JSON, migration scripted)
- **OSM Nominatim** (free) for area search geocoding
- **Browser Geolocation API** for "Near me"

## Data sources

All data is collected and cached locally — the live app makes no paid API calls.

- **OpenStreetMap** (Overpass API) — base pub list, addresses, opening hours, tags
- **Google Places API (New)** — ratings, amenity hints from review mining (one-off enrichment, now disabled)
- **FHRS** (UK gov Food Hygiene Rating Scheme) — hygiene ratings + food confirmation
- **Wikipedia** — historical descriptions for ~115 famous pubs
- **Time Out London** — editorial picks ("Best pub", "Best beer garden", etc.)
- **OSM brand/operator tags** — chain detection for Greene King, Fuller's, Young's, etc.
- **pubsinthesun.com** — ray-traced sun-exposure data for every day of the year, plus hero photos (629 pubs)

## Local dev

```bash
npm install
npm run dev
```

Then [localhost:3000](http://localhost:3000).

### Environment

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # only needed for seed script
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Scripts

All scripts live in `scripts/`. Run with `npx tsx scripts/<name>.ts`.

### Data enrichment (mostly free)
- `fetch-pubs.ts` — initial OSM fetch
- `fetch-bars.ts` — add bars (amenity=bar)
- `enrich-fhrs.ts` — FHRS hygiene + food confirmation (free)
- `enrich-osm-extra.ts` — heritage / listed / year tags
- `enrich-wikipedia.ts` — descriptions from Wikipedia
- `enrich-timeout.ts` — Time Out editorial picks
- `enrich-chains.ts` — chain-based amenity inference
- `restore-osm-websites.ts` — restore website fields from OSM

### Google Places enrichment (paid — disabled by default)
- `enrich-pubs.ts` `enrich-sport.ts` `enrich-sparse.ts` `enrich-final.ts` `enrich-poor-pubs.ts` `audit-boroughs.ts`

### Sun data (pubsinthesun.com)
- `enrich-sun.ts` — single-day snapshot (legacy)
- `enrich-sun-year.ts` — all 365 days, writes `src/data/sun-by-day.json`
- `restore-osm-websites.ts` — restore website fields from OSM after over-aggressive validation

### Maintenance
- `cleanup-data.ts` — remove bad names, dedupe, drop closed pubs
- `validate-websites.ts` — probe every website URL, remove broken ones

### Supabase
- `supabase-schema.sql` — run once in Supabase SQL editor
- `seed-supabase.ts` — upsert all pubs from JSON to Supabase

## Roadmap

See [TODO.md](./TODO.md).
