-- Cup & Co Seed Data
-- 22 menu items, 5 demo users, kiosk row, sample offer, leaderboard week

-- Kiosk row (singleton)
insert into kiosk_status (id, is_open, message_en, message_ar, capacity_per_slot, slot_minutes, opens_at, closes_at)
values (
  '00000000-0000-0000-0000-000000000001',
  true,
  'We are open — your morning is handled',
  'مفتوحون — صباحك معانا',
  10, 15, '07:00', '22:00'
);

-- Categories
insert into categories (id, slug, name_en, name_ar, sort_order) values
  ('11111111-1111-1111-1111-111111111101', 'coffee',    'Coffee',    'قهوة',   1),
  ('11111111-1111-1111-1111-111111111102', 'desserts',  'Desserts',  'حلويات', 2),
  ('11111111-1111-1111-1111-111111111103', 'breakfast', 'Breakfast', 'فطور',   3);

-- Coffee products (10)
insert into products (id, category_id, name_en, name_ar, description_en, description_ar, base_price_egp, image_url, prep_minutes, sort_order, rating_avg, rating_count) values
  ('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111101', 'Velvet Cappuccino',  'كابتشينو فيلفيت',     'Silky steamed milk over a double shot, dusted with cocoa', 'حليب مبخر حريري على شوت مزدوج برشة كاكاو', 65,  '/images/products/velvet-cappuccino.jpg', 5, 1, 4.9, 128),
  ('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111101', 'Caramel Macchiato',  'كراميل ماكياتو',       'Espresso, vanilla, foam, and a caramel drizzle',           'إسبريسو وفانيليا ورغوة وكراميل',           70,  '/images/products/caramel-macchiato.jpg', 5, 2, 4.8, 96),
  ('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111101', 'Honey Latte',        'لاتيه عسل',           'Local honey blended with espresso and steamed milk',       'عسل محلي مع إسبريسو وحليب مبخر',           68,  '/images/products/honey-latte.jpg',       5, 3, 4.7, 64),
  ('22222222-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111101', 'Vanilla Cold Brew',  'كولد برو فانيليا',     '12-hour cold brew, vanilla, over ice',                     'كولد برو ١٢ ساعة بفانيليا على ثلج',         62,  '/images/products/vanilla-cold-brew.jpg', 3, 4, 4.8, 82),
  ('22222222-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111101', 'Espresso Romano',    'إسبريسو رومانو',       'Double shot with a twist of lemon',                        'شوت مزدوج مع قشر ليمون',                   45,  '/images/products/espresso-romano.jpg',   3, 5, 4.6, 41),
  ('22222222-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111101', 'Iced Americano',     'أمريكانو مثلج',       'Long espresso shaken over ice',                            'إسبريسو طويل على ثلج',                     50,  '/images/products/iced-americano.jpg',    3, 6, 4.7, 73),
  ('22222222-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111101', 'Mocha Royale',       'موكا رويال',           'Dark chocolate ganache, espresso, milk',                   'جاناش شوكولاتة داكنة وإسبريسو وحليب',     75,  '/images/products/mocha-royale.jpg',      6, 7, 4.9, 110),
  ('22222222-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111101', 'Hazelnut Latte',     'لاتيه بندق',          'Roasted hazelnut syrup, espresso, milk',                   'شراب بندق محمص مع إسبريسو وحليب',         68,  '/images/products/hazelnut-latte.jpg',    5, 8, 4.6, 58),
  ('22222222-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111101', 'Spanish Latte',      'لاتيه إسباني',         'Espresso, condensed milk, steamed milk',                   'إسبريسو وحليب مكثف وحليب مبخر',           70,  '/images/products/spanish-latte.jpg',     5, 9, 4.8, 92),
  ('22222222-0000-0000-0000-00000000000A', '11111111-1111-1111-1111-111111111101', 'Flat White',         'فلات وايت',            'Double ristretto under silky microfoam',                   'ريستريتو مزدوج تحت رغوة حريرية',          63,  '/images/products/flat-white.jpg',        5, 10, 4.7, 67);

