"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Pub } from "@/lib/types";

interface MapProps {
  pubs: Pub[];
  selectedPub: Pub | null;
  onPubSelect: (pub: Pub | null) => void;
  userLocation?: { lat: number; lng: number } | null;
  focusedArea?: { lat: number; lng: number; label: string } | null;
  /** When true, the map container is visible. Used to trigger tile-redraw
   *  after switching views on mobile. */
  isVisible?: boolean;
}

const LONDON_CENTER: [number, number] = [51.509, -0.118];
const DEFAULT_ZOOM = 13;

function createPubIcon(isSelected: boolean) {
  const size = isSelected ? 16 : 10;
  return L.divIcon({
    className: "custom-pub-marker",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${isSelected ? "#cc785c" : "#cc785c"};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(204,120,92,0.5)${isSelected ? ", 0 0 0 4px rgba(204,120,92,0.25)" : ""};
      transition: all 0.15s ease;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function formatPopupContent(pub: Pub): string {
  const tags: string[] = [];
  if (pub.hasFood) tags.push("Food");
  if (pub.hasLiveSport) tags.push("Sport");
  if (pub.hasPoolTable) tags.push("Pool");
  if (pub.hasBeerGarden || pub.hasOutdoorSeating) tags.push("Garden");
  if (pub.hasRealAle) tags.push("Ale");
  if (pub.hasDogFriendly) tags.push("Dogs");

  return `
    <div class="pub-popup">
      <h3>${pub.name}</h3>
      ${pub.address ? `<div class="pub-address">${pub.address}</div>` : ""}
      ${pub.rating ? `<div style="font-size:12px;color:#ffd666;margin-bottom:4px">${pub.rating}/5</div>` : ""}
      ${
        tags.length > 0
          ? `<div class="pub-tags">${tags.map((t) => `<span class="pub-tag">${t}</span>`).join("")}</div>`
          : ""
      }
    </div>
  `;
}

export default function Map({ pubs, selectedPub, onPubSelect, userLocation, focusedArea, isVisible = true }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: LONDON_CENTER,
      zoom: DEFAULT_ZOOM,
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
    mapRef.current = map;
    setMapReady(true);

    // Watch the map container for size changes — fixes blank tiles when
    // toggling between mobile list/map views or any responsive resize.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      // Debounce — visibility toggles can fire multiple resize events
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        map.invalidateSize({ animate: false });
      }, 50);
    });
    ro.observe(mapContainerRef.current);

    // Also force one initial invalidation after mount in case the container
    // was sized via CSS only after the map initialised
    const initialTimer = setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 100);

    return () => {
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      clearTimeout(initialTimer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    if (clusterRef.current) {
      mapRef.current.removeLayer(clusterRef.current);
    }

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        let size = "small";
        let dim = 32;
        if (count > 50) { size = "large"; dim = 44; }
        else if (count > 10) { size = "medium"; dim = 38; }

        return L.divIcon({
          html: `<div class="cluster-marker cluster-${size}">${count}</div>`,
          className: "custom-cluster-icon",
          iconSize: L.point(dim, dim),
        });
      },
    });

    pubs.forEach((pub) => {
      const isSelected = selectedPub?.id === pub.id;
      const marker = L.marker([pub.lat, pub.lng], {
        icon: createPubIcon(isSelected),
      });

      marker.bindPopup(formatPopupContent(pub), {
        maxWidth: 260,
        closeButton: true,
      });

      marker.on("click", () => {
        onPubSelect(pub);
      });

      cluster.addLayer(marker);
    });

    cluster.addTo(mapRef.current);
    clusterRef.current = cluster;
  }, [pubs, selectedPub, onPubSelect, mapReady]);

  useEffect(() => {
    if (!mapRef.current || !selectedPub) return;
    mapRef.current.setView([selectedPub.lat, selectedPub.lng], 16, {
      animate: true,
    });
  }, [selectedPub]);

  // Fly to a focused area when set
  useEffect(() => {
    if (!mapRef.current || !focusedArea) return;
    mapRef.current.flyTo([focusedArea.lat, focusedArea.lng], 15, {
      animate: true,
      duration: 0.8,
    });
  }, [focusedArea]);

  // Invalidate size whenever the map becomes visible — fixes blank tiles
  // when toggling between mobile list/map views.
  useEffect(() => {
    if (!mapRef.current || !isVisible) return;
    // Multiple staggered calls — first triggers immediately, second after
    // any CSS transitions, third as a safety net.
    const map = mapRef.current;
    map.invalidateSize({ animate: false });
    const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 50);
    const t2 = setTimeout(() => map.invalidateSize({ animate: false }), 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
    }

    const icon = L.divIcon({
      className: "user-location-marker",
      html: `<div style="
        width: 14px;
        height: 14px;
        background: #5e9eff;
        border: 2.5px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 5px rgba(94,158,255,0.25), 0 2px 6px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const marker = L.marker([userLocation.lat, userLocation.lng], { icon });
    marker.bindPopup('<div class="pub-popup"><h3>You are here</h3></div>');
    marker.addTo(mapRef.current);
    userMarkerRef.current = marker;

    mapRef.current.setView([userLocation.lat, userLocation.lng], 15, {
      animate: true,
    });
  }, [userLocation]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  );
}
