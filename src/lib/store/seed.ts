// Deterministic MIT demo seed data.
//
// One place builds the scripted demo world: the MIT campus, its buildings,
// the demo users, and a spread of historical reports that hit the exact beats
// the demo relies on (a 14-signer ice-cream report, a 4-signer handrail, a
// 9-signer Wi-Fi report with enough Wi-Fi history to read "~9 similar · ~3
// days", two private reports, curated quick fixes).
//
// `buildSeed()` returns a FRESH, independently-mutable snapshot every call, so
// the in-memory store and each test get their own copy with no shared state.

import type {
  AccessLogEntry,
  Building,
  Campus,
  CoSign,
  Notification,
  PrivateMessage,
  PrivateReport,
  QuickFix,
  Report,
  SelfResolution,
  User,
} from "@/types";

export interface Seed {
  campuses: Campus[];
  buildings: Building[];
  users: User[];
  reports: Report[];
  coSigns: CoSign[];
  notifications: Notification[];
  privateReports: PrivateReport[];
  privateMessages: PrivateMessage[];
  accessLog: AccessLogEntry[];
  quickFixes: QuickFix[];
  selfResolutions: SelfResolution[];
}

export const MIT_CAMPUS_ID = "mit";

/** A fixed clock so every row has a stable, reproducible timestamp. */
const NOW = Date.parse("2026-10-24T12:00:00.000Z");
const DAY = 86_400_000;

/** ISO timestamp `days` before the fixed NOW. */
function daysAgo(days: number): string {
  return new Date(NOW - days * DAY).toISOString();
}

function mitCampus(): Campus {
  return {
    id: MIT_CAMPUS_ID,
    name: "MIT",
    city: "Cambridge",
    state: "MA",
    latitude: 42.3601,
    longitude: -71.0942,
    cityServiceName: "Cambridge SeeClickFix",
    cityServiceUrl: "https://www.cambridgema.gov/SeeClickFix",
    cityServicePhone: "617-349-4300",
    campusPoliceName: "MIT Police",
    campusPolicePhone: "617-253-1212",
    counselingName: "MIT Health Counseling",
    counselingUrl: "https://health.mit.edu",
  };
}

// ~12 MIT buildings with coordinates; a few carry dining halls.
const BUILDING_DEFS: Array<{
  id: string;
  name: string;
  lat: number;
  lng: number;
  floors: string[];
  dining?: string[];
}> = [
  { id: "bldg-w20", name: "Stratton Student Center (W20)", lat: 42.3592, lng: -71.0954, floors: ["1", "2", "3"], dining: ["Lobdell Dining"] },
  { id: "bldg-maseeh", name: "Maseeh Hall (W1)", lat: 42.3570, lng: -71.0935, floors: ["1", "2", "3", "4"], dining: ["Maseeh Dining"] },
  { id: "bldg-mccormick", name: "McCormick Hall (W4)", lat: 42.3567, lng: -71.0944, floors: ["1", "2", "3"], dining: ["McCormick Dining"] },
  { id: "bldg-next", name: "Next House (W71)", lat: 42.3558, lng: -71.1010, floors: ["1", "2", "3", "4"], dining: ["Next Dining"] },
  { id: "bldg-baker", name: "Baker House (W7)", lat: 42.3564, lng: -71.0952, floors: ["1", "2", "3", "4"], dining: ["Baker Dining"] },
  { id: "bldg-10", name: "Building 10 (Great Dome)", lat: 42.3601, lng: -71.0920, floors: ["1", "2", "3", "4"] },
  { id: "bldg-26", name: "Building 26", lat: 42.3607, lng: -71.0907, floors: ["1", "2", "3", "4", "5"] },
  { id: "bldg-32", name: "Stata Center (32)", lat: 42.3620, lng: -71.0902, floors: ["1", "2", "3", "4"] },
  { id: "bldg-e25", name: "Health Sciences (E25)", lat: 42.3618, lng: -71.0875, floors: ["1", "2", "3"] },
  { id: "bldg-e52", name: "Samberg / Sloan (E52)", lat: 42.3608, lng: -71.0820, floors: ["1", "2", "3"] },
  { id: "bldg-w34", name: "Johnson Athletic Center (W34)", lat: 42.3585, lng: -71.0930, floors: ["1", "2"] },
  { id: "bldg-library", name: "Hayden Library (14)", lat: 42.3585, lng: -71.0900, floors: ["1", "2", "3"] },
];

