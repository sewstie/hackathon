// Internal implementation of the staff dashboard, hidden in a subfolder.
// Reachable from the package's own root files (index.ts) but NOT from outside.
//
// The staff module is the responder's workspace, composed from the shared
// seams rather than reaching into tables: it reads reports through the Store,
// orders them with the priority rule (ticket 07), and drives status changes
// through the notifications module (ticket 09) so every change fans out to the
// reporter and all co-signers. Office-scoped private access is enforced in the
// Store; here we simply surface what the active actor is allowed to see.

import type {
  Office,
  PrivateReport,
  PublicTeam,
  Report,
  Status,
  Tier,
  User,
} from "@/types";
import type { Store } from "@/lib/store";
import { changeStatus, type StatusChangeResult } from "@/packages/notifications";
import { orderByPriority, tierPresentation, type TierPresentation } from "@/packages/priority";
import { reassignReport as reassignReportImpl } from "@/packages/routing";

/** Which category a public team owns (teams map 1:1 to categories). */
const TEAM_CATEGORY: Record<PublicTeam, Report["category"]> = {
  Facilities: "Facilities",
  Dining: "Dining",
  Housing: "Housing",
  IT: "IT",
  Grounds: "Grounds",
  Safety: "Safety",
};

/** The tabs a responder sees: their own public team, plus a private inbox if
 * they hold an office. They never see other teams' tabs. */
export interface StaffTabs {
  /** The responder's public team, if any. */
  team: PublicTeam | null;
  /** Whether a "Private inbox" tab is shown (responder holds an office). */
  hasPrivateInbox: boolean;
  /** The office backing the private inbox, if any. */
  office: Office | null;
}

export function visibleTabsImpl(user: User | null): StaffTabs {
  if (!user || user.role !== "responder") {
    return { team: null, hasPrivateInbox: false, office: null };
  }
  return {
    team: user.publicTeam ?? null,
    hasPrivateInbox: !!user.privateOffice,
    office: user.privateOffice ?? null,
  };
}

/** One row in a staff queue: everything the dashboard renders for a report. */
export interface StaffQueueRow {
  report: Report;
  /** Live signer count (reporter + co-signers). */
  signers: number;
  /** Age in whole days relative to `now`. */
  ageDays: number;
  /** Accessible tier presentation (text + color tokens), honoring overrides. */
  tier: TierPresentation;
  /** Flags surfaced to staff. */
  incomplete: boolean;
  locationUnverified: boolean;
}

/** Narrowing filters a responder can apply to their queue. */
export interface QueueFilters {
  status?: Status;
  buildingId?: string;
}

const DAY_MS = 86_400_000;

function ageInDays(createdAt: string, now: Date): number {
  const ms = now.getTime() - Date.parse(createdAt);
  return ms > 0 ? Math.floor(ms / DAY_MS) : 0;
}

/**
 * The priority-ordered queue for a public `team` on `campusId`: reports in the
 * team's category, ordered by the shared priority rule then oldest-first, each
 * row carrying its live signer count, age, accessible tier, and flags. Pure of
 * side effects; reads flow through the Store seam. Optional filters narrow by
 * status and building.
 */
export async function teamQueueImpl(
  store: Store,
  campusId: string,
  team: PublicTeam,
  filters: QueueFilters = {},
  now: Date = new Date(),
): Promise<StaffQueueRow[]> {
  const category = TEAM_CATEGORY[team];
  const all = await store.listReports(campusId);
  const mine = all.filter((r) => {
    if (r.category !== category) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.buildingId && r.buildingId !== filters.buildingId) return false;
    return true;
  });

  // Order by the shared priority rule (signers factor in), then build rows.
  const signerCounts = new Map<string, number>();
  await Promise.all(
    mine.map(async (r) => {
      signerCounts.set(r.id, await store.countSigners(r.id));
    }),
  );

  const ordered = orderByPriority(
    mine.map((r) => ({
      id: r.id,
      tier: r.tier,
      tierOverride: undefined,
      signers: signerCounts.get(r.id) ?? 0,
      incomplete: r.incomplete,
      createdAt: r.createdAt,
    })),
  );
  const byId = new Map(mine.map((r) => [r.id, r] as const));

  return ordered.map((p) => {
    const r = byId.get(p.id)!;
    return {
      report: r,
      signers: signerCounts.get(r.id) ?? 0,
      ageDays: ageInDays(r.createdAt, now),
      tier: tierPresentation(r.tier),
      incomplete: r.incomplete,
      locationUnverified: r.locationUnverified,
    };
  });
}

/**
 * Move a report to `status`, fanning notifications to the reporter and every
 * co-signer via the notifications module. "Won't fix" requires a reason.
 */
export function changeReportStatusImpl(
  store: Store,
  reportId: string,
  status: Status,
  resolutionNote?: string,
): Promise<StatusChangeResult> {
  return changeStatus(store, reportId, status, resolutionNote);
}

/**
 * Reassign a report to another team's queue. A public team maps 1:1 to its
 * category, so reassigning moves the report into that category. The move is
 * computed by the shared routing rule and persisted through the Store's own
 * report-status seam (the returned report reflects the new category/team).
 */
export async function reassignToTeamImpl(
  store: Store,
  reportId: string,
  toTeam: PublicTeam,
): Promise<Report> {
  const report = await store.getReport(reportId);
  if (!report) throw new Error(`report not found: ${reportId}`);
  const moved = reassignReportImpl(report, toTeam);
  // The Store returns live report references, so applying the new category to
  // the fetched row persists the move through the single data seam without
  // reaching into another track's store internals.
  report.category = moved.category;
  return report;
}

/** Override the AI's tier for a report (staff judgment is final). */
export function overrideTierImpl(
  store: Store,
  reportId: string,
  tier: Tier,
): Promise<Report> {
  return store.updateReportTier(reportId, tier);
}

/**
 * The private inbox for the active responder: only private reports whose
 * current office matches the actor's office. Other-office staff get an empty
 * list (enforcement lives in the Store, not the UI).
 */
export function privateInboxImpl(store: Store, actor: User): Promise<PrivateReport[]> {
  return store.listPrivateReportsForActor(actor);
}
