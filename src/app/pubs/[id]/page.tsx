import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import pubs from "@/data/pubs.json";
import type { Pub } from "@/lib/types";
import { injectSun, getSunStatsFor } from "@/lib/sun";
import { getAmenityChips } from "@/lib/amenity-colors";

interface PageProps {
  params: Promise<{ id: string }>;
}

function findPub(id: string): Pub | null {
  return (pubs as Pub[]).find((p) => p.id === id) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const pub = findPub(id);
  if (!pub) return { title: "Pub not found · Frier's Useful Pub Map" };

  const tagline: string[] = [];
  if (pub.hasFood) tagline.push("food");
  if (pub.hasBeerGarden || pub.hasOutdoorSeating) tagline.push("beer garden");
  if (pub.hasRealAle) tagline.push("real ale");
  if (pub.hasLiveSport) tagline.push("live sport");

  const desc = pub.description
    ? pub.description
    : `${pub.name}${pub.address ? ` in ${pub.address.split(",").slice(-2, -1)[0]?.trim() ?? "London"}` : ""}${tagline.length ? ` — ${tagline.join(", ")}` : ""}.`;

  return {
    title: `${pub.name} — Frier's Useful Pub Map`,
    description: desc,
    openGraph: {
      title: pub.name,
      description: desc,
      type: "website",
      images: pub.heroImageUrl ? [{ url: pub.heroImageUrl, alt: pub.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: pub.name,
      description: desc,
      images: pub.heroImageUrl ? [pub.heroImageUrl] : undefined,
    },
    alternates: {
      canonical: `/pubs/${id}`,
    },
  };
}

export default async function PubPage({ params }: PageProps) {
  const { id } = await params;
  const found = findPub(id);
  if (!found) notFound();

  // Inject today's sun and seasonal stats
  const pub: Pub = { ...found };
  injectSun(pub);
  const sunStats = getSunStatsFor(id);
  if (sunStats) pub.sunStats = sunStats;

  const chips = getAmenityChips(pub);

  return (
    <div className="min-h-full bg-[var(--bg)] flex flex-col">
      {/* Hero image */}
      {pub.heroImageUrl && (
        <div className="relative w-full h-64 sm:h-80 bg-[var(--bg-tint)] overflow-hidden">
          <Image
            src={pub.heroImageUrl}
            alt={pub.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
          {pub.avgSunPercentage !== undefined && (
            <div className="absolute top-3 right-3 bg-[var(--color-sun-bg)] text-[var(--color-sun)] text-[12px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
              ☀ {pub.avgSunPercentage}% sun today
            </div>
          )}
        </div>
      )}

      <article className="max-w-2xl mx-auto px-5 py-6 sm:py-8 w-full">
        {/* Back link */}
        <Link
          href={`/?pub=${id}`}
          className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent)] inline-flex items-center gap-1 mb-4"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to the map
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
          {pub.name}
        </h1>
        {pub.address && (
          <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">{pub.address}</p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {pub.rating && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-[var(--gold-bg)] text-[var(--gold)]">
              ★ {pub.rating} / 5
            </span>
          )}
          {pub.hygieneRating !== undefined && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-[var(--green-bg)] text-[var(--green)]">
              Hygiene {typeof pub.hygieneRating === "number" ? `${pub.hygieneRating}/5` : pub.hygieneRating}
            </span>
          )}
          {pub.historic && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-ale-bg)] text-[var(--color-ale)]">
              Historic
            </span>
          )}
          {pub.yearEstablished && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-tint)] text-[var(--text-secondary)]">
              Est. {pub.yearEstablished}
            </span>
          )}
          {pub.recognitions?.some((r) => r.source === "Time Out") && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-[var(--accent)] text-white">
              ★ Time Out pick
            </span>
          )}
        </div>

        {/* Description from Wikipedia */}
        {pub.description && (
          <section className="mt-6">
            <p className="text-[16px] text-[var(--text-secondary)] leading-relaxed font-serif">
              {pub.description}
            </p>
            {pub.wikipediaUrl && (
              <a
                href={pub.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[var(--accent)] hover:underline font-medium mt-2 inline-block"
              >
                Read on Wikipedia →
              </a>
            )}
          </section>
        )}

        {/* Amenities */}
        {chips.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              What&apos;s here
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <span
                  key={chip.key}
                  className="text-[13px] font-medium px-3 py-1 rounded-lg"
                  style={{ backgroundColor: chip.bg, color: chip.fg }}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Hours */}
        {pub.openingHours && (
          <section className="mt-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Hours
            </h2>
            <p className="text-[14px] text-[var(--text-secondary)]">{pub.openingHours}</p>
          </section>
        )}

        {/* Actions */}
        <section className="mt-8 flex gap-2 flex-wrap">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${pub.lat},${pub.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-semibold bg-[var(--accent)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--accent-hover)] transition-all shadow-sm"
          >
            Get directions →
          </a>
          {pub.website && (
            <a
              href={pub.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] font-semibold text-[var(--text-primary)] bg-[var(--bg-tint)] px-5 py-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
            >
              Website
            </a>
          )}
          <Link
            href={`/?pub=${id}`}
            className="text-[14px] font-semibold text-[var(--text-primary)] bg-[var(--bg-tint)] px-5 py-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
          >
            View on map
          </Link>
        </section>
      </article>
    </div>
  );
}

// Pre-render the most popular pubs at build time for fast loads + SEO.
// (We'll just statically render those with Time Out or Wikipedia recognition.)
export async function generateStaticParams() {
  return (pubs as Pub[])
    .filter((p) => p.recognitions?.length || p.wikipediaUrl)
    .slice(0, 200) // cap for build perf
    .map((p) => ({ id: p.id }));
}

// Ensure dynamic pubs render on-demand
export const dynamicParams = true;
