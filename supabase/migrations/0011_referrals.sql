-- Cup & Co — Referrals (Phase 7.1 of UPGRADE-PLAN.md)
--
-- Each user gets a stable referral code on signup. Sharing produces a
-- deep link `/r/<code>`. When a referee clicks, signs up, and places
-- their first paid order ≥ 30 EGP within 14 days, both sides earn:
--   - Referrer: +50 pts
--   - Referee:  +30 pts
--
-- Anti-fraud: same device fingerprint = no reward, referrer must be
-- Bronze+ for ≥ 7 days, referee's first order ≥ 30 EGP. The 30-day
-- click attribution window prevents stale-link conversion abuse.

-- ---------------------------------------------------------
-- 1. Codes on users
-- ---------------------------------------------------------

alter table users add column if not exists referral_code text;

-- Backfill existing users with a 7-char code (5 letters + 2 digits)
-- using a deterministic-but-unguessable seed. Idempotent — only fires
-- on rows where the column is null.
do $$
declare
  rec record;
  v_code text;
  v_attempt int;
begin
  for rec in select id from users where referral_code is null loop
    v_attempt := 0;
    loop
      v_attempt := v_attempt + 1;
      -- Build a code from base32-ish chars to avoid 0/O, 1/I confusion.
      v_code := upper(substring(md5(rec.id::text || v_attempt::text || gen_random_uuid()::text), 1, 5))
              || lpad((floor(random() * 90 + 10))::int::text, 2, '0');
      v_code := translate(v_code, '01OI', '23ZJ');
      begin
        update users set referral_code = v_code where id = rec.id;
        exit;
      exception when unique_violation then
        if v_attempt > 10 then
          raise exception 'Could not generate unique referral code for %', rec.id;
        end if;
      end;
    end loop;
  end loop;
end $$;

-- Now enforce uniqueness + non-null going forward.
alter table users alter column referral_code set not null;
create unique index if not exists idx_users_referral_code on users(referral_code);

-- ---------------------------------------------------------
-- 2. Referrals table
-- ---------------------------------------------------------

create type if not exists referral_status as enum (
  'pending',     -- click tracked, no signup yet
  'signed_up',   -- referee signed up; awaiting first paid order
  'converted',   -- referee placed first paid order; rewards credited
  'rejected'     -- anti-fraud blocked
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  -- Always set: the user whose code was clicked.
  referrer_id uuid not null references users(id),
  -- Set when the referee signs up.
  referee_id uuid references users(id),
  code text not null,
  status referral_status not null default 'pending',
  -- Anti-fraud signals captured at click time.
  click_ip inet,
  click_ua_hash text,
  ref_clicked_at timestamptz not null default now(),
  signed_up_at timestamptz,
  converted_at timestamptz,
  -- Reward amounts at the time of conversion (snapshotted so future
  -- pricing changes don't retroactively alter history).
  referrer_reward int,
  referee_reward int,
  reason_rejected text
);

create index if not exists idx_referrals_code on referrals(code);
create index if not exists idx_referrals_referrer on referrals(referrer_id);
create index if not exists idx_referrals_referee on referrals(referee_id) where referee_id is not null;
create index if not exists idx_referrals_status on referrals(status);

alter table referrals enable row level security;

-- Referrer + referee can both see the row.
create policy "referrals_referrer_read" on referrals for select using (auth.uid() = referrer_id);
create policy "referrals_referee_read" on referrals for select using (auth.uid() = referee_id);
-- Writes go through the API service-role.

-- ---------------------------------------------------------
-- 3. Stats helper for the share page
-- ---------------------------------------------------------

create or replace function referral_stats_for(uid uuid)
returns table (
  total_clicks int,
  total_signups int,
  total_conversions int,
  total_points_earned int
)
language sql
stable
as $$
  select
    count(*)::int as total_clicks,
    count(referee_id)::int as total_signups,
    count(*) filter (where status = 'converted')::int as total_conversions,
    coalesce(sum(referrer_reward) filter (where status = 'converted'), 0)::int as total_points_earned
  from referrals
  where referrer_id = uid;
$$;
