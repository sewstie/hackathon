// Supabase-backed Store — the runtime implementation.
//
// It speaks the same `Store` interface as InMemoryStore, mapping snake_case
// rows to the camelCase domain types. Office-scoped access control for private
// reports is enforced here too (the module owns the rule; the demo anon key has
// no row-level security, so the guarantee must live in code).
//
// postgrest-js (1.21) does not always infer a typed client's result shape from
// the `Database` generic (it can collapse to `{}`/`never`), so every query
// asserts its row type explicitly via `.returns<Row[]>()` / `.single<Row>()`,
// and every insert payload is typed as the table's Insert type. `unwrap`
// centralizes the error/null handling.

import type {
  AccessLogEntry,
  Building,
  Campus,
  Category,
  CoSign,
  MessageAuthorRole,
  Notification,
  Office,
  PrivateMessage,
  PrivateReport,
  PrivateStatus,
  PublicTeam,
  QuickFix,
  Report,
  Role,
  SelfResolution,
  Status,
  Tier,
  User,
} from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  NewPrivateReport,
  NewReport,
  PrivateAccess,
  Store,
} from "./types";

type Tables = Database["public"]["Tables"];
type Row<T extends keyof Tables> = Tables[T]["Row"];
type Insert<T extends keyof Tables> = Tables[T]["Insert"];
type Update<T extends keyof Tables> = Tables[T]["Update"];

const DENIED = { allowed: false, data: null } as const;

