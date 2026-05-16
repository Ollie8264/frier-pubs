# Frier's Useful Pub Map — Next Steps

## ✅ Done
- ~~Deploy to Vercel~~ → **https://frier-pubs.vercel.app**
- ~~Commit & push to GitHub~~ → **https://github.com/Ollie8264/frier-pubs**
- ~~Open Graph meta tags + dynamic OG image~~
- ~~Error boundary~~
- ~~Loading skeletons~~
- ~~Sitemap + robots.txt~~
- ~~Supabase schema + seed script~~ (scaffolded — needs API keys to run)

## 🟡 Needs your input

### Supabase migration (15 mins)
1. Open Supabase project → SQL Editor
2. Paste `scripts/supabase-schema.sql` and run it
3. Get your keys from Supabase Settings → API:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Add them to `.env.local`
5. Run `npx tsx scripts/seed-supabase.ts` to push all 2,470 pubs
6. Also add the public-facing two to Vercel:
   `npx vercel env add NEXT_PUBLIC_SUPABASE_URL production`
   `npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production`
7. Then I can swap the API routes from JSON imports to Supabase queries

### Custom domain (5 mins, ~£8/yr)
1. Buy `frier-pubs.com` (or whatever) on Cloudflare / Namecheap
2. Vercel dashboard → frier-pubs → Settings → Domains → add
3. Vercel gives DNS records, paste into your registrar
4. Update `NEXT_PUBLIC_SITE_URL` env var to the new domain

### Analytics (5 mins)
- Easiest: Vercel dashboard → frier-pubs → Analytics → Enable
- Or: sign up for plausible.io (~£9/mo, GDPR-friendly, no cookies)

## 🚀 Future improvements (when you want)
- Re-validate websites monthly via Vercel Cron
- Add per-pub URLs (`/pubs/[id]`) for SEO + sharing
- Generate sitemap entries per pub once URLs exist
- Move filtering server-side once data is in Supabase (faster on mobile)

## 🎁 Wish-list features
- Save favourites (localStorage → Supabase auth)
- Visited check-off list
- Pub photos (Wikipedia commons / user-uploaded to Supabase storage)
- Walking distance/time (free OSRM routing)
- Cuisine filter (data already in OSM, just needs filter wired up)
- Crowd-sourced quiz/event times
- Dark mode toggle
- "Pubs my mates rate" social layer

## ⚠️ Cost watch
- Google Places API: **DISABLED**. £70 sunk cost, no further spend possible.
- Supabase free tier: 500MB DB, 5GB bandwidth, 50K monthly active users. Should be fine.
- Vercel Hobby: 100GB bandwidth/mo. Should be fine.
- Nominatim: free, no key, fair-use limits — we comply.
