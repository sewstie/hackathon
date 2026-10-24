"use client";

// The actual Leaflet render. Imported ONLY via next/dynamic with { ssr: false }
// (see campus-map.tsx), because Leaflet touches `window` at module load and the
// App Router would otherwise throw "window is not defined" during SSR.

import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import type { HeatPoint, MapData } from "@/packages/campuses/map";

/** A sensible campus-scale zoom for OpenStreetMap tiles. */
const DEFAULT_ZOOM = 15;

/**
 * Resolve a CSS custom property (e.g. "--tier-high-fg") to its computed color.
 * Pins carry only the variable NAME (no hex in source); we read the themed
 * value from the document at render time. Falls back to the primary color.
 */
function resolveCssVar(name: string): string {
  if (typeof window === "undefined") return "#1d4ed8";
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue(name).trim() || styles.getPropertyValue("--primary").trim() || "#1d4ed8";
}

/** Draws the leaflet.heat density layer; it is a Leaflet plugin, not a React layer. */
function HeatLayer({ points }: { points: HeatPoint[] }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    // `heatLayer` is added to L by the leaflet.heat side-effect import.
    const heat = (L as unknown as {
      heatLayer: (pts: HeatPoint[], opts?: Record<string, unknown>) => L.Layer;
    }).heatLayer(points, { radius: 25, blur: 18, maxZoom: 17 });
    heat.addTo(map);
    layerRef.current = heat;
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

export interface CampusMapInnerProps {
  data: MapData;
  /** Accessible label for the map region. */
  ariaLabel?: string;
}

export default function CampusMapInner({ data, ariaLabel }: CampusMapInnerProps) {
  return (
    <MapContainer
      center={data.center}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom={false}
      className="h-full w-full"
      aria-label={ariaLabel ?? "Campus report map"}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <HeatLayer points={data.heatPoints} />

      {data.pins.map((pin) => {
        const color = resolveCssVar(pin.cssVar);
        return (
          <CircleMarker
            key={pin.reportId}
            center={[pin.lat, pin.lng]}
            radius={8}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
          >
            <Tooltip>
              {pin.title} · {pin.tier}
            </Tooltip>
            <Popup>
              <span className="font-medium">{pin.title}</span>
              <br />
              {pin.tier} · {pin.status}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
