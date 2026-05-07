-- Cup & Co — Product inventory (Phase 3.2 of UPGRADE-PLAN.md)
--
-- Adds the lightweight inventory state customers need to see "out of
-- stock" UI without a heavyweight stock-quantity tracking system.
-- Two columns:
--
--   is_out_of_stock          — boolean toggle, set by staff
--   out_of_stock_until       — optional auto-clear timestamp
--
-- A daily cron clears `is_out_of_stock` rows whose `out_of_stock_until`
-- has passed, so a barista can mark "out of caramel until 2pm" and have
-- it auto-resume.
--
-- Stock-quantity tracking (deduct-on-order, low-stock alerts) is a v2
-- feature; this 80/20 covers the common case: "we ran out of beans for
-- this drink, hide it for the day."

alter table products add column if not exists is_out_of_stock boolean not null default false;
alter table products add column if not exists out_of_stock_until timestamptz;

-- Partial index — only the out-of-stock rows get indexed. Tiny.
create index if not exists idx_products_out_of_stock on products(is_out_of_stock) where is_out_of_stock = true;

-- Auto-clear function — call from a cron job every 5-15 minutes. Safe to
-- run on a schedule indefinitely (idempotent; only touches expired holds).
create or replace function clear_expired_stock_holds()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  with cleared as (
    update products
       set is_out_of_stock = false,
           out_of_stock_until = null
     where is_out_of_stock = true
       and out_of_stock_until is not null
       and out_of_stock_until < now()
    returning id
  )
  select count(*) into v_count from cleared;
  return v_count;
end;
$$;

revoke all on function clear_expired_stock_holds() from public;
-- Cron uses the service-role key.

-- Audit log helper — staff actions that toggle stock should record an
-- entry. The API does the INSERT inline; this is just a comment for the
-- API author to follow.
--   insert into audit_log (actor_id, action, target_type, target_id, after_data)
--   values (staff_id, 'product.stock_toggle', 'products', product_id,
--           jsonb_build_object('is_out_of_stock', new_value, 'until', new_until));
