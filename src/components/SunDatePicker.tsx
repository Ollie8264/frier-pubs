"use client";

import { useState } from "react";

interface SunDatePickerProps {
  /** Selected "still sunny after X hour" filter. null = no filter. */
  sunnyAfter: number | null;
  onSunnyAfterChange: (hour: number | null) => void;
}

function formatHourAmPm(h: number): string {
  if (h === 0 || h === 24) return "midnight";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

/**
 * Tiny popover that filters the pub list to those where today's sun is still
 * coming after a chosen hour. Date is implicit (always today) — the sun
 * pattern barely shifts over a week so we don't bother letting users plan
 * future dates.
 */
export default function SunDatePicker({
  sunnyAfter, onSunnyAfterChange,
}: SunDatePickerProps) {
  const [open, setOpen] = useState(false);
  const hasFilter = sunnyAfter !== null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
          hasFilter
            ? "bg-[var(--color-sun-bg)] text-[var(--color-sun)] border-[var(--color-sun)]/30"
            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]"
        }`}
        aria-label="Show pubs still sunny after a chosen time"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <span>
          {hasFilter ? `Sunny after ${formatHourAmPm(sunnyAfter!)}` : "Sun"}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[800]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-[900] animate-fade-up w-[240px] max-w-[calc(100vw-1.5rem)]">
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Still sunny today after…
              </p>
            </div>
            <div className="p-2 flex flex-wrap gap-1">
              <button
                onClick={() => {
                  onSunnyAfterChange(null);
                  setOpen(false);
                }}
                className={`text-[12px] px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  !hasFilter
                    ? "bg-[var(--color-sun-bg)] text-[var(--color-sun)]"
                    : "bg-[var(--bg-tint)] text-[var(--text-secondary)] hover:bg-[var(--accent-tint)]"
                }`}
              >
                Any
              </button>
              {[12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    onSunnyAfterChange(h === sunnyAfter ? null : h);
                    setOpen(false);
                  }}
                  className={`text-[12px] px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    sunnyAfter === h
                      ? "bg-[var(--color-sun-bg)] text-[var(--color-sun)]"
                      : "bg-[var(--bg-tint)] text-[var(--text-secondary)] hover:bg-[var(--accent-tint)]"
                  }`}
                >
                  {formatHourAmPm(h)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
