"use client";

// The actual Leaflet render. Imported ONLY via next/dynamic with { ssr: false }
// (see campus-map.tsx), because Leaflet touches `window` at module load and the
// App Router would otherwise throw "window is not defined" during SSR.
//
// The map draws three layers over OpenStreetMap tiles:
//   1. a softened density heat layer, sitting quietly in the background;
//   2. severity-aware CLUSTERS — numbered bubbles colored by their worst member,
//      which zoom-expand on click so dense areas stay readable;
//   3. a tier color legend so the colors are interpretable without guessing.
// All grouping is precomputed by the pure `clusterPins` transform; this file is
// a thin view over tested data.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import {
  LeafletContext,
  createLeafletContext,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import Link from "next/link";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import { TIER_PIN_CSS_VAR } from "@/packages/campuses/map";
import type { HeatPoint, MapCluster, MapData, MapPin } from "@/packages/campuses/map";
import { TIERS, type Tier } from "@/types";

/** A sensible campus-scale zoom for OpenStreetMap tiles. */
const DEFAULT_ZOOM = 15;
/** How far to zoom in when a multi-report cluster is clicked (expand). */
const EXPAND_ZOOM = 18;

/**
 * Resolve a CSS custom property (e.g. "--tier-high-fg") to its computed color.
 * Markers carry only the variable NAME (no hex in source); we read the themed
 * value from the document at render time. Falls back to the primary color.
 */
function resolveCssVar(name: string): string {
  if (typeof window === "undefined") return "#1d4ed8";
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue(name).trim() || styles.getPropertyValue("--primary").trim() || "#1d4ed8";
}

/**
 * StrictMode-safe replacement for react-leaflet's <MapContainer>.
 *
 * react-leaflet v5 creates the map in a ref callback but destroys it in an
 * effect cleanup. Under React 19 StrictMode (on in Next dev) effects run
 * mount → cleanup → mount, so the map is removed while the same dead instance
 * stays in context, and child layers crash with "this.getPane() is undefined".
 * Here the map's whole lifecycle lives in one effect, so every mount gets a
 * fresh, live map.
 */
function SafeMapContainer({
  center,
  zoom,
  scrollWheelZoom,
  className,
  ariaLabel,
  children,
}: {
  center: [number, number];
  zoom: number;
  scrollWheelZoom: boolean;
  className?: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const map = L.map(node, {
      scrollWheelZoom,
      dragging: true, // click-and-drag to move around
      keyboard: true, // arrow keys pan once the map has focus
      inertia: true,
    }).setView(center, zoom);
    setContext(createLeafletContext(map));
    return () => {
      setContext(null);
      map.remove();
    };
    // Create once per mount; like MapContainer, later prop changes aren't re-applied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={nodeRef} className={className} role="region" aria-label={ariaLabel}>
      {context ? <LeafletContext value={context}>{children}</LeafletContext> : null}
    </div>
  );
}

/**
 * Mouse wheel / two-finger trackpad scroll MOVES the map (up, down, left,
 * right) instead of scrolling the page while the pointer is over it. Pinch
 * (ctrl + wheel on trackpads) zooms. Click-and-drag and the +/− buttons work
 * too.
 */
function WheelPan() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        // Pinch-to-zoom on a trackpad arrives as ctrl + wheel.
        const delta = e.deltaY < 0 ? 1 : -1;
        map.setZoomAround(map.mouseEventToContainerPoint(e as unknown as MouseEvent), map.getZoom() + delta * 0.5);
        return;
      }
      // Shift + wheel on a plain mouse scrolls sideways.
      const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY;
      map.panBy([dx, dy], { animate: false });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [map]);
  return null;
}