function mitBuildings(): Building[] {
  return BUILDING_DEFS.map((b) => ({
    id: b.id,
    campusId: MIT_CAMPUS_ID,
    name: b.name,
    latitude: b.lat,
    longitude: b.lng,
    floors: b.floors,
    diningHalls: b.dining ?? [],
  }));
}

// Demo users: students Ana/Ben/Cam, one responder per public team, private
// office staff, plus ~40 background co-signer students (data only).
function mitUsers(): User[] {
  const users: User[] = [
    { id: "user-ana", name: "Ana", email: "ana@mit.edu", role: "student" },
    { id: "user-ben", name: "Ben", email: "ben@mit.edu", role: "student" },
    { id: "user-cam", name: "Cam", email: "cam@mit.edu", role: "student" },
    { id: "staff-facilities", name: "Fiona (Facilities)", email: "fiona@mit.edu", role: "responder", publicTeam: "Facilities", privateOffice: "Facilities" },
    { id: "staff-dining", name: "Diego (Dining)", email: "diego@mit.edu", role: "responder", publicTeam: "Dining" },
    { id: "staff-housing", name: "Hana (Housing)", email: "hana@mit.edu", role: "responder", publicTeam: "Housing", privateOffice: "Housing" },
    { id: "staff-it", name: "Ivan (IT)", email: "ivan@mit.edu", role: "responder", publicTeam: "IT", privateOffice: "IT Security" },
    { id: "staff-grounds", name: "Grace (Grounds)", email: "grace@mit.edu", role: "responder", publicTeam: "Grounds" },
    { id: "staff-safety", name: "Sam (Safety)", email: "sam@mit.edu", role: "responder", publicTeam: "Safety", privateOffice: "Campus Police" },
    { id: "office-dean", name: "Dana (Dean of Students)", email: "dean@mit.edu", role: "responder", privateOffice: "Dean of Students" },
    { id: "office-titleix", name: "Tess (Title IX)", email: "titleix@mit.edu", role: "responder", privateOffice: "Title IX" },
    { id: "office-accessibility", name: "Alex (Accessibility)", email: "access@mit.edu", role: "responder", privateOffice: "Accessibility Services" },
  ];
  // ~40 background co-signer students (exist in data only).
  for (let i = 1; i <= 40; i++) {
    users.push({
      id: `bg-student-${i}`,
      name: `Student ${i}`,
      email: `student${i}@mit.edu`,
      role: "student",
    });
  }
  return users;
}

function report(partial: Omit<Report, "campusId">): Report {
  return { campusId: MIT_CAMPUS_ID, ...partial };
}

