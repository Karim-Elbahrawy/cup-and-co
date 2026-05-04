# Cup & Co — Image Generation Manifest

> Every image required for a production-quality kiosk app. Each entry includes:
> ID, subject, brand-locked style direction, target paths, dimensions, format,
> and current status (stub vs final).

## Brand style lock

- **Palette:** Espresso Sunrise — terracotta #C2410C, deep teal #0F766E, warm cream #FEF3C7, paper #FAF6F0, espresso #1C1917.
- **Mood:** Premium editorial coffee — warm, confident, minimal. No candy-bright orange, no cartoon vibes.
- **Photography style:** Overhead or 3/4 angle, shallow DoF, warm natural light, linen/marble surfaces, soft espresso-tinted shadows.
- **Illustration style:** Geometric line art with sunrise gradient fills, rounded strokes, breathing whitespace.

---

## App Icon

| ID | Subject | Style direction | Paths | Dimensions | Format | Status |
|----|---------|----------------|-------|-----------|--------|--------|
| icon-1024 | Cup & Co monogram — stylized "C" cup silhouette on sunrise gradient | Clean geometric mark, sunrise gradient background (#F4A261 → #C2410C), white cup silhouette with steam wisps | `apps/customer-web/public/brand/app-icon-1024.png`, `apps/ios/.../AppIcon.appiconset/icon-1024.png` | 1024×1024 | PNG | stub |
| icon-512 | Downscaled from icon-1024 | Same | `apps/customer-web/public/brand/app-icon-512.png` | 512×512 | PNG | stub |
| icon-192 | Downscaled from icon-1024 | Same | `apps/customer-web/public/brand/app-icon-192.png` | 192×192 | PNG | stub |
| icon-180 | Downscaled from icon-1024 | Same | `apps/customer-web/public/brand/app-icon-180.png` | 180×180 | PNG | stub |

---

## Hero Promo

| ID | Subject | Style direction | Paths | Dimensions | Format | Status |
|----|---------|----------------|-------|-----------|--------|--------|
| hero-promo | Seasonal offer banner — latte art in a premium ceramic cup | Top-down shot, warm light, sunrise gradient overlay with 70% text, editorial type | `apps/customer-web/public/brand/hero-promo.jpg` | 1200×600 | JPG | stub |

---

## Product Shots (22)

All product images: warm cream (#FAF6F0) background, soft drop shadow, centered subject, editorial food photography feel.

| ID | Product | Paths | Dimensions | Format | Status |
|----|---------|-------|-----------|--------|--------|
| velvet_cappuccino | Velvet Cappuccino — latte art on ceramic cup | `public/images/products/velvet_cappuccino.jpg` | 600×600 | JPG | stub |
| caramel_macchiato | Caramel Macchiato — drizzled caramel, tall glass | `public/images/products/caramel_macchiato.jpg` | 600×600 | JPG | stub |
| honey_latte | Honey Latte — golden honey drip, ceramic mug | `public/images/products/honey_latte.jpg` | 600×600 | JPG | stub |
| vanilla_cold_brew | Vanilla Cold Brew — iced tall glass, condensation | `public/images/products/vanilla_cold_brew.jpg` | 600×600 | JPG | stub |
| espresso_romano | Espresso Romano — demitasse cup, lemon twist | `public/images/products/espresso_romano.jpg` | 600×600 | JPG | stub |
| iced_americano | Iced Americano — clear glass, ice cubes, dark brew | `public/images/products/iced_americano.jpg` | 600×600 | JPG | stub |
| mocha_royale | Mocha Royale — cocoa dusted, whipped cream | `public/images/products/mocha_royale.jpg` | 600×600 | JPG | stub |
| hazelnut_latte | Hazelnut Latte — warm tones, hazelnut garnish | `public/images/products/hazelnut_latte.jpg` | 600×600 | JPG | stub |
| spanish_latte | Spanish Latte — condensed milk layer, warm cup | `public/images/products/spanish_latte.jpg` | 600×600 | JPG | stub |
| flat_white | Flat White — velvety microfoam, flat ceramic | `public/images/products/flat_white.jpg` | 600×600 | JPG | stub |
| tiramisu_cup | Tiramisu Cup — layered cocoa/mascarpone in glass | `public/images/products/tiramisu_cup.jpg` | 600×600 | JPG | stub |
| brownie_bar | Brownie Bar — fudgy slab, cocoa dust | `public/images/products/brownie_bar.jpg` | 600×600 | JPG | stub |
| almond_croissant | Almond Croissant — flaky layers, almond slivers | `public/images/products/almond_croissant.jpg` | 600×600 | JPG | stub |
| cheesecake_slice | Cheesecake Slice — creamy wedge, berry drizzle | `public/images/products/cheesecake_slice.jpg` | 600×600 | JPG | stub |
| chocolate_tart | Chocolate Tart — glossy ganache, gold leaf | `public/images/products/chocolate_tart.jpg` | 600×600 | JPG | stub |
| cinnamon_roll | Cinnamon Roll — glazed spiral, steam | `public/images/products/cinnamon_roll.jpg` | 600×600 | JPG | stub |
| avocado_toast | Avocado Toast — sourdough, smashed avo, seeds | `public/images/products/avocado_toast.jpg` | 600×600 | JPG | stub |
| egg_cheese_sandwich | Egg & Cheese Sandwich — golden toast, melted cheese | `public/images/products/egg_cheese_sandwich.jpg` | 600×600 | JPG | stub |
| smoked_turkey_bagel | Smoked Turkey Bagel — everything bagel, layers | `public/images/products/smoked_turkey_bagel.jpg` | 600×600 | JPG | stub |
| granola_bowl | Granola Bowl — yogurt, granola clusters, berries | `public/images/products/granola_bowl.jpg` | 600×600 | JPG | stub |
| acai_bowl | Acai Bowl — purple blend, toppings, coconut | `public/images/products/acai_bowl.jpg` | 600×600 | JPG | stub |
| spinach_feta_wrap | Spinach Feta Wrap — grilled wrap, cross-section | `public/images/products/spinach_feta_wrap.jpg` | 600×600 | JPG | stub |

---

## Product Cutouts (transparent)

| ID | Subject | Paths | Dimensions | Format | Status |
|----|---------|-------|-----------|--------|--------|
| cold_coffee-cutout | Iced coffee glass, transparent BG | `public/images/products/cold_coffee-cutout.png` | 400×600 | PNG | stub |
| hot_coffee-cutout | Hot coffee cup, transparent BG | `public/images/products/hot_coffee-cutout.png` | 400×600 | PNG | stub |

---

## Onboarding

| ID | Subject | Style direction | Paths | Dimensions | Format | Status |
|----|---------|----------------|-------|-----------|--------|--------|
| onboarding-1 | "Order in seconds" — phone with app UI | Line-art illustration, sunrise gradient fill, cup icon | `public/brand/onboarding-1.svg` | 360×360 | SVG | stub |
| onboarding-2 | "Earn rewards" — star/points burst | Geometric celebration, teal accent, radiating lines | `public/brand/onboarding-2.svg` | 360×360 | SVG | stub |
| onboarding-3 | "Campus pickup" — map pin + cup | Location marker with steam, warm cream background | `public/brand/onboarding-3.svg` | 360×360 | SVG | stub |

---

## Empty States

| ID | Subject | Style direction | Paths | Dimensions | Format | Status |
|----|---------|----------------|-------|-----------|--------|--------|
| empty-cart | Empty shopping bag with cup outline | Soft line illustration, muted tones, inviting CTA feel | `public/brand/empty-cart.svg` | 240×240 | SVG | stub |
| order-success | Checkmark + cup celebration | Confetti lines, sunrise gradient check, celebratory | `public/brand/order-success.svg` | 240×240 | SVG | stub |

---

## Game Assets

| ID | Subject | Style direction | Paths | Dimensions | Format | Status |
|----|---------|----------------|-------|-----------|--------|--------|
| game_logo | Coffee Collector game logo | Playful but premium — stylized bean + cup, sunrise accent | `public/brand/game-logo.png` | 200×200 | PNG | stub |
| leaderboard_podium | Podium ranks 1-2-3 | Terracotta/teal/cream gradient medals, geometric | iOS Assets + `public/brand/podium.svg` | 300×200 | SVG | stub |

---

## OG / Social

| ID | Subject | Style direction | Paths | Dimensions | Format | Status |
|----|---------|----------------|-------|-----------|--------|--------|
| og-card | Cup & Co share card — logo + tagline | Sunrise gradient left edge, white card, monogram, "Your campus cup" | `public/brand/og-card.png` | 1200×630 | PNG | stub |

---

## Payment Method Glyphs

| ID | Subject | Paths | Dimensions | Format | Status |
|----|---------|-------|-----------|--------|--------|
| pay-visa | Visa mark | `public/brand/payments/visa.svg` | 48×32 | SVG | stub |
| pay-mastercard | Mastercard mark | `public/brand/payments/mastercard.svg` | 48×32 | SVG | stub |
| pay-vodafone | Vodafone Cash mark | `public/brand/payments/vodafone-cash.svg` | 48×32 | SVG | stub |
| pay-cash | Cash icon | `public/brand/payments/cash.svg` | 48×32 | SVG | stub |
