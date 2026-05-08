-- Cup & Co — Seed-a-new-campus SQL template
-- Last updated: 2026-05-07. Aligns with migration 0005_multi_campus.sql.
--
-- USAGE:
--   1. Replace every :placeholder below with the real value
--   2. Run via Supabase SQL editor or `psql -d <db> -f seed-campus.sql`
--   3. Verify with the SELECTs at the bottom
--
-- PLACEHOLDERS (set these all before running):
--   :slug                — URL-safe lowercase, e.g. 'auc-tagamoa'
--   :name_en             — Display name (English), e.g. 'AUC Tagamoa'
--   :name_ar             — Display name (Arabic), e.g. 'الجامعة الأمريكية - التجمع'
--   :timezone            — IANA, e.g. 'Africa/Cairo'
--   :currency            — ISO 4217 3-letter, e.g. 'EGP'
--   :default_language    — 'en' or 'ar'
--   :kiosk_slug          — kiosk slug, e.g. 'main' or 'library-annex'
--   :kiosk_name_en       — kiosk display name in English
--   :kiosk_name_ar       — kiosk display name in Arabic
--   :kiosk_building      — building label, NULL if not applicable
--   :kiosk_lat           — latitude as numeric, NULL if unknown
--   :kiosk_lng           — longitude as numeric, NULL if unknown
--
-- The whole script is wrapped in a transaction. If anything fails, the
-- entire onboarding rolls back — you don't end up half-onboarded.

begin;

-- ----------------------------------------------------------------------
-- 1. Insert the campus
-- ----------------------------------------------------------------------
with new_campus as (
  insert into campuses (slug, name_en, name_ar, timezone, currency, default_language, is_active)
  values (
    :'slug',
    :'name_en',
    :'name_ar',
    :'timezone',
    :'currency',
    :'default_language',
    true
  )
  returning id
)

-- ----------------------------------------------------------------------
-- 2. Insert the first kiosk for that campus
-- ----------------------------------------------------------------------
insert into kiosks (
  campus_id,
  slug,
  name_en,
  name_ar,
  building,
  lat,
  lng,
  is_open,
  is_active,
  message_en,
  message_ar
)
select
  new_campus.id,
  :'kiosk_slug',
  :'kiosk_name_en',
  :'kiosk_name_ar',
  nullif(:'kiosk_building', ''),
  nullif(:'kiosk_lat', '')::numeric,
  nullif(:'kiosk_lng', '')::numeric,
  true,
  true,
  'We are open — your morning is handled',
  'مفتوحون — صباحك معانا'
from new_campus;

commit;

-- ----------------------------------------------------------------------
-- Verification — should return one row each
-- ----------------------------------------------------------------------
-- (run these manually after the COMMIT above)
--
-- select id, slug, name_en, timezone, currency, default_language, is_active
-- from campuses where slug = :'slug';
--
-- select k.id, k.slug, k.name_en, k.is_open, k.is_active, c.slug as campus_slug
-- from kiosks k
-- join campuses c on c.id = k.campus_id
-- where c.slug = :'slug';
--
-- select * from kiosk_status_with_campus where campus_slug = :'slug';
