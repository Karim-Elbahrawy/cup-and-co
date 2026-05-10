-- Migration 0014: add review_mode and stock_count to products
--
-- Both columns are referenced by `packages/types/src/index.ts > Product`
-- but no migration on main creates them — admin pages and customer-web
-- code that reads these will silently get `undefined` until this lands.
--
-- review_mode controls what customers see in the product detail Reviews
-- section (`full` shows stars + list + form, `write_only` shows form only,
-- `hidden` shows nothing). Defaults to `'full'` so existing products keep
-- their current behaviour.
--
-- stock_count tracks inventory units: NULL = unlimited (the default),
-- 0 = sold out, positive = units left. Complements `is_out_of_stock`
-- from migration 0007 (the staff-managed override). Both fields are
-- consulted when deciding whether to show the out-of-stock pill.
--
-- Idempotent: safe to re-run; the existence checks skip the ALTERs if
-- the columns are already there.

-- review_mode
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'review_mode'
  ) then
    alter table products
      add column review_mode text not null default 'full'
        check (review_mode in ('full', 'write_only', 'hidden'));
  end if;
end $$;

-- stock_count
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'stock_count'
  ) then
    alter table products
      add column stock_count int default null;
  end if;
end $$;
