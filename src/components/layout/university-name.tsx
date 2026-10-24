"use client";

import * as React from "react";

/**
 * The header's university-name slot: the product name and the active campus as
 * their own element, visually divided from the logo so it reads "UniFix | MIT".
 * Fills the stable slot the SHARED prefactor opened in `header.tsx`; the campus
 * name is passed in by the header (which reads it from the store).
 */
export function UniversityName({ campusName }: { campusName: string }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      {/* The logo already reads "UniFix"; the name stays for screen readers. */}
      <span className="sr-only">UniFix</span>
      {campusName ? (
        <>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{campusName}</span>
        </>
      ) : null}
    </span>
  );
}
