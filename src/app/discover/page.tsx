import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { NEIGHBOURHOODS } from "@/data/neighbourhoods";
import { PUB_CRAWLS } from "@/data/pub-crawls";
import {
  neighbourhoodHero,
  neighbourhoodPubCount,
  crawlHero,
} from "@/lib/discover";

export const metadata: Metadata = {
  title: "Discover — Frier's Useful Pub Map",
  description:
    "Can't decide where to go? Browse curated London drinking neighbourhoods and famous pub crawls. From Bermondsey Beer Mile to Hampstead's village pubs.",
  alternates: { canonical: "/discover" },
};

type Tab = "areas" | "crawls";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab: Tab = params.tab === "crawls" ? "crawls" : "areas";

  return (
    <div className="min-h-full bg-[var(--bg)]">
      {/* Header strip */}
      <header className="sticky top-0 z-30 bg-[var(--bg-raised)] border-b border-[var(--border)] px-3 sm:px-5 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 max-w-screen-2xl mx-auto">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 group">
            <Image
              src="/logo.svg"
              alt=""
              width={56}
              height={48}
              className="w-10 h-9 sm:w-14 sm:h-12 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-serif text-[13px] sm:text-[22px] font-semibold text-[var(--text-primary)] tracking-tight leading-[1.1] group-hover:text-[var(--accent)] transition-colors">
                Frier&rsquo;s Useful Pub Map
              </h1>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] tracking-wide uppercase mt-0.5">
                Discover
              </p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-[12px] sm:text-[13px] font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] px-3 sm:px-4 py-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tint)] transition-all whitespace-nowrap"
          >
            ← Map
          </Link>
        </div>
      </header>

      {/* Tab bar */}
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-5 pt-4 sm:pt-6">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
          Sunny day, can&rsquo;t decide?
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1 max-w-xl">
          A handful of London&rsquo;s best drinking areas and the famous pub
          crawls that string them together. Tap to drop into the map.
        </p>

        <div className="flex gap-1 mt-5 border-b border-[var(--border)]">
          <Link
            href="/discover"
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
              activeTab === "areas"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Neighbourhoods
          </Link>
          <Link
            href="/discover?tab=crawls"
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
              activeTab === "crawls"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            🍺 Pint Path
          </Link>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-screen-2xl mx-auto px-3 sm:px-5 py-5 sm:py-6">
        {activeTab === "areas" ? <AreasGrid /> : <CrawlsGrid />}
      </main>

      <footer className="max-w-screen-2xl mx-auto px-3 sm:px-5 py-6 text-[11px] text-[var(--text-muted)]">
        Got an area or crawl we&rsquo;re missing? Email{" "}
        <a href="mailto:ollie@frier.london" className="text-[var(--accent)] hover:underline">
          ollie@frier.london
        </a>
      </footer>
    </div>
  );
}

function AreasGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {NEIGHBOURHOODS.map((n) => {
        const hero = neighbourhoodHero(n);
        const pubCount = neighbourhoodPubCount(n);
        const params = new URLSearchParams({
          lat: n.center.lat.toFixed(5),
          lng: n.center.lng.toFixed(5),
          place: n.placeLabel,
        });
        return (
          <Link
            key={n.id}
            href={`/?${params.toString()}`}
            className="group bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--border-strong)] transition-all"
          >
            {/* Hero */}
            <div className="relative w-full h-40 sm:h-44 bg-[var(--bg-tint)]">
              {hero ? (
                <Image
                  src={hero}
                  alt={n.name}
                  fill
                  className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    width="40" height="40" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-muted)" strokeWidth="1.2"
                    strokeLinecap="round" strokeLinejoin="round" opacity="0.4"
                  >
                    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                  </svg>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                {pubCount} pubs
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              <h3 className="font-serif text-[18px] font-semibold text-[var(--text-primary)] leading-tight">
                {n.name}
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-snug">
                {n.blurb}
              </p>
              <div className="flex flex-wrap gap-1 mt-3">
                {n.vibe.slice(0, 3).map((v) => (
                  <span
                    key={v}
                    className="text-[11px] font-medium text-[var(--accent)] bg-[var(--accent-tint)] px-2 py-0.5 rounded-md"
                  >
                    {v}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-3 italic">
                Best for: {n.bestFor}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CrawlsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {PUB_CRAWLS.map((c) => {
        const hero = crawlHero(c);
        return (
          <Link
            key={c.id}
            href={`/discover/crawl/${c.id}`}
            className="group bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--border-strong)] transition-all"
          >
            <div className="relative w-full h-40 sm:h-44 bg-[var(--bg-tint)]">
              {hero ? (
                <Image
                  src={hero}
                  alt={c.name}
                  fill
                  className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    width="40" height="40" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-muted)" strokeWidth="1.2"
                    strokeLinecap="round" strokeLinejoin="round" opacity="0.4"
                  >
                    <path d="M3 6l3 12h12l3-12" />
                  </svg>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-[var(--accent)] text-white text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                {c.stops.length} stops
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-serif text-[18px] font-semibold text-[var(--text-primary)] leading-tight">
                {c.name}
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-snug">
                {c.blurb}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-3">
                <span>{c.distanceKm}km</span>
                <span>·</span>
                <span>~{c.hours} hours</span>
                <span>·</span>
                <span>Meet at {c.meetAt}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
