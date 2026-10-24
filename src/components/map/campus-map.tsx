"use client";

// Client-only entry for the campus map. The real Leaflet render lives in
// campus-map-inner.tsx and is loaded via next/dynamic with { ssr: false }, so
// Leaflet's `window` access never runs during App Router server rendering.

import dynamic from "next/dynamic";
import type { MapData } from "@/packages/campuses/map";
import { MapErrorBoundary } from "./map-error-boundary";

const CampusMapInner = dynamic(() => import("./campus-map-inner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground"
      role="status"
    >
      Loading map…
    </div>
  ),
});

export interface CampusMapProps {
  data: MapData;
  ariaLabel?: string;
}

/** Renders the campus report map (clusters + legend + heat layer) client-side only. */
export function CampusMap({ data, ariaLabel }: CampusMapProps) {
  return (
    <div className="h-80 w-full overflow-hidden rounded-[--radius] border border-border">
      <MapErrorBoundary>
        <CampusMapInner data={data} ariaLabel={ariaLabel} />
      </MapErrorBoundary>
    </div>
  );
}
