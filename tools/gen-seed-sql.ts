// Generates supabase/seed.sql from the shared buildSeed() data, so the SQL
// seed and the in-memory/test seed can never drift. Run with:
//   npx tsx tools/gen-seed-sql.ts   (or via the npm script)
//
// Not part of the app bundle or tests; a build-time authoring helper.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSeed } from "../src/lib/store/seed";

function q(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${value.replace(/'/g, "''")}'`;
}

function arr(values: string[]): string {
  if (values.length === 0) return "'{}'";
  return `ARRAY[${values.map((v) => q(v)).join(", ")}]`;
}

function insert(table: string, columns: string[], rows: string[][]): string {
  if (rows.length === 0) return `-- (no ${table} rows)\n`;
  const values = rows.map((r) => `  (${r.join(", ")})`).join(",\n");
  return `insert into ${table} (${columns.join(", ")}) values\n${values}\non conflict (id) do nothing;\n`;
}

const seed = buildSeed();
const parts: string[] = [
  "-- CampusFix seed data (MIT demo campus).",
  "-- GENERATED from src/lib/store/seed.ts by tools/gen-seed-sql.ts — do not edit by hand.",
  "-- Regenerate with: npm run gen:seed",
  "",
];

parts.push(
  insert(
    "campuses",
    ["id", "name", "city", "state", "latitude", "longitude", "city_service_name", "city_service_url", "city_service_phone", "campus_police_name", "campus_police_phone", "counseling_name", "counseling_url"],
    seed.campuses.map((c) => [q(c.id), q(c.name), q(c.city), q(c.state), q(c.latitude), q(c.longitude), q(c.cityServiceName), q(c.cityServiceUrl), q(c.cityServicePhone), q(c.campusPoliceName), q(c.campusPolicePhone), q(c.counselingName), q(c.counselingUrl)]),
  ),
);

parts.push(
  insert(
    "buildings",
    ["id", "campus_id", "name", "latitude", "longitude", "floors", "dining_halls"],
    seed.buildings.map((b) => [q(b.id), q(b.campusId), q(b.name), q(b.latitude), q(b.longitude), arr(b.floors), arr(b.diningHalls)]),
  ),
);

parts.push(
  insert(
    "users",
    ["id", "name", "email", "role", "public_team", "private_office"],
    seed.users.map((u) => [q(u.id), q(u.name), q(u.email), q(u.role), q(u.publicTeam ?? null), q(u.privateOffice ?? null)]),
  ),
);

parts.push(
  insert(
    "reports",
    ["id", "campus_id", "building_id", "reporter_id", "category", "item", "title", "tier", "status", "location", "incomplete", "location_unverified", "photo_url", "resolution_note", "created_at"],
    seed.reports.map((r) => [q(r.id), q(r.campusId), q(r.buildingId ?? null), q(r.reporterId), q(r.category), q(r.item), q(r.title), q(r.tier), q(r.status), q(r.location), q(r.incomplete), q(r.locationUnverified), q(r.photoUrl ?? null), q(r.resolutionNote ?? null), q(r.createdAt)]),
  ),
);

parts.push(
  insert(
    "co_signs",
    ["id", "report_id", "user_id", "created_at"],
    seed.coSigns.map((c) => [q(c.id), q(c.reportId), q(c.userId), q(c.createdAt)]),
  ),
);

parts.push(
  insert(
    "private_reports",
    ["id", "campus_id", "reporter_id", "office", "current_office", "title", "body", "status", "dont_share_name", "resolution_note", "created_at"],
    seed.privateReports.map((p) => [q(p.id), q(p.campusId), q(p.reporterId), q(p.office), q(p.currentOffice), q(p.title), q(p.body), q(p.status), q(p.dontShareName), q(p.resolutionNote ?? null), q(p.createdAt)]),
  ),
);

parts.push(
  insert(
    "private_messages",
    ["id", "report_id", "author_role", "author_id", "body", "created_at"],
    seed.privateMessages.map((m) => [q(m.id), q(m.reportId), q(m.authorRole), q(m.authorId), q(m.body), q(m.createdAt)]),
  ),
);

parts.push(
  insert(
    "quick_fixes",
    ["id", "campus_id", "category", "item", "text"],
    seed.quickFixes.map((f) => [q(f.id), q(f.campusId), q(f.category), q(f.item ?? null), q(f.text)]),
  ),
);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "seed.sql");
writeFileSync(out, parts.join("\n") + "\n");
console.log(`Wrote ${out}`);