// The three hero reports plus ~37 more historical reports.
function mitReports(): Report[] {
  const reports: Report[] = [
    report({
      id: "rep-icecream",
      buildingId: "bldg-w20",
      reporterId: "user-ben",
      category: "Dining",
      item: "ice cream machine",
      title: "Ice cream machine is broken",
      tier: "Medium",
      status: "Received",
      location: "Stratton Student Center (W20), Lobdell Dining",
      incomplete: false,
      locationUnverified: false,
      createdAt: daysAgo(2),
    }),
    report({
      id: "rep-handrail",
      buildingId: "bldg-26",
      reporterId: "user-cam",
      category: "Facilities",
      item: "handrail",
      title: "Broken handrail on the stairwell",
      tier: "High",
      status: "Received",
      location: "Building 26, Floor 3 stairwell",
      incomplete: false,
      locationUnverified: false,
      createdAt: daysAgo(3),
    }),
    report({
      id: "rep-wifi",
      buildingId: "bldg-library",
      reporterId: "user-ana",
      category: "IT",
      item: "wifi",
      title: "Wi-Fi keeps dropping",
      tier: "Medium",
      status: "Received",
      location: "Hayden Library (14), Floor 2",
      incomplete: false,
      locationUnverified: false,
      createdAt: daysAgo(1),
    }),
  ];

  // Wi-Fi history: additional FIXED Wi-Fi reports so Ari can read
  // "~9 similar this semester · usually fixed in ~3 days". Each took ~3 days.
  for (let i = 1; i <= 8; i++) {
    reports.push(
      report({
        id: `rep-wifi-hist-${i}`,
        buildingId: BUILDING_DEFS[i % BUILDING_DEFS.length].id,
        reporterId: `bg-student-${i}`,
        category: "IT",
        item: "wifi",
        title: "Wi-Fi dropping",
        tier: "Medium",
        status: "Fixed",
        location: `${BUILDING_DEFS[i % BUILDING_DEFS.length].name}, Floor 1`,
        incomplete: false,
        locationUnverified: false,
        createdAt: daysAgo(10 + i * 3),
      }),
    );
  }

  // A rebalanced spread of historical reports so EVERY public team (Facilities,
  // Dining, Housing, IT, Grounds, Safety) shows several reports, spanning all
  // tiers (Low→Urgent) and all statuses (Received→Won't fix). Some are "fixed
  // this week" and some are near-duplicates (same item + building) so the
  // duplicate-merge / co-sign feature is demonstrable. `daysAgo` keeps every
  // timestamp deterministic relative to the fixed seed clock.
  type Extra = {
    id: string;
    category: Report["category"];
    item: string;
    title: string;
    tier: Report["tier"];
    status: Report["status"];
    buildingId: string;
    days: number;
    reporterId?: string;
    resolutionNote?: string;
  };
  const extras: Extra[] = [
    // --- Facilities ---
    { id: "rep-heater", category: "Facilities", item: "heater", title: "Heater not working", tier: "High", status: "In progress", buildingId: "bldg-maseeh", days: 6 },
    { id: "rep-door", category: "Facilities", item: "door opener", title: "Automatic door opener broken", tier: "High", status: "Assigned", buildingId: "bldg-10", days: 8 },
    { id: "rep-leak", category: "Facilities", item: "ceiling leak", title: "Ceiling leaking in hallway", tier: "High", status: "Received", buildingId: "bldg-library", days: 1 },
    { id: "rep-elevator", category: "Facilities", item: "elevator", title: "Elevator stuck between floors", tier: "High", status: "In progress", buildingId: "bldg-32", days: 2 },
    { id: "rep-ac", category: "Facilities", item: "air conditioning", title: "AC blowing warm air in the lounge", tier: "Low", status: "Won't fix", buildingId: "bldg-e52", days: 20, resolutionNote: "Seasonal system; will revisit in spring." },
    { id: "rep-handrail-dup", category: "Facilities", item: "handrail", title: "Loose handrail, same stairwell", tier: "Medium", status: "Received", buildingId: "bldg-26", days: 2 },
    // --- Dining ---
    { id: "rep-vending", category: "Dining", item: "vending machine", title: "Vending machine ate my money", tier: "Low", status: "Fixed", buildingId: "bldg-w20", days: 4 },
    // A near-duplicate of the hero ice-cream report, kept CLOSED (Fixed) so it
    // never shadows rep-icecream as the live open duplicate at W20.
    { id: "rep-icecream-dup", category: "Dining", item: "ice cream machine", title: "Soft-serve machine was down last week", tier: "Medium", status: "Fixed", buildingId: "bldg-w20", days: 9 },
    { id: "rep-dishwasher", category: "Dining", item: "dishwasher", title: "Dish return belt jammed", tier: "High", status: "In progress", buildingId: "bldg-maseeh", days: 3 },
    { id: "rep-coffee", category: "Dining", item: "coffee machine", title: "Coffee machine out of order", tier: "Low", status: "Fixed", buildingId: "bldg-next", days: 5 },
    // --- Housing ---
    { id: "rep-shower", category: "Housing", item: "shower", title: "Shower stuck on cold", tier: "Medium", status: "Assigned", buildingId: "bldg-baker", days: 7 },
    { id: "rep-radiator", category: "Housing", item: "radiator", title: "Radiator clanking all night", tier: "Low", status: "Received", buildingId: "bldg-mccormick", days: 9 },
    { id: "rep-laundry", category: "Housing", item: "washing machine", title: "Dryer not heating in basement", tier: "Medium", status: "Fixed", buildingId: "bldg-next", days: 3 },
    { id: "rep-lock", category: "Housing", item: "door lock", title: "Room key card reader fails intermittently", tier: "High", status: "In progress", buildingId: "bldg-baker", days: 4 },
    // --- IT ---
    { id: "rep-printer", category: "IT", item: "printer", title: "Printer jammed on floor 2", tier: "Low", status: "Fixed", buildingId: "bldg-32", days: 6 },
    { id: "rep-projector", category: "IT", item: "projector", title: "Lecture hall projector won't connect", tier: "High", status: "Assigned", buildingId: "bldg-26", days: 2 },
    { id: "rep-outlet", category: "IT", item: "charging outlet", title: "Dead charging outlets at study carrels", tier: "Low", status: "Received", buildingId: "bldg-library", days: 5 },
    // --- Grounds ---
    { id: "rep-light", category: "Grounds", item: "pathway light", title: "Pathway light out", tier: "Medium", status: "Fixed", buildingId: "bldg-32", days: 4 },
    { id: "rep-light-dup", category: "Grounds", item: "pathway light", title: "Another path light dark near Stata", tier: "Medium", status: "Received", buildingId: "bldg-32", days: 2 },
    { id: "rep-ice", category: "Grounds", item: "icy walkway", title: "Icy walkway by the entrance", tier: "High", status: "In progress", buildingId: "bldg-w34", days: 3 },
    { id: "rep-bench", category: "Grounds", item: "bench", title: "Broken bench slat on the lawn", tier: "Low", status: "Won't fix", buildingId: "bldg-e25", days: 25, resolutionNote: "Scheduled for full bench replacement next quarter." },
    // --- Safety ---
    { id: "rep-exit", category: "Safety", item: "exit sign", title: "Emergency exit sign unlit", tier: "Urgent", status: "Assigned", buildingId: "bldg-26", days: 2 },
    { id: "rep-extinguisher", category: "Safety", item: "fire extinguisher", title: "Fire extinguisher past inspection date", tier: "High", status: "Received", buildingId: "bldg-maseeh", days: 5 },
    { id: "rep-alarm", category: "Safety", item: "smoke alarm", title: "Smoke alarm chirping low battery", tier: "Medium", status: "Fixed", buildingId: "bldg-mccormick", days: 4 },
  ];
  for (const e of extras) {
    reports.push(
      report({
        id: e.id,
        buildingId: e.buildingId,
        reporterId: e.reporterId ?? "bg-student-20",
        category: e.category,
        item: e.item,
        title: e.title,
        tier: e.tier,
        status: e.status,
        location: `${BUILDING_DEFS.find((b) => b.id === e.buildingId)?.name ?? "Campus"}`,
        incomplete: false,
        locationUnverified: false,
        resolutionNote: e.resolutionNote,
        createdAt: daysAgo(e.days),
      }),
    );
  }
  return reports;
}

