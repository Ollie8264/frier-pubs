"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "frier-pubs:welcomed";

/**
 * One-time tip shown the first time someone lands on the app.
 * Persists "seen" in localStorage so it doesn't show again.
 */
export default function WelcomeTip() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Wait a moment so the page settles before showing
        const t = setTimeout(() => setShow(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage blocked, just skip
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Welcome"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1500] animate-fade-up max-w-md mx-auto px-4 w-[calc(100%-2rem)]"
    >
      <div className="bg-[var(--bg-elevated)] border border-[var(--accent-tint-strong)] rounded-2xl shadow-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-tint)] flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
              <line x1="6" x2="6" y1="2" y2="4"/>
              <line x1="10" x2="10" y1="2" y2="4"/>
              <line x1="14" x2="14" y1="2" y2="4"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-[16px] font-semibold text-[var(--text-primary)] mb-1">
              Welcome to Frier&rsquo;s Pub Map
            </h3>
            <ul className="text-[12px] text-[var(--text-secondary)] leading-relaxed space-y-1 mb-3">
              <li>• <strong>Tap a pub</strong> for hours, photos, sun rating, and what&rsquo;s on tap</li>
              <li>• <strong>Filter by ☀ Sunny</strong> to find the pub with the best sun today</li>
              <li>• <strong>Heart pubs you rate</strong> — share your list with mates via the &ldquo;My picks&rdquo; menu</li>
              <li>• <strong>Plan ahead</strong> — pick a date to see which pub will be sunny on the day</li>
            </ul>
            <div className="flex items-center gap-2">
              <button
                onClick={dismiss}
                className="flex-1 text-[13px] font-semibold bg-[var(--accent)] text-white px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-all cursor-pointer"
              >
                Got it 🍻
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
