// campuses/map — the campus-map data seam.
//
// A second entry point of the campuses package (alongside index.ts), exposing
// the pure pin/heat transform the campus home map renders. Keeping the shaping
// here — not in the client component — means the Leaflet render stays a thin
// view over tested data, and private reports stay off the map by construction
// (callers pass public reports only).

export {
  buildMapData,
  clusterPins,
  TIER_PIN_CSS_VAR,
  HEAT_WINDOW_DAYS,
  CLUSTER_PRECISION,
  type MapData,
  type MapDataInput,
  type MapPin,
  type MapCluster,
  type ClusterOptions,
  type HeatPoint,
} from "./lib/map-data";
