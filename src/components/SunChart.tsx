"use client";

import type { SunStats } from "@/lib/types";

const MONTHS_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

interface SunChartProps {
  stats: SunStats;
  /** Highlight the current month (0=Jan) */
  currentMonth?: number;
}

export default function SunChart({ stats, currentMonth }: SunChartProps) {
  const max = 100;
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-20" role="img" aria-label="Sun coverage by month">
        {stats.monthly.map((val, i) => {
          const heightPct = (val / max) * 100;
          const isCurrent = i === currentMonth;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full group"
              title={`${MONTHS_SHORT[i]} — ${val}%`}
            >
              <div
                className={`w-full rounded-sm transition-all ${
                  isCurrent
                    ? "bg-[var(--color-sun)]"
                    : val >= 60
                    ? "bg-[var(--color-sun-bg)] border border-[var(--color-sun)]/30"
                    : "bg-[var(--bg-tint)]"
                }`}
                style={{ height: `${Math.max(heightPct, 3)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {MONTHS_SHORT.map((m, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[10px] ${
              i === currentMonth ? "text-[var(--color-sun)] font-bold" : "text-[var(--text-muted)]"
            }`}
          >
            {m}
          </div>
        ))}
      </div>
    </div>
  );
}
