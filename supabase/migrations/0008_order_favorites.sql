-- Cup & Co — Order favorites (Phase 6.1 of UPGRADE-PLAN.md)
--
-- Stores entire saved order configurations ("my usual") — separate from
-- the existing `favorites` table which tracks product-level hearts.
-- Coffee is a daily ritual; this powers the one-tap reorder loop and
-- the morning "your usual?" suggestion.
--
-- Each row is a self-contained order shape: items + customizations +
-- optional time-of-day hint + name. The customer can have many; one
-- can be flagged `is_default` for the morning push.

create table if not exists order_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  -- User-editable label. Defaults on create to a humanized first item
  -- name, e.g. "Iced caramel macchiato w/ less sugar".
  name text not null,
  -- The cart payload. Each entry is { product_id, options, qty }.
  -- Stored as jsonb so we can store custom option labels without joining.
  items jsonb not null default '[]'::jsonb,
  -- Optional hint that powers the time-of-day suggestion engine
  -- (Phase 6.4). NULL means "any time."
  time_of_day text check (time_of_day in ('morning', 'midday', 'evening')),
  -- Exactly one favorite per user can be the default (enforced via
  -- partial unique index below).
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_order_favorites_user on order_favorites(user_id);
create index if not exists idx_order_favorites_user_created on order_favorites(user_id, created_at desc);

-- One default per user. NULLs aren't unique to themselves, so a user
-- with zero defaults doesn't conflict with anything.
create unique index if not exists idx_order_favorites_user_default
  on order_favorites(user_id) where is_default = true;

-- updated_at auto-touch
create or replace function set_order_favorite_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_order_favorites_updated_at on order_favorites;
create trigger trg_order_favorites_updated_at
  before update on order_favorites
  for each row execute function set_order_favorite_updated_at();

-- RLS: users see only their own favorites.
alter table order_favorites enable row level security;
create policy "order_favorites_own_read" on order_favorites for select using (auth.uid() = user_id);
create policy "order_favorites_own_insert" on order_favorites for insert with check (auth.uid() = user_id);
create policy "order_favorites_own_update" on order_favorites for update using (auth.uid() = user_id);
create policy "order_favorites_own_delete" on order_favorites for delete using (auth.uid() = user_id);
