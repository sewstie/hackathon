// The UniFix data seam.
//
// Every track reads and writes domain data through ONE interface, `Store`.
// There are two implementations behind it:
//   - InMemoryStore  — deterministic, seeded, used by tests (no cloud).
//   - SupabaseStore   — backed by the shared Supabase project at runtime.
//
// The interface is intentionally small and task-shaped: feature tracks compose
// these primitives rather than reaching into tables directly. Office-scoped
// access control for private reports is enforced here (not only in the UI):
// private reads/writes take the acting user and are denied unless that user's
// office matches the report's current office.

import type {
  AccessLogEntry,
  Building,
  Campus,
  CoSign,
  Notification,
  Office,
  PrivateMessage,
  PrivateReport,
  PrivateStatus,
  QuickFix,
  Report,
  SelfResolution,
  Status,
  User,
} from "@/types";

/** Fields a caller supplies to file a public report; the store fills the rest. */
export type NewReport = Omit<Report, "id" | "status" | "createdAt"> & {
  status?: Status;
};

export type NewPrivateReport = Omit<
  PrivateReport,
  "id" | "currentOffice" | "status" | "createdAt"
> & {
  status?: PrivateStatus;
};

/** Result of an office-scoped private read: denied carries no data. */
export type PrivateAccess<T> =
  | { allowed: true; data: T }
  | { allowed: false; data: null };

export interface Store {
  // --- campuses & buildings ---
  listCampuses(): Promise<Campus[]>;
  getCampus(campusId: string): Promise<Campus | null>;
  listBuildings(campusId: string): Promise<Building[]>;

  // --- users ---
  listUsers(): Promise<User[]>;
  getUser(userId: string): Promise<User | null>;

  // --- public reports ---
  listReports(campusId: string): Promise<Report[]>;
  getReport(reportId: string): Promise<Report | null>;
  createReport(report: NewReport): Promise<Report>;
  updateReportStatus(
    reportId: string,
    status: Status,
    resolutionNote?: string,
  ): Promise<Report>;
  updateReportTier(reportId: string, tier: Report["tier"]): Promise<Report>;
  /** Hard-delete a report and its co-signs. Unknown id is a no-op. */
  deleteReport(reportId: string): Promise<void>;

  // --- co-signs (one per user per report; reporter counts as signed) ---
  listCoSigns(reportId: string): Promise<CoSign[]>;
  countSigners(reportId: string): Promise<number>;
  addCoSign(reportId: string, userId: string): Promise<CoSign | null>;
  /** Toggle a user's co-sign off. No-op when the user has not co-signed. */
  removeCoSign(reportId: string, userId: string): Promise<void>;

  // --- notifications ---
  listNotifications(recipientId: string): Promise<Notification[]>;
  countUnread(recipientId: string): Promise<number>;
  addNotification(recipientId: string, body: string): Promise<Notification>;
  markAllRead(recipientId: string): Promise<void>;

  // --- quick fixes & self-resolutions ---
  listQuickFixes(campusId: string): Promise<QuickFix[]>;
  addQuickFix(fix: Omit<QuickFix, "id">): Promise<QuickFix>;
  addSelfResolution(
    resolution: Omit<SelfResolution, "id" | "createdAt">,
  ): Promise<SelfResolution>;

  // --- private reports (office-scoped access enforced here) ---
  createPrivateReport(report: NewPrivateReport): Promise<PrivateReport>;
  /** Only the current office's staff receive the report; others are denied. */
  getPrivateReport(
    reportId: string,
    actor: User,
  ): Promise<PrivateAccess<PrivateReport>>;
  /** Private reports whose current office matches the actor's office. */
  listPrivateReportsForActor(actor: User): Promise<PrivateReport[]>;
  reassignPrivateReport(
    reportId: string,
    toOffice: Office,
    actor: User,
  ): Promise<PrivateAccess<PrivateReport>>;
  updatePrivateStatus(
    reportId: string,
    status: PrivateStatus,
    actor: User,
    resolutionNote?: string,
  ): Promise<PrivateAccess<PrivateReport>>;
  listPrivateMessages(
    reportId: string,
    actor: User,
  ): Promise<PrivateAccess<PrivateMessage[]>>;
  addPrivateMessage(
    reportId: string,
    body: string,
    actor: User,
  ): Promise<PrivateAccess<PrivateMessage>>;

  // --- access log (append-only audit trail) ---
  listAccessLog(reportId: string): Promise<AccessLogEntry[]>;
  logAccess(entry: Omit<AccessLogEntry, "id" | "createdAt">): Promise<AccessLogEntry>;
}
