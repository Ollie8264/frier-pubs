"use client";

import { useState } from "react";

interface OpenLatePickerProps {
  /** Hour (0-30, where >24 = past midnight). null = no filter. */
  value: number | null;
  onChange: (hour: number | null) => void;
}

// Late-night presets. Use 24+ for "past midnight" so we can match pubs that
// close at e.g. 01:00 (closeMinutes wraps to next day in typicalOpenWindow).
const PRESETS: { label: string; value: number }[] = [
  { label: "9pm", value: 21 },
  { label: "10pm", value: 22 },
  { label: "10:30pm", value: 22.5 },
  { label: "11pm", value: 23 },
  { label: "Midnight", value: 24 },
  { label: "1am", value: 25 },
  { label: "2am", value: 26 },
  { label: "3am", value: 27 },
  { label: "4am", value: 28 },
];

function formatLabel(value: number): string {
  const preset = PRESETS.find((p) => p.value === value);
  if (preset) return preset.label;
  if (value === 24) return "midnight";
  if (value > 24) return `${value - 24}am`;
  if (value === 12) return "noon";
  return value < 12 ? `${value}am` : `${value - 12}pm`;
}

export default function OpenLatePicker({ value, onChange }: OpenLatePickerProps) {
  const [open, setOpen] = useState(false);
  const active = value !== null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
          active
            ? "bg-[var(--color-music-bg)] text-[var(--color-music)] border-[var(--color-music)]/30"
            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]"
        }`}
        aria-label="Filter to pubs open late"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <span>
          {active ? `Open past ${formatLabel(value!)}` : "Open late"}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[800]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-[900] animate-fade-up min-w-[180px] max-w-[calc(100vw-1.5rem)]">
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Still open past…
              </p>
            </div>
            <div className="py-1">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    onChange(p.value === value ? null : p.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[12px] transition-colors cursor-pointer ${
                    p.value === value
                      ? "bg-[var(--color-music-bg)] text-[var(--color-music)] font-semibold"
                      : "text-[var(--text-primary)] hover:bg-[var(--accent-tint)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {active && (
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full text-[11px] py-2 text-[var(--accent)] hover:bg-[var(--accent-tint)] border-t border-[var(--border)] cursor-pointer font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
