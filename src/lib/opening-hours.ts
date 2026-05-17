export function isOpenNow(hoursString: string | undefined): "open" | "closed" | "unknown" {
  if (!hoursString) return "unknown";

  try {
    const now = new Date();
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const today = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const rules = hoursString.split(";").map((r) => r.trim());

    for (const rule of rules) {
      if (rule === "24/7") return "open";

      const match = rule.match(/^([A-Za-z, -]+?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
      if (!match) continue;

      const [, daysPart, openTime, closeTime] = match;
      const days = expandDays(daysPart);

      if (days.includes(today)) {
        const openMinutes = parseTime(openTime);
        const closeMinutes = parseTime(closeTime);

        if (closeMinutes <= openMinutes) {
          if (currentMinutes >= openMinutes || currentMinutes < closeMinutes) {
            return "open";
          }
        } else {
          if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
            return "open";
          }
        }
      }
    }

    return "closed";
  } catch {
    return "unknown";
  }
}

function expandDays(daysPart: string): string[] {
  const allDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const result: string[] = [];

  const parts = daysPart.split(",").map((p) => p.trim());
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((d) => d.trim());
      const startIdx = allDays.indexOf(start);
      const endIdx = allDays.indexOf(end);
      if (startIdx !== -1 && endIdx !== -1) {
        let i = startIdx;
        while (true) {
          result.push(allDays[i]);
          if (i === endIdx) break;
          i = (i + 1) % 7;
        }
      }
    } else {
      if (allDays.includes(part)) result.push(part);
    }
  }

  return result;
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Returns the earliest open hour and latest close hour across the week as
 * decimal hours (e.g. {open: 11, close: 23}). Used to clip sun-time displays
 * so we don't tell users about 5am sun when no pub is open then.
 *
 * Falls back to sensible UK pub defaults (11:00 - 23:00) if hours are missing
 * or can't be parsed.
 */
export function typicalOpenWindow(
  hoursString: string | undefined
): { open: number; close: number } {
  const DEFAULT = { open: 11, close: 23 };

  if (!hoursString) return DEFAULT;
  if (hoursString.trim() === "24/7") return { open: 0, close: 24 };

  try {
    const rules = hoursString.split(";").map((r) => r.trim());
    let earliestOpen = Infinity;
    let latestClose = -Infinity;

    for (const rule of rules) {
      const match = rule.match(/^([A-Za-z, -]+?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
      if (!match) continue;

      const [, , openTime, closeTime] = match;
      const openMins = parseTime(openTime);
      let closeMins = parseTime(closeTime);

      // Handle close-after-midnight (e.g. closes 01:00 next day)
      if (closeMins <= openMins) closeMins += 24 * 60;

      if (openMins < earliestOpen) earliestOpen = openMins;
      if (closeMins > latestClose) latestClose = closeMins;
    }

    if (earliestOpen === Infinity || latestClose === -Infinity) return DEFAULT;

    return {
      open: earliestOpen / 60,
      // Clamp at 25 (1am next day) — sun never matters after midnight
      close: Math.min(latestClose / 60, 25),
    };
  } catch {
    return DEFAULT;
  }
}
