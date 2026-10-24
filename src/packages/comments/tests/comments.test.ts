import { describe, expect, it } from "vitest";
import { InMemoryStore } from "@/lib/store";
import { listComments, postComment } from "@/packages/comments";

async function setup() {
  const store = new InMemoryStore();
  const report = (await store.getReport("rep-wifi"))!; // filed by Ana, IT team
  const ana = (await store.getUser("user-ana"))!;
  const ben = (await store.getUser("user-ben"))!;
  const ivan = (await store.getUser("staff-it"))!;
  return { store, report, ana, ben, ivan };
}

describe("report comments", () => {
  it("staff can message the reporter directly; the reporter is notified and can reply", async () => {
    const { store, report, ana, ben, ivan } = await setup();
    const q = await postComment(store, { report, author: ivan, body: "Which floor exactly?", visibility: "direct" });
    expect(q.ok).toBe(true);
    expect(await store.countUnread(ana.id)).toBe(1);
    // Clicking it opens the report's private chat.
    const [toAna] = await store.listNotifications(ana.id);
    expect(toAna.link).toBe(`/report-detail?id=${report.id}&chat=direct#conversation`);

    const reply = await postComment(store, { report, author: ana, body: "2nd floor, near the stairs", visibility: "direct" });
    expect(reply.ok).toBe(true);
    expect(await store.countUnread(ivan.id)).toBe(1);
    const [toIvan] = await store.listNotifications(ivan.id);
    expect(toIvan.link).toBe(`/staff?report=${report.id}&chat=direct`);

    // Direct messages are hidden from other students and from anonymous viewers.
    expect(await listComments(store, report.id, ben)).toHaveLength(0);
    expect(await listComments(store, report.id, null)).toHaveLength(0);
    expect(await listComments(store, report.id, ana)).toHaveLength(2);
    expect(await listComments(store, report.id, ivan)).toHaveLength(2);
  });

  it("other students cannot use direct messages", async () => {
    const { store, report, ben } = await setup();
    const r = await postComment(store, { report, author: ben, body: "hi staff", visibility: "direct" });
    expect(r.ok).toBe(false);
  });

  it("public comments are visible to everyone; staff comments notify the reporter and co-signers", async () => {
    const { store, report, ben, ivan } = await setup();
    const signers = (await store.listCoSigns(report.id)).map((c) => c.userId);
    const r = await postComment(store, { report, author: ivan, body: "A technician is on the way.", visibility: "public" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.notified).toContain(report.reporterId);
      for (const id of signers) if (id !== ivan.id) expect(r.notified).toContain(id);
    }
    expect(await listComments(store, report.id, null)).toHaveLength(1);
    const s = await postComment(store, { report, author: ben, body: "Still down for me too", visibility: "public" });
    expect(s.ok).toBe(true);
    expect(await listComments(store, report.id, ben)).toHaveLength(2);
  });

  it("blocks spam and person-naming in public comments", async () => {
    const { store, report, ben } = await setup();
    expect((await postComment(store, { report, author: ben, body: "I won a million dollars", visibility: "public" })).ok).toBe(false);
    expect((await postComment(store, { report, author: ben, body: "Professor Smith broke it", visibility: "public" })).ok).toBe(false);
    expect((await postComment(store, { report, author: ben, body: "   ", visibility: "public" })).ok).toBe(false);
  });
});
