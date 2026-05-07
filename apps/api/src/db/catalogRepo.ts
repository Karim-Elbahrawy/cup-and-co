import type {
  CatalogResponse,
  Category,
  Product,
  ProductOption,
  Offer,
  KioskStatus,
  ProductDetailResponse,
  Review,
  ReviewMode,
} from '@cup-and-co/types';
import { getServiceClient } from './supabase.js';
import { config } from '../config.js';

/**
 * Fallback in-memory catalog used when Supabase is not configured (no
 * SUPABASE_URL set or local dev without `supabase start`). Mirrors the
 * shape of the seed.sql data so the customer app and tests work end-to-end
 * without external infra.
 */
const FALLBACK: CatalogResponse = {
  categories: [
    { id: '11111111-1111-1111-1111-111111111101', slug: 'hot_coffee',  name_en: 'Hot Coffee',  name_ar: 'قهوة ساخنة', sort_order: 1 },
    { id: '11111111-1111-1111-1111-111111111102', slug: 'cold_coffee', name_en: 'Cold Coffee', name_ar: 'قهوة باردة', sort_order: 2 },
    { id: '11111111-1111-1111-1111-111111111103', slug: 'milk_coffee', name_en: 'Milk Coffee', name_ar: 'قهوة بالحليب', sort_order: 3 },
    { id: '11111111-1111-1111-1111-111111111104', slug: 'hot_teas',    name_en: 'Hot Teas',    name_ar: 'شاي ساخن',   sort_order: 4 },
    { id: '11111111-1111-1111-1111-111111111105', slug: 'hot_drinks',  name_en: 'Hot Drinks',  name_ar: 'مشروبات ساخنة', sort_order: 5 },
    { id: '11111111-1111-1111-1111-111111111106', slug: 'blended',     name_en: 'Blended',     name_ar: 'مخلوط',      sort_order: 6 },
    { id: '11111111-1111-1111-1111-111111111107', slug: 'desserts',    name_en: 'Desserts',    name_ar: 'حلويات',      sort_order: 7 },
    { id: '11111111-1111-1111-1111-111111111108', slug: 'breakfast',   name_en: 'Breakfast',   name_ar: 'فطور',        sort_order: 8 },
  ],
  products: [
    p('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111103', 'Velvet Cappuccino',  'كابتشينو فيلفيت',     'Silky steamed milk over a double shot, dusted with cocoa', 65, '/images/products/velvet_cappuccino.svg', 5, 1, 4.9, 128),
    p('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111103', 'Caramel Macchiato',  'كراميل ماكياتو',       'Espresso, vanilla, foam, and a caramel drizzle',           70, '/images/products/caramel_macchiato.svg', 5, 2, 4.8, 96),
    p('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111103', 'Honey Latte',        'لاتيه عسل',           'Local honey blended with espresso and steamed milk',       68, '/images/products/honey_latte.svg', 5, 3, 4.7, 64),
    p('22222222-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111102', 'Vanilla Cold Brew',  'كولد برو فانيليا',     '12-hour cold brew, vanilla, over ice',                     62, '/images/products/vanilla_cold_brew.svg', 3, 4, 4.8, 82),
    p('22222222-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111101', 'Espresso Romano',    'إسبريسو رومانو',       'Double shot with a twist of lemon',                        45, '/images/products/espresso_romano.svg', 3, 5, 4.6, 41),
    p('22222222-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111102', 'Iced Americano',     'أمريكانو مثلج',       'Long espresso shaken over ice',                            50, '/images/products/iced_americano.svg', 3, 6, 4.7, 73),
    p('22222222-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111103', 'Mocha Royale',       'موكا رويال',           'Dark chocolate ganache, espresso, milk',                   75, '/images/products/mocha_royale.svg', 6, 7, 4.9, 110),
    p('22222222-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111103', 'Hazelnut Latte',     'لاتيه بندق',          'Roasted hazelnut syrup, espresso, milk',                   68, '/images/products/hazelnut_latte.svg', 5, 8, 4.6, 58),
    p('22222222-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111103', 'Spanish Latte',      'لاتيه إسباني',         'Espresso, condensed milk, steamed milk',                   70, '/images/products/spanish_latte.svg', 5, 9, 4.8, 92),
    p('22222222-0000-0000-0000-00000000000A', '11111111-1111-1111-1111-111111111103', 'Flat White',         'فلات وايت',            'Double ristretto under silky microfoam',                   63, '/images/products/flat_white.svg', 5, 10, 4.7, 67),
    p('22222222-0000-0000-0000-00000000000B', '11111111-1111-1111-1111-111111111107', 'Tiramisu Cup',         'كأس تيراميسو',         'Mascarpone, espresso-soaked ladyfingers, cocoa',           85, '/images/products/tiramisu_cup.svg', 2, 1, 4.9, 88),
    p('22222222-0000-0000-0000-00000000000C', '11111111-1111-1111-1111-111111111107', 'Brownie Bar',          'براوني',                'Fudgy double-chocolate brownie',                           55, '/images/products/brownie_bar.svg', 2, 2, 4.7, 74),
    p('22222222-0000-0000-0000-00000000000D', '11111111-1111-1111-1111-111111111107', 'Almond Croissant',     'كرواسون لوز',           'Buttery croissant filled with almond cream',               60, '/images/products/almond_croissant.svg', 2, 3, 4.8, 56),
    p('22222222-0000-0000-0000-00000000000E', '11111111-1111-1111-1111-111111111107', 'Cheesecake Slice',     'تشيز كيك',              'New York style cheesecake, berry compote',                 70, '/images/products/cheesecake_slice.svg', 2, 4, 4.8, 81),
    p('22222222-0000-0000-0000-00000000000F', '11111111-1111-1111-1111-111111111107', 'Chocolate Tart',       'تارت شوكولاتة',          'Dark chocolate ganache in butter pastry',                  65, '/images/products/chocolate_tart.svg', 2, 5, 4.7, 49),
    p('22222222-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111107', 'Cinnamon Roll',        'سينامون رول',            'Warm cinnamon roll with cream cheese glaze',               50, '/images/products/cinnamon_roll.svg', 2, 6, 4.6, 42),
    p('22222222-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111108', 'Avocado Toast',          'توست أفوكادو',           'Sourdough, smashed avocado, chili flakes, lemon',          80, '/images/products/avocado_toast.svg', 7, 1, 4.7, 65),
    p('22222222-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111108', 'Egg & Cheese Sandwich',  'ساندويتش بيض وجبنة',       'Scrambled eggs, melted cheese, on a toasted bun',          65, '/images/products/egg_cheese_sandwich.svg', 6, 2, 4.6, 54),
    p('22222222-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111108', 'Smoked Turkey Bagel',    'بيغل ديك رومي مدخن',        'Smoked turkey, swiss, mustard, on a fresh bagel',          75, '/images/products/smoked_turkey_bagel.svg', 6, 3, 4.7, 48),
    p('22222222-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111108', 'Granola Bowl',           'وعاء جرانولا',           'House granola, yogurt, seasonal fruit, honey',             70, '/images/products/granola_bowl.svg', 5, 4, 4.8, 62),
    p('22222222-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111108', 'Acai Bowl',              'وعاء آساي',              'Acai, banana, granola, fresh berries',                     90, '/images/products/acai_bowl.svg', 5, 5, 4.9, 71),
    p('22222222-0000-0000-0000-000000000016', '11111111-1111-1111-1111-111111111108', 'Spinach Feta Wrap',      'راب سبانخ وفيتا',          'Spinach, feta, sundried tomatoes in spinach tortilla',     75, '/images/products/spinach_feta_wrap.svg', 6, 6, 4.6, 38),
  ],
  offers: [
    {
      id: 'offer-today-70',
      name_en: 'Today Only — 70% Super Discount',
      name_ar: 'اليوم فقط — خصم خاص ٧٠٪',
      type: 'percentage',
      value: 70,
      starts_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      ends_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
      target_roles: ['student', 'faculty', 'office'],
      code: null,
      usage_limit: null,
      usage_count: 0,
    },
  ],
  kiosk: {
    id: 'kiosk-1',
    is_open: true,
    message_en: 'We are open — your morning is handled',
    message_ar: 'مفتوحون — صباحك معانا',
    capacity_per_slot: 10,
    slot_minutes: 15,
    opens_at: '07:00',
    closes_at: '22:00',
  },
};

