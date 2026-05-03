-- Cup & Co: Initial Schema
-- All naming is plain English. No campus jargon.

-- Enums
create type user_role as enum ('student', 'faculty', 'office', 'owner', 'barista');
create type verification_status as enum ('pending', 'approved', 'rejected', 'blocked');
create type fulfillment_type as enum ('pickup', 'delivery');
create type order_status as enum (
  'received', 'accepted', 'preparing', 'ready',
  'out_for_delivery', 'completed', 'cancelled', 'refunded'
);
create type payment_method as enum ('paymob_card', 'paymob_wallet', 'cash');
create type payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
create type loyalty_source as enum ('online_paid', 'cash_in_app', 'qr_receipt', 'game_reward');
create type option_group as enum ('size', 'sugar', 'ice', 'milk', 'extras');
create type offer_type as enum ('percentage', 'fixed', 'free_item');
create type prize_type as enum ('free_combo', 'free_drink', 'percentage_off');

-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  full_name text,
  role user_role not null default 'student',
  verification_status verification_status not null default 'pending',
  university_id text,
  major text,
  department text,
  language_pref text not null default 'en' check (language_pref in ('en', 'ar')),
  biometric_enabled boolean not null default false,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_users_phone on users(phone);
create index idx_users_role on users(role);

-- Catalog
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_ar text not null,
  sort_order int not null default 0
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  base_price_egp numeric(8,2) not null,
  image_url text not null default '',
  prep_minutes int not null default 5,
  is_available boolean not null default true,
  sort_order int not null default 0,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_products_category on products(category_id);
create index idx_products_available on products(is_available) where is_available = true;

create table product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  group_name option_group not null,
  name_en text not null,
  name_ar text not null,
  price_delta_egp numeric(8,2) not null default 0,
  sort_order int not null default 0
);

create index idx_product_options_product on product_options(product_id);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  status order_status not null default 'received',
  fulfillment_type fulfillment_type not null default 'pickup',
  scheduled_for timestamptz,
  subtotal_egp numeric(10,2) not null,
  discount_egp numeric(10,2) not null default 0,
  points_redeemed int not null default 0,
  total_egp numeric(10,2) not null,
  payment_method payment_method not null default 'cash',
  payment_status payment_status not null default 'unpaid',
  pickup_code text,
  notes text,
  created_at timestamptz not null default now(),
  picked_up_at timestamptz
);

create index idx_orders_user on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null default 1 check (quantity > 0 and quantity <= 20),
  options jsonb not null default '{}',
  line_total_egp numeric(10,2) not null
);

create index idx_order_items_order on order_items(order_id);

-- Payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  provider text not null default 'paymob',
  provider_intent_id text,
  amount_egp numeric(10,2) not null,
  status payment_status not null default 'pending',
  raw_callback jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index idx_payments_provider_intent on payments(provider_intent_id) where provider_intent_id is not null;
create index idx_payments_order on payments(order_id);

-- Loyalty
create table loyalty_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  source loyalty_source not null,
  order_id uuid references orders(id),
  qr_code_id uuid,
  points int not null,
  balance_after int not null,
  created_at timestamptz not null default now()
);

create index idx_loyalty_user on loyalty_points(user_id);

create table qr_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  code text unique not null,
  points_value int not null,
  created_by uuid references users(id),
  used_at timestamptz,
  used_by_user_id uuid references users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_qr_receipts_code on qr_receipts(code);

-- Offers
create table offers (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  type offer_type not null,
  value numeric(10,2) not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target_roles user_role[] not null default '{}',
  code text,
  usage_limit int,
  usage_count int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_offers_active on offers(starts_at, ends_at);

-- Reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  product_id uuid not null references products(id),
  order_id uuid not null references orders(id),
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  hidden boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, order_id, product_id)
);

create index idx_reviews_product on reviews(product_id);

-- Favorites
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  product_id uuid not null references products(id),
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

-- Games
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  score int,
  server_max_score int not null,
  validated boolean not null default false
);

create index idx_game_sessions_user on game_sessions(user_id);

create table leaderboard_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  week_end date not null,
  prize_rules jsonb not null default '[]',
  settled_at timestamptz
);

create table prizes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  week_id uuid not null references leaderboard_weeks(id),
  rank int not null,
  type prize_type not null,
  code text unique not null,
  redeemed_at timestamptz,
  expires_at timestamptz not null
);

create index idx_prizes_user on prizes(user_id);

-- Operations
create table kiosk_status (
  id uuid primary key default gen_random_uuid(),
  is_open boolean not null default false,
  message_en text,
  message_ar text,
  capacity_per_slot int not null default 10,
  slot_minutes int not null default 15,
  opens_at time not null default '07:00',
  closes_at time not null default '22:00'
);

create table push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  platform text not null check (platform in ('ios', 'web')),
  token text not null,
  last_seen_at timestamptz not null default now(),
  unique(user_id, token)
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  target_type text,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_created on audit_log(created_at desc);

-- RLS Policies
alter table users enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_options enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table loyalty_points enable row level security;
alter table qr_receipts enable row level security;
alter table offers enable row level security;
alter table reviews enable row level security;
alter table favorites enable row level security;
alter table game_sessions enable row level security;
alter table kiosk_status enable row level security;
alter table push_devices enable row level security;

-- Public read for catalog
create policy "categories_public_read" on categories for select using (true);
create policy "products_public_read" on products for select using (true);
create policy "product_options_public_read" on product_options for select using (true);
create policy "offers_public_read" on offers for select
  using (now() between starts_at and ends_at);
create policy "kiosk_status_public_read" on kiosk_status for select using (true);

-- Reviews: public read for visible only
create policy "reviews_public_read" on reviews for select using (hidden = false);

-- User self-access
create policy "users_own_read" on users for select using (auth.uid() = id);
create policy "users_own_update" on users for update using (auth.uid() = id);

-- Orders: user sees own
create policy "orders_own_read" on orders for select using (auth.uid() = user_id);
create policy "order_items_own_read" on order_items for select
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));

-- Loyalty: user sees own
create policy "loyalty_own_read" on loyalty_points for select using (auth.uid() = user_id);

-- Favorites: user manages own
create policy "favorites_own_read" on favorites for select using (auth.uid() = user_id);
create policy "favorites_own_insert" on favorites for insert with check (auth.uid() = user_id);
create policy "favorites_own_delete" on favorites for delete using (auth.uid() = user_id);

-- Games: user sees own
create policy "game_sessions_own_read" on game_sessions for select using (auth.uid() = user_id);

-- Push devices: user manages own
create policy "push_own_read" on push_devices for select using (auth.uid() = user_id);
create policy "push_own_insert" on push_devices for insert with check (auth.uid() = user_id);
create policy "push_own_delete" on push_devices for delete using (auth.uid() = user_id);