// Co-signs: ice-cream report at 14 signers (reporter + 13 co-signers),
// handrail at 4 (reporter + 3), Wi-Fi at 9 (reporter + 8).
function mitCoSigns(): CoSign[] {
  const coSigns: CoSign[] = [];
  const add = (reportId: string, userId: string, offsetDays: number) => {
    coSigns.push({
      id: `cosign-${reportId}-${userId}`,
      reportId,
      userId,
      createdAt: daysAgo(offsetDays),
    });
  };
  // Reporters count as signed.
  add("rep-icecream", "user-ben", 2);
  add("rep-handrail", "user-cam", 3);
  add("rep-wifi", "user-ana", 1);
  // Additional co-signers to hit 14 / 4 / 9 total.
  for (let i = 1; i <= 13; i++) add("rep-icecream", `bg-student-${i}`, 1);
  for (let i = 14; i <= 16; i++) add("rep-handrail", `bg-student-${i}`, 2);
  for (let i = 17; i <= 24; i++) add("rep-wifi", `bg-student-${i}`, 1);

  // Varied co-sign counts across the enriched feed so the priority ranking
  // visibly differs (and the near-duplicates read as "others have this too").
  // Co-signs are per (report, user), so reusing the same background students
  // across DIFFERENT reports is legal and stays deterministic.
  const spread: Array<{ reportId: string; count: number }> = [
    { reportId: "rep-leak", count: 11 }, // Urgent + highly co-signed → tops Facilities
    { reportId: "rep-elevator", count: 7 },
    { reportId: "rep-exit", count: 6 },
    { reportId: "rep-ice", count: 5 },
    { reportId: "rep-icecream-dup", count: 5 },
    { reportId: "rep-projector", count: 4 },
    { reportId: "rep-handrail-dup", count: 3 },
    { reportId: "rep-light-dup", count: 3 },
    { reportId: "rep-dishwasher", count: 2 },
    { reportId: "rep-lock", count: 2 },
  ];
  for (const { reportId, count } of spread) {
    for (let i = 1; i <= count; i++) {
      add(reportId, `bg-student-${((i * 3) % 40) + 1}`, 1 + (i % 4));
    }
  }
  return coSigns;
}

