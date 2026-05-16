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
