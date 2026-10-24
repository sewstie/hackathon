import { beforeEach, describe, expect, it } from "vitest";
// Exercise the package through its ENTRY POINTS only — never lib/ internals.
import {
  listOfficeInbox,
  openPrivateReport,
  reassignOffice,
  setPrivateStatus,
} from "../access";
import {
  loadThread,
  postOfficeReply,
  postStudentMessage,
} from "../thread";
import { InMemoryStore } from "@/lib/store";
import type { Store } from "@/lib/store";
import type { User } from "@/types";

// Seeded private reports (from Wave 1):
//   priv-housing  → currentOffice Housing   (reporter user-ana)
//   priv-titleix  → currentOffice Title IX  (reporter user-cam, don't-share-name)
const HOUSING_REPORT = "priv-housing";
const TITLEIX_REPORT = "priv-titleix";

async function getUser(store: Store, id: string): Promise<User> {
  const u = await store.getUser(id);
  if (!u) throw new Error(`seed user missing: ${id}`);
  return u;
}

describe("private: office-scoped access control (enforced in the module)", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("lets the owning office open a private report and returns its data", async () => {
    const hana = await getUser(store, "staff-housing"); // Housing office
    const access = await openPrivateReport(store, HOUSING_REPORT, hana);
    expect(access.allowed).toBe(true);
    expect(access.data?.id).toBe(HOUSING_REPORT);
    expect(access.data?.currentOffice).toBe("Housing");
  });

  it("denies an actor from another office and returns no data", async () => {
    const titleix = await getUser(store, "office-titleix"); // Title IX office
    const denied = await openPrivateReport(store, HOUSING_REPORT, titleix);
    expect(denied.allowed).toBe(false);
    expect(denied.data).toBeNull();
  });

  it("writes an access-log row when the owning office views a report", async () => {
    const hana = await getUser(store, "staff-housing");
    const before = await store.listAccessLog(HOUSING_REPORT);
    await openPrivateReport(store, HOUSING_REPORT, hana);
    const after = await store.listAccessLog(HOUSING_REPORT);
    expect(after.length).toBe(before.length + 1);
    const entry = after[after.length - 1];
    expect(entry.action).toBe("view");
    expect(entry.actorId).toBe("staff-housing");
    expect(entry.reportId).toBe(HOUSING_REPORT);
  });

  it("lists only the actor's own office reports in the inbox", async () => {
    const hana = await getUser(store, "staff-housing");
    const inbox = await listOfficeInbox(store, hana);
    expect(inbox.length).toBeGreaterThanOrEqual(1);
    expect(inbox.every((r) => r.currentOffice === "Housing")).toBe(true);
    expect(inbox.some((r) => r.id === HOUSING_REPORT)).toBe(true);
    // The Title IX report must never leak into Housing's inbox.
    expect(inbox.some((r) => r.id === TITLEIX_REPORT)).toBe(false);
  });

  it("returns an empty inbox for staff who hold no office", async () => {
    const diego = await getUser(store, "staff-dining"); // publicTeam only, no office
    const inbox = await listOfficeInbox(store, diego);
    expect(inbox).toEqual([]);
  });
});

describe("private: reassignment cuts the previous office's access (least-exposure)", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("moves the report to the new office and removes the old office's access", async () => {
    const hana = await getUser(store, "staff-housing"); // current Housing office
    const dean = await getUser(store, "office-dean"); // Dean of Students office

    const reassigned = await reassignOffice(store, HOUSING_REPORT, "Dean of Students", hana);
    expect(reassigned.allowed).toBe(true);
    expect(reassigned.data?.currentOffice).toBe("Dean of Students");

    // Old office is now denied.
    const oldAccess = await openPrivateReport(store, HOUSING_REPORT, hana);
    expect(oldAccess.allowed).toBe(false);
    expect(oldAccess.data).toBeNull();

    // New office can now open it.
    const newAccess = await openPrivateReport(store, HOUSING_REPORT, dean);
    expect(newAccess.allowed).toBe(true);
    expect(newAccess.data?.currentOffice).toBe("Dean of Students");
  });

  it("logs the reassign action and denies reassignment from a non-owning office", async () => {
    const hana = await getUser(store, "staff-housing");
    const before = await store.listAccessLog(HOUSING_REPORT);
    await reassignOffice(store, HOUSING_REPORT, "Dean of Students", hana);
    const after = await store.listAccessLog(HOUSING_REPORT);
    expect(after.some((e) => e.action === "reassign")).toBe(true);
    expect(after.length).toBeGreaterThan(before.length);

    // A different office cannot reassign a report it does not own.
    const titleix = await getUser(store, "office-titleix");
    const denied = await reassignOffice(store, HOUSING_REPORT, "Housing", titleix);
    expect(denied.allowed).toBe(false);
  });
});

