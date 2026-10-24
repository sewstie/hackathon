// CampusFix public reporting — the module's PUBLIC INTERFACE.
//
// This is the core student action: type what's wrong -> the app classifies it
// -> the student confirms (and edits) a draft -> a public report is filed.
//
// The module is a thin, deep orchestration over two seams it does NOT own:
//   - the AI classifier (src/modules/ai) turns free text into a Classification;
//   - the Store (src/lib/store) persists the report (and the reporter's co-sign).
// Both seams are injected, so tests run with a MockLanguageModelV4 + the
// in-memory store and never touch the network or the cloud.
//
// Two invariants the tests pin:
//   1. classifyReport never blocks — the ai module already falls back to a pure
//      keyword classifier on any AI problem, and we surface that draft as-is.
//   2. fileReport never lets a photo-upload failure block filing — the report
//      is created first, the photo is attached best-effort, and the caller is
//      told whether the photo made it.
import type { LanguageModel } from "ai";

import { classify } from "@/modules/ai";
import type { Store } from "@/lib/store";
import type { Category, Report, Tier } from "@/types";

import { confirmationFor, teamForCategory } from "./lib/teams";
import { uploadToSupabaseStorage, type PhotoUploader } from "./lib/photo";

/** The editable draft shown on the confirmation card before posting. */
export interface ReportDraft {
  /** The student's original free text, preserved for re-validation. */
  text: string;
  category: Category;
  item: string;
  title: string;
  tier: Tier;
  /** Human-readable location; empty until a follow-up/edit fills it (ticket 04). */
  location: string;
  /** Details the classifier still wants (drives follow-ups in ticket 04). */
  missingDetails: string[];
  /** The classifier flagged the text as naming a person (ticket 06 acts on it). */
  namesPerson: boolean;
  /** True when the keyword fallback produced this draft (AI was unavailable). */
  fromFallback: boolean;
}

export interface ClassifyReportInput {
  /** The student's free text (already length-capped by the UI, max 500). */
  text: string;
}

export interface ClassifyReportOptions {
  /** Inject a model (tests pass a MockLanguageModelV4). Defaults to env model. */
  model?: LanguageModel;
  /** Abort budget for the AI call in ms (forwarded to the classifier). */
  timeoutMs?: number;
}

/**
 * Classify the student's free text into an editable draft. Always resolves —
 * on any AI problem the underlying classifier falls back to keywords, and the
 * resulting draft is returned with `fromFallback: true`.
 */
export async function classifyReport(
  input: ClassifyReportInput,
  opts: ClassifyReportOptions = {},
): Promise<ReportDraft> {
  const c = await classify(
    { text: input.text, mode: "public" },
    { model: opts.model, timeoutMs: opts.timeoutMs },
  );
  return {
    text: input.text,
    category: c.category,
    item: c.item,
    title: c.title,
    tier: c.tier,
    location: "",
    missingDetails: c.missingDetails,
    namesPerson: c.namesPerson,
    fromFallback: c.source === "fallback",
  };
}

export interface FileReportOptions {
  /** The data seam to persist through. */
  store: Store;
  /** The acting student (reporter). They count as the first signer. */
  reporterId: string;
  /** The campus the report belongs to. */
  campusId: string;
  /** Optional building id resolved from the chosen location (ticket 04). */
  buildingId?: string;
  /** Report was filed with details still missing after the 3-question cap. */
  incomplete?: boolean;
  /** "Use my location" put the device > 500 m from the chosen building. */
  locationUnverified?: boolean;
  /** An optional photo to attach; upload is best-effort and never blocks. */
  photo?: Blob;
  /** Inject the uploader (tests pass a stub). Defaults to Supabase Storage. */
  uploadPhoto?: PhotoUploader;
}

/** What the caller gets back after a report is filed. */
export interface FileReportResult {
  /** The persisted report (read back through the same store). */
  report: Report;
  /** The exact confirmation line, e.g. "Sent to Dining. We'll let you know…". */
  confirmation: string;
  /** True when a photo was supplied AND successfully attached. */
  photoAttached: boolean;
  /** True when a photo was supplied but the upload failed (filed without it). */
  photoError: boolean;
}

/**
 * File the (possibly edited) draft as a public report. A photo, if supplied, is
 * uploaded best-effort FIRST so its URL can be persisted with the report in a
 * single `createReport` call — but a storage failure can never block filing:
 * on failure the report is created without a photo and `photoError` is set so
 * the UI can tell the student the photo didn't attach.
 */
