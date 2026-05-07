-- Cup & Co — User streaks (Phase 6.2 of UPGRADE-PLAN.md)
--
-- Tracks consecutive-day order ritual + a "freeze" mechanic that lets
-- a user skip one day per calendar week without breaking their streak.
-- Daily ritual + loss-aversion = the cheapest retention engine in the
-- coffee playbook.
--
-- One row per user. Updated on every paid order_placed; auto-broken
-- by a daily midnight cron (`break_idle_streaks()`) if the user hasn't
-- ordered in 24h+ AND has no freezes left.

create table if not exists user_streaks (
  user_id uuid primary key references users(id),
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  -- Date of the last paid order. NULL means user has never ordered.
  -- Stored as `date` so timezone shifts don't accidentally bump it.
  last_order_date date,
  -- Number of weekly freezes used in the current ISO week. Reset by
  -- the cron when the week rolls.
  freezes_used_this_week int not null default 0 check (freezes_used_this_week >= 0),
  freezes_reset_at timestamptz not null default date_trunc('week', now()),
  -- Tracks the day-7 bonus payout streak so we don't double-credit.
  last_bonus_streak int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_streaks_last_order on user_streaks(last_order_date);

-- Auto-touch
create or replace function set_user_streaks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_streaks_updated_at on user_streaks;
create trigger trg_user_streaks_updated_at
  before update on user_streaks
  for each row execute function set_user_streaks_updated_at();

-- RLS — users see only their own row
alter table user_streaks enable row level security;
create policy "user_streaks_own_read" on user_streaks for select using (auth.uid() = user_id);
-- INSERT/UPDATE go through the API service-role; no direct write policy needed

-- ============================================================
-- Daily-break helper (runs at 00:05 UTC via Supabase cron)
-- ============================================================
-- For each user whose last_order_date is older than yesterday:
--   - If freezes_used_this_week < 1 (one free skip per week): consume a
--     freeze and DON'T break the streak. The freeze counts as if they
--     ordered yesterday.
--   - Otherwise: reset current_streak to 0.
-- Also rolls the freezes counter on Monday 00:05 UTC.

create or replace function break_idle_streaks()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int := 0;
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_week_start timestamptz := date_trunc('week', now());
  rec record;
begin
  -- Roll the weekly freeze counter on Monday.
  update user_streaks
     set freezes_used_this_week = 0,
         freezes_reset_at = v_week_start
   where freezes_reset_at < v_week_start;

  -- For users who haven't ordered today AND last_order_date < yesterday
  -- (so they missed at least one full day): apply freeze or break.
  for rec in
    select user_id, current_streak, freezes_used_this_week
      from user_streaks
     where last_order_date is not null
       and last_order_date < v_yesterday
       and current_streak > 0
  loop
    if rec.freezes_used_this_week < 1 then
      -- Consume a freeze. Treat last_order_date as yesterday so a
      -- subsequent order today extends the streak normally.
      update user_streaks
         set freezes_used_this_week = freezes_used_this_week + 1,
             last_order_date = v_yesterday
       where user_id = rec.user_id;
    else
      -- Out of freezes: break the streak.
      update user_streaks
         set current_streak = 0
       where user_id = rec.user_id;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function break_idle_streaks() from public;
