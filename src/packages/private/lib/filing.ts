// Filing a direct (private) report — hidden impl.
//
// Filing goes through the store's office-scoped `createPrivateReport`, so the
// report lands on exactly one office's desk and never touches the public
// reports table (it can therefore never appear in the feed, map, Fixed-this-
// week, duplicates, co-signing, or Ari history — all of which read public
// reports only).

import type { Store } from "@/lib/store";
import type { Office, PrivateReport } from "@/types";

/** What a caller supplies to file a private report. */
export interface PrivateFiling {
  campusId: string;
  reporterId: string;
  /** The routed (and possibly student-overridden) office. */
  office: Office;
  title: string;
  body: string;
  /** Student asked to stay anonymous to the office. */
  dontShareName: boolean;
}

/** File the private report to its office. Returns the created row. */
export function createPrivate(
  store: Store,
  filing: PrivateFiling,
): Promise<PrivateReport> {
  return store.createPrivateReport({
    campusId: filing.campusId,
    reporterId: filing.reporterId,
    office: filing.office,
    title: filing.title,
    body: filing.body,
    dontShareName: filing.dontShareName,
  });
}