export async function fileReport(
  draft: ReportDraft,
  opts: FileReportOptions,
): Promise<FileReportResult> {
  let photoUrl: string | undefined;
  let photoError = false;

  if (opts.photo) {
    const upload = opts.uploadPhoto ?? uploadToSupabaseStorage;
    try {
      // Key is campus-scoped and collision-tolerant (timestamp + reporter).
      const key = `${opts.campusId}/${opts.reporterId}-${Date.now()}`;
      photoUrl = await upload(opts.photo, key);
    } catch {
      // Storage down / unconfigured: carry on and file without a photo.
      photoError = true;
    }
  }

  const report = await opts.store.createReport({
    campusId: opts.campusId,
    buildingId: opts.buildingId,
    reporterId: opts.reporterId,
    category: draft.category,
    item: draft.item,
    title: draft.title,
    tier: draft.tier,
    location: draft.location,
    incomplete: opts.incomplete ?? false,
    locationUnverified: opts.locationUnverified ?? false,
    photoUrl,
  });

  return {
    report,
    confirmation: confirmationFor(draft.category),
    photoAttached: Boolean(photoUrl),
    photoError,
  };
}

/** Re-export the team lookup so the confirm card can name the destination. */
export { teamForCategory };

// --- ticket 04: smart follow-ups -------------------------------------------
//
// The follow-up flow is a thin, deep orchestration over the seeded campus data
// (chips) and the device's geolocation (trust check). The UI consumes these two
// calls; the rules (location-first, 3-question cap, seed-sourced chips, 500 m
// radius) live in ./lib/followups and are proven through this interface.
import {
  checkDeviceLocation,
  planFollowUps,
  requiredDetailsFor,
  type FollowUpContext,
  type FollowUpPlan,
  type FollowUpQuestion,
  type GeoCoords,
  type LocationCheck,
  type VerifyContext,
} from "./lib/followups";

export type {
  FollowUpPlan,
  FollowUpQuestion,
  GeoCoords,
  LocationCheck,
};

/**
 * Build the follow-up plan for a draft: only the details still missing, asked
 * one at a time with location first, capped at three. Chips are drawn from the
 * campus's seeded buildings / floors / dining halls / items; an unseeded campus
 * yields free-text. If missing details remain after the cap the plan is marked
 * `incomplete` so the report can still be filed and flagged.
 */
export function buildFollowUpPlan(
  draft: ReportDraft,
  ctx: FollowUpContext,
): Promise<FollowUpPlan> {
  return planFollowUps(draft, ctx);
}

/**
 * Verify a device's coordinates against the chosen building's seeded location.
 * More than 500 m away sets `locationUnverified` so staff can weigh the report.
 */
export function verifyDeviceLocation(
  ctx: VerifyContext,
  coords: GeoCoords,
): Promise<LocationCheck> {
  return checkDeviceLocation(ctx, coords);
}

/** The ordered required details for a category (location first). */
export { requiredDetailsFor };

// --- ticket 06: names-a-person block (public path) -------------------------
//
// A PUBLIC report must never name a specific person (constraint 2). The guard
// is exposed here so the public report screen can gate filing on it; nothing is
// ever persisted when blocked. The private path deliberately does NOT call this
// (it is allowed to name people), so the block applies only to the public path.
import {
  evaluateNamesPerson,
  NAMES_PERSON_BLOCK_MESSAGE,
} from "./lib/names-person";

/** The result of the public names-a-person check. */
export interface NamesPersonCheck {
  /** True when the public submission must be blocked (nothing persisted). */
  blocked: boolean;
  /** The exact block copy to show (Rephrase / Send privately offered by UI). */
  message: string;
}

/**
 * Decide whether a PUBLIC submission is blocked for naming a person. Reads the
 * classifier's `namesPerson` flag off the draft and OR-s in a pure keyword
 * fallback (honorifics like "Professor Smith", relationship/accusation
 * phrases), so the guard holds even when the AI is off. Call this on the public
 * path BEFORE filing; when `blocked` is true, persist nothing and offer the
 * student Rephrase or Send privately.
 */
export function checkNamesPerson(draft: ReportDraft): NamesPersonCheck {
  return evaluateNamesPerson(draft.text, draft.namesPerson);
}

/** Re-export the exact block copy for any non-draft caller (e.g. UI tests). */
export { NAMES_PERSON_BLOCK_MESSAGE };
