-- Cup & Co — Multi-Campus Architecture (Phase 2.1 of UPGRADE-PLAN.md)
--
-- Adds the data-layer plumbing for hosting multiple university campuses
-- under a single Cup & Co installation. Schema-breaking risk is the highest
-- in the entire upgrade plan: this touches every transactional table.
--
-- Strategy: ADDITIVE-ONLY in this PR. New columns are NULLABLE with
-- backfilled values, NOT marked NOT NULL yet. This keeps the existing API
-- (which has zero knowledge of campus_id) functional. A follow-up PR
-- ("0006_multi_campus_enforce.sql") will:
--   1. Update the API to pass campus_id on every INSERT
--   2. Then ALTER COLUMN ... SET NOT NULL on these columns
--   3. Then update RLS policies to filter by current_setting('app.current_campus_id')
--
-- Rolling out in two stages eliminates the "deploy migration first or API
-- first" race condition. With this migration applied:
--   - Old API code keeps working (campus_id is nullable, has backfilled values)
--   - New API code can read/write campus_id immediately
--   - When all writers pass campus_id, flip NOT NULL in stage 2

-- ========================================
-- 1. campuses table
-- ========================================

create table if not exists campuses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_ar text not null,
  timezone text not null default 'Africa/Cairo',
  currency text not null default 'EGP',
  default_language text not null default 'en' check (default_language in ('en', 'ar')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table campuses enable row level security;
-- Public read so the customer-web campus picker can list options without auth.
create policy "campuses_public_read" on campuses for select using (is_active = true);

-- Seed the only campus that currently exists. Subsequent campuses are added
-- via the admin UI (Phase 2.3) or directly via SQL using the playbook in
-- docs/runbooks/onboard-new-campus.md (Phase 2.4).
insert into campuses (slug, name_en, name_ar)
values ('cairo-main', 'Cairo Main Campus', 'الحرم الجامعي الرئيسي')
on conflict (slug) do nothing;

-- ========================================
-- 2. kiosks table
-- ========================================
-- Replaces the singleton `kiosk_status` table. Each campus can have N kiosks
-- (e.g., main building, library annex, dorm cafe). For v1 we seed one kiosk
-- per campus with the same defaults `kiosk_status` had.

create table if not exists kiosks (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references campuses(id),
  slug text not null,
  name_en text not null,
  name_ar text not null,
  building text,
  lat numeric(10,7),
  lng numeric(10,7),
  is_open boolean not null default true,
  message_en text,
  message_ar text,
  capacity_per_slot int not null default 10,
  slot_minutes int not null default 15,
  opens_at time not null default '07:00',
  closes_at time not null default '22:00',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (campus_id, slug)
);

create index if not exists idx_kiosks_campus on kiosks(campus_id);
create index if not exists idx_kiosks_active on kiosks(is_active) where is_active = true;

alter table kiosks enable row level security;
create policy "kiosks_public_read" on kiosks for select using (is_active = true);

-- Seed the default kiosk for the existing campus and copy state from the
-- legacy kiosk_status table if it exists and has rows.
insert into kiosks (campus_id, slug, name_en, name_ar)
select c.id, 'main', 'Main Kiosk', 'الكيوسك الرئيسي'
from campuses c
where c.slug = 'cairo-main'
on conflict (campus_id, slug) do nothing;

-- Migrate state from legacy kiosk_status (if it exists). Best-effort —
-- if kiosk_status has zero rows or differing schema, skip.
do $$
declare
  v_campus_id uuid;
  v_status record;
begin
  select id into v_campus_id from campuses where slug = 'cairo-main' limit 1;
  if v_campus_id is null then
    return;
  end if;
  begin
    select * into v_status from kiosk_status limit 1;
    if found then
      update kiosks set
        is_open = v_status.is_open,
        message_en = v_status.message_en,
        message_ar = v_status.message_ar,
        capacity_per_slot = v_status.capacity_per_slot,
        slot_minutes = v_status.slot_minutes,
        opens_at = v_status.opens_at,
        closes_at = v_status.closes_at
      where campus_id = v_campus_id and slug = 'main';
    end if;
  exception when undefined_table then
    -- kiosk_status doesn't exist; nothing to migrate.
    null;
  end;
end $$;

-- NOTE: kiosk_status table is intentionally LEFT IN PLACE for now. The
-- existing API still reads/writes it. Stage 2 migration removes it after
-- the API migrates to the kiosks table.

-- ========================================
-- 3. Add campus_id to transactional tables
-- ========================================
-- All NULLABLE in this stage. Backfilled with the only campus that exists.
-- Stage 2 flips NOT NULL after the API code passes campus_id on writes.

alter table users add column if not exists current_campus_id uuid references campuses(id);
alter table products add column if not exists campus_id uuid references campuses(id);
alter table categories add column if not exists campus_id uuid references campuses(id);
alter table orders add column if not exists campus_id uuid references campuses(id);
alter table orders add column if not exists kiosk_id uuid references kiosks(id);
alter table loyalty_points add column if not exists campus_id uuid references campuses(id);
alter table reviews add column if not exists campus_id uuid references campuses(id);
alter table offers add column if not exists campus_id uuid references campuses(id);
alter table prizes add column if not exists campus_id uuid references campuses(id);
alter table leaderboard_weeks add column if not exists campus_id uuid references campuses(id);
alter table game_sessions add column if not exists campus_id uuid references campuses(id);
alter table qr_receipts add column if not exists campus_id uuid references campuses(id);
alter table push_devices add column if not exists campus_id uuid references campuses(id);

-- ========================================
-- 4. Backfill
-- ========================================

do $$
declare
  v_campus_id uuid;
  v_kiosk_id uuid;
begin
  select id into v_campus_id from campuses where slug = 'cairo-main' limit 1;
  if v_campus_id is null then
    raise exception 'cairo-main campus not seeded — migration aborted';
  end if;
  select id into v_kiosk_id from kiosks where campus_id = v_campus_id and slug = 'main' limit 1;

  update users set current_campus_id = v_campus_id where current_campus_id is null;
  update products set campus_id = v_campus_id where campus_id is null;
  update categories set campus_id = v_campus_id where campus_id is null;
  update orders set campus_id = v_campus_id where campus_id is null;
  update orders set kiosk_id = v_kiosk_id where kiosk_id is null;
  update loyalty_points set campus_id = v_campus_id where campus_id is null;
  update reviews set campus_id = v_campus_id where campus_id is null;
  update offers set campus_id = v_campus_id where campus_id is null;
  update prizes set campus_id = v_campus_id where campus_id is null;
  update leaderboard_weeks set campus_id = v_campus_id where campus_id is null;
  update game_sessions set campus_id = v_campus_id where campus_id is null;
  update qr_receipts set campus_id = v_campus_id where campus_id is null;
  update push_devices set campus_id = v_campus_id where campus_id is null;
end $$;

-- ========================================
-- 5. Indexes for campus-scoped queries
-- ========================================
-- Partial indexes wherever campus_id can stay nullable post-stage-1.

create index if not exists idx_users_campus on users(current_campus_id) where current_campus_id is not null;
create index if not exists idx_products_campus on products(campus_id);
create index if not exists idx_categories_campus on categories(campus_id);
create index if not exists idx_orders_campus on orders(campus_id);
create index if not exists idx_orders_kiosk on orders(kiosk_id);
create index if not exists idx_loyalty_campus on loyalty_points(campus_id);
create index if not exists idx_reviews_campus on reviews(campus_id);
create index if not exists idx_offers_campus on offers(campus_id) where campus_id is not null;
create index if not exists idx_prizes_campus on prizes(campus_id);
create index if not exists idx_leaderboard_weeks_campus on leaderboard_weeks(campus_id);
create index if not exists idx_game_sessions_campus on game_sessions(campus_id);
create index if not exists idx_qr_receipts_campus on qr_receipts(campus_id);
create index if not exists idx_push_devices_campus on push_devices(campus_id) where campus_id is not null;

-- ========================================
-- 6. Helper view for the daily-opening admin dashboard
-- ========================================
-- Combines kiosk state + campus name. The admin UI (Phase 2.3) reads
-- from here to render the per-campus "today's status" widget.

create or replace view kiosk_status_with_campus as
  select
    k.id as kiosk_id,
    k.slug as kiosk_slug,
    k.name_en as kiosk_name_en,
    k.name_ar as kiosk_name_ar,
    k.is_open,
    k.message_en,
    k.message_ar,
    k.capacity_per_slot,
    k.slot_minutes,
    k.opens_at,
    k.closes_at,
    c.id as campus_id,
    c.slug as campus_slug,
    c.name_en as campus_name_en,
    c.name_ar as campus_name_ar,
    c.timezone,
    c.currency
  from kiosks k
  join campuses c on c.id = k.campus_id
  where k.is_active and c.is_active;

-- ========================================
-- 7. Rollback notes (for ops)
-- ========================================
-- This migration is REVERSIBLE in stage 1. To roll back:
--   1. Drop new columns (they have no NOT NULL or unique constraints):
--      alter table users drop column current_campus_id;
--      ...etc
--   2. Drop new indexes
--   3. Drop view kiosk_status_with_campus
--   4. Drop tables: drop table kiosks; drop table campuses;
-- After stage 2 ("0006_multi_campus_enforce.sql") flips NOT NULL and
-- drops kiosk_status, rollback becomes destructive — that is by design.
