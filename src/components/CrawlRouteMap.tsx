"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Pub } from "@/lib/types";

interface CrawlRouteMapProps {
  /** Stops in order — only those with a matched pub get a marker */
  stops: { name: string; pub?: Pub }[];
  /** Fallback centre if no stops have coords */
  fallbackCenter: { lat: number; lng: number };
}

export default function CrawlRouteMap({ stops, fallbackCenter }: CrawlRouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [fallbackCenter.lat, fallbackCenter.lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    map.zoomControl.setPosition("bottomright");

    // Numbered markers for each matched stop
    const points: [number, number][] = [];
    stops.forEach((stop, i) => {
      if (!stop.pub) return;
      const p = stop.pub;
      points.push([p.lat, p.lng]);
      const icon = L.divIcon({
        className: "crawl-stop-marker",
        html: `<div style="
          width: 30px; height: 30px;
          background: var(--accent, #cc785c);
          border: 3px solid #fff;
          border-radius: 50%;
          color: white;
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">${i + 1}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      L.marker([p.lat, p.lng], { icon })
        .bindPopup(`<div class="pub-popup"><h3>${stop.name}</h3></div>`)
        .addTo(map);
    });

    // Draw the route as a dashed polyline
    if (points.length > 1) {
      L.polyline(points, {
        color: "#cc785c",
        weight: 3,
        opacity: 0.7,
        dashArray: "8 6",
      }).addTo(map);
    }

    // Fit map to all points
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [stops, fallbackCenter.lat, fallbackCenter.lng]);

  return <div ref={containerRef} className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden" />;
}
