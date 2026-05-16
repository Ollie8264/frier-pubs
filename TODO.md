# Frier's Useful Pub Map — Next Steps

## 🚀 Ship it (do first when ready)
1. **Deploy to Vercel** — get a public URL to share with mates (frier-pubs.vercel.app)
2. **Commit & push to GitHub** — back up the work
3. **Open Graph meta tags** — proper preview when sharing in WhatsApp/iMessage. Use cartoon logo on cream background.

## 🔒 Production polish
4. **Buy real domain** — frier-pubs.com / frierspubs.london, ~£8/yr
5. **Error boundary** — catch React crashes, show "Something went wrong, refresh" instead of white screen
6. **Loading skeletons** — ghost pub cards instead of spinner while loading

## 🗄️ Future-proofing
7. **Migrate data to Supabase** — currently 1.4MB JSON shipped on every deploy. Moving to Postgres lets you:
   - Update pub data without redeploying
   - Accept user edits from the "Report incorrect info" link
   - Allow user contributions (visited list, reviews, photos)
   - Use indexed queries instead of full-scan filtering
8. **Analytics** — Plausible or Vercel Analytics. See which filters get used, what people click.

## 🐛 Ongoing
9. **Re-validate websites monthly** — pub sites die regularly. Vercel cron + the existing validator script.
10. **Sitemap + robots.txt** — basic SEO so pubs are crawlable by Google.

## 🎁 Wish-list features (skipped for now, revisit later)
- Save favourites (localStorage at first, then user accounts via Supabase auth)
- Visited check-off list
- Pub photos (Wikipedia commons, or user-uploaded)
- Walking distance/time (need a routing API — free OSRM exists)
- Cuisine filter (we already pulled this from OSM cuisine tag, just need filter)
- Crowd-sourced quiz/event nights with day-of-week
- Dark mode toggle
- "Pubs my mates rate" — social layer

## ⚠️ Cost watch
- Google Places API budget: hit £70 vs £10 budget alert. **API key currently disabled in .env.local** as of 2026-05-16.
- Before re-enabling, set a hard quota cap in Google Cloud Console (Places API → Quotas) to enforce a real spend limit.
- Nominatim (used for area search) is free and has no usage cost — that one's safe.
