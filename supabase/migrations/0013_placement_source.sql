-- 0013_placement_source.sql — Phase K1.11 of docs/KIOSK-PLAN.md
--
-- Tags every order with the surface that placed it (kiosk, customer app,
-- or admin phone-in) so:
--   • Reporting can split sales by channel without joining synthetic IDs
--   • The KDS can highlight kiosk orders that need on-the-spot pickup
--   • A future per-kiosk leaderboard / settle-out flow has the data it needs
--
-- Backfill: existing rows default to 'customer_app' since every order in
-- production today came from the customer-web/iOS apps.

create type placement_source as enum ('customer_app', 'kiosk', 'admin_phone');

alter table orders
  add column placement_source placement_source not null default 'customer_app',
  -- kiosk_id stays nullable: only populated for kiosk-placed orders. The
  -- referenced `kiosks` table doesn't exist yet (lands in K6 with the
  -- multi-kiosk admin); for now we track kiosk_id as a free-form uuid so
  -- the column ships before the FK target exists. K6 adds the FK.
  add column kiosk_id uuid;

create index orders_placement_source_idx on orders (placement_source);
create index orders_kiosk_id_idx on orders (kiosk_id) where kiosk_id is not null;

comment on column orders.placement_source is
  'Surface that placed the order: customer_app (default), kiosk, admin_phone.';
comment on column orders.kiosk_id is
  'Kiosk that placed the order (null for non-kiosk orders). FK to kiosks table added in K6.';
