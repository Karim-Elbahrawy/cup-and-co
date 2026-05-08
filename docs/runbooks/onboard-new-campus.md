# Runbook — Onboarding a new campus

**Audience:** ops + senior dev. **Estimated time:** 30 minutes for a new campus from a clean staging baseline. **Last validated:** 2026-05-07.

This is the canonical procedure for adding a 2nd, 3rd, Nth campus to a Cup & Co installation that already has Phase 2.1 and 2.2 of `docs/UPGRADE-PLAN.md` deployed.

---

## Pre-flight checklist

Before you start:

- [ ] Phase 2.1 migration `0005_multi_campus.sql` is applied on the target database (verify: `select count(*) from campuses;` returns at least 1)
- [ ] Phase 2.2 customer campus selector is deployed (verify: `GET /campuses` on the API returns JSON)
- [ ] You have **owner** role in the admin app for at least one existing campus
- [ ] You have access to the Supabase project (dashboard or CLI)
- [ ] You know the new campus's:
  - Display name in English and Arabic
  - Slug (URL-safe lowercase, e.g. `auc-tagamoa`)
  - Timezone (e.g. `Africa/Cairo`, `Asia/Riyadh`, `Europe/Istanbul`)
  - Currency code (3-letter ISO, e.g. `EGP`, `SAR`, `TRY`)
  - Default language (`en` or `ar`)
  - Kiosk locations (lat/lng if available; building name otherwise)

If any item is unchecked, **stop**. Don't proceed with partial information.

---

## Step 1 — Seed the campus + first kiosk (5 min)

The simplest path is the SQL template at `docs/runbooks/sql/seed-campus.sql`. Open that file, replace the `:variable` placeholders (the file lists every one in a header block), and run it via the Supabase SQL editor or `psql`.

After the script runs, verify:

```sql
select id, slug, name_en, timezone, currency from campuses where slug = '<your-slug>';
select id, slug, name_en, campus_id from kiosks where campus_id = '<the-campus-id-from-above>';
```

You should see exactly one campus row and at least one kiosk row.

> **Note:** the script wraps everything in a single transaction. If any step fails, the whole thing rolls back — you don't end up with a half-onboarded campus.

---

## Step 2 — Seed the menu (10 min)

The new campus starts with an empty menu. You have three options:

### Option A — Copy the menu from an existing campus

Useful when the new campus shares the brand's standard menu.

```sql
-- Replace these UUIDs:
--   :source_campus_id  = the campus you're cloning the menu from
--   :target_campus_id  = the new campus you're onboarding
begin;

-- Copy categories
insert into categories (slug, name_en, name_ar, sort_order, campus_id)
select slug || '-' || (select slug from campuses where id = :target_campus_id),
       name_en, name_ar, sort_order, :target_campus_id
from categories
where campus_id = :source_campus_id;

-- Copy products (using the new campus's category ids)
insert into products (
  category_id, name_en, name_ar, description_en, description_ar,
  base_price_egp, image_url, prep_minutes, is_available,
  sort_order, campus_id
)
select
  (select c2.id from categories c2
   where c2.campus_id = :target_campus_id
     and c2.slug = c1.slug || '-' || (select slug from campuses where id = :target_campus_id)),
  p.name_en, p.name_ar, p.description_en, p.description_ar,
  p.base_price_egp, p.image_url, p.prep_minutes, p.is_available,
  p.sort_order, :target_campus_id
from products p
join categories c1 on c1.id = p.category_id
where p.campus_id = :source_campus_id;

-- TODO: copy product_options similarly if the menu has options

commit;
```

### Option B — Onboard via the admin app

Open the admin app, switch to the new campus via the campus selector dropdown (Phase 2.3), and use the existing Menu page to add categories + products manually. Best when the campus has a different menu.

### Option C — Skip menu seed for now

Acceptable for a soft-launch where the campus is bookable but not yet sellable. Add `is_active = false` on the campus until the menu is ready.

---

## Step 3 — Configure payment routing (5 min)

Each campus may use different Paymob credentials (e.g. different merchant accounts per franchise location). For v1.5, payment config is process-wide and lives in env vars on the API host. Multi-tenant payment routing is a v2 feature.

For now:

- If the new campus uses the same Paymob account → no action needed.
- If the new campus uses a different Paymob account → file an issue tagged `multi-campus-payment-routing` for the v2 backlog. Don't try to hack around this; the security implications of mixing payment credentials across campuses are not safe to improvise.

