"use client";

import { Filters, SortOption } from "@/lib/types";
import { FILTER_COLORS } from "@/lib/amenity-colors";
import SunDatePicker from "@/components/SunDatePicker";
import OpenLatePicker from "@/components/OpenLatePicker";

interface FilterPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  totalCount: number;
  filteredCount: number;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
  hasSortAnchor: boolean;
  sunDate: string | null;
  onSunDateChange: (date: string | null) => void;
}

const FILTER_CHIPS: { key: keyof Omit<Filters, "searchQuery">; label: string }[] = [
  { key: "isSunny", label: "☀ Sunny" },
  { key: "isTimeOutPick", label: "★ Time Out" },
  { key: "hasFood", label: "Food" },
  { key: "hasLiveSport", label: "Sport" },
  { key: "hasBeerGarden", label: "Garden" },
  { key: "hasRealAle", label: "Real Ale" },
  { key: "hasDogFriendly", label: "Dogs OK" },
  { key: "hasPoolTable", label: "Pool" },
  { key: "hasDarts", label: "Darts" },
  { key: "hasQuizNight", label: "Quiz" },
  { key: "hasLiveMusic", label: "Music" },
];

export default function FilterPanel({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  sortBy,
  onSortChange,
  hasSortAnchor,
  sunDate,
  onSunDateChange,
}: FilterPanelProps) {
  function toggleFilter(key: keyof Omit<Filters, "searchQuery">) {
    const current = filters[key];
    onFiltersChange({
      ...filters,
      [key]: current === true ? null : true,
    });
  }

  function clearFilters() {
    onFiltersChange({
      hasFood: null,
      hasLiveSport: null,
      hasPoolTable: null,
      hasDarts: null,
      hasBeerGarden: null,
      hasDogFriendly: null,
      hasRealAle: null,
      hasQuizNight: null,
      hasLiveMusic: null,
      isSunny: null,
      isTimeOutPick: null,
      sunnyAfter: null,
      openAfter: null,
      searchQuery: "",
    });
  }

  const hasActiveFilters =
    FILTER_CHIPS.some((c) => filters[c.key]) ||
    filters.searchQuery ||
    filters.sunnyAfter !== null ||
    filters.openAfter !== null;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or address..."
          value={filters.searchQuery}
          onChange={(e) =>
            onFiltersChange({ ...filters, searchQuery: e.target.value })
          }
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl pl-10 pr-9 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-tint)] transition-all shadow-sm"
        />
        {filters.searchQuery && (
          <button
            onClick={() => onFiltersChange({ ...filters, searchQuery: "" })}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div role="group" aria-label="Filter pubs by amenity" className="flex flex-wrap gap-1.5">
        {FILTER_CHIPS.map((chip) => {
          const active = filters[chip.key] === true;
          const colors = FILTER_COLORS[chip.key];
          return (
            <button
              key={chip.key}
              onClick={() => toggleFilter(chip.key)}
              aria-pressed={active}
              aria-label={`${chip.label} filter${active ? ", active" : ""}`}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all cursor-pointer ${
                active
                  ? "shadow-sm"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              }`}
              style={active ? {
                backgroundColor: colors.bg,
                color: colors.fg,
                borderColor: colors.fg + "40",
              } : {}}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Count + Sort + Clear */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">
          <span className="text-[var(--text-primary)] font-semibold">{filteredCount.toLocaleString()}</span>
          {filteredCount !== totalCount && (
            <span className="text-[var(--text-muted)]"> of {totalCount.toLocaleString()}</span>
          )}{" "}
          pubs
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {/* Sun date picker (shows ☀ + date + time) */}
          <SunDatePicker
            value={sunDate}
            onChange={onSunDateChange}
            sunnyAfter={filters.sunnyAfter}
            onSunnyAfterChange={(h) => onFiltersChange({ ...filters, sunnyAfter: h })}
          />

          {/* Open-late picker — for finding pubs open late at night */}
          <OpenLatePicker
            value={filters.openAfter}
            onChange={(h) => onFiltersChange({ ...filters, openAfter: h })}
          />

          {/* Sort dropdown */}
          <label className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              aria-label="Sort pubs by"
              className="text-[11px] font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-1.5 py-0.5 cursor-pointer focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-tint)]"
            >
              <option value="distance" disabled={!hasSortAnchor}>
                Distance{hasSortAnchor ? "" : " (set location)"}
              </option>
              <option value="rating">Top rated</option>
              <option value="name">Name</option>
            </select>
          </label>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer font-medium transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
