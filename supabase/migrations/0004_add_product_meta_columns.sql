-- Migration 0004: add review_mode and stock_count to products
-- These columns are required by the Phase 3/5 review & stock management features.
-- Safe to run multiple times (idempotent — ALTER COLUMN is skipped if the column exists).

-- review_mode controls what customers see on the product detail page
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

-- stock_count tracks inventory: null = unlimited, 0 = sold out, positive = units left
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
