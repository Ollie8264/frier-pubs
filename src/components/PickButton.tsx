"use client";

import { useEffect, useState } from "react";
import { isPicked, togglePick } from "@/lib/mate-picks";

interface PickButtonProps {
  pubId: string;
  /** "small" for cards, "large" for detail panel */
  size?: "small" | "large";
}

export default function PickButton({ pubId, size = "small" }: PickButtonProps) {
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    setPicked(isPicked(pubId));
    function handler() {
      setPicked(isPicked(pubId));
    }
    window.addEventListener("frier-picks-changed", handler);
    return () => window.removeEventListener("frier-picks-changed", handler);
  }, [pubId]);

  const dim = size === "large" ? 18 : 14;
  const pad = size === "large" ? "p-2" : "p-1.5";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // don't trigger card click
        togglePick(pubId);
      }}
      aria-label={picked ? "Remove from my picks" : "Add to my picks"}
      title={picked ? "Remove from my picks" : "Add to my picks"}
      className={`${pad} rounded-full transition-all cursor-pointer shrink-0 ${
        picked
          ? "bg-[var(--accent-tint)] text-[var(--accent)] hover:bg-[var(--accent-tint-strong)]"
          : "text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-tint)]"
      }`}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill={picked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
