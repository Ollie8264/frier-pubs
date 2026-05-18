"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { Pub, Filters, SortOption } from "@/lib/types";

// ─── URL state helpers ──────────────────────────────────────────────
// Sync filters/area/search/sort/selected pub to URL search params so users
// can share links and refreshing doesn't lose state.

const FILTER_KEYS = [
  "hasFood", "hasLiveSport", "hasPoolTable", "hasDarts", "hasBeerGarden",
  "hasDogFriendly", "hasRealAle", "hasQuizNight", "hasLiveMusic",
  "isSunny", "isTimeOutPick",
] as const;

interface PersistedState {
  filters: Filters;
  sortBy: SortOption;
  focusedArea: { lat: number; lng: number; label: string } | null;
  selectedPubId: string | null;
  sunDate: string | null;
}

function readUrlState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if ([...params.keys()].length === 0) return null;

  const filters: Filters = {
    hasFood: null, hasLiveSport: null, hasPoolTable: null, hasDarts: null,
    hasBeerGarden: null, hasDogFriendly: null, hasRealAle: null,
    hasQuizNight: null, hasLiveMusic: null, isSunny: null,
    isTimeOutPick: null, searchQuery: "",
  };
  for (const k of FILTER_KEYS) {
    if (params.get(k) === "1") filters[k] = true;
  }
  filters.searchQuery = params.get("q") ?? "";

  const sortBy = (params.get("sort") as SortOption | null) ?? "distance";

  let focusedArea: PersistedState["focusedArea"] = null;
  const lat = params.get("lat");
  const lng = params.get("lng");
  const label = params.get("place");
  if (lat && lng && label) {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!Number.isNaN(la) && !Number.isNaN(ln)) {
      focusedArea = { lat: la, lng: ln, label };
    }
  }

  return {
    filters,
    sortBy,
    focusedArea,
    selectedPubId: params.get("pub"),
    sunDate: params.get("date"),
  };
}

function writeUrlState(state: {
  filters: Filters;
  sortBy: SortOption;
  focusedArea: PersistedState["focusedArea"];
  selectedPubId: string | null;
  sunDate: string | null;
}) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    if (state.filters[k]) params.set(k, "1");
  }
  if (state.filters.searchQuery) params.set("q", state.filters.searchQuery);
  if (state.sortBy && state.sortBy !== "distance") params.set("sort", state.sortBy);
  if (state.focusedArea) {
    params.set("lat", state.focusedArea.lat.toFixed(5));
    params.set("lng", state.focusedArea.lng.toFixed(5));
    params.set("place", state.focusedArea.label);
  }
  if (state.selectedPubId) params.set("pub", state.selectedPubId);
  if (state.sunDate) params.set("date", state.sunDate);

  const queryString = params.toString();
  const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

  // Use replaceState to avoid polluting history on every keystroke
  window.history.replaceState(null, "", newUrl);
}
import FilterPanel from "@/components/FilterPanel";
import PubList from "@/components/PubList";
import PubDetail from "@/components/PubDetail";
import AreaSearch from "@/components/AreaSearch";
import SkeletonList from "@/components/SkeletonList";
import SunDatePicker from "@/components/SunDatePicker";
import MyPicksMenu from "@/components/MyPicksMenu";
import WelcomeTip from "@/components/WelcomeTip";
import {
  parseMatesParam,
  getMyPicks,
  allPickedIds,
  type MateList,
} from "@/lib/mate-picks";

const Map = lazy(() => import("@/components/Map"));

