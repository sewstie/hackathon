-- UniFix database schema.
--
-- Campus-agnostic civic-repair app. Applied by `./ship-keys schema` (which runs
-- this file) and mirrored by src/lib/supabase/database.types.ts. Snake_case
-- columns map to the camelCase domain types in src/types.
--
-- Demo note: the anon key has no row-level security in the demo, so
-- office-scoped access control for private reports is enforced in the store
-- module (src/lib/store), not here.

-- ---------------------------------------------------------------------------
-- Campuses (with city hand-off + safety/counseling config)
-- ---------------------------------------------------------------------------
create table if not exists campuses (
  id                   text primary key,
  name                 text not null,
  city                 text not null,
  state                text not null,
  latitude             double precision not null,
  longitude            double precision not null,
  city_service_name    text not null,
  city_service_url     text not null,
  city_service_phone   text not null,
  campus_police_name   text not null,
  campus_police_phone  text not null,
  counseling_name      text not null,
  counseling_url       text not null
);

-- ---------------------------------------------------------------------------
-- Buildings (coordinates + floors + dining halls)
-- ---------------------------------------------------------------------------
create table if not exists buildings (
  id            text primary key,
  campus_id     text not null references campuses (id) on delete cascade,
  name          text not null,
  latitude      double precision not null,
  longitude     double precision not null,
  floors        text[] not null default '{}',
  dining_halls  text[] not null default '{}'
);
create index if not exists buildings_campus_idx on buildings (campus_id);

-- ---------------------------------------------------------------------------
-- Users (demo roster; real school-email auth resolves to the same row later)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id              text primary key,
  name            text not null,
  email           text not null unique,
  role            text not null check (role in ('student', 'responder')),
  public_team     text,
  private_office  text
);

-- ---------------------------------------------------------------------------
-- Public reports
-- ---------------------------------------------------------------------------
create table if not exists reports (
  id                   text primary key,
  campus_id            text not null references campuses (id) on delete cascade,
  building_id          text references buildings (id) on delete set null,
  reporter_id          text not null references users (id) on delete cascade,
  category             text not null check (category in ('Facilities','Dining','Housing','IT','Grounds','Safety','City')),
  item                 text not null,
  title                text not null,
  tier                 text not null check (tier in ('Low','Medium','High','Urgent')),
  status               text not null check (status in ('Received','Assigned','In progress','Fixed','Won''t fix')),
  location             text not null,
  incomplete           boolean not null default false,
  location_unverified  boolean not null default false,
  photo_url            text,
  resolution_note      text,
  created_at           timestamptz not null default now()
);
create index if not exists reports_campus_idx on reports (campus_id);
create index if not exists reports_building_idx on reports (building_id);

-- ---------------------------------------------------------------------------
-- Co-signs (one per user per report; reporter counts as signed)
-- ---------------------------------------------------------------------------
create table if not exists co_signs (
  id          text primary key,
  report_id   text not null references reports (id) on delete cascade,
  user_id     text not null references users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (report_id, user_id)
);
create index if not exists co_signs_report_idx on co_signs (report_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id            text primary key,
  recipient_id  text not null references users (id) on delete cascade,
  body          text not null,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on notifications (recipient_id);

-- ---------------------------------------------------------------------------
-- Private (direct) reports — office-scoped
-- ---------------------------------------------------------------------------
create table if not exists private_reports (
  id               text primary key,
  campus_id        text not null references campuses (id) on delete cascade,
  reporter_id      text not null references users (id) on delete cascade,
  office           text not null,
  current_office   text not null,
  title            text not null,
  body             text not null,
  status           text not null check (status in ('Received','Reviewing','Resolved','Referred')),
  dont_share_name  boolean not null default false,
  resolution_note  text,
  created_at       timestamptz not null default now()
);
create index if not exists private_reports_office_idx on private_reports (current_office);

-- ---------------------------------------------------------------------------
-- Private message thread (two-way, office-scoped)
-- ---------------------------------------------------------------------------
create table if not exists private_messages (
  id           text primary key,
  report_id    text not null references private_reports (id) on delete cascade,
  author_role  text not null check (author_role in ('student', 'office')),
  author_id    text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists private_messages_report_idx on private_messages (report_id);

-- ---------------------------------------------------------------------------
-- Access log (append-only audit trail for private reports + safety taps)
-- ---------------------------------------------------------------------------
create table if not exists access_log (
  id            text primary key,
  actor_id      text not null,
  actor_office  text,
  action        text not null,
  report_id     text not null,
  created_at    timestamptz not null default now()
);
create index if not exists access_log_report_idx on access_log (report_id);

-- ---------------------------------------------------------------------------
-- Quick fixes (curated; seeded or staff-promoted) + self-resolutions
-- ---------------------------------------------------------------------------
create table if not exists quick_fixes (
  id         text primary key,
  campus_id  text not null references campuses (id) on delete cascade,
  category   text not null,
  item       text,
  text       text not null
);
create index if not exists quick_fixes_campus_idx on quick_fixes (campus_id);

create table if not exists self_resolutions (
  id          text primary key,
  campus_id   text not null references campuses (id) on delete cascade,
  user_id     text not null references users (id) on delete cascade,
  category    text not null,
  item        text,
  created_at  timestamptz not null default now()
);
