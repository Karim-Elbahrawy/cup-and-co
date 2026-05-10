-- Cup & Co — Persist in-memory stores (SHIP-PLAN Phase 2.1)
--
-- Move four in-memory Map-based stores in apps/api/src/db/ to durable
-- Supabase tables. The stores keep their in-memory cache + sync function
-- signatures; this migration is the durable backing layer that survives
-- a Render redeploy and works across multi-instance scaling.
--
-- Stores covered:
--   1. kiosksStore.ts          → kiosk_devices       (iPad heartbeat fleet)
--   2. kioskRatingsStore.ts    → kiosk_ratings       (post-order 👍/👎)
--   3. featuredProductsStore   → featured_products   (admin "feature today")
--   4. productPairsStore       → product_pairs       (admin combo override)
--
-- Notes:
--   • A separate `kiosk_devices` table is used (not the existing `kiosks`
--     table from 0005_multi_campus). The 0005 `kiosks` table represents
--     admin-defined storefront kiosks per campus and has NOT-NULL columns
--     (campus_id, name_en, name_ar) that the iPad heartbeat flow cannot
--     populate at auto-create time. `kiosk_devices` is the iPad fleet
--     registry — UUIDs minted by the iPad and sent in `x-kiosk-id`.
--   • All writes go through the API service-role client. RLS is enabled
--     on every table and public-read is exposed only where the data is
--     non-sensitive (featured_products, product_pairs). Ratings stay
--     admin-only.
--   • Stores fall back to the in-memory Map when SUPABASE_URL is unset
--     or points at the local stub (preserves dev / vitest workflow with
--     no external infra).

-- ============================================================
-- 1. kiosk_devices  (iPad fleet heartbeat tracking)
-- ============================================================
create table if not exists kiosk_devices (
  id uuid primary key,
  name text not null,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  last_state text not null default 'unknown',
  version text,
  created_at timestamptz not null default now()
);

create index if not exists idx_kiosk_devices_last_seen
  on kiosk_devices(last_seen_at desc);

alter table kiosk_devices enable row level security;
-- Writes go through the API service-role client. No public select policy
-- — admin reads come through service-role too via /admin/kiosks.
create policy "kiosk_devices_service_only" on kiosk_devices for select using (false);

comment on table kiosk_devices is
  'iPad kiosk fleet. Auto-populated on first heartbeat for an x-kiosk-id; admin renames + deactivates via /admin/kiosks. Distinct from `kiosks` table which holds admin-defined campus storefronts.';

-- ============================================================
-- 2. kiosk_ratings  (one row per (order_id, kiosk_id))
-- ============================================================
create table if not exists kiosk_ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  kiosk_id uuid not null,
  rating text not null check (rating in ('up', 'down')),
  rated_at timestamptz not null default now(),
  unique (order_id)
);

create index if not exists idx_kiosk_ratings_kiosk_rated
  on kiosk_ratings(kiosk_id, rated_at desc);

alter table kiosk_ratings enable row level security;
create policy "kiosk_ratings_service_only" on kiosk_ratings for select using (false);

comment on table kiosk_ratings is
  'Post-order kiosk rating (👍/👎). One rating per order — second submit is a silent no-op. Aggregated per kiosk for /admin/reports/by-kiosk.';

-- ============================================================
-- 3. featured_products  (admin-toggled "feature today")
-- ============================================================
create table if not exists featured_products (
  product_id uuid primary key references products(id) on delete cascade,
  set_at timestamptz not null default now()
);

alter table featured_products enable row level security;
-- Public read so the customer-web + kiosk catalogue can surface the
-- "feature today" flag without an extra round trip / auth.
create policy "featured_products_public_read" on featured_products for select using (true);

comment on table featured_products is
  'Admin-toggled "feature today" set. Each row = one product the admin has marked as today''s hero. Read by /catalog into the is_featured_today flag.';

-- ============================================================
-- 4. product_pairs  (admin per-product "complete the combo" override)
-- ============================================================
create table if not exists product_pairs (
  product_id uuid primary key references products(id) on delete cascade,
  pair_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table product_pairs enable row level security;
-- Public read — pairings power the customer-facing "complete the combo"
-- upsell, no auth required.
create policy "product_pairs_public_read" on product_pairs for select using (true);

comment on table product_pairs is
  'Admin per-product override of the "complete the combo" pairing list. Replaces the curated category-default when set. Empty array is a valid override meaning "no pairings for this product".';