function p(
  id: string,
  category_id: string,
  name_en: string,
  name_ar: string,
  description_en: string,
  base_price_egp: number,
  image_url: string,
  prep_minutes = 5,
  sort_order = 0,
  rating_avg = 4.7,
  rating_count = 0,
): Product {
  return {
    id,
    category_id,
    name_en,
    name_ar,
    description_en,
    description_ar: '',
    base_price_egp,
    image_url,
    prep_minutes,
    is_available: true,
    sort_order,
    rating_avg,
    rating_count,
  };
}

const SHOT_OPTIONS: Omit<ProductOption, 'product_id' | 'id'>[] = [
  { group_name: 'shots', name_en: 'Single', name_ar: 'شوت واحد', price_delta_egp: 0 },
  { group_name: 'shots', name_en: 'Double', name_ar: 'شوتين',    price_delta_egp: 10 },
];

const COFFEE_OPTIONS: Omit<ProductOption, 'product_id' | 'id'>[] = [
  { group_name: 'size',  name_en: 'Small',  name_ar: 'صغير',  price_delta_egp: -5 },
  { group_name: 'size',  name_en: 'Medium', name_ar: 'وسط',   price_delta_egp: 0 },
  { group_name: 'size',  name_en: 'Large',  name_ar: 'كبير',  price_delta_egp: 10 },
  { group_name: 'sugar', name_en: 'Normal', name_ar: 'عادي',  price_delta_egp: 0 },
  { group_name: 'sugar', name_en: 'Less',   name_ar: 'أقل',   price_delta_egp: 0 },
  { group_name: 'sugar', name_en: 'No',     name_ar: 'بدون',  price_delta_egp: 0 },
];

