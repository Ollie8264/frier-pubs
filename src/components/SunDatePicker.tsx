"use client";

import { useState } from "react";

interface SunDatePickerProps {
  /** Selected date as YYYY-MM-DD (UTC). null = today. */
  value: string | null;
  onChange: (date: string | null) => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) {
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function SunDatePicker({ value, onChange }: SunDatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = todayIso();
  const selected = value ?? today;
  const isToday = selected === today;

  // Quick presets for common planning dates
  const presets = (() => {
    const list: { label: string; iso: string }[] = [];
    const now = new Date();
    for (let offset = 0; offset <= 14; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const day = d.toLocaleDateString("en-GB", { weekday: "short" });
      let label: string;
      if (offset === 0) label = "Today";
      else if (offset === 1) label = "Tomorrow";
      else label = `${day} ${d.getDate()}`;
      list.push({ label, iso });
    }
    return list;
  })();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
          isToday
            ? "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]"
            : "bg-[var(--color-sun-bg)] text-[var(--color-sun)] border-[var(--color-sun)]/30"
        }`}
        aria-label="Plan sun for a different day"
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>☀ {formatDateShort(selected)}</span>
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-[800]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-[900] animate-fade-up min-w-[200px]">
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Plan sun for…
              </p>
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {presets.map((p) => (
                <button
                  key={p.iso}
                  onClick={() => {
                    onChange(p.iso === today ? null : p.iso);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[12px] transition-colors cursor-pointer ${
                    p.iso === selected
                      ? "bg-[var(--color-sun-bg)] text-[var(--color-sun)] font-semibold"
                      : "text-[var(--text-primary)] hover:bg-[var(--accent-tint)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-[var(--border)]">
              <input
                type="date"
                value={selected}
                min={today}
                max={`${new Date().getFullYear()}-12-31`}
                onChange={(e) => {
                  onChange(e.target.value === today ? null : e.target.value);
                  setOpen(false);
                }}
                className="w-full text-[12px] bg-[var(--bg-tint)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            {!isToday && (
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full text-[11px] py-2 text-[var(--accent)] hover:bg-[var(--accent-tint)] border-t border-[var(--border)] cursor-pointer font-medium"
              >
                Back to today
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
