# Cup & Co — Image Generation Manifest

> Every image required for a production-quality kiosk app. Each entry includes:
> ID, subject, brand-locked style direction, target paths, dimensions, format,
> and current status (stub vs final).

## Brand style lock

- **Palette:** Espresso Sunrise — terracotta #C2410C, deep teal #0F766E, warm cream #FEF3C7, paper #FAF6F0, espresso #1C1917.
- **Mood:** Premium editorial coffee — warm, confident, minimal. No candy-bright orange, no cartoon vibes.
- **Photography style:** Overhead or 3/4 angle, shallow DoF, warm natural light, linen/marble surfaces, soft espresso-tinted shadows.
- **Illustration style:** Geometric line art with sunrise gradient fills, rounded strokes, breathing whitespace.

## Where images get wired (single source of truth)

`apps/api/src/db/productImageOverrides.ts` is the canonical mapping from product NAME (case-insensitive) to its best-known image path. Every catalog response runs through this map at the API edge, so updating one entry there propagates immediately to:

- Kiosk catalog grid + product cards
- Kiosk drink-builder fallback hero
- Cart drawer line items + checkout summary
- Confirmation screen receipt thumbnail
- Customer-web product cards + detail page

You never need to update Supabase rows or the FALLBACK fixture in `catalogRepo.ts` for product imagery. The override wins.

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

## Product Shots — current state

Status legend:
- **real** — dedicated PNG photo wired via `productImageOverrides.ts`
- **bucket** — falls back to a category-level photo (`breakfast.png` / `dessert.png`); needs own photo
- **stub** — still a flat SVG illustration, override missing

| Product | File | Status | Notes |
|---|---|---|---|
| Velvet Cappuccino | `velvet_cappuccino.png` | real | 515 KB |
| Caramel Macchiato | `caramel_macchiato.png` | real | 495 KB |
| Caramel Frappuccino | `caramel_frappuccino.png` | real | 475 KB |
| Honey Latte | `honey_latte.png` | real | 566 KB |
| Hazelnut Latte | `hazelnut_latte.png` | real | 556 KB |
| Spanish Latte | `spanish_latte.png` | real | 449 KB |
| Mocha Royale | `mocha_royale.png` | real | 664 KB |
| Flat White | `flat_white.png` | real | 543 KB |
| Hot Chocolate | `hot_chocolate.png` | real | 574 KB |
| Espresso Romano | `espresso_romano.png` | real | 482 KB |
| Iced Americano | `iced_americano.png` | real | 487 KB |
| Vanilla Cold Brew | `vanilla_cold_brew.png` | real | 415 KB |
| Classic Earl Grey | `earl_grey_tea.png` | real | 434 KB |
| Fresh Orange Juice | `orange_juice.png` | real | 422 KB |
| Peach Iced Tea | `peach_iced_tea.png` | real | 414 KB |
| Avocado Toast | `breakfast.png` | bucket | Needs own photo |
| Egg & Cheese Sandwich | `breakfast.png` | bucket | Needs own photo |
| Smoked Turkey Bagel | `breakfast.png` | bucket | Needs own photo |
| Granola Bowl | `breakfast.png` | bucket | Needs own photo |
| Acai Bowl | `breakfast.png` | bucket | Needs own photo |
| Spinach Feta Wrap | `breakfast.png` | bucket | Needs own photo |
| Tiramisu Cup | `dessert.png` | bucket | Needs own photo |
| Brownie Bar | `dessert.png` | bucket | Needs own photo |
| Almond Croissant | `dessert.png` | bucket | Needs own photo |
| Cheesecake Slice | `dessert.png` | bucket | Needs own photo |
| Chocolate Tart | `dessert.png` | bucket | Needs own photo |
| Cinnamon Roll | `dessert.png` | bucket | Needs own photo |

### Commissioning the 12 missing photos

Two paths, depending on budget:

**Path A — local food photographer.** Hire someone with a 50mm prime + softbox setup. Brief: cream backdrop, single product, top-down or 3/4 angle, soft directional light. Background removal in Photoshop / Affinity / remove.bg → transparent PNG. Output 1024×1024, drop into `apps/kiosk/public/images/products/<slug>.png`, add an entry to `productImageOverrides.ts`.

**Path B — AI generation + cleanup.** Generate via Krea / Imagen / Midjourney with prompt: *"Premium product photography, [product name] on a warm cream background, soft directional lighting from upper-left, slight steam (hot) or condensation (cold), 3/4 angle, shallow depth of field, on-brand specialty coffee aesthetic, no garnish, square crop, clean composition."* Upscale to 1024×1024. Run through remove.bg for transparent background. Same drop-in step as Path A.

### Brand rules for any new image

- **Background:** cream `#FEF3C7` solid OR transparent. Never pure white, never any other tint.
- **Aspect:** square (1:1) for cards; minimum 1024×1024 for retina.
- **Light direction:** upper-left, soft. Morning sun through café window, not studio strobe.
- **Crop margins:** ~10% breathing room on all sides. Tight crop reads as "stamp" not "object".
- **Color treatment:** warm whites, terracotta highlights welcome. Avoid blue casts.

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