-- Desserts (6)
insert into products (id, category_id, name_en, name_ar, description_en, description_ar, base_price_egp, image_url, prep_minutes, sort_order, rating_avg, rating_count) values
  ('22222222-0000-0000-0000-00000000000B', '11111111-1111-1111-1111-111111111102', 'Tiramisu Cup',         'كأس تيراميسو',         'Mascarpone, espresso-soaked ladyfingers, cocoa',           'ماسكاربوني وأصابع السيدة بإسبريسو وكاكاو', 85, '/images/products/tiramisu-cup.jpg',         2, 1, 4.9, 88),
  ('22222222-0000-0000-0000-00000000000C', '11111111-1111-1111-1111-111111111102', 'Brownie Bar',          'براوني',                'Fudgy double-chocolate brownie',                           'براوني شوكولاتة مزدوجة',                   55, '/images/products/brownie-bar.jpg',          2, 2, 4.7, 74),
  ('22222222-0000-0000-0000-00000000000D', '11111111-1111-1111-1111-111111111102', 'Almond Croissant',     'كرواسون لوز',           'Buttery croissant filled with almond cream',               'كرواسون بزبدة محشي بكريمة لوز',           60, '/images/products/almond-croissant.jpg',     2, 3, 4.8, 56),
  ('22222222-0000-0000-0000-00000000000E', '11111111-1111-1111-1111-111111111102', 'Cheesecake Slice',     'تشيز كيك',              'New York style cheesecake, berry compote',                 'تشيز كيك نيويورك بكومبوت توت',           70, '/images/products/cheesecake-slice.jpg',     2, 4, 4.8, 81),
  ('22222222-0000-0000-0000-00000000000F', '11111111-1111-1111-1111-111111111102', 'Chocolate Tart',       'تارت شوكولاتة',          'Dark chocolate ganache in butter pastry',                  'جاناش شوكولاتة داكنة في عجينة زبدية',     65, '/images/products/chocolate-tart.jpg',       2, 5, 4.7, 49),
  ('22222222-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111102', 'Cinnamon Roll',        'سينامون رول',            'Warm cinnamon roll with cream cheese glaze',               'سينامون رول دافئ بصوص كريم تشيز',         50, '/images/products/cinnamon-roll.jpg',        2, 6, 4.6, 42);

-- Breakfast (6)
insert into products (id, category_id, name_en, name_ar, description_en, description_ar, base_price_egp, image_url, prep_minutes, sort_order, rating_avg, rating_count) values
  ('22222222-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111103', 'Avocado Toast',          'توست أفوكادو',           'Sourdough, smashed avocado, chili flakes, lemon',          'خبز ساوردو وأفوكادو ورقائق فلفل وليمون',  80, '/images/products/avocado-toast.jpg',        7, 1, 4.7, 65),
  ('22222222-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111103', 'Egg & Cheese Sandwich',  'ساندويتش بيض وجبنة',       'Scrambled eggs, melted cheese, on a toasted bun',          'بيض مخفوق وجبنة ذائبة في خبز محمص',       65, '/images/products/egg-cheese-sandwich.jpg',  6, 2, 4.6, 54),
  ('22222222-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111103', 'Smoked Turkey Bagel',    'بيغل ديك رومي مدخن',        'Smoked turkey, swiss, mustard, on a fresh bagel',          'ديك رومي مدخن وسويسري وخردل في بيغل طازج',75, '/images/products/smoked-turkey-bagel.jpg',  6, 3, 4.7, 48),
  ('22222222-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111103', 'Granola Bowl',           'وعاء جرانولا',           'House granola, yogurt, seasonal fruit, honey',             'جرانولا منزلية وزبادي وفواكه موسمية وعسل', 70, '/images/products/granola-bowl.jpg',         5, 4, 4.8, 62),
  ('22222222-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111103', 'Acai Bowl',              'وعاء آساي',              'Acai, banana, granola, fresh berries',                     'آساي وموز وجرانولا وتوت طازج',           90, '/images/products/acai-bowl.jpg',            5, 5, 4.9, 71),
  ('22222222-0000-0000-0000-000000000016', '11111111-1111-1111-1111-111111111103', 'Spinach Feta Wrap',      'راب سبانخ وفيتا',          'Spinach, feta, sundried tomatoes in spinach tortilla',     'سبانخ وفيتا وطماطم مجففة في تورتيلا سبانخ', 75, '/images/products/spinach-feta-wrap.jpg',    6, 6, 4.6, 38);

