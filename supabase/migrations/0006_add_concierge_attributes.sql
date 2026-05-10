-- Migration 0005: Cup AI Concierge — semantic attributes on products
-- Adds the data layer that powers the "describe what you want" experience.
-- All columns are nullable so existing rows keep working; admin UI fills them in.
-- Idempotent: safe to re-run.

-- ───────────────────────────────────────────────────────────────────────────
-- energy_level: how stimulating the drink is on a 3-point scale
-- ───────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'energy_level'
  ) then
    alter table products
      add column energy_level text default null
        check (energy_level is null or energy_level in ('low', 'medium', 'high'));
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- sweetness: 0 (bitter / savoury) … 5 (very sweet)
-- ───────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'sweetness'
  ) then
    alter table products
      add column sweetness int default null
        check (sweetness is null or (sweetness >= 0 and sweetness <= 5));
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- temperature: 'hot' / 'cold' / 'both' (e.g. drinks that come in either)
-- ───────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'temperature'
  ) then
    alter table products
      add column temperature text default null
        check (temperature is null or temperature in ('hot', 'cold', 'both'));
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- caffeine_mg: rough estimate, drives "energising" / "decaf" matching
-- ───────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'caffeine_mg'
  ) then
    alter table products
      add column caffeine_mg int default null
        check (caffeine_mg is null or caffeine_mg >= 0);
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- tags_en / tags_ar: free-form descriptors used by the matcher
-- e.g. ['refreshing', 'creamy', 'nutty'] / ['منعش', 'كريمي']
-- ───────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'tags_en'
  ) then
    alter table products
      add column tags_en text[] default '{}'::text[];
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'tags_ar'
  ) then
    alter table products
      add column tags_ar text[] default '{}'::text[];
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- GIN indexes on the tag arrays — fast contains() lookups for the matcher.
-- ───────────────────────────────────────────────────────────────────────────
create index if not exists idx_products_tags_en on products using gin (tags_en);
create index if not exists idx_products_tags_ar on products using gin (tags_ar);
