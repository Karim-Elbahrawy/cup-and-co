-- Migration 0003: use individual product images instead of category fallbacks
-- Run this if you already seeded the database with 0001_init.sql + seed.sql.
-- Safe to run multiple times (idempotent — updates are no-ops when already correct).

-- Coffee products — individual PNGs
update products set image_url = '/images/products/velvet_cappuccino.png'   where id = '22222222-0000-0000-0000-000000000001';
update products set image_url = '/images/products/caramel_macchiato.png'   where id = '22222222-0000-0000-0000-000000000002';
update products set image_url = '/images/products/honey_latte.png'         where id = '22222222-0000-0000-0000-000000000003';
update products set image_url = '/images/products/vanilla_cold_brew.png'   where id = '22222222-0000-0000-0000-000000000004';
update products set image_url = '/images/products/espresso_romano.png'     where id = '22222222-0000-0000-0000-000000000005';
update products set image_url = '/images/products/iced_americano.png'      where id = '22222222-0000-0000-0000-000000000006';
update products set image_url = '/images/products/mocha_royale.png'        where id = '22222222-0000-0000-0000-000000000007';
update products set image_url = '/images/products/hazelnut_latte.png'      where id = '22222222-0000-0000-0000-000000000008';
update products set image_url = '/images/products/spanish_latte.png'       where id = '22222222-0000-0000-0000-000000000009';
update products set image_url = '/images/products/flat_white.png'          where id = '22222222-0000-0000-0000-00000000000A';

-- Desserts — SVGs
update products set image_url = '/images/products/tiramisu_cup.svg'        where id = '22222222-0000-0000-0000-00000000000B';
update products set image_url = '/images/products/brownie_bar.svg'         where id = '22222222-0000-0000-0000-00000000000C';
update products set image_url = '/images/products/almond_croissant.svg'    where id = '22222222-0000-0000-0000-00000000000D';
update products set image_url = '/images/products/cheesecake_slice.svg'    where id = '22222222-0000-0000-0000-00000000000E';
update products set image_url = '/images/products/chocolate_tart.svg'      where id = '22222222-0000-0000-0000-00000000000F';
update products set image_url = '/images/products/cinnamon_roll.svg'       where id = '22222222-0000-0000-0000-000000000010';

-- Breakfast — SVGs
update products set image_url = '/images/products/avocado_toast.svg'       where id = '22222222-0000-0000-0000-000000000011';
update products set image_url = '/images/products/egg_cheese_sandwich.svg' where id = '22222222-0000-0000-0000-000000000012';
update products set image_url = '/images/products/smoked_turkey_bagel.svg' where id = '22222222-0000-0000-0000-000000000013';
update products set image_url = '/images/products/granola_bowl.svg'        where id = '22222222-0000-0000-0000-000000000014';
update products set image_url = '/images/products/acai_bowl.svg'           where id = '22222222-0000-0000-0000-000000000015';
update products set image_url = '/images/products/spinach_feta_wrap.svg'   where id = '22222222-0000-0000-0000-000000000016';
