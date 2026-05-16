"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[var(--bg)] p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--red-bg)] flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1 className="font-serif text-[24px] font-semibold text-[var(--text-primary)] mb-2">
        Something went wrong
      </h1>
      <p className="text-[14px] text-[var(--text-secondary)] max-w-sm mb-6">
        Sorry — the pub map crashed unexpectedly. Try again, or reload the page.
      </p>

      <div className="flex gap-2">
        <button
          onClick={reset}
          className="text-[13px] font-semibold bg-[var(--accent)] text-white px-4 py-2.5 rounded-xl hover:bg-[var(--accent-hover)] transition-all shadow-sm cursor-pointer"
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="text-[13px] font-semibold text-[var(--text-primary)] bg-[var(--bg-tint)] px-4 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--accent-tint)] transition-all cursor-pointer"
        >
          Start over
        </button>
      </div>

      {error.digest && (
        <p className="text-[10px] text-[var(--text-muted)] mt-6 font-mono">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
