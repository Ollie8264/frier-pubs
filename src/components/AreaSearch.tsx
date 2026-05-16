"use client";

import { useState, useRef, useEffect } from "react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

interface AreaSearchProps {
  focusedArea: { lat: number; lng: number; label: string } | null;
  onSelectArea: (area: { lat: number; lng: number; label: string } | null) => void;
}

export default function AreaSearch({ focusedArea, onSelectArea }: AreaSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setShowDropdown(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        // viewbox = left,top,right,bottom — Greater London box
        const params = new URLSearchParams({
          q: `${query}, London`,
          format: "json",
          limit: "6",
          addressdetails: "1",
          viewbox: "-0.51,51.69,0.33,51.28",
          bounded: "1",
          countrycodes: "gb",
        });

        const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { "Accept-Language": "en-GB" },
          signal: controller.signal,
        });
        const data: NominatimResult[] = await resp.json();
        setResults(data);
        setSearched(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Geocoding failed:", err);
          setResults([]);
          setSearched(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function formatPlaceName(r: NominatimResult): string {
    const parts = r.display_name.split(",").map((s) => s.trim());
    const filtered = parts.filter(
      (p) => !["London", "Greater London", "England", "United Kingdom"].includes(p)
    );
    return filtered.slice(0, 3).join(", ");
  }

  function selectResult(r: NominatimResult) {
    const label = formatPlaceName(r);
    onSelectArea({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      label,
    });
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setSearched(false);
  }

  // If an area is selected, show the chip — click the label to swap areas
  if (focusedArea) {
    return (
      <div className="flex items-center gap-2 bg-[var(--accent-tint)] text-[var(--accent)] px-3 py-2 rounded-xl border border-[var(--accent-tint-strong)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <button
          onClick={() => {
            // Re-open the search input pre-filled with current area name
            onSelectArea(null);
            setQuery(focusedArea.label.split(",")[0].trim());
            requestAnimationFrame(() => {
              const input = containerRef.current?.querySelector("input");
              input?.focus();
              input?.select();
            });
          }}
          className="text-[12px] font-medium flex-1 truncate text-left hover:underline cursor-pointer"
          title="Tap to change area"
          aria-label={`Currently showing pubs near ${focusedArea.label}. Tap to change area.`}
        >
          Near <strong>{focusedArea.label}</strong>
        </button>
        <button
          onClick={() => onSelectArea(null)}
          className="text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer shrink-0"
          aria-label="Clear area"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--accent)]"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <input
          type="text"
          placeholder="Find pubs in an area..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl pl-10 pr-9 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-tint)] transition-all shadow-sm"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          </div>
        )}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setShowDropdown(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-[1000] animate-fade-up">
          {loading && results.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-[var(--text-muted)] flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              <span>Searching...</span>
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-[var(--text-muted)]">
              No places found for &ldquo;{query}&rdquo; in London
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.place_id}
              onClick={() => selectResult(r)}
              className="w-full text-left px-3 py-2.5 text-[13px] text-[var(--text-primary)] hover:bg-[var(--accent-tint)] transition-colors cursor-pointer border-b border-[var(--border)] last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <svg
                  className="text-[var(--text-muted)] mt-0.5 shrink-0"
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="leading-tight">{formatPlaceName(r)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