const ICE_OPTIONS: Omit<ProductOption, 'product_id' | 'id'>[] = [
  { group_name: 'ice', name_en: 'Normal', name_ar: 'عادي', price_delta_egp: 0 },
  { group_name: 'ice', name_en: 'Less',   name_ar: 'أقل',  price_delta_egp: 0 },
  { group_name: 'ice', name_en: 'No',     name_ar: 'بدون', price_delta_egp: 0 },
];

// Category IDs
const HOT_COFFEE_CAT  = '11111111-1111-1111-1111-111111111101';
const COLD_COFFEE_CAT = '11111111-1111-1111-1111-111111111102';
const MILK_COFFEE_CAT = '11111111-1111-1111-1111-111111111103';

function fallbackOptionsFor(productId: string): ProductOption[] {
  const product = FALLBACK.products.find((x) => x.id === productId);
  if (!product) return [];
  const { category_id: cat } = product;
  const coffeeCategories = [HOT_COFFEE_CAT, COLD_COFFEE_CAT, MILK_COFFEE_CAT];
  if (!coffeeCategories.includes(cat)) return [];

  // Hot/milk espresso drinks get shot + size + sugar options.
  // Cold coffee additionally gets ice.
  const withShots = cat === HOT_COFFEE_CAT || cat === MILK_COFFEE_CAT;
  const all: Omit<ProductOption, 'product_id' | 'id'>[] = [
    ...(withShots ? SHOT_OPTIONS : []),
    ...COFFEE_OPTIONS,
    ...(cat === COLD_COFFEE_CAT ? ICE_OPTIONS : []),
  ];
  return all.map((o, i) => ({ ...o, id: `${productId}-opt-${i}`, product_id: productId }));
}

// ─── Per-product review-mode overlay ─────────────────────────────────────────
// Default is 'full'. The admin can cycle this per-product at runtime.
const productReviewMode = new Map<string, ReviewMode>();

export function setProductReviewMode(productId: string, mode: ReviewMode): void {
  productReviewMode.set(productId, mode);
}

export function getProductReviewMode(productId: string): ReviewMode {
  return productReviewMode.get(productId) ?? 'full';
}

function isSupabaseReady(): boolean {
  return !!(config.supabase.serviceRoleKey && config.supabase.url && !config.supabase.url.includes('127.0.0.1:54321'));
}

/**
 * In-memory product overlay for fallback mode. Lets the admin "Add product"
 * flow create new menu items at runtime without a Supabase write. Lives only
 * for the lifetime of the API process — production uses the real DB insert.
 */
const extraProducts: Product[] = [];

export interface AddProductInput {
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en?: string | null;
  description_ar?: string | null;
  base_price_egp: number;
  image_url?: string | null;
  prep_minutes?: number | null;
}

export function addProduct(input: AddProductInput): Product {
  const sortOrder = FALLBACK.products.length + extraProducts.length + 1;
  const slug = input.name_en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || `product-${sortOrder}`;
  const product: Product = {
    id: `99999999-0000-0000-0000-${String(sortOrder).padStart(12, '0')}`,
    category_id: input.category_id,
    name_en: input.name_en,
    name_ar: input.name_ar,
    description_en: input.description_en ?? '',
    description_ar: input.description_ar ?? '',
    base_price_egp: input.base_price_egp,
    image_url: input.image_url || `/images/products/${slug}.svg`,
    prep_minutes: input.prep_minutes ?? 5,
    sort_order: sortOrder,
    rating_avg: 0,
    rating_count: 0,
    is_available: true,
  };
  extraProducts.push(product);
  return product;
}

export function listExtraProducts(): Product[] {
  return [...extraProducts];
}

