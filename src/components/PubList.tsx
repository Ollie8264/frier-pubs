"use client";

import { useState, useEffect } from "react";
import { Pub } from "@/lib/types";
import { isOpenNow } from "@/lib/opening-hours";
import { getAmenityChips } from "@/lib/amenity-colors";

const PAGE_SIZE = 50;

interface PubListProps {
  pubs: Pub[];
  selectedPub: Pub | null;
  onPubSelect: (pub: Pub) => void;
  searchQuery?: string;
  hasActiveFilters?: boolean;
  radiusContext?: {
    label: string;
    km: number;
    onClear: () => void;
  } | null;
}

function PubCard({
  pub,
  isSelected,
  onClick,
}: {
  pub: Pub;
  isSelected: boolean;
  onClick: () => void;
}) {
  const openStatus = isOpenNow(pub.openingHours);
  const chips = getAmenityChips(pub);

  const labelBits = [pub.name];
  if (pub.rating) labelBits.push(`${pub.rating} stars`);
  if (openStatus === "open") labelBits.push("open now");
  if (openStatus === "closed") labelBits.push("closed");
  if (pub.address) labelBits.push(pub.address);

  return (
    <button
      onClick={onClick}
      data-pub-card
      aria-label={labelBits.join(", ")}
      aria-pressed={isSelected}
      className={`w-full text-left p-4 rounded-2xl transition-all cursor-pointer group ${
        isSelected
          ? "bg-[var(--accent-tint)] ring-2 ring-[var(--accent)]/40 shadow-md"
          : "bg-[var(--bg-elevated)] hover:bg-[var(--bg-raised)] border border-[var(--border)] hover:border-[var(--border-strong)] shadow-sm hover:shadow-md"
      }`}
    >
      {/* Top row: name + rating */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <h3 className="font-serif font-semibold text-[16px] text-[var(--text-primary)] leading-tight tracking-tight">
            {pub.name}
          </h3>
          {pub.recognitions && pub.recognitions.length > 0 && (
            <span
              className="text-[var(--accent)] mt-0.5 shrink-0"
              title={pub.recognitions.map(r => `${r.source}: ${r.type ?? ""}`).join(" · ")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </span>
          )}
          {pub.historic && (
            <span
              className="text-[var(--color-ale)] mt-0.5 shrink-0"
              title={pub.listedStatus ? `Historic — ${pub.listedStatus}` : "Historic pub"}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
              </svg>
            </span>
          )}
        </div>
        {pub.rating && (
          <div className="flex items-center gap-1 shrink-0 bg-[var(--gold-bg)] px-2 py-0.5 rounded-md">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[12px] font-semibold text-[var(--gold)]">{pub.rating}</span>
          </div>
        )}
      </div>

      {/* Address + status */}
      <div className="flex items-center gap-2 mb-2.5">
        {openStatus !== "unknown" && (
          <span
            className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
              openStatus === "open"
                ? "bg-[var(--green-bg)] text-[var(--green)]"
                : "bg-[var(--red-bg)] text-[var(--red)]"
            }`}
          >
            {openStatus === "open" ? "Open" : "Closed"}
          </span>
        )}
        {pub.address && (
          <p className="text-[12px] text-[var(--text-muted)] truncate">
            {pub.address}
          </p>
        )}
      </div>

      {/* Tags */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.slice(0, 6).map((chip) => (
            <span
              key={chip.key}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md"
              style={{ backgroundColor: chip.bg, color: chip.fg }}
            >
              {chip.label}
            </span>
          ))}
          {chips.length > 6 && (
            <span className="text-[11px] text-[var(--text-muted)] px-1.5 py-0.5">
              +{chips.length - 6}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function EmptyState({
  searchQuery,
  hasActiveFilters,
  radiusContext,
}: {
  searchQuery?: string;
  hasActiveFilters?: boolean;
  radiusContext?: PubListProps["radiusContext"];
}) {
  let title = "No pubs found";
  let body: React.ReactNode = "Try different filters or search terms";

  if (searchQuery && radiusContext) {
    title = `No matches for "${searchQuery}" near ${radiusContext.label}`;
    body = (
      <button
        onClick={radiusContext.onClear}
        className="text-[12px] text-[var(--accent)] hover:underline font-medium mt-1 cursor-pointer"
      >
        Search all of London instead →
      </button>
    );
  } else if (searchQuery) {
    title = `No pubs match "${searchQuery}"`;
    body = "Try a different spelling, or check the area filter above";
  } else if (radiusContext && hasActiveFilters) {
    title = `Nothing nearby with those filters`;
    body = (
      <span>
        Try clearing some filters, or{" "}
        <button
          onClick={radiusContext.onClear}
          className="text-[var(--accent)] hover:underline font-medium cursor-pointer"
        >
          search all of London
        </button>
      </span>
    );
  } else if (radiusContext) {
    title = `No pubs within ${radiusContext.km}km of ${radiusContext.label}`;
    body = (
      <button
        onClick={radiusContext.onClear}
        className="text-[12px] text-[var(--accent)] hover:underline font-medium mt-1 cursor-pointer"
      >
        Show all London pubs →
      </button>
    );
  } else if (hasActiveFilters) {
    title = "No pubs match all those filters";
    body = "Try removing one or two";
  }

  return (
    <div className="text-center py-12 px-4">
      <div className="w-14 h-14 rounded-full bg-[var(--bg-tint)] flex items-center justify-center mx-auto mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <p className="font-serif text-[15px] text-[var(--text-primary)] font-semibold">{title}</p>
      <div className="text-[12px] text-[var(--text-muted)] mt-1">{body}</div>
    </div>
  );
}

export default function PubList({
  pubs,
  selectedPub,
  onPubSelect,
  searchQuery,
  hasActiveFilters,
  radiusContext,
}: PubListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when filters/search/area change (list reshuffles)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [pubs.length, searchQuery, hasActiveFilters, radiusContext?.label]);

  if (pubs.length === 0) {
    return (
      <EmptyState
        searchQuery={searchQuery}
        hasActiveFilters={hasActiveFilters}
        radiusContext={radiusContext}
      />
    );
  }

  const visible = pubs.slice(0, visibleCount);
  const hasMore = visibleCount < pubs.length;

  return (
    <div className="space-y-2">
      {/* Radius context banner — explains the implicit filter */}
      {radiusContext && (
        <div className="flex items-center justify-between gap-2 bg-[var(--accent-tint)]/40 border border-[var(--accent-tint-strong)] px-3 py-2 rounded-xl mb-2">
          <p className="text-[11px] text-[var(--text-secondary)]">
            Within <strong className="text-[var(--text-primary)]">{radiusContext.km}km</strong>{" "}
            of <strong className="text-[var(--text-primary)]">{radiusContext.label}</strong>
          </p>
          <button
            onClick={radiusContext.onClear}
            className="text-[11px] text-[var(--accent)] hover:underline font-medium cursor-pointer shrink-0"
          >
            Show all
          </button>
        </div>
      )}

      {visible.map((pub) => (
        <PubCard
          key={pub.id}
          pub={pub}
          isSelected={selectedPub?.id === pub.id}
          onClick={() => onPubSelect(pub)}
        />
      ))}

      {hasMore && (
        <div className="text-center py-3 space-y-2">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="text-[13px] font-semibold text-[var(--accent)] bg-[var(--bg-elevated)] hover:bg-[var(--accent-tint)] border border-[var(--accent-tint-strong)] px-5 py-2 rounded-full transition-all cursor-pointer shadow-sm"
          >
            Show {Math.min(PAGE_SIZE, pubs.length - visibleCount)} more
          </button>
          <p className="text-[11px] text-[var(--text-muted)]">
            Showing {visibleCount} of {pubs.length.toLocaleString()}
          </p>
        </div>
      )}

      {!hasMore && pubs.length > PAGE_SIZE && (
        <p className="text-center text-[11px] text-[var(--text-muted)] py-3">
          All {pubs.length.toLocaleString()} pubs shown
        </p>
      )}
    </div>
  );
}