export class SupabaseStore implements Store {
  private readonly sb: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database> = getSupabaseClient()) {
    this.sb = client;
  }

  private id(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  private unwrap<T>(
    result: { data: T | null; error: { message: string } | null },
    what: string,
  ): NonNullable<T> {
    if (result.error) throw new Error(`${what}: ${result.error.message}`);
    if (result.data === null || result.data === undefined) {
      throw new Error(`${what}: not found`);
    }
    return result.data as NonNullable<T>;
  }

  // --- mappers ---
  private toCampus(r: Row<"campuses">): Campus {
    return {
      id: r.id,
      name: r.name,
      city: r.city,
      state: r.state,
      latitude: r.latitude,
      longitude: r.longitude,
      cityServiceName: r.city_service_name,
      cityServiceUrl: r.city_service_url,
      cityServicePhone: r.city_service_phone,
      campusPoliceName: r.campus_police_name,
      campusPolicePhone: r.campus_police_phone,
      counselingName: r.counseling_name,
      counselingUrl: r.counseling_url,
    };
  }
  private toBuilding(r: Row<"buildings">): Building {
    return {
      id: r.id,
      campusId: r.campus_id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      floors: r.floors,
      diningHalls: r.dining_halls,
    };
  }
  private toUser(r: Row<"users">): User {
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role as Role,
      publicTeam: (r.public_team as PublicTeam | null) ?? undefined,
      privateOffice: (r.private_office as Office | null) ?? undefined,
    };
  }
  private toReport(r: Row<"reports">): Report {
    return {
      id: r.id,
      campusId: r.campus_id,
      buildingId: r.building_id ?? undefined,
      reporterId: r.reporter_id,
      category: r.category as Category,
      item: r.item,
      title: r.title,
      tier: r.tier as Tier,
      status: r.status as Status,
      location: r.location,
      incomplete: r.incomplete,
      locationUnverified: r.location_unverified,
      photoUrl: r.photo_url ?? undefined,
      resolutionNote: r.resolution_note ?? undefined,
      createdAt: r.created_at,
    };
  }
  private toCoSign(r: Row<"co_signs">): CoSign {
    return { id: r.id, reportId: r.report_id, userId: r.user_id, createdAt: r.created_at };
  }
  private toNotification(r: Row<"notifications">): Notification {
    return { id: r.id, recipientId: r.recipient_id, body: r.body, read: r.read, createdAt: r.created_at };
  }
  private toPrivateReport(r: Row<"private_reports">): PrivateReport {
    return {
      id: r.id,
      campusId: r.campus_id,
      reporterId: r.reporter_id,
      office: r.office as Office,
      currentOffice: r.current_office as Office,
      title: r.title,
      body: r.body,
      status: r.status as PrivateStatus,
      dontShareName: r.dont_share_name,
      resolutionNote: r.resolution_note ?? undefined,
      createdAt: r.created_at,
    };
  }
  private toPrivateMessage(r: Row<"private_messages">): PrivateMessage {
    return {
      id: r.id,
      reportId: r.report_id,
      authorRole: r.author_role as MessageAuthorRole,
      authorId: r.author_id,
      body: r.body,
      createdAt: r.created_at,
    };
  }
  private toQuickFix(r: Row<"quick_fixes">): QuickFix {
    return { id: r.id, campusId: r.campus_id, category: r.category as Category, item: r.item ?? undefined, text: r.text };
  }
  private toSelfResolution(r: Row<"self_resolutions">): SelfResolution {
    return { id: r.id, campusId: r.campus_id, userId: r.user_id, category: r.category as Category, item: r.item ?? undefined, createdAt: r.created_at };
  }
  private toAccessLogEntry(r: Row<"access_log">): AccessLogEntry {
    return {
      id: r.id,
      actorId: r.actor_id,
      actorOffice: (r.actor_office as Office | null) ?? undefined,
      action: r.action as AccessLogEntry["action"],
      reportId: r.report_id,
      createdAt: r.created_at,
    };
  }

  // --- campuses & buildings ---
  async listCampuses(): Promise<Campus[]> {
    const data = this.unwrap(await this.sb.from("campuses").select("*").returns<Row<"campuses">[]>(), "listCampuses");
    return data.map((r) => this.toCampus(r));
  }
  async getCampus(campusId: string): Promise<Campus | null> {
    const { data, error } = await this.sb.from("campuses").select("*").eq("id", campusId).maybeSingle<Row<"campuses">>();
    if (error) throw new Error(`getCampus: ${error.message}`);
    return data ? this.toCampus(data) : null;
  }
  async listBuildings(campusId: string): Promise<Building[]> {
    const data = this.unwrap(await this.sb.from("buildings").select("*").eq("campus_id", campusId).returns<Row<"buildings">[]>(), "listBuildings");
    return data.map((r) => this.toBuilding(r));
  }

  // --- users ---
  async listUsers(): Promise<User[]> {
    const data = this.unwrap(await this.sb.from("users").select("*").returns<Row<"users">[]>(), "listUsers");
    return data.map((r) => this.toUser(r));
  }
  async getUser(userId: string): Promise<User | null> {
    const { data, error } = await this.sb.from("users").select("*").eq("id", userId).maybeSingle<Row<"users">>();
    if (error) throw new Error(`getUser: ${error.message}`);
    return data ? this.toUser(data) : null;
  }

  // --- public reports ---
  async listReports(campusId: string): Promise<Report[]> {
    const data = this.unwrap(await this.sb.from("reports").select("*").eq("campus_id", campusId).returns<Row<"reports">[]>(), "listReports");
    return data.map((r) => this.toReport(r));
  }
  async getReport(reportId: string): Promise<Report | null> {
    const { data, error } = await this.sb.from("reports").select("*").eq("id", reportId).maybeSingle<Row<"reports">>();
    if (error) throw new Error(`getReport: ${error.message}`);
    return data ? this.toReport(data) : null;
  }
  async createReport(report: NewReport): Promise<Report> {
    const id = this.id("rep");
    const row: Insert<"reports"> = {
      id,
      campus_id: report.campusId,
      building_id: report.buildingId ?? null,
      reporter_id: report.reporterId,
      category: report.category,
      item: report.item,
      title: report.title,
      tier: report.tier,
      status: report.status ?? "Received",
      location: report.location,
      incomplete: report.incomplete,
      location_unverified: report.locationUnverified,
      photo_url: report.photoUrl ?? null,
      resolution_note: report.resolutionNote ?? null,
    };
    const data = this.unwrap(await this.sb.from("reports").insert(row).select().single<Row<"reports">>(), "createReport");
    const coSign: Insert<"co_signs"> = { id: this.id("cosign"), report_id: id, user_id: report.reporterId };
    await this.sb.from("co_signs").insert(coSign);
    return this.toReport(data);
  }
  async updateReportStatus(reportId: string, status: Status, resolutionNote?: string): Promise<Report> {
    const patch: Update<"reports"> = { status };
    if (resolutionNote !== undefined) patch.resolution_note = resolutionNote;
    const data = this.unwrap(await this.sb.from("reports").update(patch).eq("id", reportId).select().single<Row<"reports">>(), "updateReportStatus");
    return this.toReport(data);
  }
  async updateReportTier(reportId: string, tier: Tier): Promise<Report> {
    const patch: Update<"reports"> = { tier };
    const data = this.unwrap(await this.sb.from("reports").update(patch).eq("id", reportId).select().single<Row<"reports">>(), "updateReportTier");
    return this.toReport(data);
  }
  async deleteReport(reportId: string): Promise<void> {
    // Co-signs are removed by the schema's `on delete cascade`; delete the
    // report itself. Deleting a non-existent id affects zero rows (no-op).
    const { error } = await this.sb.from("reports").delete().eq("id", reportId);
    if (error) throw new Error(`deleteReport: ${error.message}`);
  }

  // --- co-signs ---
  async listCoSigns(reportId: string): Promise<CoSign[]> {
    const data = this.unwrap(await this.sb.from("co_signs").select("*").eq("report_id", reportId).returns<Row<"co_signs">[]>(), "listCoSigns");
    return data.map((r) => this.toCoSign(r));
  }
  async countSigners(reportId: string): Promise<number> {
    const { count, error } = await this.sb.from("co_signs").select("*", { count: "exact", head: true }).eq("report_id", reportId);
    if (error) throw new Error(`countSigners: ${error.message}`);
    return count ?? 0;
  }
  async addCoSign(reportId: string, userId: string): Promise<CoSign | null> {
    const { data: existing } = await this.sb.from("co_signs").select("id").eq("report_id", reportId).eq("user_id", userId).maybeSingle();
    if (existing) return null;
    const row: Insert<"co_signs"> = { id: this.id("cosign"), report_id: reportId, user_id: userId };
    const data = this.unwrap(await this.sb.from("co_signs").insert(row).select().single<Row<"co_signs">>(), "addCoSign");
    return this.toCoSign(data);
  }
  async removeCoSign(reportId: string, userId: string): Promise<void> {
    // Delete this user's co-sign row; an absent pair affects zero rows (no-op).
    const { error } = await this.sb
      .from("co_signs")
      .delete()
      .eq("report_id", reportId)
      .eq("user_id", userId);
    if (error) throw new Error(`removeCoSign: ${error.message}`);
  }

  // --- notifications ---
  async listNotifications(recipientId: string): Promise<Notification[]> {
    const data = this.unwrap(await this.sb.from("notifications").select("*").eq("recipient_id", recipientId).returns<Row<"notifications">[]>(), "listNotifications");
    return data.map((r) => this.toNotification(r));
  }
  async countUnread(recipientId: string): Promise<number> {
    const { count, error } = await this.sb.from("notifications").select("*", { count: "exact", head: true }).eq("recipient_id", recipientId).eq("read", false);
    if (error) throw new Error(`countUnread: ${error.message}`);
    return count ?? 0;
  }
  async addNotification(recipientId: string, body: string): Promise<Notification> {
    const row: Insert<"notifications"> = { id: this.id("notif"), recipient_id: recipientId, body, read: false };
    const data = this.unwrap(await this.sb.from("notifications").insert(row).select().single<Row<"notifications">>(), "addNotification");
    return this.toNotification(data);
  }
  async markAllRead(recipientId: string): Promise<void> {
    const patch: Update<"notifications"> = { read: true };
    const { error } = await this.sb.from("notifications").update(patch).eq("recipient_id", recipientId);
    if (error) throw new Error(`markAllRead: ${error.message}`);
  }

  // --- quick fixes & self-resolutions ---
  async listQuickFixes(campusId: string): Promise<QuickFix[]> {
    const data = this.unwrap(await this.sb.from("quick_fixes").select("*").eq("campus_id", campusId).returns<Row<"quick_fixes">[]>(), "listQuickFixes");
    return data.map((r) => this.toQuickFix(r));
  }
  async addQuickFix(fix: Omit<QuickFix, "id">): Promise<QuickFix> {
    const row: Insert<"quick_fixes"> = { id: this.id("qf"), campus_id: fix.campusId, category: fix.category, item: fix.item ?? null, text: fix.text };
    const data = this.unwrap(await this.sb.from("quick_fixes").insert(row).select().single<Row<"quick_fixes">>(), "addQuickFix");
    return this.toQuickFix(data);
  }
  async addSelfResolution(resolution: Omit<SelfResolution, "id" | "createdAt">): Promise<SelfResolution> {
    const row: Insert<"self_resolutions"> = { id: this.id("selfres"), campus_id: resolution.campusId, user_id: resolution.userId, category: resolution.category, item: resolution.item ?? null };
    const data = this.unwrap(await this.sb.from("self_resolutions").insert(row).select().single<Row<"self_resolutions">>(), "addSelfResolution");
    return this.toSelfResolution(data);
  }

  // --- private reports (office-scoped access) ---
  private canAccess(report: PrivateReport, actor: User): boolean {
    return actor.role === "responder" && actor.privateOffice === report.currentOffice;
  }

  async createPrivateReport(report: NewPrivateReport): Promise<PrivateReport> {
    const row: Insert<"private_reports"> = {
      id: this.id("priv"),
      campus_id: report.campusId,
      reporter_id: report.reporterId,
      office: report.office,
      current_office: report.office,
      title: report.title,
      body: report.body,
      status: report.status ?? "Received",
      dont_share_name: report.dontShareName,
      resolution_note: null,
    };
    const data = this.unwrap(await this.sb.from("private_reports").insert(row).select().single<Row<"private_reports">>(), "createPrivateReport");
    return this.toPrivateReport(data);
  }

  private async fetchPrivate(reportId: string): Promise<PrivateReport | null> {
    const { data, error } = await this.sb.from("private_reports").select("*").eq("id", reportId).maybeSingle<Row<"private_reports">>();
    if (error) throw new Error(`fetchPrivate: ${error.message}`);
    return data ? this.toPrivateReport(data) : null;
  }

  async getPrivateReport(reportId: string, actor: User): Promise<PrivateAccess<PrivateReport>> {
    const r = await this.fetchPrivate(reportId);
    if (!r || !this.canAccess(r, actor)) return DENIED;
    await this.logAccess({ actorId: actor.id, actorOffice: actor.privateOffice, action: "view", reportId });
    return { allowed: true, data: r };
  }

  async listPrivateReportsForActor(actor: User): Promise<PrivateReport[]> {
    if (actor.role !== "responder" || !actor.privateOffice) return [];
    const data = this.unwrap(await this.sb.from("private_reports").select("*").eq("current_office", actor.privateOffice).returns<Row<"private_reports">[]>(), "listPrivateReportsForActor");
    return data.map((r) => this.toPrivateReport(r));
  }

  async reassignPrivateReport(reportId: string, toOffice: Office, actor: User): Promise<PrivateAccess<PrivateReport>> {
    const r = await this.fetchPrivate(reportId);
    if (!r || !this.canAccess(r, actor)) return DENIED;
    const patch: Update<"private_reports"> = { current_office: toOffice };
    const data = this.unwrap(await this.sb.from("private_reports").update(patch).eq("id", reportId).select().single<Row<"private_reports">>(), "reassignPrivateReport");
    await this.logAccess({ actorId: actor.id, actorOffice: actor.privateOffice, action: "reassign", reportId });
    return { allowed: true, data: this.toPrivateReport(data) };
  }

  async updatePrivateStatus(reportId: string, status: PrivateStatus, actor: User, resolutionNote?: string): Promise<PrivateAccess<PrivateReport>> {
    const r = await this.fetchPrivate(reportId);
    if (!r || !this.canAccess(r, actor)) return DENIED;
    const patch: Update<"private_reports"> = { status };
    if (resolutionNote !== undefined) patch.resolution_note = resolutionNote;
    const data = this.unwrap(await this.sb.from("private_reports").update(patch).eq("id", reportId).select().single<Row<"private_reports">>(), "updatePrivateStatus");
    await this.logAccess({ actorId: actor.id, actorOffice: actor.privateOffice, action: "status-change", reportId });
    await this.addNotification(r.reporterId, `Your private report "${r.title}" is now ${status}`);
    return { allowed: true, data: this.toPrivateReport(data) };
  }

  async listPrivateMessages(reportId: string, actor: User): Promise<PrivateAccess<PrivateMessage[]>> {
    const r = await this.fetchPrivate(reportId);
    if (!r) return DENIED;
    if (r.reporterId !== actor.id && !this.canAccess(r, actor)) return DENIED;
    const data = this.unwrap(await this.sb.from("private_messages").select("*").eq("report_id", reportId).returns<Row<"private_messages">[]>(), "listPrivateMessages");
    return { allowed: true, data: data.map((m) => this.toPrivateMessage(m)) };
  }

  async addPrivateMessage(reportId: string, body: string, actor: User): Promise<PrivateAccess<PrivateMessage>> {
    const r = await this.fetchPrivate(reportId);
    if (!r) return DENIED;
    const isReporter = r.reporterId === actor.id;
    const isOffice = this.canAccess(r, actor);
    if (!isReporter && !isOffice) return DENIED;
    const authorRole: MessageAuthorRole = isReporter ? "student" : "office";
    const row: Insert<"private_messages"> = {
      id: this.id("pm"),
      report_id: reportId,
      author_role: authorRole,
      author_id: actor.id,
      body,
    };
    const data = this.unwrap(await this.sb.from("private_messages").insert(row).select().single<Row<"private_messages">>(), "addPrivateMessage");
    if (!isReporter) {
      await this.addNotification(r.reporterId, `New reply on your private report "${r.title}"`);
    }
    return { allowed: true, data: this.toPrivateMessage(data) };
  }

  // --- access log ---
  async listAccessLog(reportId: string): Promise<AccessLogEntry[]> {
    const data = this.unwrap(await this.sb.from("access_log").select("*").eq("report_id", reportId).returns<Row<"access_log">[]>(), "listAccessLog");
    return data.map((r) => this.toAccessLogEntry(r));
  }
  async logAccess(entry: Omit<AccessLogEntry, "id" | "createdAt">): Promise<AccessLogEntry> {
    const row: Insert<"access_log"> = {
      id: this.id("log"),
      actor_id: entry.actorId,
      actor_office: entry.actorOffice ?? null,
      action: entry.action,
      report_id: entry.reportId,
    };
    const data = this.unwrap(await this.sb.from("access_log").insert(row).select().single<Row<"access_log">>(), "logAccess");
    return this.toAccessLogEntry(data);
  }
}
