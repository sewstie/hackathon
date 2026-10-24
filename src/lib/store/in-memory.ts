// Deterministic in-memory Store — the test and offline-demo implementation.
//
// It holds a fresh seed snapshot and mutates it in place. Office-scoped access
// control for private reports lives HERE, so tests prove the guarantee at the
// data seam rather than trusting the UI. IDs are generated from a monotonic
// counter so a given sequence of calls is reproducible.

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
import { buildSeed, type Seed } from "./seed";
import type {
  NewPrivateReport,
  NewReport,
  PrivateAccess,
  Store,
} from "./types";

const DENIED = { allowed: false, data: null } as const;

export class InMemoryStore implements Store {
  private db: Seed;
  private counter = 0;

  constructor(seed: Seed = buildSeed()) {
    this.db = seed;
  }

  private id(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  private now(): string {
    // Monotonic deterministic timestamps keyed off the counter.
    return new Date(Date.parse("2026-10-24T12:00:00.000Z") + this.counter * 1000).toISOString();
  }

  // --- campuses & buildings ---
  async listCampuses(): Promise<Campus[]> {
    return [...this.db.campuses];
  }
  async getCampus(campusId: string): Promise<Campus | null> {
    return this.db.campuses.find((c) => c.id === campusId) ?? null;
  }
  async listBuildings(campusId: string): Promise<Building[]> {
    return this.db.buildings.filter((b) => b.campusId === campusId);
  }

  // --- users ---
  async listUsers(): Promise<User[]> {
    return [...this.db.users];
  }
  async getUser(userId: string): Promise<User | null> {
    return this.db.users.find((u) => u.id === userId) ?? null;
  }

  // --- public reports ---
  async listReports(campusId: string): Promise<Report[]> {
    return this.db.reports.filter((r) => r.campusId === campusId);
  }
  async getReport(reportId: string): Promise<Report | null> {
    return this.db.reports.find((r) => r.id === reportId) ?? null;
  }
  async createReport(report: NewReport): Promise<Report> {
    const created: Report = {
      ...report,
      id: this.id("rep"),
      status: report.status ?? "Received",
      createdAt: this.now(),
    };
    this.db.reports.push(created);
    // Reporter counts as signed.
    this.db.coSigns.push({
      id: this.id("cosign"),
      reportId: created.id,
      userId: created.reporterId,
      createdAt: this.now(),
    });
    return created;
  }
  async updateReportStatus(
    reportId: string,
    status: Status,
    resolutionNote?: string,
  ): Promise<Report> {
    const r = this.mustReport(reportId);
    r.status = status;
    if (resolutionNote !== undefined) r.resolutionNote = resolutionNote;
    return r;
  }
  async updateReportTier(reportId: string, tier: Report["tier"]): Promise<Report> {
    const r = this.mustReport(reportId);
    r.tier = tier;
    return r;
  }
  private mustReport(reportId: string): Report {
    const r = this.db.reports.find((x) => x.id === reportId);
    if (!r) throw new Error(`report not found: ${reportId}`);
    return r;
  }

  // --- co-signs ---
  async listCoSigns(reportId: string): Promise<CoSign[]> {
    return this.db.coSigns.filter((c) => c.reportId === reportId);
  }
  async countSigners(reportId: string): Promise<number> {
    return this.db.coSigns.filter((c) => c.reportId === reportId).length;
  }
  async addCoSign(reportId: string, userId: string): Promise<CoSign | null> {
    const exists = this.db.coSigns.some(
      (c) => c.reportId === reportId && c.userId === userId,
    );
    if (exists) return null; // one co-sign per user per report
    const coSign: CoSign = {
      id: this.id("cosign"),
      reportId,
      userId,
      createdAt: this.now(),
    };
    this.db.coSigns.push(coSign);
    return coSign;
  }

  // --- notifications ---
  async listNotifications(recipientId: string): Promise<Notification[]> {
    return this.db.notifications.filter((n) => n.recipientId === recipientId);
  }
  async countUnread(recipientId: string): Promise<number> {
    return this.db.notifications.filter(
      (n) => n.recipientId === recipientId && !n.read,
    ).length;
  }
  async addNotification(recipientId: string, body: string): Promise<Notification> {
    const n: Notification = {
      id: this.id("notif"),
      recipientId,
      body,
      read: false,
      createdAt: this.now(),
    };
    this.db.notifications.push(n);
    return n;
  }
  async markAllRead(recipientId: string): Promise<void> {
    for (const n of this.db.notifications) {
      if (n.recipientId === recipientId) n.read = true;
    }
  }

  // --- quick fixes & self-resolutions ---
  async listQuickFixes(campusId: string): Promise<QuickFix[]> {
    return this.db.quickFixes.filter((q) => q.campusId === campusId);
  }
  async addQuickFix(fix: Omit<QuickFix, "id">): Promise<QuickFix> {
    const q: QuickFix = { ...fix, id: this.id("qf") };
    this.db.quickFixes.push(q);
    return q;
  }
  async addSelfResolution(
    resolution: Omit<SelfResolution, "id" | "createdAt">,
  ): Promise<SelfResolution> {
    const s: SelfResolution = {
      ...resolution,
      id: this.id("selfres"),
      createdAt: this.now(),
    };
    this.db.selfResolutions.push(s);
    return s;
  }

  // --- private reports (office-scoped access) ---
  async createPrivateReport(report: NewPrivateReport): Promise<PrivateReport> {
    const created: PrivateReport = {
      ...report,
      id: this.id("priv"),
      currentOffice: report.office,
      status: report.status ?? "Received",
      createdAt: this.now(),
    };
    this.db.privateReports.push(created);
    return created;
  }

  private canAccess(report: PrivateReport, actor: User): boolean {
    return actor.role === "responder" && actor.privateOffice === report.currentOffice;
  }

  async getPrivateReport(
    reportId: string,
    actor: User,
  ): Promise<PrivateAccess<PrivateReport>> {
    const r = this.db.privateReports.find((p) => p.id === reportId);
    if (!r || !this.canAccess(r, actor)) return DENIED;
    await this.logAccess({ actorId: actor.id, actorOffice: actor.privateOffice, action: "view", reportId });
    return { allowed: true, data: r };
  }

  async listPrivateReportsForActor(actor: User): Promise<PrivateReport[]> {
    if (actor.role !== "responder" || !actor.privateOffice) return [];
    return this.db.privateReports.filter((p) => p.currentOffice === actor.privateOffice);
  }

  async reassignPrivateReport(
    reportId: string,
    toOffice: Office,
    actor: User,
  ): Promise<PrivateAccess<PrivateReport>> {
    const r = this.db.privateReports.find((p) => p.id === reportId);
    if (!r || !this.canAccess(r, actor)) return DENIED;
    r.currentOffice = toOffice; // removes previous office's access by construction
    await this.logAccess({ actorId: actor.id, actorOffice: actor.privateOffice, action: "reassign", reportId });
    return { allowed: true, data: r };
  }

  async updatePrivateStatus(
    reportId: string,
    status: PrivateStatus,
    actor: User,
    resolutionNote?: string,
  ): Promise<PrivateAccess<PrivateReport>> {
    const r = this.db.privateReports.find((p) => p.id === reportId);
    if (!r || !this.canAccess(r, actor)) return DENIED;
    r.status = status;
    if (resolutionNote !== undefined) r.resolutionNote = resolutionNote;
    await this.logAccess({ actorId: actor.id, actorOffice: actor.privateOffice, action: "status-change", reportId });
    // Notify the student of the change.
    await this.addNotification(r.reporterId, `Your private report "${r.title}" is now ${status}`);
    return { allowed: true, data: r };
  }

  async listPrivateMessages(
    reportId: string,
    actor: User,
  ): Promise<PrivateAccess<PrivateMessage[]>> {
    const r = this.db.privateReports.find((p) => p.id === reportId);
    if (!r) return DENIED;
    const isReporter = r.reporterId === actor.id;
    if (!isReporter && !this.canAccess(r, actor)) return DENIED;
    return {
      allowed: true,
      data: this.db.privateMessages.filter((m) => m.reportId === reportId),
    };
  }

  async addPrivateMessage(
    reportId: string,
    body: string,
    actor: User,
  ): Promise<PrivateAccess<PrivateMessage>> {
    const r = this.db.privateReports.find((p) => p.id === reportId);
    if (!r) return DENIED;
    const isReporter = r.reporterId === actor.id;
    const isOffice = this.canAccess(r, actor);
    if (!isReporter && !isOffice) return DENIED;
    const message: PrivateMessage = {
      id: this.id("pm"),
      reportId,
      authorRole: isReporter ? "student" : "office",
      authorId: actor.id,
      body,
      createdAt: this.now(),
    };
    this.db.privateMessages.push(message);
    // Notify the other side.
    const recipientId = isReporter
      ? // office side has no single user id; notify reporter's thread owner only on office replies
        r.reporterId
      : r.reporterId;
    if (!isReporter) {
      await this.addNotification(recipientId, `New reply on your private report "${r.title}"`);
    }
    return { allowed: true, data: message };
  }

  // --- access log ---
  async listAccessLog(reportId: string): Promise<AccessLogEntry[]> {
    return this.db.accessLog.filter((a) => a.reportId === reportId);
  }
  async logAccess(
    entry: Omit<AccessLogEntry, "id" | "createdAt">,
  ): Promise<AccessLogEntry> {
    const e: AccessLogEntry = {
      ...entry,
      id: this.id("log"),
      createdAt: this.now(),
    };
    this.db.accessLog.push(e);
    return e;
  }
}