export default function Home() {
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);
  const [pendingPubId, setPendingPubId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [focusedArea, setFocusedArea] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  // Selected date for sun planning (YYYY-MM-DD). null = today.
  const [sunDate, setSunDate] = useState<string | null>(null);
  // "Pubs my mates rate" state
  const [mates, setMates] = useState<MateList[]>([]);
  const [showMyPicks, setShowMyPicks] = useState(false);
  const [myPicksVersion, setMyPicksVersion] = useState(0);
  const [filters, setFilters] = useState<Filters>({
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
    searchQuery: "",
  });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from URL after mount to avoid SSR/CSR mismatch
  useEffect(() => {
    const s = readUrlState();
    if (s) {
      setFilters(s.filters);
      setSortBy(s.sortBy);
      setFocusedArea(s.focusedArea);
      setPendingPubId(s.selectedPubId);
      setSunDate(s.sunDate);
    }
    // Parse mate share URLs (?mates=Alice:id1,id2|Bob:id3,id4)
    const params = new URLSearchParams(window.location.search);
    const matesList = parseMatesParam(params.get("mates"));
    setMates(matesList);
    setHydrated(true);

    // Listen for changes to my picks so filtering updates instantly
    function handler() {
      setMyPicksVersion((v) => v + 1);
    }
    window.addEventListener("frier-picks-changed", handler);
    return () => window.removeEventListener("frier-picks-changed", handler);
  }, []);

  // Sync state to URL whenever it changes (but not before initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    writeUrlState({
      filters,
      sortBy,
      focusedArea,
      selectedPubId: selectedPub?.id ?? null,
      sunDate,
    });
  }, [hydrated, filters, sortBy, focusedArea, selectedPub, sunDate]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const searchChanged = filters.searchQuery !== debouncedFilters.searchQuery;
    const delay = searchChanged ? 300 : 0;

    debounceRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters]);

  // Geo radius — when "Near me" or an area is set, narrow to within RADIUS_KM
  // so the list stays manageable instead of all 2,492 pubs sorted by distance.
  const RADIUS_KM = 1.5;
  const radiusAnchor = focusedArea || userLocation;

  // Convert sunDate (YYYY-MM-DD) → day-of-year 1..365 for API
  const sunDay = (() => {
    if (!sunDate) return undefined;
    const [y, m, d] = sunDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const startOfYear = new Date(Date.UTC(y, 0, 0));
    return Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  })();

  useEffect(() => {
    async function loadPubs() {
      try {
        const params = new URLSearchParams();
        if (debouncedFilters.hasFood) params.set("hasFood", "true");
        if (debouncedFilters.hasLiveSport) params.set("hasLiveSport", "true");
        if (debouncedFilters.hasPoolTable) params.set("hasPoolTable", "true");
        if (debouncedFilters.hasDarts) params.set("hasDarts", "true");
        if (debouncedFilters.hasBeerGarden) params.set("hasBeerGarden", "true");
        if (debouncedFilters.hasDogFriendly) params.set("hasDogFriendly", "true");
        if (debouncedFilters.hasRealAle) params.set("hasRealAle", "true");
        if (debouncedFilters.hasQuizNight) params.set("hasQuizNight", "true");
        if (debouncedFilters.hasLiveMusic) params.set("hasLiveMusic", "true");
        if (debouncedFilters.isSunny) params.set("isSunny", "true");
        if (debouncedFilters.isTimeOutPick) params.set("isTimeOutPick", "true");
        if (sunDay) params.set("day", String(sunDay));
        if (debouncedFilters.searchQuery)
          params.set("search", debouncedFilters.searchQuery);

        // Geo radius filter when a focus point is set
        if (radiusAnchor) {
          params.set("lat", radiusAnchor.lat.toString());
          params.set("lng", radiusAnchor.lng.toString());
          params.set("radius", RADIUS_KM.toString());
        }

        const res = await fetch(`/api/pubs?${params.toString()}`);
        const data = await res.json();
        setPubs(data.pubs);
        setTotalCount(data.total);
      } catch (err) {
        console.error("Failed to load pubs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPubs();
  }, [debouncedFilters, radiusAnchor, sunDay]);

  // Sort + filter by picks
  const sortAnchor = focusedArea || userLocation;
  // Picks filter is active when:
  // - user toggled "show only mine" OR
  // - mates URL param is present (auto-filter to mate picks)
  const picksFilterActive = showMyPicks || mates.length > 0;

  const sortedPubs = useCallback(() => {
    let arr = [...pubs];

    // Apply picks filter (client-side because picks are user-local)
    if (picksFilterActive) {
      const allowed = allPickedIds(mates, showMyPicks || mates.length === 0);
      arr = arr.filter((p) => allowed.has(p.id));
    }
    void myPicksVersion; // re-run when my picks change

    if (sortBy === "rating") {
      arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "name") {
      arr.sort((a, b) => {
        const stripThe = (s: string) => s.replace(/^The\s+/i, "");
        return stripThe(a.name).localeCompare(stripThe(b.name));
      });
    } else {
      // distance (default) — falls back to original order if no anchor
      if (sortAnchor) {
        arr.sort((a, b) => {
          const distA = Math.hypot(a.lat - sortAnchor.lat, a.lng - sortAnchor.lng);
          const distB = Math.hypot(b.lat - sortAnchor.lat, b.lng - sortAnchor.lng);
          return distA - distB;
        });
      }
    }
    return arr;
  }, [pubs, sortAnchor, sortBy, picksFilterActive, mates, showMyPicks, myPicksVersion])();

  const handlePubSelect = useCallback((pub: Pub | null) => {
    setSelectedPub(pub);
  }, []);

  // On mobile: when a pub is selected, surface the sidebar and scroll the
  // detail panel into view so users don't lose their place in the list.
  useEffect(() => {
    if (!selectedPub) return;
    if (window.innerWidth >= 768) return; // desktop has both panes
    setShowSidebar(true);
    // Wait for the panel to render, then scroll
    requestAnimationFrame(() => {
      const panel = document.querySelector("#pub-detail-panel");
      panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedPub]);

  // Quick action for mobile map view: jump back to list with search focused
  function focusSearch() {
    setShowSidebar(true);
    requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder*="name"]');
      input?.focus();
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // Hydrate selected pub from URL when data loads
  useEffect(() => {
    if (!pendingPubId || pubs.length === 0) return;
    const match = pubs.find((p) => p.id === pendingPubId);
    if (match) {
      setSelectedPub(match);
      setPendingPubId(null);
    } else {
      // Pub from URL isn't in current filter set; try fetching it directly
      // so it still shows in detail view
      fetch(`/api/pubs/${encodeURIComponent(pendingPubId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((p: Pub | null) => {
          if (p) setSelectedPub(p);
          setPendingPubId(null);
        })
        .catch(() => setPendingPubId(null));
    }
  }, [pubs, pendingPubId]);

  // Drop the selected pub if it's no longer in the current results
  useEffect(() => {
    if (!selectedPub) return;
    if (pendingPubId) return; // still hydrating
    if (!pubs.some((p) => p.id === selectedPub.id)) {
      setSelectedPub(null);
    }
  }, [pubs, selectedPub, pendingPubId]);

  function handleLocateMe() {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support location");
      setTimeout(() => setLocationError(null), 4000);
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
        // On mobile, switch to map view so they can see themselves
        if (window.innerWidth < 768) {
          setShowSidebar(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location blocked — enable it in browser settings");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError("Couldn't get your location — try again");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("Location request timed out");
        } else {
          setLocationError("Couldn't get your location");
        }
        setTimeout(() => setLocationError(null), 4000);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg)] overflow-hidden">
      <WelcomeTip />
      {/* Skip link for keyboard users — invisible until Tab-focused */}
      <a
        href="#pub-list"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-lg"
      >
        Skip to pub list
      </a>

      {/* Toast: location error */}
      {locationError && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] animate-fade-up bg-[var(--red-bg)] border border-[var(--red)]/40 text-[var(--red)] px-4 py-2.5 rounded-xl shadow-lg max-w-[90vw]"
        >
          <p className="text-[13px] font-medium">{locationError}</p>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 bg-[var(--bg-raised)] border-b border-[var(--border)] px-3 sm:px-5 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Image
              src="/logo.svg"
              alt="Frier's Useful Pub Map"
              width={56}
              height={48}
              priority
              className="w-10 h-9 sm:w-14 sm:h-12 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-serif text-[15px] sm:text-[22px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight truncate">
                {/* Shorter on mobile to avoid header truncation */}
                <span className="sm:hidden">Frier&rsquo;s Pub Map</span>
                <span className="hidden sm:inline">Frier&rsquo;s Useful Pub Map</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] tracking-wide uppercase mt-0.5 truncate">
                {totalCount.toLocaleString()} central London pubs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <MyPicksMenu
              showMyPicks={showMyPicks}
              onToggleShowMyPicks={setShowMyPicks}
            />
            <button
              onClick={handleLocateMe}
              disabled={locating}
              aria-label={
                userLocation
                  ? "Showing pubs near your location"
                  : locating
                  ? "Getting your location"
                  : "Find pubs near me"
              }
              className={`text-[12px] sm:text-[13px] font-medium px-2.5 sm:px-4 py-2 rounded-full transition-all cursor-pointer border shadow-sm whitespace-nowrap disabled:cursor-wait ${
                userLocation && !focusedArea
                  ? "bg-[var(--accent)] text-white border-[var(--accent)] hover:bg-[var(--accent-hover)]"
                  : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--bg-tint)]"
              }`}
              title={
                userLocation
                  ? "Showing pubs near you"
                  : locating
                  ? "Getting your location..."
                  : "Find pubs near me"
              }
            >
              <span className="flex items-center gap-1.5">
                {locating ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                ) : (
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={userLocation && !focusedArea ? "white" : "var(--accent)"}
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                  </svg>
                )}
                <span className="hidden sm:inline">
                  {locating ? "Locating..." : userLocation ? "You" : "Near me"}
                </span>
              </span>
            </button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              aria-label={showSidebar ? "Show map" : "Show pub list"}
              className="md:hidden text-[12px] sm:text-[13px] font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] px-3 sm:px-4 py-2 rounded-full cursor-pointer border border-[var(--border)] whitespace-nowrap"
            >
              {showSidebar ? "Map" : "List"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`w-full md:w-[420px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-raised)] flex flex-col overflow-hidden ${
            showSidebar ? "block" : "hidden md:block"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Search & Filters - fixed at top */}
            <div className="shrink-0 p-3 sm:p-4 border-b border-[var(--border)] bg-[var(--bg-raised)] space-y-2.5 sm:space-y-3">
              <AreaSearch focusedArea={focusedArea} onSelectArea={setFocusedArea} />
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                totalCount={totalCount}
                filteredCount={pubs.length}
                sortBy={sortBy}
                onSortChange={setSortBy}
                hasSortAnchor={!!sortAnchor}
                sunDate={sunDate}
                onSunDateChange={setSunDate}
              />
            </div>

            {/* Scrollable list */}
            <div id="pub-list" className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2">
              {/* Mate-list banner */}
              {mates.length > 0 && (
                <div className="bg-[var(--accent-tint)] border border-[var(--accent-tint-strong)] rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                  <svg
                    className="text-[var(--accent)] mt-0.5 shrink-0"
                    width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[var(--text-primary)] font-medium leading-tight">
                      Showing pubs rated by{" "}
                      {mates.map((m, i) => (
                        <span key={m.name}>
                          {i > 0 && (i === mates.length - 1 ? " and " : ", ")}
                          <strong>{m.name}</strong>
                        </span>
                      ))}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {mates.reduce((sum, m) => sum + m.pubIds.length, 0)} pubs
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMates([]);
                      // Strip ?mates= from the URL
                      const url = new URL(window.location.href);
                      url.searchParams.delete("mates");
                      window.history.replaceState(null, "", url.toString());
                    }}
                    className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}

              {selectedPub && (
                <div id="pub-detail-panel">
                  <PubDetail
                    pub={selectedPub}
                    onClose={() => setSelectedPub(null)}
                    day={sunDay}
                    selectedDate={sunDate}
                    walkFrom={userLocation && !focusedArea ? userLocation : focusedArea}
                  />
                </div>
              )}

              {loading ? (
                <SkeletonList count={6} />
              ) : (
              <PubList
                pubs={sortedPubs}
                selectedPub={selectedPub}
                onPubSelect={handlePubSelect}
                searchQuery={debouncedFilters.searchQuery}
                hasActiveFilters={
                  !!debouncedFilters.hasFood ||
                  !!debouncedFilters.hasLiveSport ||
                  !!debouncedFilters.hasPoolTable ||
                  !!debouncedFilters.hasDarts ||
                  !!debouncedFilters.hasBeerGarden ||
                  !!debouncedFilters.hasDogFriendly ||
                  !!debouncedFilters.hasRealAle ||
                  !!debouncedFilters.hasQuizNight ||
                  !!debouncedFilters.hasLiveMusic ||
                  !!debouncedFilters.isSunny ||
                  !!debouncedFilters.isTimeOutPick
                }
                radiusContext={
                  radiusAnchor
                    ? {
                        label: focusedArea?.label ?? "you",
                        km: RADIUS_KM,
                        onClear: () => {
                          if (focusedArea) setFocusedArea(null);
                          else setUserLocation(null);
                        },
                      }
                    : null
                }
                mates={mates}
                walkFrom={userLocation && !focusedArea ? userLocation : focusedArea}
              />
              )}
            </div>
          </div>
        </aside>

        {/* Map */}
        <main
          className={`flex-1 relative ${
            !showSidebar ? "block" : "hidden md:block"
          }`}
        >
          {/* Floating search FAB — mobile-only, on map view */}
          {!showSidebar && (
            <button
              onClick={focusSearch}
              aria-label="Open search and filters"
              className="md:hidden absolute top-3 left-3 z-[1000] bg-[var(--accent)] text-white border-2 border-white rounded-full px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex items-center gap-2 text-[13px] font-semibold hover:bg-[var(--accent-hover)] transition-all cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Search & filter
            </button>
          )}

          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)]">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-[var(--text-muted)] text-sm">Loading pubs...</p>
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)]">
                  <p className="text-[var(--text-muted)] text-sm">Loading map...</p>
                </div>
              }
            >
              <Map
                pubs={sortedPubs}
                selectedPub={selectedPub}
                onPubSelect={handlePubSelect}
                userLocation={userLocation}
                focusedArea={focusedArea}
                isVisible={!showSidebar}
              />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