export type UpdateProductInput = Partial<{
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  base_price_egp: number;
  image_url: string | null;
  prep_minutes: number | null;
  is_available: boolean;
}>;

/**
 * Update an extra product (admin-created). FALLBACK seed products are
 * read-only — the admin can flip availability via the existing
 * productAvailability override but can't rename/reprice them.
 */
export function updateExtraProduct(id: string, patch: UpdateProductInput): Product | null {
  const idx = extraProducts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const current = extraProducts[idx]!;
  // Coerce nullable text/numeric fields back to Product's stricter shape.
  const next: Product = {
    ...current,
    ...(patch.category_id !== undefined && { category_id: patch.category_id }),
    ...(patch.name_en !== undefined && { name_en: patch.name_en }),
    ...(patch.name_ar !== undefined && { name_ar: patch.name_ar }),
    ...(patch.description_en !== undefined && { description_en: patch.description_en ?? '' }),
    ...(patch.description_ar !== undefined && { description_ar: patch.description_ar ?? '' }),
    ...(patch.base_price_egp !== undefined && { base_price_egp: patch.base_price_egp }),
    ...(patch.image_url !== undefined && { image_url: patch.image_url ?? current.image_url }),
    ...(patch.prep_minutes !== undefined && { prep_minutes: patch.prep_minutes ?? current.prep_minutes }),
    ...(patch.is_available !== undefined && { is_available: patch.is_available }),
    id: current.id,
  };
  extraProducts[idx] = next;
  return next;
}

/** Remove an extra product. FALLBACK products can't be deleted. */
export function deleteExtraProduct(id: string): boolean {
  const idx = extraProducts.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  extraProducts.splice(idx, 1);
  return true;
}

/** Used by admin endpoints to know whether a product id is editable. */
export function isExtraProduct(id: string): boolean {
  return extraProducts.some((p) => p.id === id);
}

export async function getCatalog(): Promise<CatalogResponse> {
  if (!isSupabaseReady()) {
    return {
      ...FALLBACK,
      products: [...FALLBACK.products, ...extraProducts],
    };
  }
  try {
    const sb = getServiceClient();
    const [categoriesRes, productsRes, offersRes, kioskRes] = await Promise.all([
      sb.from('categories').select('*').order('sort_order'),
      sb.from('products').select('*').eq('is_available', true).order('sort_order'),
      sb.from('offers').select('*').gte('ends_at', new Date().toISOString()).lte('starts_at', new Date().toISOString()),
      sb.from('kiosk_status').select('*').limit(1).single(),
    ]);
    if (categoriesRes.error || productsRes.error || offersRes.error) {
      throw new Error('Catalog query failed');
    }
    return {
      categories: categoriesRes.data as Category[],
      products: (productsRes.data ?? []) as Product[],
      offers: (offersRes.data ?? []) as Offer[],
      kiosk: (kioskRes.data ?? FALLBACK.kiosk) as KioskStatus,
    };
  } catch {
    return FALLBACK;
  }
}

export async function getProductDetail(id: string, userId?: string): Promise<ProductDetailResponse | null> {
  const reviewMode = getProductReviewMode(id);
  // Only fetch reviews from DB when the mode actually shows them.
  const fetchReviews = reviewMode !== 'hidden';

  if (!isSupabaseReady()) {
    const product =
      FALLBACK.products.find((x) => x.id === id) ??
      extraProducts.find((x) => x.id === id);
    if (!product) return null;
    return {
      product,
      options: fallbackOptionsFor(id),
      reviews: [],
      is_favorited: false,
      review_mode: reviewMode,
    };
  }
  try {
    const sb = getServiceClient();
    const [productRes, optionsRes, reviewsRes, favRes] = await Promise.all([
      sb.from('products').select('*').eq('id', id).single(),
      sb.from('product_options').select('*').eq('product_id', id).order('sort_order'),
      fetchReviews
        ? sb.from('reviews').select('*').eq('product_id', id).eq('hidden', false).order('created_at', { ascending: false }).limit(20)
        : Promise.resolve({ data: [] as Review[], error: null }),
      userId ? sb.from('favorites').select('id').eq('product_id', id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (productRes.error || !productRes.data) return null;
    return {
      product: productRes.data as Product,
      options: (optionsRes.data ?? []) as ProductOption[],
      reviews: (reviewsRes.data ?? []) as Review[],
      is_favorited: !!favRes.data,
      review_mode: reviewMode,
    };
  } catch {
    const product = FALLBACK.products.find((x) => x.id === id);
    if (!product) return null;
    return { product, options: fallbackOptionsFor(id), reviews: [], is_favorited: false, review_mode: reviewMode };
  }
}
