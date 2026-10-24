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
      <span className="font-semibold text-foreground">UniFix</span>
      {campusName ? (
        <>
          <span aria-hidden="true" className="text-border">
            |
          </span>
          <span className="font-normal text-muted-foreground">{campusName}</span>
        </>
      ) : null}
    </span>
  );
}
