import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PUB_CRAWLS } from "@/data/pub-crawls";
import { resolveCrawl, crawlHero, nearbyExtraPubs } from "@/lib/discover";
import CrawlRouteMap from "@/components/CrawlRouteMap.client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return PUB_CRAWLS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const crawl = PUB_CRAWLS.find((c) => c.id === id);
  if (!crawl) return { title: "Crawl not found · Frier's Useful Pub Map" };
  const hero = crawlHero(crawl);
  return {
    title: `${crawl.name} — Frier's Useful Pub Map`,
    description: crawl.description,
    openGraph: {
      title: crawl.name,
      description: crawl.description,
      images: hero ? [{ url: hero, alt: crawl.name }] : undefined,
    },
    alternates: { canonical: `/discover/crawl/${id}` },
  };
}

export default async function CrawlPage({ params }: PageProps) {
  const { id } = await params;
  const crawl = PUB_CRAWLS.find((c) => c.id === id);
  if (!crawl) notFound();

  const stops = resolveCrawl(crawl);
  const hero = crawlHero(crawl);
  const matchedCount = stops.filter((s) => s.pub).length;
  const extras = nearbyExtraPubs(crawl, 8);

  // Build a Google Maps deep link with stops as waypoints — opens proper
  // walking directions covering all stops in order.
  const matchedStops = stops.filter((s) => s.pub).map((s) => s.pub!);
  const googleMapsRouteUrl = (() => {
    if (matchedStops.length < 2) return null;
    const first = matchedStops[0];
    const last = matchedStops[matchedStops.length - 1];
    const middle = matchedStops.slice(1, -1);
    const params = new URLSearchParams({
      api: "1",
      origin: `${first.lat},${first.lng}`,
      destination: `${last.lat},${last.lng}`,
      travelmode: "walking",
    });
    if (middle.length > 0) {
      // Google supports up to 9 waypoints in a free deep-link
      const wp = middle
        .slice(0, 9)
        .map((p) => `${p.lat},${p.lng}`)
        .join("|");
      params.set("waypoints", wp);
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  })();

  return (
    <div className="min-h-full bg-[var(--bg)]">
      {/* Header */}
      <header className="bg-[var(--bg-raised)] border-b border-[var(--border)] px-3 sm:px-5 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 max-w-screen-2xl mx-auto">
          <Link href="/discover?tab=crawls" className="flex items-center gap-2 sm:gap-3 min-w-0 group">
            <Image src="/logo.svg" alt="" width={56} height={48} className="w-10 h-9 sm:w-14 sm:h-12 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-serif text-[13px] sm:text-[18px] font-semibold text-[var(--text-primary)] tracking-tight leading-[1.1] group-hover:text-[var(--accent)] transition-colors">
                Frier&rsquo;s Useful Pub Map
              </h1>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] tracking-wide uppercase mt-0.5">
                Pint Path
              </p>
            </div>
          </Link>
          <Link
            href="/discover?tab=crawls"
            className="text-[12px] sm:text-[13px] font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] px-3 sm:px-4 py-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tint)] transition-all whitespace-nowrap"
          >
            ← Crawls
          </Link>
        </div>
      </header>

      {/* Hero */}
      {hero && (
        <div className="relative w-full h-56 sm:h-72 bg-[var(--bg-tint)] overflow-hidden">
          <Image src={hero} alt={crawl.name} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}

      <article className="max-w-3xl mx-auto px-4 sm:px-5 py-6 sm:py-8 w-full">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
          {crawl.name}
        </h1>
        <p className="text-[15px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          {crawl.description}
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-[12px] font-semibold bg-[var(--accent-tint)] text-[var(--accent)] px-2.5 py-1 rounded-md">
            🍺 {crawl.stops.length} stops
          </span>
          <span className="text-[12px] font-semibold bg-[var(--bg-tint)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md">
            🚶 {crawl.distanceKm}km
          </span>
          <span className="text-[12px] font-semibold bg-[var(--bg-tint)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md">
            ⏱ ~{crawl.hours} hours
          </span>
          <span className="text-[12px] font-semibold bg-[var(--bg-tint)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md">
            📍 Meet at {crawl.meetAt}
          </span>
        </div>

        {/* Vibe chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {crawl.vibe.map((v) => (
            <span key={v} className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-tint)] px-2 py-0.5 rounded">
              {v}
            </span>
          ))}
        </div>

        {/* Route map */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              The route
            </h2>
            {googleMapsRouteUrl && (
              <a
                href={googleMapsRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-1"
              >
                Open in Google Maps
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </a>
            )}
          </div>
          <CrawlRouteMap stops={stops} fallbackCenter={crawl.center} />
          {matchedCount < crawl.stops.length && (
            <p className="text-[11px] text-[var(--text-muted)] mt-2">
              {matchedCount} of {crawl.stops.length} stops shown on the map (the rest are breweries / venues not yet in our pub data).
            </p>
          )}
        </section>

        {/* Stop list */}
        <section className="mt-7">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Stops
          </h2>
          <ol className="space-y-3">
            {stops.map((stop, i) => (
              <li
                key={`${stop.name}-${i}`}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-3 sm:p-4 flex gap-3 items-start"
              >
                {/* Number badge */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--accent)] text-white text-[14px] font-bold flex items-center justify-center">
                  {i + 1}
                </div>

                {/* Pub thumbnail */}
                {stop.pub?.heroImageUrl ? (
                  <Image
                    src={stop.pub.heroImageUrl}
                    alt=""
                    width={64}
                    height={64}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shrink-0 bg-[var(--bg-tint)]"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-[var(--bg-tint)] shrink-0 flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                      <line x1="6" x2="6" y1="2" y2="4" />
                      <line x1="10" x2="10" y1="2" y2="4" />
                      <line x1="14" x2="14" y1="2" y2="4" />
                    </svg>
                  </div>
                )}

                {/* Text content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-[16px] sm:text-[17px] font-semibold text-[var(--text-primary)] leading-tight">
                      {stop.pub ? (
                        <Link
                          href={`/pubs/${stop.pub.id}`}
                          className="hover:text-[var(--accent)] transition-colors"
                        >
                          {stop.pub.name}
                        </Link>
                      ) : (
                        stop.name
                      )}
                    </h3>
                    {stop.pub?.rating && (
                      <span className="text-[12px] font-semibold bg-[var(--gold-bg)] text-[var(--gold)] px-1.5 py-0.5 rounded shrink-0">
                        ★ {stop.pub.rating}
                      </span>
                    )}
                  </div>
                  {stop.pub?.address && (
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5 truncate">
                      {stop.pub.address}
                    </p>
                  )}
                  {stop.note && (
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 italic leading-snug">
                      {stop.note}
                    </p>
                  )}
                  {!stop.pub && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-2">
                      Not yet in our pub database — search Google Maps for directions.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Want a longer crawl? Bonus nearby pubs */}
        {extras.length > 0 && (
          <section className="mt-8">
            <div className="bg-[var(--bg-tint)] border border-[var(--border)] rounded-2xl p-4 sm:p-5">
              <h2 className="font-serif text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">
                Want a longer crawl?
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-3">
                Top-rated extras in the area, in case the planned route isn&rsquo;t enough.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {extras.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/pubs/${p.id}`}
                      className="flex gap-3 items-center bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-2.5 hover:border-[var(--border-strong)] hover:shadow-sm transition-all"
                    >
                      {p.heroImageUrl ? (
                        <Image
                          src={p.heroImageUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-md object-cover shrink-0 bg-[var(--bg-tint)]"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-[var(--bg-tint)] shrink-0 flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                            <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-[14px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                          {p.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--text-muted)]">
                          {p.rating && (
                            <span className="font-medium text-[var(--gold)]">★ {p.rating}</span>
                          )}
                          {p.avgSunPercentage !== undefined && p.avgSunPercentage >= 40 && (
                            <span className="text-[var(--color-sun)]">☀ {p.avgSunPercentage}%</span>
                          )}
                          {p.hasBeerGarden || p.hasOutdoorSeating ? (
                            <span className="text-[var(--color-garden)]">Garden</span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Bottom CTAs */}
        <section className="mt-8 flex flex-wrap gap-2">
          <Link
            href={`/?lat=${crawl.center.lat.toFixed(5)}&lng=${crawl.center.lng.toFixed(5)}&place=${encodeURIComponent(crawl.name)}`}
            className="text-[14px] font-semibold bg-[var(--accent)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--accent-hover)] transition-all shadow-sm"
          >
            Open on map →
          </Link>
          <Link
            href="/discover?tab=crawls"
            className="text-[14px] font-semibold text-[var(--text-primary)] bg-[var(--bg-tint)] px-5 py-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
          >
            Other crawls
          </Link>
        </section>
      </article>
    </div>
  );
}
