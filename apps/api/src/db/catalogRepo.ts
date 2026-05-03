import type {
  CatalogResponse,
  Category,
  Product,
  ProductOption,
  Offer,
  KioskStatus,
  ProductDetailResponse,
  Review,
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
    { id: 'cat-coffee',    slug: 'coffee',    name_en: 'Coffee',    name_ar: 'قهوة',   sort_order: 1 },
    { id: 'cat-desserts',  slug: 'desserts',  name_en: 'Desserts',  name_ar: 'حلويات', sort_order: 2 },
    { id: 'cat-breakfast', slug: 'breakfast', name_en: 'Breakfast', name_ar: 'فطور',   sort_order: 3 },
  ],
  products: [
    p('velvet-cappuccino',  'cat-coffee',    'Velvet Cappuccino',     'كابتشينو فيلفيت',     'Silky steamed milk · cocoa dust',                65, 4.9, 128),
    p('caramel-macchiato',  'cat-coffee',    'Caramel Macchiato',     'كراميل ماكياتو',       'Espresso · vanilla · caramel drizzle',           70, 4.8, 96),
    p('honey-latte',        'cat-coffee',    'Honey Latte',           'لاتيه عسل',           'Local honey · espresso · steamed milk',           68, 4.7, 64),
    p('vanilla-cold-brew',  'cat-coffee',    'Vanilla Cold Brew',     'كولد برو فانيليا',     '12-hour cold brew · vanilla · over ice',          62, 4.8, 82),
    p('espresso-romano',    'cat-coffee',    'Espresso Romano',       'إسبريسو رومانو',       'Double shot · twist of lemon',                    45, 4.6, 41),
    p('iced-americano',     'cat-coffee',    'Iced Americano',        'أمريكانو مثلج',       'Long espresso shaken over ice',                   50, 4.7, 73),
    p('mocha-royale',       'cat-coffee',    'Mocha Royale',          'موكا رويال',           'Dark chocolate ganache · espresso · milk',        75, 4.9, 110, 6),
    p('hazelnut-latte',     'cat-coffee',    'Hazelnut Latte',        'لاتيه بندق',          'Roasted hazelnut syrup · espresso · milk',        68, 4.6, 58),
    p('spanish-latte',      'cat-coffee',    'Spanish Latte',         'لاتيه إسباني',         'Espresso · condensed milk · steamed milk',        70, 4.8, 92),
    p('flat-white',         'cat-coffee',    'Flat White',            'فلات وايت',            'Double ristretto · silky microfoam',              63, 4.7, 67),
    p('tiramisu-cup',       'cat-desserts',  'Tiramisu Cup',          'كأس تيراميسو',         'Mascarpone · espresso ladyfingers · cocoa',       85, 4.9, 88, 2),
    p('brownie-bar',        'cat-desserts',  'Brownie Bar',           'براوني',                'Fudgy double-chocolate brownie',                  55, 4.7, 74, 2),
    p('almond-croissant',   'cat-desserts',  'Almond Croissant',      'كرواسون لوز',           'Buttery croissant · almond cream',                60, 4.8, 56, 2),
    p('cheesecake-slice',   'cat-desserts',  'Cheesecake Slice',      'تشيز كيك',              'New York style · berry compote',                  70, 4.8, 81, 2),
    p('chocolate-tart',     'cat-desserts',  'Chocolate Tart',        'تارت شوكولاتة',          'Dark chocolate ganache · butter pastry',          65, 4.7, 49, 2),
    p('cinnamon-roll',      'cat-desserts',  'Cinnamon Roll',         'سينامون رول',            'Warm cinnamon · cream cheese glaze',              50, 4.6, 42, 2),
    p('avocado-toast',      'cat-breakfast', 'Avocado Toast',         'توست أفوكادو',           'Sourdough · smashed avocado · chili · lemon',    80, 4.7, 65, 7),
    p('egg-cheese-sandwich','cat-breakfast', 'Egg & Cheese Sandwich', 'ساندويتش بيض وجبنة',     'Scrambled eggs · melted cheese · toasted bun',   65, 4.6, 54, 6),
    p('smoked-turkey-bagel','cat-breakfast', 'Smoked Turkey Bagel',   'بيغل ديك رومي مدخن',     'Smoked turkey · swiss · mustard · fresh bagel',  75, 4.7, 48, 6),
    p('granola-bowl',       'cat-breakfast', 'Granola Bowl',          'وعاء جرانولا',           'House granola · yogurt · seasonal fruit · honey',70, 4.8, 62, 5),
    p('acai-bowl',          'cat-breakfast', 'Acai Bowl',             'وعاء آساي',              'Acai · banana · granola · fresh berries',         90, 4.9, 71, 5),
    p('spinach-feta-wrap',  'cat-breakfast', 'Spinach Feta Wrap',     'راب سبانخ وفيتا',         'Spinach · feta · sundried tomato · spinach tortilla', 75, 4.6, 38, 6),
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
  slug: string,
  category_id: string,
  name_en: string,
  name_ar: string,
  description_en: string,
  base_price_egp: number,
  rating_avg = 4.7,
  rating_count = 0,
  prep_minutes = 5,
): Product {
  return {
    id: slug,
    category_id,
    name_en,
    name_ar,
    description_en,
    description_ar: '',
    base_price_egp,
    image_url: `/images/products/${slug}.svg`,
    prep_minutes,
    is_available: true,
    sort_order: 0,
    rating_avg,
    rating_count,
  };
}

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

function fallbackOptionsFor(productId: string): ProductOption[] {
  const product = FALLBACK.products.find((x) => x.id === productId);
  if (!product) return [];
  if (product.category_id === 'cat-coffee') {
    const isCold = productId === 'vanilla-cold-brew' || productId === 'iced-americano';
    const all: Omit<ProductOption, 'product_id' | 'id'>[] = isCold
      ? [...COFFEE_OPTIONS, ...ICE_OPTIONS]
      : COFFEE_OPTIONS;
    return all.map((o, i) => ({ ...o, id: `${productId}-opt-${i}`, product_id: productId }));
  }
  return [];
}

function isSupabaseReady(): boolean {
  return !!(config.supabase.serviceRoleKey && config.supabase.url && !config.supabase.url.includes('127.0.0.1:54321'));
}

export async function getCatalog(): Promise<CatalogResponse> {
  if (!isSupabaseReady()) {
    return FALLBACK;
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
  if (!isSupabaseReady()) {
    const product = FALLBACK.products.find((x) => x.id === id);
    if (!product) return null;
    return {
      product,
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
      product: productRes.data as Product,
      options: (optionsRes.data ?? []) as ProductOption[],
      reviews: (reviewsRes.data ?? []) as Review[],
      is_favorited: !!favRes.data,
    };
  } catch {
    const product = FALLBACK.products.find((x) => x.id === id);
    if (!product) return null;
    return { product, options: fallbackOptionsFor(id), reviews: [], is_favorited: false };
  }
}
