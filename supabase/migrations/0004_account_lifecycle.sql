-- Cup & Co — Account Lifecycle (Phase 1.3 of UPGRADE-PLAN.md)
--
-- Adds the soft-delete + data-export infrastructure required by Egypt's
-- Personal Data Protection Law (Law No. 151 of 2020) and Apple App Store
-- guideline 5.1.1(v) (in-app account deletion).
--
-- Strategy: anonymize-in-place (NOT cascade-delete). This preserves FK
-- chains so historical orders/loyalty stay intact for accounting, but the
-- user's row is stripped of all PII. Operationally equivalent to deletion
-- from the data subject's perspective — phone, name, university details
-- are gone — while the business retains the non-identifying transactional
-- record it needs.
--
-- Grace period: 30 days. Within grace, user can sign back in and cancel.
-- After grace, a daily cron calls anonymize_user(uid) and the row becomes
-- a tombstone.

-- ========================================
-- Users: lifecycle columns
-- ========================================

alter table users add column if not exists deleted_at timestamptz;
alter table users add column if not exists deletion_requested_at timestamptz;

-- Partial index — only the soft-deleted rows get indexed, keeps it tiny.
create index if not exists idx_users_deleted_at on users(deleted_at) where deleted_at is not null;

-- The cron job will key on this for hard-delete eligibility.
create index if not exists idx_users_deletion_requested on users(deletion_requested_at) where deletion_requested_at is not null;

-- ========================================
-- RLS: deleted users invisible to themselves
-- ========================================
-- Soft-deleted users can still authenticate (Supabase Auth lives in
-- auth.users and is independent), but reads/updates of THIS table's row
-- are blocked. The /me/account/cancel-deletion endpoint uses an admin
-- client to clear deleted_at.

drop policy if exists "users_own_read" on users;
create policy "users_own_read" on users for select
  using (auth.uid() = id and deleted_at is null);

drop policy if exists "users_own_update" on users;
create policy "users_own_update" on users for update
  using (auth.uid() = id and deleted_at is null);

-- ========================================
-- Data exports
-- ========================================

create table if not exists data_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  -- Storage path inside Supabase Storage bucket `data-exports`.
  storage_path text,
  -- 7-day signed-URL expiry from done_at.
  expires_at timestamptz,
  -- Capture failure reason for support.
  error text,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_data_exports_user on data_exports(user_id);
create index if not exists idx_data_exports_pending on data_exports(status) where status = 'pending';

alter table data_exports enable row level security;

create policy "data_exports_own_read" on data_exports for select using (auth.uid() = user_id);
-- INSERT goes through the API's service role; no direct insert policy here.

-- ========================================
-- Anonymization function
-- ========================================
-- Called by the daily hard-delete cron for every user whose
-- deletion_requested_at + 30 days < now(). Idempotent; safe to retry.
--
-- Cascade strategy (designed to be reversibility-aware AND PDPL-compliant):
--   users         → PII stripped, deleted_at preserved as tombstone
--   push_devices  → DELETE (purely identifying, no business value)
--   favorites     → DELETE (per-user state, no business value)
--   game_sessions → DELETE (per-user state)
--   reviews       → comment cleared, rating kept (statistical signal,
--                   reviewer identity gone)
--   orders        → user_id stays linked to the (now-anonymized) row.
--                   Historical order amounts + payment audit preserved
--                   for accounting.
--   loyalty_points→ stays linked. Aggregate statistics preserved; user
--                   identity is gone via the users-row anonymization.
--   audit_log     → entry RECORDED (compliance trail).

create or replace function anonymize_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  before_phone text;
begin
  -- Capture before-state for audit (just phone hash for traceability —
  -- not the actual phone, to avoid leaving PII in the audit table).
  select phone into before_phone from users where id = uid;
  if before_phone is null then
    -- Already deleted or never existed. Idempotent: no-op.
    return;
  end if;

  -- Strip PII from users row. Phone becomes a deterministic tombstone so
  -- any FK paths still resolve, but it can't be used to identify or
  -- contact the person.
  update users set
    phone = '[deleted-' || uid::text || ']',
    full_name = null,
    university_id = null,
    major = null,
    department = null,
    biometric_enabled = false
  where id = uid;

  -- Hard-delete pure-state tables.
  delete from push_devices where user_id = uid;
  delete from favorites where user_id = uid;
  delete from game_sessions where user_id = uid;

  -- Wipe review comments (free-form text → potential PII).
  -- Keep the rating + product_id for product-quality statistics.
  update reviews set comment = null where user_id = uid;

  -- Audit trail — store a hash of the prior phone, never the phone itself.
  insert into audit_log (actor_id, action, target_type, target_id, after_data)
  values (
    uid,
    'account.hard_delete',
    'users',
    uid::text,
    jsonb_build_object(
      'anonymized_at', now(),
      'prior_phone_hash', encode(digest(before_phone, 'sha256'), 'hex')
    )
  );
end;
$$;

revoke all on function anonymize_user(uuid) from public;
-- The cron job invokes this with the service-role key.

-- ========================================
-- Rate-limit helper for data exports
-- ========================================
-- Used by the API to reject repeated export requests within 7 days.

create or replace function can_request_export(uid uuid)
returns boolean
language sql
stable
as $$
  select not exists (
    select 1 from data_exports
    where user_id = uid
      and created_at > now() - interval '7 days'
      and status in ('pending', 'running', 'done')
  );
$$;

-- ========================================
-- Cron-friendly view
-- ========================================
-- Lists users eligible for hard-delete (grace period elapsed). The
-- daily Edge Function (or a cron job) iterates this view and calls
-- anonymize_user(id) for each row, then nulls out deletion_requested_at
-- so it doesn't reprocess.

create or replace view users_due_for_hard_delete as
  select id, deletion_requested_at
  from users
  where deleted_at is not null
    and deletion_requested_at is not null
    and deletion_requested_at < now() - interval '30 days';
