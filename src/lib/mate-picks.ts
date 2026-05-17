/**
 * "Pubs my mates rate" — local-first social feature.
 *
 * - You can SAVE pubs you rate (stored in localStorage)
 * - You can SHARE your list via a URL like `?mates=Alice:osm-way-123,osm-way-456`
 * - When friends open the URL, they see your picks with a banner
 *
 * No backend required — URLs encode the list. Future Supabase migration
 * can replace this with persistent profiles.
 */

const STORAGE_KEY = "frier-pubs:my-picks";
const NAME_KEY = "frier-pubs:my-name";

export interface MateList {
  name: string;
  pubIds: string[];
}

// ─── Local storage (your own picks) ──────────────────────────────────

export function getMyPicks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isPicked(pubId: string): boolean {
  return getMyPicks().includes(pubId);
}

export function togglePick(pubId: string): boolean {
  const picks = getMyPicks();
  const idx = picks.indexOf(pubId);
  if (idx >= 0) {
    picks.splice(idx, 1);
  } else {
    picks.push(pubId);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  // Fire a custom event so React components can react
  window.dispatchEvent(new CustomEvent("frier-picks-changed"));
  return idx < 0; // true if added
}

export function getMyName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setMyName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NAME_KEY, name.trim().substring(0, 30));
  } catch {
    // ignore
  }
}

// ─── URL encoding for shareable lists ─────────────────────────────────

/**
 * Build a shareable URL for the current user's picks.
 * Format: ?mates=Alice:osm-way-123,osm-way-456|Bob:osm-node-789
 */
export function buildShareUrl(name: string, pubIds: string[]): string {
  if (typeof window === "undefined" || pubIds.length === 0) return "";
  const url = new URL(window.location.href);
  // Strip existing params to keep the URL clean
  url.search = "";
  const encodedName = encodeURIComponent(name.trim() || "Anonymous");
  url.searchParams.set("mates", `${encodedName}:${pubIds.join(",")}`);
  return url.toString();
}

/**
 * Parse the `mates` URL parameter into structured lists.
 * Multiple mates separated by | — each as Name:id1,id2,...
 */
export function parseMatesParam(param: string | null): MateList[] {
  if (!param) return [];
  return param
    .split("|")
    .map((chunk) => {
      const colonIdx = chunk.indexOf(":");
      if (colonIdx < 0) return null;
      const name = decodeURIComponent(chunk.substring(0, colonIdx)).trim();
      const pubIds = chunk
        .substring(colonIdx + 1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (pubIds.length === 0) return null;
      return { name, pubIds };
    })
    .filter((m): m is MateList => m !== null);
}

/**
 * All pub IDs picked by any mate (for filtering).
 */
export function allPickedIds(mates: MateList[], includeMine: boolean): Set<string> {
  const ids = new Set<string>();
  if (includeMine) {
    for (const id of getMyPicks()) ids.add(id);
  }
  for (const mate of mates) {
    for (const id of mate.pubIds) ids.add(id);
  }
  return ids;
}

/**
 * For a pub, who's picked it? Returns names of mates that include this id.
 */
export function whoPickedIt(
  pubId: string,
  mates: MateList[],
  myName: string
): string[] {
  const names: string[] = [];
  if (getMyPicks().includes(pubId)) {
    names.push(myName || "You");
  }
  for (const mate of mates) {
    if (mate.pubIds.includes(pubId)) names.push(mate.name);
  }
  return names;
}
