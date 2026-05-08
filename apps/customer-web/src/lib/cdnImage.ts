/**
 * Cloudflare Images URL builder — Phase 3.4 of UPGRADE-PLAN.md.
 *
 * Cloudflare Images URL pattern:
 *   https://imagedelivery.net/<account_hash>/<image_id>/<variant>
 *
 * `<variant>` is a named transform configured in the Cloudflare dashboard.
 * For Cup & Co we standardize on three:
 *   - `thumb`   — 160px square, ~10KB, used in cart line items
 *   - `card`    — 400px wide,    ~30KB, used in product cards / list grids
 *   - `hero`    — 1200px wide,   ~80KB, used in product detail page hero
 *
 * Three usage patterns:
 *   1. cdnImage(product, 'card')       — preferred; reads product.image_id
 *      with `image_url` fallback when CDN isn't ready or the product
 *      hasn't been migrated yet.
 *   2. cdnImageById(id, 'hero')        — for cases where you only have the id.
 *   3. <Image src={cdnImage(p, 'card')} /> — drop-in for next/image.
 *
 * No-op safety: when NEXT_PUBLIC_CF_IMAGES_HASH is unset (local dev,
 * staging without Cloudflare), `cdnImage()` returns the product's
 * `image_url` directly. The migration is therefore a deploy-anytime
 * change — image rendering stays identical until the env var lands.
 */

import type { Product } from '@cup-and-co/types';

export type CdnImageVariant = 'thumb' | 'card' | 'hero';

const CF_IMAGES_HOST = 'https://imagedelivery.net';

function getAccountHash(): string | null {
  // NEXT_PUBLIC_ so it's safe in the browser bundle. The hash isn't a
  // secret — it's part of every public image URL anyway.
  const hash = process.env.NEXT_PUBLIC_CF_IMAGES_HASH;
  return hash && hash.length > 0 ? hash : null;
}

/**
 * Build a CDN URL for a product, with a graceful fallback to the
 * legacy `image_url`. **Prefer this** over `cdnImageById` — the
 * fallback path is what makes the migration safe.
 */
export function cdnImage(
  product: Pick<Product, 'image_id' | 'image_url'>,
  variant: CdnImageVariant,
): string {
  const hash = getAccountHash();
  if (!hash || !product.image_id) {
    return product.image_url ?? '';
  }
  return `${CF_IMAGES_HOST}/${hash}/${product.image_id}/${variant}`;
}

/**
 * Build a CDN URL when only the image_id is known. No fallback —
 * caller is responsible for handling the unset-hash case.
 */
export function cdnImageById(imageId: string, variant: CdnImageVariant): string | null {
  const hash = getAccountHash();
  if (!hash) return null;
  return `${CF_IMAGES_HOST}/${hash}/${imageId}/${variant}`;
}

/** True iff Cloudflare Images is configured. Useful for conditional UI. */
export function isCdnEnabled(): boolean {
  return getAccountHash() !== null;
}
