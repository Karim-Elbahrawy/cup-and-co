import { randomUUID } from 'node:crypto';
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
    p('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111103', 'Velvet Cappuccino',  'كابتشينو فيلفيت',     'Silky steamed milk over a double shot, dusted with cocoa', 65, '/images/products/hot_coffee.png', 5, 1, 4.9, 128),
    p('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111103', 'Caramel Macchiato',  'كراميل ماكياتو',       'Espresso, vanilla, foam, and a caramel drizzle',           70, '/images/products/hot_coffee.png', 5, 2, 4.8, 96),
    p('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111103', 'Honey Latte',        'لاتيه عسل',           'Local honey blended with espresso and steamed milk',       68, '/images/products/hot_coffee.png', 5, 3, 4.7, 64),
    p('22222222-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111102', 'Vanilla Cold Brew',  'كولد برو فانيليا',     '12-hour cold brew, vanilla, over ice',                     62, '/images/products/cold_coffee.png', 3, 4, 4.8, 82),
    p('22222222-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111101', 'Espresso Romano',    'إسبريسو رومانو',       'Double shot with a twist of lemon',                        45, '/images/products/hot_coffee.png', 3, 5, 4.6, 41),
    p('22222222-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111102', 'Iced Americano',     'أمريكانو مثلج',       'Long espresso shaken over ice',                            50, '/images/products/cold_coffee.png', 3, 6, 4.7, 73),
    p('22222222-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111103', 'Mocha Royale',       'موكا رويال',           'Dark chocolate ganache, espresso, milk',                   75, '/images/products/hot_coffee.png', 6, 7, 4.9, 110),
    p('22222222-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111103', 'Hazelnut Latte',     'لاتيه بندق',          'Roasted hazelnut syrup, espresso, milk',                   68, '/images/products/hot_coffee.png', 5, 8, 4.6, 58),
    p('22222222-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111103', 'Spanish Latte',      'لاتيه إسباني',         'Espresso, condensed milk, steamed milk',                   70, '/images/products/hot_coffee.png', 5, 9, 4.8, 92),
    p('22222222-0000-0000-0000-00000000000A', '11111111-1111-1111-1111-111111111103', 'Flat White',         'فلات وايت',            'Double ristretto under silky microfoam',                   63, '/images/products/hot_coffee.png', 5, 10, 4.7, 67),
    p('22222222-0000-0000-0000-00000000000B', '11111111-1111-1111-1111-111111111107', 'Tiramisu Cup',         'كأس تيراميسو',         'Mascarpone, espresso-soaked ladyfingers, cocoa',           85, '/images/products/dessert.png', 2, 1, 4.9, 88),
    p('22222222-0000-0000-0000-00000000000C', '11111111-1111-1111-1111-111111111107', 'Brownie Bar',          'براوني',                'Fudgy double-chocolate brownie',                           55, '/images/products/dessert.png', 2, 2, 4.7, 74),
    p('22222222-0000-0000-0000-00000000000D', '11111111-1111-1111-1111-111111111107', 'Almond Croissant',     'كرواسون لوز',           'Buttery croissant filled with almond cream',               60, '/images/products/dessert.png', 2, 3, 4.8, 56),
    p('22222222-0000-0000-0000-00000000000E', '11111111-1111-1111-1111-111111111107', 'Cheesecake Slice',     'تشيز كيك',              'New York style cheesecake, berry compote',                 70, '/images/products/dessert.png', 2, 4, 4.8, 81),
    p('22222222-0000-0000-0000-00000000000F', '11111111-1111-1111-1111-111111111107', 'Chocolate Tart',       'تارت شوكولاتة',          'Dark chocolate ganache in butter pastry',                  65, '/images/products/dessert.png', 2, 5, 4.7, 49),
    p('22222222-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111107', 'Cinnamon Roll',        'سينامون رول',            'Warm cinnamon roll with cream cheese glaze',               50, '/images/products/dessert.png', 2, 6, 4.6, 42),
    p('22222222-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111108', 'Avocado Toast',          'توست أفوكادو',           'Sourdough, smashed avocado, chili flakes, lemon',          80, '/images/products/breakfast.png', 7, 1, 4.7, 65),
    p('22222222-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111108', 'Egg & Cheese Sandwich',  'ساندويتش بيض وجبنة',       'Scrambled eggs, melted cheese, on a toasted bun',          65, '/images/products/breakfast.png', 6, 2, 4.6, 54),
    p('22222222-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111108', 'Smoked Turkey Bagel',    'بيغل ديك رومي مدخن',        'Smoked turkey, swiss, mustard, on a fresh bagel',          75, '/images/products/breakfast.png', 6, 3, 4.7, 48),
    p('22222222-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111108', 'Granola Bowl',           'وعاء جرانولا',           'House granola, yogurt, seasonal fruit, honey',             70, '/images/products/breakfast.png', 5, 4, 4.8, 62),
    p('22222222-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111108', 'Acai Bowl',              'وعاء آساي',              'Acai, banana, granola, fresh berries',                     90, '/images/products/breakfast.png', 5, 5, 4.9, 71),
    p('22222222-0000-0000-0000-000000000016', '11111111-1111-1111-1111-111111111108', 'Spinach Feta Wrap',      'راب سبانخ وفيتا',          'Spinach, feta, sundried tomatoes in spinach tortilla',     75, '/images/products/breakfast.png', 6, 6, 4.6, 38),
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
    stock_count: null,
    review_mode: 'full',
  };
}

