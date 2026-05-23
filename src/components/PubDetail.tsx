"use client";

import { useEffect, useState } from "react";
import { Pub } from "@/lib/types";
import { isOpenNow, typicalOpenWindow } from "@/lib/opening-hours";
import { getAmenityChips } from "@/lib/amenity-colors";
import SunChart from "@/components/SunChart";
import PickButton from "@/components/PickButton";
import { walkingMinutes, walkingKm, formatWalkingTime, formatWalkingDistance } from "@/lib/walking";

interface PubDetailProps {
  pub: Pub;
  onClose: () => void;
  /** Anchor for walking time display (user location or focused area). */
  walkFrom?: { lat: number; lng: number } | null;
}

// Cache full pub details across opens so reselecting the same pub is instant.
// Keyed by `${pubId}|${day ?? "today"}` so different dates have their own cache.
const detailCache = new Map<string, Pub>();

function patternLabel(p: NonNullable<Pub["sunPattern"]>): string {
  switch (p) {
    case "morning": return "Morning sun";
    case "midday": return "Midday sun";
    case "afternoon": return "Afternoon sun";
    case "all-day": return "Sun all day";
  }
}

function formatHour(h: number): string {
  // Round to nearest 5 minutes for clean display
  const totalMins = Math.round((h * 60) / 5) * 5;
  let hh = Math.floor(totalMins / 60);
  const mm = totalMins % 60;
  // Wrap past midnight cleanly
  if (hh >= 24) hh -= 24;

  const period = hh >= 12 ? "pm" : "am";
  const display = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  if (mm === 0) return `${display}${period}`;
  return `${display}:${String(mm).padStart(2, "0")}${period}`;
}