-- Product options for coffee items (size, sugar, ice)
-- Size for all coffees
insert into product_options (product_id, group_name, name_en, name_ar, price_delta_egp, sort_order)
select id, 'size'::option_group, 'Small', 'صغير', -5, 1 from products where category_id = '11111111-1111-1111-1111-111111111101';
insert into product_options (product_id, group_name, name_en, name_ar, price_delta_egp, sort_order)
select id, 'size'::option_group, 'Medium', 'وسط', 0, 2 from products where category_id = '11111111-1111-1111-1111-111111111101';
insert into product_options (product_id, group_name, name_en, name_ar, price_delta_egp, sort_order)
select id, 'size'::option_group, 'Large', 'كبير', 10, 3 from products where category_id = '11111111-1111-1111-1111-111111111101';

-- Sugar for all coffees
insert into product_options (product_id, group_name, name_en, name_ar, price_delta_egp, sort_order)
select id, 'sugar'::option_group, 'Normal', 'عادي', 0, 1 from products where category_id = '11111111-1111-1111-1111-111111111101';
insert into product_options (product_id, group_name, name_en, name_ar, price_delta_egp, sort_order)
select id, 'sugar'::option_group, 'Less', 'أقل', 0, 2 from products where category_id = '11111111-1111-1111-1111-111111111101';
insert into product_options (product_id, group_name, name_en, name_ar, price_delta_egp, sort_order)
select id, 'sugar'::option_group, 'No', 'بدون', 0, 3 from products where category_id = '11111111-1111-1111-1111-111111111101';

-- Ice for cold coffees only (cold brew, americano)
insert into product_options (product_id, group_name, name_en, name_ar, price_delta_egp, sort_order)
select id, 'ice'::option_group, 'Normal', 'عادي', 0, 1 from products where id in ('22222222-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006');
insert into product_options (product_id, group_name, name_en, name_ar, price_delta_egp, sort_order)
select id, 'ice'::option_group, 'Less', 'أقل', 0, 2 from products where id in ('22222222-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006');
insert into product_options (product_id, group_name, name_en, name_ar, price_delta_egp, sort_order)
select id, 'ice'::option_group, 'No', 'بدون', 0, 3 from products where id in ('22222222-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006');

-- Demo users (dev OTP code is always 000000)
insert into users (id, phone, full_name, role, verification_status, university_id, major, language_pref) values
  ('33333333-0000-0000-0000-000000000001', '+201000000001', 'Karim Elbahrawy',     'student',  'approved', 'CSE-2021-0042', 'Computer Science', 'en'),
  ('33333333-0000-0000-0000-000000000002', '+201000000002', 'Dr. Layla Hassan',    'faculty',  'approved', null,            null,               'ar'),
  ('33333333-0000-0000-0000-000000000003', '+201000000003', 'Omar Mahmoud',        'office',   'approved', null,            null,               'en'),
  ('33333333-0000-0000-0000-000000000004', '+201000000004', 'Cup & Co Owner',      'owner',    'approved', null,            null,               'en'),
  ('33333333-0000-0000-0000-000000000005', '+201000000005', 'Nour the Barista',    'barista',  'approved', null,            null,               'ar');

-- Sample offer: 70% off today only
insert into offers (name_en, name_ar, type, value, starts_at, ends_at, target_roles)
values (
  'Today Only — 70% Super Discount',
  'اليوم فقط — خصم خاص ٧٠٪',
  'percentage',
  70,
  now() - interval '1 hour',
  now() + interval '23 hours',
  array['student','faculty','office']::user_role[]
);

-- Current leaderboard week (Sunday-aligned, Africa/Cairo)
insert into leaderboard_weeks (week_start, week_end, prize_rules)
values (
  date_trunc('week', current_date)::date,
  (date_trunc('week', current_date) + interval '6 days')::date,
  '[
    {"rank": 1, "type": "free_combo",      "value": 0,  "description_en": "Free combo (drink + dessert)", "description_ar": "كومبو مجاني (مشروب + حلوى)"},
    {"rank": 2, "type": "free_drink",      "value": 0,  "description_en": "Free drink",                   "description_ar": "مشروب مجاني"},
    {"rank": 3, "type": "percentage_off",  "value": 50, "description_en": "50% off coupon",               "description_ar": "كوبون خصم ٥٠٪"}
  ]'::jsonb
);