/** Coffee categories that get shot + size + sugar options. */
const COFFEE_CATEGORY_IDS = [
  '11111111-1111-1111-1111-111111111101', // hot_coffee
  '11111111-1111-1111-1111-111111111102', // cold_coffee
  '11111111-1111-1111-1111-111111111103', // milk_coffee
];

const COFFEE_OPTIONS: Omit<ProductOption, 'product_id' | 'id'>[] = [
  { group_name: 'shots', name_en: 'Single',  name_ar: 'شوت واحد', price_delta_egp: 0 },
  { group_name: 'shots', name_en: 'Double',  name_ar: 'شوتين',    price_delta_egp: 5 },
  { group_name: 'size',  name_en: 'Small',   name_ar: 'صغير',     price_delta_egp: -5 },
  { group_name: 'size',  name_en: 'Medium',  name_ar: 'وسط',      price_delta_egp: 0 },
  { group_name: 'size',  name_en: 'Large',   name_ar: 'كبير',     price_delta_egp: 10 },
  { group_name: 'sugar', name_en: 'Normal',  name_ar: 'عادي',     price_delta_egp: 0 },
  { group_name: 'sugar', name_en: 'Less',    name_ar: 'أقل',      price_delta_egp: 0 },
  { group_name: 'sugar', name_en: 'No',      name_ar: 'بدون',     price_delta_egp: 0 },
];

const ICE_OPTIONS: Omit<ProductOption, 'product_id' | 'id'>[] = [
  { group_name: 'ice', name_en: 'Normal', name_ar: 'عادي', price_delta_egp: 0 },
  { group_name: 'ice', name_en: 'Less',   name_ar: 'أقل',  price_delta_egp: 0 },
  { group_name: 'ice', name_en: 'No',     name_ar: 'بدون', price_delta_egp: 0 },
];