---

## Step 4 — Assign staff (5 min)

The admin app's user management (Phase 2.3) supports per-campus staff assignment. To add a barista or owner to the new campus:

1. Open admin → Settings → Staff
2. Click "Add staff member"
3. Enter their phone number; system creates the user account if it doesn't exist
4. Pick role (`barista` / `owner`)
5. Pick campus = your new campus

For v1.5 the assignment is exclusive — a staff member is assigned to one campus. Cross-campus staff is a v2 feature.

---

## Step 5 — Smoke test (5 min)

Before announcing the new campus is live, run this checklist:

### Public-side (incognito browser)
- [ ] `GET /campuses` returns the new campus
- [ ] `GET /campuses/<new-id>` returns the campus + its kiosks
- [ ] Customer-web campus picker (Profile → Campus) shows both old and new campuses
- [ ] Sign in as a test user, switch to the new campus, verify cart clears
- [ ] Browse the new campus's menu — every product shows
- [ ] Place a test order with the test user + cash payment
- [ ] Verify the order appears in admin under the new campus's filter

### Admin-side
- [ ] Sign in to admin as a staff member assigned to the new campus
- [ ] Verify dashboard shows only the new campus's data
- [ ] Verify the Orders list, Menu, Offers all scope to the new campus
- [ ] As super-admin, verify cross-campus comparison view shows both campuses

If any step fails, **stop** and investigate before announcing.

---

## Step 6 — Announce (informational, no system impact)

When everything passes the smoke test:
- Update `status.cupandco.app` (if you have one) with the new campus
- Push a one-time announcement notification to existing users via the admin push composer (Phase 4 will add this)
- Update marketing materials, social media, on-campus signage

---

## Rollback

If you need to remove the new campus before it goes live:

```sql
begin;
-- Mark inactive (preferred — preserves any test data)
update campuses set is_active = false where slug = '<your-slug>';
update kiosks set is_active = false where campus_id = (select id from campuses where slug = '<your-slug>');
commit;
```

To **fully remove** the campus (only safe when zero orders/loyalty exist):

```sql
begin;
-- Delete only after confirming no transactional data references this campus
delete from products where campus_id = '<id>';
delete from categories where campus_id = '<id>';
delete from kiosks where campus_id = '<id>';
delete from campuses where id = '<id>';
commit;
```

If transactional data exists (orders, loyalty), prefer the soft-delete (`is_active = false`) — purging would orphan rows.

---

## Common gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| New campus's products don't appear | Products were inserted without `campus_id` | Run `update products set campus_id = '<id>' where campus_id is null and ...` |
| Customer can't switch to new campus | Campus is `is_active = false` | Flip `is_active = true` in the campuses table |
| Existing user's cart contains items from old campus after switching | `useCart.clear()` wasn't called | Phase 2.2's `/profile/campus` page already calls `clear()` on switch — verify the API responded 200 (a 400/500 leaves cart intact) |
| Admin doesn't see the new campus | Staff member is assigned only to old campus | Add a `staff_users.campus_id = <new-id>` row OR assign them to multiple campuses if they're a super-admin |
| Wrong timezone in pickup time picker | `campuses.timezone` is wrong or the client doesn't read it | Update the row; Phase 2.2 reads timezone via `GET /me/campus` and tags `Intl.DateTimeFormat` accordingly |

---

## After Stage 2 of multi-campus migration

When `0006_multi_campus_enforce.sql` (Phase 2.x stage 2) lands and the API code starts filtering every query by `campus_id`, this runbook tightens up:

- All SQL examples above must explicitly pass `campus_id` (the migration removes nullable defaults)
- RLS will block cross-campus reads even for the service-role key (need to set `app.current_campus_id` per-session)
- Staff users will require a `campus_id` value (no more global staff)

Until then, this runbook works as written.

---

## Related

- Plan: `docs/UPGRADE-PLAN.md` Phase 2.4
- Migration: `supabase/migrations/0005_multi_campus.sql`
- Customer campus selector: `apps/customer-web/src/app/(authed)/profile/campus/page.tsx`
- API endpoints: `apps/api/src/app.ts` (`/campuses`, `/me/campus`)
- SQL template: `docs/runbooks/sql/seed-campus.sql`
