"use client";

import * as React from "react";
import type { Campus } from "@/types";
import { cityHandoff } from "@/packages/routing";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export interface CityHandoffCardProps {
  /** The active campus, whose config drives every value shown here. */
  campus: Campus;
}

/**
 * The city hand-off card shown when a report turns out to be an off-campus
 * public issue (pothole, public streetlight, sidewalk). Nothing is posted to
 * UniFix; the student is pointed at the campus's configured city service
 * (for MIT: Cambridge SeeClickFix) with a copy-text button, a phone number,
 * and a link. All copy comes from campus config, so a different campus shows a
 * different service.
 */
export function CityHandoffCard({ campus }: CityHandoffCardProps) {
  const card = cityHandoff(campus);
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(card.copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; the text + link are still shown below.
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>This looks like a city issue</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">{card.message}</p>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Service</dt>
          <dd>{card.serviceName}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>
            <a className="underline" href={`tel:${card.phone}`}>
              {card.phone}
            </a>
          </dd>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleCopy}
            aria-label={`Copy ${card.serviceName} details`}
          >
            {copied ? "Copied" : "Copy details"}
          </Button>
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center rounded-[--radius] px-4 text-sm font-medium underline"
          >
            Open {card.serviceName} →
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          Nothing was posted to UniFix — city issues go to {card.serviceName}.
        </p>
      </CardContent>
    </Card>
  );
}