function fallbackOptionsFor(productId: string): ProductOption[] {
  const product = FALLBACK.products.find((x) => x.id === productId);
  if (!product) return [];
  if (COFFEE_CATEGORY_IDS.includes(product.category_id)) {
    const isCold = product.category_id === '11111111-1111-1111-1111-111111111102';
    const all: Omit<ProductOption, 'product_id' | 'id'>[] = isCold
      ? [...COFFEE_OPTIONS, ...ICE_OPTIONS]
      : COFFEE_OPTIONS;
    return all.map((o, i) => ({ ...o, id: `${productId}-opt-${i}`, product_id: productId }));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Admin-mutable in-memory overlays (survive hot-reloads in dev; reset on
// process restart — swap for a DB-backed store in production).
// ---------------------------------------------------------------------------

/** Admin-created products (stored in memory; reset on server restart in dev). */
const adminProducts: Product[] = [];

/** Per-product review-mode override set by admin. Defaults to 'full'. */
const productReviewModes = new Map<string, ReviewMode>();

/**
 * Per-product stock override.
 * `undefined` (absent) = unlimited; `0` = sold out; positive = units left.
 */
const productStockMap = new Map<string, number>();

/**
 * Creates a new product. In dev (no Supabase) it is stored in the
 * in-memory `adminProducts` array. With Supabase it inserts a row and
 * keeps an in-memory copy so the fallback catch path also sees it.
 */
export async function createProduct(
  input: Omit<Product, 'id' | 'rating_avg' | 'rating_count' | 'stock_count' | 'review_mode'>,
): Promise<Product> {
  const id = randomUUID();
  const product: Product = {
    id,
    ...input,
    rating_avg: 0,
    rating_count: 0,
    stock_count: null,
    review_mode: 'full',
  };

  if (isSupabaseReady()) {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from('products')
      .insert({
        id,
        category_id: input.category_id,
        name_en: input.name_en,
        name_ar: input.name_ar,
        description_en: input.description_en,
        description_ar: input.description_ar,
        base_price_egp: input.base_price_egp,
        image_url: input.image_url,
        prep_minutes: input.prep_minutes,
        is_available: input.is_available,
        sort_order: input.sort_order,
        rating_avg: 0,
        rating_count: 0,
        stock_count: null,
        review_mode: 'full',
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create product in database');
    const created = data as Product;
    adminProducts.push(created); // keep in-memory copy for fallback catch path
    return created;
  }

  adminProducts.push(product);
  return product;
}

export function setProductReviewMode(id: string, mode: ReviewMode): void {
  productReviewModes.set(id, mode);
}

/** Pass `null` to remove the stock cap (unlimited). */
export function setProductStock(id: string, count: number | null): void {
  if (count === null) {
    productStockMap.delete(id);
  } else {
    productStockMap.set(id, count);
  }
}

/** Returns the live stock count for a product. `null` = unlimited. */
export function getProductStock(id: string): number | null {
  const v = productStockMap.get(id);
  return v === undefined ? null : v;
}

/**
 * Decrements stock by `qty`. Call only after confirming there is enough stock.
 * No-ops for unlimited products (not in the map).
 */
export function decrementStock(id: string, qty: number): void {
  const current = productStockMap.get(id);
  if (current !== undefined) {
    productStockMap.set(id, Math.max(0, current - qty));
  }
}

/** Applies in-memory stock and review-mode overlays to a product. */
function withMeta(product: Product): Product {
  const stockVal = productStockMap.get(product.id);
  const modeVal = productReviewModes.get(product.id);
  if (stockVal === undefined && modeVal === undefined) return product;
  return {
    ...product,
    stock_count: stockVal !== undefined ? stockVal : product.stock_count,
    review_mode: modeVal ?? product.review_mode,
  };
}

function isSupabaseReady(): boolean {
  return !!(config.supabase.serviceRoleKey && config.supabase.url && !config.supabase.url.includes('127.0.0.1:54321'));
}

export async function getCatalog(): Promise<CatalogResponse> {
  if (!isSupabaseReady()) {
    return {
      ...FALLBACK,
      products: [...FALLBACK.products, ...adminProducts].map(withMeta),
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
    const rawProducts = (productsRes.data ?? []) as Product[];
    return {
      categories: categoriesRes.data as Category[],
      products: rawProducts.map(withMeta),
      offers: (offersRes.data ?? []) as Offer[],
      kiosk: (kioskRes.data ?? FALLBACK.kiosk) as KioskStatus,
    };
  } catch {
    return { ...FALLBACK, products: [...FALLBACK.products, ...adminProducts].map(withMeta) };
  }
}

export async function getProductDetail(id: string, userId?: string): Promise<ProductDetailResponse | null> {
  if (!isSupabaseReady()) {
    const product = FALLBACK.products.find((x) => x.id === id);
    if (!product) return null;
    return {
      product: withMeta(product),
      options: fallbackOptionsFor(id),
      reviews: [],
      is_favorited: false,
    };
  }
  try {
    const sb = getServiceClient();
    const [productRes, optionsRes, reviewsRes, favRes] = await Promise.all([
      sb.from('products').select('*').eq('id', id).single(),
      sb.from('product_options').select('*').eq('product_id', id).order('sort_order'),
      sb.from('reviews').select('*').eq('product_id', id).eq('hidden', false).order('created_at', { ascending: false }).limit(20),
      userId ? sb.from('favorites').select('id').eq('product_id', id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (productRes.error || !productRes.data) return null;
    return {
      product: withMeta(productRes.data as Product),
      options: (optionsRes.data ?? []) as ProductOption[],
      reviews: (reviewsRes.data ?? []) as Review[],
      is_favorited: !!favRes.data,
    };
  } catch {
    const product = FALLBACK.products.find((x) => x.id === id);
    if (!product) return null;
    return { product: withMeta(product), options: fallbackOptionsFor(id), reviews: [], is_favorited: false };
  }
}