export default function PubDetail({ pub: summaryPub, onClose, walkFrom }: PubDetailProps) {
  // Start with the summary data the list already has, merge in full data on fetch
  const [pub, setPub] = useState<Pub>(
    () => detailCache.get(summaryPub.id) ?? summaryPub
  );
  const [loadingDetails, setLoadingDetails] = useState(
    !detailCache.has(summaryPub.id)
  );

  useEffect(() => {
    setPub(detailCache.get(summaryPub.id) ?? summaryPub);

    if (detailCache.has(summaryPub.id)) {
      setLoadingDetails(false);
      return;
    }

    setLoadingDetails(true);
    const controller = new AbortController();
    fetch(`/api/pubs/${summaryPub.id}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((full: Pub | null) => {
        if (full) {
          detailCache.set(summaryPub.id, full);
          setPub(full);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Failed to fetch pub:", err);
      })
      .finally(() => setLoadingDetails(false));

    return () => controller.abort();
  }, [summaryPub]);

  const openStatus = isOpenNow(pub.openingHours);
  const chips = getAmenityChips(pub);
  void loadingDetails;

  // Sanitise website URL — only render the button for well-formed http(s) URLs
  const websiteHref = (() => {
    if (!pub.website) return null;
    try {
      const u = new URL(pub.website);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      if (!u.hostname.includes(".")) return null;
      return u.toString();
    } catch {
      return null;
    }
  })();

  // Sanitise phone — strip whitespace, ensure it has digits
  const phoneHref = (() => {
    if (!pub.phone) return null;
    const digits = pub.phone.replace(/[^\d+]/g, "");
    return digits.length >= 7 ? digits : null;
  })();

  // Build contextual notes for time-sensitive amenities
  const timeNotes: string[] = [];
  if (pub.hasQuizNight) timeNotes.push("Quiz nights");
  if (pub.hasLiveMusic) timeNotes.push("Live music");
  if (pub.hasLiveSport) timeNotes.push("Live sport");
  const hasTimeSensitive = timeNotes.length > 0;

  return (
    <div className="animate-fade-up bg-[var(--bg-elevated)] border border-[var(--accent-tint-strong)] rounded-2xl overflow-hidden shadow-lg">
      {/* Hero image (if available — sourced from pubsinthesun.com) */}
      {pub.heroImageUrl && (
        <div className="relative w-full h-44 bg-[var(--bg-tint)] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pub.heroImageUrl}
            alt={`${pub.name} exterior`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          {/* Sun badge overlay if rated */}
          {pub.avgSunPercentage !== undefined && (
            <div className="absolute top-2 right-2 bg-[var(--color-sun-bg)] text-[var(--color-sun)] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <span>☀</span>
              <span>{pub.avgSunPercentage}% sun</span>
            </div>
          )}
        </div>
      )}

      {/* Header band */}
      <div className="bg-gradient-to-br from-[var(--accent-tint)] to-[var(--bg-elevated)] px-5 pt-4 pb-3 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[20px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
              {pub.name}
            </h2>
            {pub.address && (
              <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-snug">
                {pub.address}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <PickButton pubId={pub.id} size="large" />
            <button
              onClick={onClose}
              aria-label="Close pub details"
              className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tint)] transition-all cursor-pointer border border-[var(--border)] shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {openStatus !== "unknown" && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                openStatus === "open"
                  ? "bg-[var(--green-bg)] text-[var(--green)]"
                  : "bg-[var(--red-bg)] text-[var(--red)]"
              }`}
            >
              {openStatus === "open" ? "● Open now" : "● Closed"}
            </span>
          )}
          {pub.rating && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--gold-bg)] text-[var(--gold)] flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {pub.rating} / 5
            </span>
          )}
          {pub.hygieneRating !== undefined && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--green-bg)] text-[var(--green)]">
              Hygiene {typeof pub.hygieneRating === "number" ? `${pub.hygieneRating}/5` : pub.hygieneRating}
            </span>
          )}
          {pub.historic && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-ale-bg)] text-[var(--color-ale)]">
              Historic
            </span>
          )}
          {pub.listedStatus && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-ale-bg)] text-[var(--color-ale)]">
              {pub.listedStatus}
            </span>
          )}
          {pub.yearEstablished && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-tint)] text-[var(--text-secondary)]">
              Est. {pub.yearEstablished}
            </span>
          )}
          {walkFrom && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--accent-tint)] text-[var(--accent)] flex items-center gap-1"
              title={`${formatWalkingDistance(walkingKm(walkFrom.lat, walkFrom.lng, pub.lat, pub.lng))} away`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13" cy="4" r="2" />
                <path d="M15 21l-3-9-5 3 4-9 7 8" />
              </svg>
              {formatWalkingTime(walkingMinutes(walkFrom.lat, walkFrom.lng, pub.lat, pub.lng))}
            </span>
          )}
        </div>

        {/* Editorial recognitions */}
        {pub.recognitions && pub.recognitions.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {pub.recognitions.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-1"
                title={`${r.source} — ${r.type ?? "Featured"}`}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {r.source} pick
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3.5">
        {/* Description from Wikipedia */}
        {pub.description && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">About</p>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-serif">
              {pub.description}
            </p>
            {pub.wikipediaUrl && (
              <a
                href={pub.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] underline font-medium mt-1 inline-block"
              >
                Read on Wikipedia →
              </a>
            )}
          </div>
        )}

        {/* Sun exposure year breakdown */}
        {pub.sunStats && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Sun across the year
              </p>
              {pub.avgSunPercentage !== undefined && (
                <span className="text-[11px] font-semibold text-[var(--color-sun)]">
                  ☀ {pub.avgSunPercentage}% today
                </span>
              )}
            </div>
            <SunChart
              stats={pub.sunStats}
              currentMonth={new Date().getMonth()}
            />
            <div className="flex items-center justify-between mt-2 text-[11px] text-[var(--text-muted)]">
              <span>
                Best in{" "}
                <strong className="text-[var(--text-primary)]">{pub.sunStats.bestMonth.name}</strong>{" "}
                ({pub.sunStats.bestMonth.avg}%)
              </span>
              <span>
                Year avg{" "}
                <strong className="text-[var(--text-primary)]">{pub.sunStats.yearAvg}%</strong>
              </span>
            </div>

            {/* When the sun hits — clipped to when the pub is actually open */}
            {(() => {
              if (
                !pub.sunPattern ||
                pub.sunStartHour === undefined ||
                pub.sunEndHour === undefined
              ) return null;

              const { open, close } = typicalOpenWindow(pub.openingHours);
              const startClipped = Math.max(pub.sunStartHour, open);
              const endClipped = Math.min(pub.sunEndHour, close);

              // If no overlap with opening hours, don't show — the sun pattern
              // happens before the pub opens or after it closes.
              if (endClipped - startClipped < 0.5) {
                return (
                  <div className="mt-3 flex items-center gap-2 bg-[var(--bg-tint)] border border-[var(--border)] rounded-lg px-2.5 py-2">
                    <span className="text-[12px] text-[var(--text-muted)]">
                      Sunny period is mostly outside opening hours
                    </span>
                  </div>
                );
              }

              // If the peak is also during open hours, mention it
              const peakInWindow =
                pub.peakSunHour !== undefined &&
                pub.peakSunHour >= startClipped &&
                pub.peakSunHour <= endClipped;

              return (
                <div className="mt-3 flex items-center gap-2 bg-[var(--color-sun-bg)]/40 border border-[var(--color-sun)]/30 rounded-lg px-2.5 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-sun)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                  </svg>
                  <span className="text-[12px] text-[var(--text-primary)]">
                    Sun{" "}
                    <strong>{formatHour(startClipped)}</strong>
                    {" to "}
                    <strong>{formatHour(endClipped)}</strong>
                    {peakInWindow && pub.peakSunHour !== undefined && (
                      <>, peak <strong>{formatHour(pub.peakSunHour)}</strong></>
                    )}
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Amenities */}
        {chips.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">What's here</p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <span
                  key={chip.key}
                  className="text-[12px] font-medium px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: chip.bg, color: chip.fg }}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Time-sensitive event note */}
        {hasTimeSensitive && (
          <div className="bg-[var(--accent-tint)] border border-[var(--accent-tint-strong)] rounded-xl px-3 py-2.5 flex gap-2.5">
            <svg className="text-[var(--accent)] shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">{timeNotes.join(", ")}</strong> may not run every day.{" "}
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline font-medium"
                >
                  Check the website for times →
                </a>
              ) : (
                <span>Worth ringing ahead.</span>
              )}
            </div>
          </div>
        )}

        {/* Hours */}
        {pub.openingHours && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Hours</p>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              {pub.openingHours}
            </p>
          </div>
        )}
      </div>

      {/* Footer links: share + report */}
      <div className="px-5 pb-2 flex items-center justify-between gap-2 flex-wrap">
        <a
          href={`/pubs/${pub.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:underline"
        >
          Share this pub →
        </a>
        <a
          href={`mailto:ollie@frier.london?subject=${encodeURIComponent(
            `Pub info correction: ${pub.name}`
          )}&body=${encodeURIComponent(
            `Pub: ${pub.name}\nAddress: ${pub.address ?? ""}\nLink: ${typeof window !== "undefined" ? window.location.href : ""}\n\nWhat's wrong / what should change:\n`
          )}`}
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:underline"
        >
          Report incorrect info
        </a>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${pub.lat},${pub.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-[13px] font-semibold bg-[var(--accent)] text-white px-4 py-2.5 rounded-xl hover:bg-[var(--accent-hover)] transition-all shadow-sm flex items-center justify-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          Directions
        </a>
        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold text-[var(--text-primary)] bg-[var(--bg-tint)] px-4 py-2.5 rounded-xl hover:bg-[var(--accent-tint)] transition-all flex items-center gap-1.5 border border-[var(--border)]"
            title={websiteHref}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Website
          </a>
        )}
        {phoneHref && (
          <a
            href={`tel:${phoneHref}`}
            className="text-[13px] font-semibold text-[var(--text-primary)] bg-[var(--bg-tint)] px-4 py-2.5 rounded-xl hover:bg-[var(--accent-tint)] transition-all flex items-center gap-1.5 border border-[var(--border)]"
            title={pub.phone}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Call
          </a>
        )}
      </div>
    </div>
  );
}
