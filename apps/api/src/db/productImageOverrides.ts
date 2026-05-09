/**
 * Product image overrides — surface real PNG photography over whatever
 * the Supabase column or the fallback fixture currently has set.
 *
 * Why this layer exists: the FALLBACK catalog still references .svg
 * placeholder illustrations from the early days. The Supabase product
 * rows often have the same paths because the seed pre-dated the
 * photography drop. Updating both at once is risky (Supabase can
 * drift, FALLBACK is local-only). This override map is the
 * single source of truth — every catalog response runs each product
 * through it and we serve the best image we have on disk regardless
 * of where the row came from.
 *
 * Key by NAME (case-insensitive, EN canonical) rather than UUID so
 * that re-seeding Supabase, or running against the fallback, both
 * resolve correctly. Product names in the seed are stable; UUIDs are
 * not.
 *
 * The override path is what the kiosk's `<Image src={...}/>` will load;
 * it must exist in `apps/kiosk/public/images/products/` (and the
 * customer-web public/ for parity).
 *
 * If a product is NOT listed here, the original `image_url` from the
 * catalog row is preserved. Defense-in-depth: if a typo'd path crept
 * in here, we'd silently fall back to whatever was already there
 * rather than render a broken image.
 */

const KNOWN_PHOTOS: Record<string, string> = {
  // Hot / milk coffees — full-photo PNGs.
  'velvet cappuccino':   '/images/products/velvet_cappuccino.png',
  'caramel macchiato':   '/images/products/caramel_macchiato.png',
  'caramel frappuccino': '/images/products/caramel_frappuccino.png',
  'honey latte':         '/images/products/honey_latte.png',
  'hazelnut latte':      '/images/products/hazelnut_latte.png',
  'spanish latte':       '/images/products/spanish_latte.png',
  'mocha royale':        '/images/products/mocha_royale.png',
  'flat white':          '/images/products/flat_white.png',
  'hot chocolate':       '/images/products/hot_chocolate.png',
  'espresso romano':     '/images/products/espresso_romano.png',

  // Cold coffees.
  'iced americano':      '/images/products/iced_americano.png',
  'vanilla cold brew':   '/images/products/vanilla_cold_brew.png',

  // Drinks (non-coffee).
  'earl grey tea':       '/images/products/earl_grey_tea.png',
  'classic earl grey':   '/images/products/earl_grey_tea.png',
  'fresh orange juice':  '/images/products/orange_juice.png',
  'orange juice':        '/images/products/orange_juice.png',
  'peach iced tea':      '/images/products/peach_iced_tea.png',

  // Breakfast/dessert items without dedicated photography fall back to
  // the lifestyle bucket photos in their respective categories. These
  // still read as real food photography, just not product-specific —
  // visibly better than the flat SVG icons the kiosk had before.
  'avocado toast':         '/images/products/breakfast.png',
  'egg & cheese sandwich': '/images/products/breakfast.png',
  'smoked turkey bagel':   '/images/products/breakfast.png',
  'granola bowl':          '/images/products/breakfast.png',
  'acai bowl':             '/images/products/breakfast.png',
  'spinach feta wrap':     '/images/products/breakfast.png',

  'tiramisu cup':       '/images/products/dessert.png',
  'brownie bar':        '/images/products/dessert.png',
  'almond croissant':   '/images/products/dessert.png',
  'cheesecake slice':   '/images/products/dessert.png',
  'chocolate tart':     '/images/products/dessert.png',
  'cinnamon roll':      '/images/products/dessert.png',
};

/** Returns the best-known image URL for a product, or null if no override exists. */
export function bestImageFor(productNameEn: string): string | null {
  const key = productNameEn.trim().toLowerCase();
  return KNOWN_PHOTOS[key] ?? null;
}
