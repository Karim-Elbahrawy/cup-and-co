-- Cup & Co — Tiered loyalty (Phase 6.3 of UPGRADE-PLAN.md)
--
-- Three tiers based on trailing 12-month points earned:
--   Bronze    0–499 pts/yr     (default)
--   Silver  500–1999 pts/yr    1.25× points multiplier; 1×/mo free upsize; birthday drink free
--   Gold      2000+ pts/yr     1.5×  points multiplier; 4×/mo free upsize; birthday drink free; KDS priority badge
--
-- Tier is recalculated nightly by a cron (`recalculate_user_tier()`).
-- It can also be called inline from the API after a points credit
-- so a customer who hits the threshold mid-day gets the celebration
-- on their next refresh.
--
-- Annual rolling reset — we look at the last 365 days continuously,
-- not calendar year. Demotion takes 2 consecutive sub-threshold months
-- to absorb seasonal dips.

create type if not exists loyalty_tier as enum ('bronze', 'silver', 'gold');

alter table users add column if not exists current_tier loyalty_tier not null default 'bronze';
alter table users add column if not exists tier_calculated_at timestamptz;
alter table users add column if not exists tier_below_threshold_streak int not null default 0;

create index if not exists idx_users_tier on users(current_tier);

create table if not exists tier_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  from_tier loyalty_tier,
  to_tier loyalty_tier not null,
  trailing_12m_points int not null,
  reason text,
  changed_at timestamptz not null default now()
);
create index if not exists idx_tier_history_user on tier_history(user_id, changed_at desc);

alter table tier_history enable row level security;
create policy "tier_history_own_read" on tier_history for select using (auth.uid() = user_id);

-- ============================================================
-- Tier calculation
-- ============================================================
-- Sums the user's earned (positive) loyalty_points entries from the
-- last 365 days, picks a tier, and updates users.current_tier +
-- inserts a tier_history row when the tier actually changes.
--
-- Demotion logic: a user who falls below their tier's lower bound
-- gets `tier_below_threshold_streak += 1`. Demotion only fires after
-- 2 consecutive nightly runs of sub-threshold (~60 days). Promotion
-- is immediate.

create or replace function recalculate_user_tier(uid uuid)
returns loyalty_tier
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_points int;
  v_old_tier loyalty_tier;
  v_new_tier loyalty_tier;
  v_streak int;
begin
  select coalesce(sum(points), 0)::int
    into v_points
    from loyalty_points
   where user_id = uid
     and points > 0
     and created_at > now() - interval '365 days';

  select current_tier, tier_below_threshold_streak
    into v_old_tier, v_streak
    from users
   where id = uid;

  if v_points >= 2000 then
    v_new_tier := 'gold';
  elsif v_points >= 500 then
    v_new_tier := 'silver';
  else
    v_new_tier := 'bronze';
  end if;

  -- Promotion is immediate; demotion requires 2 consecutive runs below.
  if v_new_tier::text < v_old_tier::text then
    -- (Enum order: bronze < silver < gold lexicographically too — careful)
    -- We rebuild the comparison via a CASE to be safe:
    declare
      v_old_rank int := case v_old_tier when 'bronze' then 1 when 'silver' then 2 when 'gold' then 3 end;
      v_new_rank int := case v_new_tier when 'bronze' then 1 when 'silver' then 2 when 'gold' then 3 end;
    begin
      if v_new_rank < v_old_rank then
        if v_streak >= 1 then
          -- Second consecutive sub-threshold run: actually demote.
          insert into tier_history (user_id, from_tier, to_tier, trailing_12m_points, reason)
          values (uid, v_old_tier, v_new_tier, v_points, 'demotion (2 cycles below)');
          update users
             set current_tier = v_new_tier,
                 tier_calculated_at = now(),
                 tier_below_threshold_streak = 0
           where id = uid;
        else
          -- First sub-threshold run: count it but don't demote yet.
          update users
             set tier_below_threshold_streak = v_streak + 1,
                 tier_calculated_at = now()
           where id = uid;
          v_new_tier := v_old_tier;
        end if;
      else
        -- Same or higher: clear the streak counter.
        update users
           set tier_calculated_at = now(),
               tier_below_threshold_streak = 0
         where id = uid;
      end if;
    end;
  elsif v_new_tier::text > v_old_tier::text then
    -- Promotion — immediate.
    insert into tier_history (user_id, from_tier, to_tier, trailing_12m_points, reason)
    values (uid, v_old_tier, v_new_tier, v_points, 'promotion');
    update users
       set current_tier = v_new_tier,
           tier_calculated_at = now(),
           tier_below_threshold_streak = 0
     where id = uid;
  else
    -- No change.
    update users
       set tier_calculated_at = now(),
           tier_below_threshold_streak = 0
     where id = uid;
  end if;

  return v_new_tier;
end;
$$;

revoke all on function recalculate_user_tier(uuid) from public;

-- ============================================================
-- Nightly cron driver
-- ============================================================
-- Walks every active (non-deleted) user. Cheap at v1.5 scale.
-- Schedule with: select recalculate_all_tiers();

create or replace function recalculate_all_tiers()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rec record;
  v_count int := 0;
begin
  for rec in
    select id from users where deleted_at is null
  loop
    perform recalculate_user_tier(rec.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function recalculate_all_tiers() from public;
