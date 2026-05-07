-- Cup & Co — Image CDN integration (Phase 3.4 of UPGRADE-PLAN.md)
--
-- Adds Cloudflare Images integration. Each product gets an optional
-- `image_id` pointing at the CDN; the existing `image_url` column stays
-- as a fallback for unmigrated products and as a graceful-degradation
-- path if Cloudflare Images is unreachable.
--
-- The migration is purely ADDITIVE. Existing products keep their
-- `image_url` until the bulk-upload script (`scripts/upload-images-to-cdn.ts`)
-- populates `image_id`. Customer-web's `cdnImage()` helper prefers
-- `image_id` when set, otherwise renders `image_url`.

alter table products add column if not exists image_id text;

-- Partial index on image_id so the customer-web can quickly identify
-- which products need a CDN URL build vs the fallback path.
create index if not exists idx_products_image_id on products(image_id) where image_id is not null;

-- Audit trail (informational comment) — the bulk-upload script logs each
-- migrated product to audit_log so we can replay if Cloudflare ever
-- needs re-ingestion:
--   insert into audit_log (action, target_type, target_id, after_data)
--   values ('product.image_uploaded_to_cdn', 'products', product_id,
--           jsonb_build_object('image_id', new_id, 'cf_account_hash', '...'));
