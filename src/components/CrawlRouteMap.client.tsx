"use client";

import dynamic from "next/dynamic";
import type { Pub } from "@/lib/types";

// Leaflet uses `window` at module load — only import on the client.
const Inner = dynamic(() => import("./CrawlRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-80 rounded-2xl bg-[var(--bg-tint)] animate-pulse" />
  ),
});

interface Props {
  stops: { name: string; pub?: Pub }[];
  fallbackCenter: { lat: number; lng: number };
}

export default function CrawlRouteMapClient(props: Props) {
  return <Inner {...props} />;
}
