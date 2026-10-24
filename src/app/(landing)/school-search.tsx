"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { searchCampuses, type CampusSummary } from "@/packages/campuses";
import { Input } from "@/components/ui";

/**
 * Search Massachusetts institutions and open any one of them. Selecting a school
 * navigates to its campus home (`/campus/[campusId]`): MIT opens the richly
 * seeded demo; every other school opens empty-but-usable.
 */
export function SchoolSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const results = useMemo<CampusSummary[]>(
    () => (query.trim().length > 0 ? searchCampuses(query).slice(0, 8) : []),
    [query],
  );

  function open(campus: CampusSummary) {
    router.push(`/campus/${campus.id}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="school-search" className="text-sm font-medium">
        Find your campus
      </label>
      <Input
        id="school-search"
        type="search"
        autoComplete="off"
        placeholder="Search Massachusetts colleges and universities…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-describedby="school-search-hint"
        className="h-14 rounded-full px-6 text-base shadow-[var(--shadow-sm)]"
      />
      <p id="school-search-hint" className="text-xs text-muted-foreground">
        Try &ldquo;MIT&rdquo;, &ldquo;Harvard&rdquo;, or a city like
        &ldquo;Worcester&rdquo;. Every Massachusetts campus opens — MIT is the
        seeded demo.
      </p>

      {query.trim().length > 0 && (
        <ul
          className="cx-pop flex flex-col gap-1 rounded-3xl border border-border bg-card p-2 shadow-[var(--shadow-md)]"
          aria-label="Search results"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No Massachusetts schools match &ldquo;{query}&rdquo;.
            </li>
          ) : (
            results.map((campus) => (
              <li key={campus.id}>
                <button
                  type="button"
                  onClick={() => open(campus)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{campus.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {campus.city}, {campus.state}
                    </span>
                  </span>
                  {campus.seeded && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Demo campus
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
