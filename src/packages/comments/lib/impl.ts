// Internal: posting and reading report comments, with screening + notifications.
import type { Store } from "@/lib/store";
import { screenComment } from "@/packages/abuse";
import type { Category, CommentVisibility, PublicTeam, Report, ReportComment, User } from "@/types";

/** Which staff team owns a report (City hand-offs fall back to Facilities). */
function teamFor(category: Category): PublicTeam {
  return category === "City" ? "Facilities" : category;
}

function snippet(body: string): string {
  const t = body.trim().replace(/\s+/g, " ");
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
}

export interface PostCommentInput {
  report: Report;
  author: User;
  body: string;
  visibility: CommentVisibility;
}

export type PostCommentResult =
  | { ok: true; comment: ReportComment; notified: string[] }
  | { ok: false; reason: string };

export async function postCommentImpl(store: Store, input: PostCommentInput): Promise<PostCommentResult> {
  const { report, author, visibility } = input;
  const body = input.body.trim();
  const isStaff = author.role === "responder";
  const isReporter = author.id === report.reporterId;

  // Direct messages are only between staff and the person who filed it.
  if (visibility === "direct" && !isStaff && !isReporter) {
    return { ok: false, reason: "Only the person who filed this report can message staff about it." };
  }
  const screen = screenComment(body, visibility);
  if (!screen.ok) return { ok: false, reason: screen.reason ?? "That can't be posted." };

  const comment = await store.addReportComment({
    reportId: report.id,
    authorId: author.id,
    authorRole: isStaff ? "staff" : "student",
    visibility,
    body: body.slice(0, 1000),
  });

  // Who hears about it.
  const team = teamFor(report.category);
  const users = await store.listUsers();
  const teamStaff = users.filter((u) => u.role === "responder" && u.publicTeam === team).map((u) => u.id);
  const recipients = new Set<string>();
  let text: string;

  if (visibility === "direct") {
    if (isStaff) {
      recipients.add(report.reporterId);
      text = `${team} staff sent you a message about “${report.title}”: ${snippet(body)}`;
    } else {
      teamStaff.forEach((id) => recipients.add(id));
      text = `The reporter replied about “${report.title}”: ${snippet(body)}`;
    }
  } else if (isStaff) {
    recipients.add(report.reporterId);
    for (const c of await store.listCoSigns(report.id)) recipients.add(c.userId);
    text = `${team} staff commented on “${report.title}”: ${snippet(body)}`;
  } else {
    recipients.add(report.reporterId);
    teamStaff.forEach((id) => recipients.add(id));
    text = `New comment on “${report.title}”: ${snippet(body)}`;
  }
  recipients.delete(author.id);

  const notified = [...recipients];
  const staffIds = new Set(users.filter((u) => u.role === "responder").map((u) => u.id));
  const studentLink = `/report-detail?id=${encodeURIComponent(report.id)}&chat=${visibility}#conversation`;
  const staffLink = `/staff?report=${encodeURIComponent(report.id)}&chat=${visibility}`;
  await Promise.all(
    notified.map((id) => store.addNotification(id, text, staffIds.has(id) ? staffLink : studentLink)),
  );
  return { ok: true, comment, notified };
}
