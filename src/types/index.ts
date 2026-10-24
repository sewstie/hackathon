// UniFix shared domain vocabulary.
//
// This is the single source of truth for the types every track consumes.
// Enums are modeled as string-literal union types plus a frozen value list,
// so they stay simple to serialize (Supabase rows, JSON) while giving the
// compiler exhaustive checks.

/** Severity tiers, lowest to highest. */
export const TIERS = ["Low", "Medium", "High", "Urgent"] as const;
export type Tier = (typeof TIERS)[number];

/** Public report categories (City is an off-campus hand-off, never persisted). */
export const CATEGORIES = [
  "Facilities",
  "Dining",
  "Housing",
  "IT",
  "Grounds",
  "Safety",
  "City",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Public report lifecycle statuses. */
export const STATUSES = [
  "Received",
  "Assigned",
  "In progress",
  "Fixed",
  "Won't fix",
] as const;
export type Status = (typeof STATUSES)[number];

/** Private (direct) report lifecycle statuses. */
export const PRIVATE_STATUSES = [
  "Received",
  "Reviewing",
  "Resolved",
  "Referred",
] as const;
export type PrivateStatus = (typeof PRIVATE_STATUSES)[number];

/** Offices that can receive a direct (private) report. */
export const OFFICES = [
  "Facilities",
  "Housing",
  "Dean of Students",
  "Title IX",
  "Campus Police",
  "Accessibility Services",
  "IT Security",
] as const;
export type Office = (typeof OFFICES)[number];

/** Public staff teams (the queue a public report lands in). */
export const PUBLIC_TEAMS = [
  "Facilities",
  "Dining",
  "Housing",
  "IT",
  "Grounds",
  "Safety",
] as const;
export type PublicTeam = (typeof PUBLIC_TEAMS)[number];

/** A demo user role. Real school-email auth resolves to the same shape later. */
export type Role = "student" | "responder";

export interface User {
  id: string;
  name: string;
  email: string; // @mit.edu on the demo campus
  role: Role;
  publicTeam?: PublicTeam; // responders on a public team
  privateOffice?: Office; // responders who hold an office
}

export interface Campus {
  id: string;
  name: string;
  city: string;
  state: string;
  /** Map centering. */
  latitude: number;
  longitude: number;
  /** Off-campus city hand-off config (e.g. Cambridge SeeClickFix). */
  cityServiceName: string;
  cityServiceUrl: string;
  cityServicePhone: string;
  /** Campus safety + wellbeing contacts. */
  campusPoliceName: string;
  campusPolicePhone: string;
  counselingName: string;
  counselingUrl: string;
}

export interface Building {
  id: string;
  campusId: string;
  name: string;
  latitude: number;
  longitude: number;
  floors: string[];
  /** Dining halls / servery names available in this building, if any. */
  diningHalls: string[];
}

/** A public report. Reporter identity is visible to staff only. */
export interface Report {
  id: string;
  campusId: string;
  buildingId?: string;
  reporterId: string;
  category: Category;
  item: string;
  title: string;
  tier: Tier;
  status: Status;
  /** Human-readable location (building + floor/room), chip- or free-text-sourced. */
  location: string;
  /** Missing details remained after the 3-question cap. */
  incomplete: boolean;
  /** "Use my location" put the device > 500 m from the chosen building. */
  locationUnverified: boolean;
  photoUrl?: string;
  /** Reason required when status is "Won't fix". */
  resolutionNote?: string;
  createdAt: string; // ISO-8601
}

/** One co-sign per user per report. The reporter counts as signed. */
export interface CoSign {
  id: string;
  reportId: string;
  userId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  body: string;
  read: boolean;
  createdAt: string;
  /** In-app page to open when the notification is clicked (e.g. the report's chat). */
  link?: string;
}

/** A direct (private) report, scoped to exactly one office. */
export interface PrivateReport {
  id: string;
  campusId: string;
  reporterId: string;
  /** The office this report was first routed to. */
  office: Office;
  /** The office that currently holds access (changes on reassign). */
  currentOffice: Office;
  title: string;
  body: string;
  status: PrivateStatus;
  /** Student asked to stay anonymous to the office. */
  dontShareName: boolean;
  /** Note required when status is "Referred". */
  resolutionNote?: string;
  createdAt: string;
}

export type MessageAuthorRole = "student" | "office";

export interface PrivateMessage {
  id: string;
  reportId: string;
  authorRole: MessageAuthorRole;
  authorId: string;
  body: string;
  createdAt: string;
}

/**
 * A comment on a PUBLIC report.
 *  - "public": everyone on the campus page sees it (students and staff).
 *  - "direct": a staff ↔ reporter conversation (e.g. a clarifying question);
 *    only the reporter and staff can read it.
 */
export type CommentVisibility = "public" | "direct";

export interface ReportComment {
  id: string;
  reportId: string;
  authorId: string;
  authorRole: "student" | "staff";
  visibility: CommentVisibility;
  body: string;
  createdAt: string;
}

export type AccessAction = "view" | "reassign" | "status-change";

/** Append-only audit trail entry for private reports and 911 taps. */
export interface AccessLogEntry {
  id: string;
  actorId: string;
  actorOffice?: Office;
  action: AccessAction | "call-911" | "call-campus-police";
  reportId: string;
  createdAt: string;
}

/** A curated (seeded or staff-promoted) self-serve fix. Never AI-generated. */
export interface QuickFix {
  id: string;
  campusId: string;
  category: Category;
  item?: string;
  text: string;
}

/** Logged when a student taps "That fixed it" — no report is filed. */
export interface SelfResolution {
  id: string;
  campusId: string;
  userId: string;
  category: Category;
  item?: string;
  createdAt: string;
}
