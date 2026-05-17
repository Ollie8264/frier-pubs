"use client";

import { useEffect, useState } from "react";
import {
  getMyPicks,
  getMyName,
  setMyName,
  buildShareUrl,
} from "@/lib/mate-picks";

interface MyPicksMenuProps {
  showMyPicks: boolean;
  onToggleShowMyPicks: (v: boolean) => void;
}

export default function MyPicksMenu({
  showMyPicks,
  onToggleShowMyPicks,
}: MyPicksMenuProps) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function refresh() {
      const picks = getMyPicks();
      setCount(picks.length);
      setName(getMyName());
    }
    refresh();
    window.addEventListener("frier-picks-changed", refresh);
    return () => window.removeEventListener("frier-picks-changed", refresh);
  }, []);

  // Re-build the share URL when picks/name changes
  useEffect(() => {
    setShareUrl(buildShareUrl(name || "Anonymous", getMyPicks()));
  }, [count, name]);

  async function handleShare() {
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${name || "My"} pub picks`,
          text: `Check out my pub picks on Frier's Useful Pub Map`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="My picks menu"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
          showMyPicks
            ? "bg-[var(--accent)] text-white border-[var(--accent)]"
            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]"
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={showMyPicks ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {count > 0 ? `My picks (${count})` : "My picks"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[800]" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-[900] animate-fade-up min-w-[260px]">
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Your pub picks
              </p>
            </div>

            <div className="px-3 py-3 space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Your name (shown to mates)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setMyName(e.target.value);
                  }}
                  placeholder="e.g. Ollie"
                  maxLength={30}
                  className="w-full bg-[var(--bg-tint)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  {count > 0 ? (
                    <>
                      <strong className="text-[var(--text-primary)]">{count}</strong>{" "}
                      pub{count === 1 ? "" : "s"} saved
                    </>
                  ) : (
                    "No picks yet"
                  )}
                </span>
                {count > 0 && (
                  <button
                    onClick={() => {
                      onToggleShowMyPicks(!showMyPicks);
                      setOpen(false);
                    }}
                    className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer font-medium"
                  >
                    {showMyPicks ? "Show all" : "Show only mine"}
                  </button>
                )}
              </div>

              {count > 0 && (
                <button
                  onClick={handleShare}
                  className="w-full text-center text-[12px] font-semibold bg-[var(--accent)] text-white px-3 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Link copied!
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      Share with mates
                    </>
                  )}
                </button>
              )}

              {count === 0 && (
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Tap the heart on any pub to save it. Your mates can open your link to see what you rate.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