/** Draws the leaflet.heat density layer, softened to a quiet background signal. */
function HeatLayer({ points }: { points: HeatPoint[] }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    // Guard: nothing to draw, and leaflet.heat dislikes an empty array.
    if (points.length === 0) return;
    const heat = (L as unknown as {
      heatLayer: (pts: HeatPoint[], opts?: Record<string, unknown>) => L.Layer;
    }).heatLayer(points, {
      // Softened: smaller radius, more blur, capped opacity so clusters lead.
      radius: 18,
      blur: 24,
      maxZoom: 17,
      minOpacity: 0.15,
      max: 3,
    });
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

/** A single cluster marker: a tier-colored bubble showing its report count.
 * Click it to see every report inside, each linking to its detail page. */
function ClusterMarker({ cluster, pins }: { cluster: MapCluster; pins: Map<string, MapPin> }) {
  const map = useMap();
  const color = resolveCssVar(cluster.cssVar);
  const size = cluster.count > 1 ? 34 : 22;
  const members = cluster.reportIds
    .map((id) => pins.get(id))
    .filter((p): p is MapPin => !!p)
    .sort((a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier));

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "", // avoid Leaflet's default white box
        html: `<div style="
            display:flex;align-items:center;justify-content:center;
            width:${size}px;height:${size}px;border-radius:9999px;
            background:${color};color:#fff;font-weight:600;font-size:12px;
            border:2px solid rgba(255,255,255,0.9);
            box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer;
          ">${cluster.count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    [color, size, cluster.count],
  );

  return (
    <Marker position={[cluster.lat, cluster.lng]} icon={icon}>
      <Tooltip>
        {cluster.count === 1
          ? `1 report · ${cluster.tier} · click to see it`
          : `${cluster.count} reports · up to ${cluster.tier} · click to see them`}
      </Tooltip>
      <Popup minWidth={240} maxWidth={320}>
        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm font-semibold">
            {cluster.count === 1 ? "1 report here" : `${cluster.count} reports here`}
          </p>
          <ul className="m-0 flex max-h-56 list-none flex-col gap-1 overflow-y-auto p-0">
            {members.map((pin) => (
              <li key={pin.reportId}>
                <Link
                  href={{ pathname: "/report-detail", query: { id: pin.reportId } }}
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-foreground no-underline hover:bg-muted"
                >
                  <span
                    aria-hidden
                    className="mt-1 inline-block size-2.5 shrink-0 rounded-full"
                    style={{ background: `var(${pin.cssVar})` }}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[13px] font-medium leading-snug">{pin.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {pin.tier} · {pin.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {cluster.count > 1 ? (
            <button
              type="button"
              onClick={() => map.flyTo([cluster.lat, cluster.lng], EXPAND_ZOOM, { duration: 0.5 })}
              className="self-start rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
            >
              Zoom in here
            </button>
          ) : null}
        </div>
      </Popup>
    </Marker>
  );
}

/** The tier color legend, positioned over the map's bottom-right corner. */
function TierLegend() {
  return (
    <div
      className="absolute bottom-2 right-2 z-[1000] flex flex-col gap-1 rounded-(--radius) border border-border bg-background/90 p-2 text-xs shadow-sm backdrop-blur"
      aria-label="Severity legend"
    >
      <span className="font-medium text-foreground">Severity</span>
      <ul className="flex flex-col gap-1">
        {(TIERS as readonly Tier[]).map((tier) => (
          <li key={tier} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-full border border-white/80"
              style={{ background: `var(${TIER_PIN_CSS_VAR[tier]})` }}
            />
            <span className="text-muted-foreground">{tier}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface CampusMapInnerProps {
  data: MapData;
  /** Accessible label for the map region. */
  ariaLabel?: string;
}

export default function CampusMapInner({ data, ariaLabel }: CampusMapInnerProps) {
  // Guard against a missing/invalid center so Leaflet never throws on bad input.
  const [centerLat, centerLng] = data.center;
  const center: [number, number] =
    Number.isFinite(centerLat) && Number.isFinite(centerLng)
      ? [centerLat, centerLng]
      : [42.3601, -71.0942]; // MIT fallback

  // Only draw clusters with finite coordinates (one bad data point can't blank it).
  const clusters = data.clusters.filter(
    (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng),
  );
  const pinsById = new Map(data.pins.map((p) => [p.reportId, p]));
  const heatPoints = data.heatPoints.filter(
    (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );

  return (
    <div className="relative h-full w-full">
      <SafeMapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        className="h-full w-full"
        ariaLabel={ariaLabel ?? "Campus report map"}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <HeatLayer points={heatPoints} />
        <WheelPan />

        {clusters.map((cluster) => (
          <ClusterMarker key={cluster.id} cluster={cluster} pins={pinsById} />
        ))}
      </SafeMapContainer>

      <TierLegend />
      <p className="pointer-events-none absolute bottom-2 left-2 z-[1000] max-w-[60%] rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
        Drag or scroll to move · pinch or +/− to zoom · click a bubble to see its reports
      </p>
    </div>
  );
}
