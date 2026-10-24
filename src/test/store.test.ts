// Interface-level test for the data seam.
//
// This establishes the testing pattern every track reuses: exercise the Store
// through its public interface against the deterministic in-memory impl — no
// cloud, no mocking of internals. It also pins the seeded demo beats the demo
// script relies on, and proves office-scoped access control at the seam.

import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";
import type { Store } from "@/lib/store";
import type { User } from "@/types";

describe("Store (in-memory interface)", () => {
  let store: Store;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("seeds the MIT campus with city hand-off + safety contacts", async () => {
    const campus = await store.getCampus(MIT_CAMPUS_ID);
    expect(campus).not.toBeNull();
    expect(campus?.name).toBe("MIT");
    expect(campus?.cityServiceName).toBe("Cambridge SeeClickFix");
    expect(campus?.cityServicePhone).toBe("617-349-4300");
    expect(campus?.campusPolicePhone).toBe("617-253-1212");
  });

  it("seeds ~12 buildings and the demo users", async () => {
    const buildings = await store.listBuildings(MIT_CAMPUS_ID);
    expect(buildings.length).toBeGreaterThanOrEqual(12);
    const users = await store.listUsers();
    expect(users.find((u) => u.name === "Ana")).toBeDefined();
    expect(users.filter((u) => u.role === "responder").length).toBeGreaterThanOrEqual(6);
  });

  it("hits the scripted signer counts: ice-cream 14, handrail 4, Wi-Fi 9", async () => {
    expect(await store.countSigners("rep-icecream")).toBe(14);
    expect(await store.countSigners("rep-handrail")).toBe(4);
    expect(await store.countSigners("rep-wifi")).toBe(9);
  });

  it("co-signing is one-per-user and the reporter counts as signed", async () => {
    const first = await store.addCoSign("rep-icecream", "user-ana");
    expect(first).not.toBeNull();
    expect(await store.countSigners("rep-icecream")).toBe(15);

    const second = await store.addCoSign("rep-icecream", "user-ana");
    expect(second).toBeNull(); // duplicate rejected
    expect(await store.countSigners("rep-icecream")).toBe(15);
  });

  it("deleting a report removes it and its co-signs; unknown id is a no-op", async () => {
    const report = await store.createReport({
      campusId: MIT_CAMPUS_ID,
      reporterId: "user-ben",
      category: "Facilities",
      item: "light",
      title: "Hallway light out",
      tier: "Low",
      location: "Building 10, Floor 2",
      incomplete: false,
      locationUnverified: false,
    });
    // A second co-signer so we prove co-signs are dropped too.
    await store.addCoSign(report.id, "user-ana");
    expect(await store.countSigners(report.id)).toBe(2);

    await store.deleteReport(report.id);

    const list = await store.listReports(MIT_CAMPUS_ID);
    expect(list.some((r) => r.id === report.id)).toBe(false);
    expect(await store.getReport(report.id)).toBeNull();
    expect(await store.listCoSigns(report.id)).toHaveLength(0);
    expect(await store.countSigners(report.id)).toBe(0);

    // Unknown id is a no-op (does not throw, changes nothing).
    const before = (await store.listReports(MIT_CAMPUS_ID)).length;
    await expect(store.deleteReport("rep-does-not-exist")).resolves.toBeUndefined();
    expect((await store.listReports(MIT_CAMPUS_ID)).length).toBe(before);
  });

  it("filing a report auto-signs the reporter", async () => {
    const report = await store.createReport({
      campusId: MIT_CAMPUS_ID,
      reporterId: "user-ben",
      category: "Facilities",
      item: "light",
      title: "Hallway light out",
      tier: "Low",
      location: "Building 10, Floor 2",
      incomplete: false,
      locationUnverified: false,
    });
    expect(report.status).toBe("Received");
    expect(await store.countSigners(report.id)).toBe(1);
  });

  it("status changes can be notified and the unread count reflects it", async () => {
    await store.updateReportStatus("rep-wifi", "Fixed");
    await store.addNotification("user-ana", "Wi-Fi keeps dropping is now Fixed");
    expect(await store.countUnread("user-ana")).toBe(1);
    await store.markAllRead("user-ana");
    expect(await store.countUnread("user-ana")).toBe(0);
  });

  it("ships the Wi-Fi reconnect quick fix", async () => {
    const fixes = await store.listQuickFixes(MIT_CAMPUS_ID);
    const wifi = fixes.filter((f) => f.item === "wifi");
    expect(wifi.length).toBeGreaterThanOrEqual(1);
    expect(wifi.some((f) => /reconnect/i.test(f.text))).toBe(true);
  });

  describe("private report office-scoped access", () => {
    const housingStaff: User = {
      id: "staff-housing",
      name: "Hana",
      email: "hana@mit.edu",
      role: "responder",
      privateOffice: "Housing",
    };
    const titleIxStaff: User = {
      id: "office-titleix",
      name: "Tess",
      email: "titleix@mit.edu",
      role: "responder",
      privateOffice: "Title IX",
    };

    it("grants the owning office and denies another office (no data)", async () => {
      const allowed = await store.getPrivateReport("priv-housing", housingStaff);
      expect(allowed.allowed).toBe(true);
      expect(allowed.data?.title).toContain("Roommate");

      const denied = await store.getPrivateReport("priv-housing", titleIxStaff);
      expect(denied.allowed).toBe(false);
      expect(denied.data).toBeNull();
    });

    it("logs a view when access is granted", async () => {
      await store.getPrivateReport("priv-housing", housingStaff);
      const log = await store.listAccessLog("priv-housing");
      expect(log.some((e) => e.action === "view" && e.actorId === "staff-housing")).toBe(true);
    });

    it("reassigning cuts the old office's access", async () => {
      const reassigned = await store.reassignPrivateReport("priv-housing", "Dean of Students", housingStaff);
      expect(reassigned.allowed).toBe(true);

      const nowDenied = await store.getPrivateReport("priv-housing", housingStaff);
      expect(nowDenied.allowed).toBe(false);
      expect(nowDenied.data).toBeNull();
    });

    it("a status change notifies the student", async () => {
      await store.updatePrivateStatus("priv-housing", "Reviewing", housingStaff);
      expect(await store.countUnread("user-ana")).toBe(1);
    });

    it("only the owning office lists a private report", async () => {
      const housingList = await store.listPrivateReportsForActor(housingStaff);
      expect(housingList.some((r) => r.id === "priv-housing")).toBe(true);
      const titleIxList = await store.listPrivateReportsForActor(titleIxStaff);
      expect(titleIxList.some((r) => r.id === "priv-housing")).toBe(false);
    });
  });
});
