"use client";

// A small client-only error boundary for the campus map. A Leaflet render can
// throw at runtime (bad coordinate, a plugin touching the DOM before it is
// ready). Without a boundary, that error bubbles to the route's error UI and
// blanks the whole feed. This boundary catches it and renders a quiet,
// accessible fallback in the map's place so the rest of the page survives.

import * as React from "react";

interface MapErrorBoundaryProps {
  children: React.ReactNode;
  /** Shown in place of the map when a render error is caught. */
  fallback?: React.ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

export class MapErrorBoundary extends React.Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // Surface it for debugging without crashing the page.
    console.error("Campus map failed to render:", error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="status"
            className="flex h-full w-full items-center justify-center bg-muted px-4 text-center text-sm text-muted-foreground"
          >
            The map couldn&apos;t be displayed. The rest of the page still works.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