// Two direct (private) reports: one Housing, one Title IX.
function mitPrivateReports(): PrivateReport[] {
  return [
    {
      id: "priv-housing",
      campusId: MIT_CAMPUS_ID,
      reporterId: "user-ana",
      office: "Housing",
      currentOffice: "Housing",
      title: "Roommate keeps leaving the door unlocked",
      body: "My roommate keeps leaving our door unlocked overnight and I don't feel safe.",
      status: "Received",
      dontShareName: false,
      createdAt: daysAgo(4),
    },
    {
      id: "priv-titleix",
      campusId: MIT_CAMPUS_ID,
      reporterId: "user-cam",
      office: "Title IX",
      currentOffice: "Title IX",
      title: "Harassing comments",
      body: "Someone in my lab keeps making comments about my race.",
      status: "Reviewing",
      dontShareName: true,
      createdAt: daysAgo(5),
    },
  ];
}

function mitPrivateMessages(): PrivateMessage[] {
  return [
    {
      id: "pm-titleix-1",
      reportId: "priv-titleix",
      authorRole: "office",
      authorId: "office-titleix",
      body: "Thank you for reporting. We're reviewing and will follow up.",
      createdAt: daysAgo(5),
    },
  ];
}

// Curated quick fixes including the Wi-Fi reconnect fix.
function mitQuickFixes(): QuickFix[] {
  return [
    { id: "qf-wifi-1", campusId: MIT_CAMPUS_ID, category: "IT", item: "wifi", text: "Forget the MIT network and reconnect, then re-accept the certificate." },
    { id: "qf-wifi-2", campusId: MIT_CAMPUS_ID, category: "IT", item: "wifi", text: "Toggle Wi-Fi off and on; move within 10 m of an access point." },
    { id: "qf-printer", campusId: MIT_CAMPUS_ID, category: "IT", item: "printer", text: "Open the front tray and clear any jammed sheet, then retry." },
    { id: "qf-vending", campusId: MIT_CAMPUS_ID, category: "Dining", item: "vending machine", text: "Note the machine ID on the front panel for a refund request." },
    { id: "qf-heater", campusId: MIT_CAMPUS_ID, category: "Facilities", item: "heater", text: "Check the thermostat is set above room temp and the vent isn't blocked." },
  ];
}

/** Build a fresh, mutable snapshot of the full MIT demo world. */
export function buildSeed(): Seed {
  return {
    campuses: [mitCampus()],
    buildings: mitBuildings(),
    users: mitUsers(),
    reports: mitReports(),
    coSigns: mitCoSigns(),
    notifications: [],
    privateReports: mitPrivateReports(),
    privateMessages: mitPrivateMessages(),
    accessLog: [],
    quickFixes: mitQuickFixes(),
    selfResolutions: [],
  };
}
