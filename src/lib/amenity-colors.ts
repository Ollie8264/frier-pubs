import { Pub, SUNNY_THRESHOLD } from "@/lib/types";

export interface AmenityChip {
  key: string;
  label: string;
  bg: string;
  fg: string;
}

export function getAmenityChips(pub: Pub): AmenityChip[] {
  const chips: AmenityChip[] = [];
  // Show sun chip first if pub is rated sunny (lead with the unique signal)
  if ((pub.avgSunPercentage ?? 0) >= SUNNY_THRESHOLD) {
    chips.push({
      key: "sun",
      label: `☀ ${pub.avgSunPercentage}%`,
      bg: "var(--color-sun-bg)",
      fg: "var(--color-sun)",
    });
  }
  if (pub.hasFood) chips.push({ key: "food", label: "Food", bg: "var(--color-food-bg)", fg: "var(--color-food)" });
  if (pub.hasLiveSport) chips.push({ key: "sport", label: "Sport", bg: "var(--color-sport-bg)", fg: "var(--color-sport)" });
  if (pub.hasBeerGarden || pub.hasOutdoorSeating) chips.push({ key: "garden", label: "Garden", bg: "var(--color-garden-bg)", fg: "var(--color-garden)" });
  if (pub.hasRealAle) chips.push({ key: "ale", label: "Real Ale", bg: "var(--color-ale-bg)", fg: "var(--color-ale)" });
  if (pub.hasDogFriendly) chips.push({ key: "dogs", label: "Dogs OK", bg: "var(--color-dogs-bg)", fg: "var(--color-dogs)" });
  if (pub.hasPoolTable) chips.push({ key: "pool", label: "Pool", bg: "var(--color-pool-bg)", fg: "var(--color-pool)" });
  if (pub.hasDarts) chips.push({ key: "darts", label: "Darts", bg: "var(--color-darts-bg)", fg: "var(--color-darts)" });
  if (pub.hasQuizNight) chips.push({ key: "quiz", label: "Quiz", bg: "var(--color-quiz-bg)", fg: "var(--color-quiz)" });
  if (pub.hasLiveMusic) chips.push({ key: "music", label: "Music", bg: "var(--color-music-bg)", fg: "var(--color-music)" });
  if (pub.hasWifi) chips.push({ key: "wifi", label: "WiFi", bg: "var(--color-wifi-bg)", fg: "var(--color-wifi)" });
  if (pub.hasRealFire) chips.push({ key: "fire", label: "Fire", bg: "var(--color-fire-bg)", fg: "var(--color-fire)" });
  return chips;
}

export const FILTER_COLORS: Record<string, { bg: string; fg: string }> = {
  hasFood: { bg: "var(--color-food-bg)", fg: "var(--color-food)" },
  hasLiveSport: { bg: "var(--color-sport-bg)", fg: "var(--color-sport)" },
  hasBeerGarden: { bg: "var(--color-garden-bg)", fg: "var(--color-garden)" },
  hasRealAle: { bg: "var(--color-ale-bg)", fg: "var(--color-ale)" },
  hasDogFriendly: { bg: "var(--color-dogs-bg)", fg: "var(--color-dogs)" },
  hasPoolTable: { bg: "var(--color-pool-bg)", fg: "var(--color-pool)" },
  hasDarts: { bg: "var(--color-darts-bg)", fg: "var(--color-darts)" },
  hasQuizNight: { bg: "var(--color-quiz-bg)", fg: "var(--color-quiz)" },
  hasLiveMusic: { bg: "var(--color-music-bg)", fg: "var(--color-music)" },
  isSunny: { bg: "var(--color-sun-bg)", fg: "var(--color-sun)" },
};