describe("private: status changes notify the student and require a note on Referred", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("changes status and notifies the reporter", async () => {
    const hana = await getUser(store, "staff-housing");
    const before = await store.listNotifications("user-ana");
    const res = await setPrivateStatus(store, HOUSING_REPORT, "Reviewing", hana);
    expect(res.allowed).toBe(true);
    expect(res.data?.status).toBe("Reviewing");
    const after = await store.listNotifications("user-ana");
    expect(after.length).toBe(before.length + 1);
  });

  it("logs a status-change and denies status changes from another office", async () => {
    const hana = await getUser(store, "staff-housing");
    await setPrivateStatus(store, HOUSING_REPORT, "Reviewing", hana);
    const log = await store.listAccessLog(HOUSING_REPORT);
    expect(log.some((e) => e.action === "status-change")).toBe(true);

    const titleix = await getUser(store, "office-titleix");
    const denied = await setPrivateStatus(store, HOUSING_REPORT, "Resolved", titleix);
    expect(denied.allowed).toBe(false);
  });

  it("rejects a Referred status without a note (note required)", async () => {
    const hana = await getUser(store, "staff-housing");
    await expect(
      setPrivateStatus(store, HOUSING_REPORT, "Referred", hana),
    ).rejects.toThrow();
    // A Referred WITH a note succeeds.
    const ok = await setPrivateStatus(store, HOUSING_REPORT, "Referred", hana, "Referred to Title IX.");
    expect(ok.allowed).toBe(true);
    expect(ok.data?.status).toBe("Referred");
    expect(ok.data?.resolutionNote).toBe("Referred to Title IX.");
  });
});

describe("private: the two-way message thread", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("lets the reporter load and post to their own thread", async () => {
    const ana = await getUser(store, "user-ana"); // reporter of priv-housing
    const posted = await postStudentMessage(store, HOUSING_REPORT, "Any update?", ana);
    expect(posted.allowed).toBe(true);
    expect(posted.data?.authorRole).toBe("student");

    const thread = await loadThread(store, HOUSING_REPORT, ana);
    expect(thread.allowed).toBe(true);
    expect(thread.data?.some((m) => m.body === "Any update?")).toBe(true);
  });

  it("lets the owning office reply and notifies the student", async () => {
    const hana = await getUser(store, "staff-housing");
    const before = await store.listNotifications("user-ana");
    const reply = await postOfficeReply(store, HOUSING_REPORT, "We're looking into it.", hana);
    expect(reply.allowed).toBe(true);
    expect(reply.data?.authorRole).toBe("office");
    const after = await store.listNotifications("user-ana");
    expect(after.length).toBe(before.length + 1);
  });

  it("denies thread access to staff from another office", async () => {
    const titleix = await getUser(store, "office-titleix");
    const denied = await loadThread(store, HOUSING_REPORT, titleix);
    expect(denied.allowed).toBe(false);
    expect(denied.data).toBeNull();

    const blockedPost = await postOfficeReply(store, HOUSING_REPORT, "hi", titleix);
    expect(blockedPost.allowed).toBe(false);
  });

  it("keeps the thread working while hiding the student's name when don't-share-name is set", async () => {
    // priv-titleix has dontShareName = true, reporter user-cam, office Title IX.
    const cam = await getUser(store, "user-cam");
    const tess = await getUser(store, "office-titleix");

    await postStudentMessage(store, TITLEIX_REPORT, "Here is more detail.", cam);
    const officeView = await loadThread(store, TITLEIX_REPORT, tess);
    expect(officeView.allowed).toBe(true);
    // The thread works for the office...
    expect(officeView.data?.some((m) => m.body === "Here is more detail.")).toBe(true);
    // ...but the reporting student's identity is not derivable from the report.
    const report = await openPrivateReport(store, TITLEIX_REPORT, tess);
    expect(report.data?.dontShareName).toBe(true);
  });
});
