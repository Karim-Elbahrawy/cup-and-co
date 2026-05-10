# Cup & Co — Image Upgrade Plan (Editorial-Grade)

> Take every image in the app from **stub or unused** to **premium editorial coffee brand** — at the level of a Soho speciality café, not a fast-food chain. Branch: `claude/image-upgrade-pass-1`.

## 1. Brand lock (binding — no exceptions)

- **Palette:** Espresso Sunrise — terracotta `#C2410C`, deep teal `#0F766E`, warm cream `#FEF3C7`, paper `#FAF6F0`, espresso text `#1C1917`. Sunrise gradient `#F4A261 → #C2410C` allowed.
- **Mood:** warm, confident, minimal, editorial. Premium specialty coffee, not chain.
- **Photography:** overhead or 3/4 angle; shallow DoF; soft directional light from upper-left (morning sun through café window, not studio strobe); linen / marble / wood surfaces; warm espresso-tinted shadows; ~10% breathing margin on all sides.
- **Illustration:** geometric line art, sunrise-gradient fills, rounded strokes, generous whitespace.
- **Backgrounds for product cutouts:** cream `#FEF3C7` solid OR transparent. Never pure white. Never any other tint.
- **Reject** on sight: candy-bright orange, cartoon vibes, blue casts, generic "smiling barista" stock, hyperreal CGI render, anything cliché.

## 2. Inventory & current state

### 2.1 Wired but mismatched (BLOCKING — fast win, zero MCP cost)

`apps/api/src/db/catalogRepo.ts` lines 33-54 point 10 products at `.svg` paths even though premium `.png` photos already sit on disk. The customer-web grid currently shows flat-svg illustrations instead of the real photos.

| # | Product | Real PNG (exists, unused) | Currently served (svg stub) |
|---|---|---|---|
| 1 | Velvet Cappuccino | `velvet_cappuccino.png` 515 KB | `velvet_cappuccino.svg` |
| 2 | Caramel Macchiato | `caramel_macchiato.png` 495 KB | `caramel_macchiato.svg` |
| 3 | Honey Latte | `honey_latte.png` 566 KB | `honey_latte.svg` |
| 4 | Vanilla Cold Brew | `vanilla_cold_brew.png` 415 KB | `vanilla_cold_brew.svg` |
| 5 | Espresso Romano | `espresso_romano.png` 482 KB | `espresso_romano.svg` |
| 6 | Iced Americano | `iced_americano.png` 487 KB | `iced_americano.svg` |
| 7 | Mocha Royale | `mocha_royale.png` 664 KB | `mocha_royale.svg` |
| 8 | Hazelnut Latte | `hazelnut_latte.png` 556 KB | `hazelnut_latte.svg` |
| 9 | Spanish Latte | `spanish_latte.png` 449 KB | `spanish_latte.svg` |
| 10 | Flat White | `flat_white.png` 543 KB | `flat_white.svg` |

**Action:** rename `.svg` → `.png` in catalogRepo.ts. 10-line edit. Instant grid upgrade.

### 2.2 Missing real photography (12 products — needs Pixa generation)

| # | Product | Slug | Stub |
|---|---|---|---|
| 1 | Tiramisu Cup | `tiramisu_cup` | `.svg` |
| 2 | Brownie Bar | `brownie_bar` | `.svg` |
| 3 | Almond Croissant | `almond_croissant` | `.svg` |
| 4 | Cheesecake Slice | `cheesecake_slice` | `.svg` |
| 5 | Chocolate Tart | `chocolate_tart` | `.svg` |
| 6 | Cinnamon Roll | `cinnamon_roll` | `.svg` |
| 7 | Avocado Toast | `avocado_toast` | `.svg` |
| 8 | Egg & Cheese Sandwich | `egg_cheese_sandwich` | `.svg` |
| 9 | Smoked Turkey Bagel | `smoked_turkey_bagel` | `.svg` |
| 10 | Granola Bowl | `granola_bowl` | `.svg` |
| 11 | Acai Bowl | `acai_bowl` | `.svg` |
| 12 | Spinach Feta Wrap | `spinach_feta_wrap` | `.svg` |

### 2.3 Brand identity (most are ~400-byte SVG stubs)

| Asset | Path | Current | Needs |
|---|---|---|---|
| App icon 1024 | `brand/app-icon-1024.png` | 96 KB exists | inspect; replace if generic |
| App icon 512/192/180 | `brand/app-icon-{512,192,180}.png` | downsized | regenerate from new 1024 |
| OG card | `brand/og-card.svg` | 506-byte stub | 1200×630 share card |
| Hero promo | (missing on disk) | — | 1200×600 editorial banner |
| Onboarding 1/2/3 | `brand/onboarding-{1,2,3}.svg` | ~380-byte stubs | 360×360 illustrations |
| Empty cart | `brand/empty-cart.{svg,png}` | 379-byte SVG / 954 KB PNG (stub) | 240×240 illustration |
| Order success | `brand/order-success.svg` | 383-byte stub | 240×240 illustration |
| Podium | `brand/podium.svg` | 381-byte stub | 300×200 leaderboard |
| Game logo | `brand/game-logo.svg` | 499-byte stub | 200×200 mascot lockup |
| Avatars 1-7 | `brand/avatars/avatar-{1..7}.svg` | small SVG stubs | 256×256 illustrated chars |
| Avatar mascot | `brand/avatar-mascot.png` | 641 KB | inspect; replace if not on-brand |
| Posters (4) | `brand/posters/offer-{cold,hot}-{en,ar}.svg` | stubs | 1080×1350 portrait posters |
| Payment glyphs | `brand/payments/{visa,mastercard,vodafone-cash,cash}.svg` | small SVGs | inspect; touch up if not crisp |
| Cold/hot coffee cutouts | `images/products/{cold,hot}_coffee-cutout.png` | exist | verify transparent BG |

### 2.4 iOS catalog (parity surface)

| Asset | Path | Action |
|---|---|---|
| AppIcon set | `Assets.xcassets/AppIcon.appiconset/` | regenerate from new 1024 (sharp resize) |
| Avatars 1-7 | `Assets.xcassets/avatar_{1..7}.imageset/` | match web set |
| Launch screen | (missing) | required App Store blocker — defer to launch-screen task |

## 3. Targets, prioritized by impact

### Tier 1 — Customer-facing default (ship today, max user impact)
The first thing every user sees. Dominates the catalog grid and product detail pages.

1. **Wire 10 existing PNGs** — rename `.svg` → `.png` in `catalogRepo.ts`. Free, instant.
2. **Generate 12 missing product photos** — Pixa, premium 1024×1024 photoreal.
3. **App icon** — Canva, iconic monogram on sunrise gradient. Re-derive 512/192/180.

### Tier 2 — Brand surfaces (strong second impression)

4. **OG card** — Canva, 1200×630 share card.
5. **Hero promo** — Pixa, editorial 1200×600 with text-safe area.
6. **Onboarding 1/2/3** — Canva or Pixa, illustrated.
7. **Empty cart + order success** — illustration style.
8. **Avatar set (7)** — illustrated character lineup.

### Tier 3 — Polish layer

9. **Posters (4)** — 1080×1350 cold/hot offer, EN/AR.
10. **Game logo & podium** — playful but premium.
11. **Payment glyphs** — verify crispness.
12. **Cold/hot coffee cutouts** — verify transparent BG, retouch if needed.
13. **iOS AppIcon set + launch screen** — regenerate from upgraded 1024 + ship launch screen.

## 4. MCP / skill assignment per asset class

| Asset class | Tool | Why |
|---|---|---|
| Product photography (12 + 2 buckets) | **Pixa `generate_media`** | Photoreal model, controllable prompt, square 1024×1024 |
| App icon, OG card, payment glyphs | **Canva `generate-design` + brand kit** | Geometric, vector-clean, matches design system tokens |
| Onboarding, empty states, podium, game logo | **brandkit skill** prompts → **Pixa** | Illustrated style with sunrise gradient fills |
| Hero promo | **Pixa** | Editorial 1200×600 with right-third text-safe area |
| Posters (EN/AR) | **Canva** + Pixa for backdrop | EN/AR composition with brand-locked typography |
| Avatars (7-character set) | **brandkit skill** → **Pixa** | One-style 7-character illustration set, accent-colored |

## 5. Wiring (single source of truth)

`apps/api/src/db/catalogRepo.ts` is the canonical mapping for product images on this branch. Every product's `image_url` field is the path served to web + kiosk + iOS clients via `/v1/catalog`.

Update sequence per generated asset:
1. Drop the new file into `apps/customer-web/public/images/products/<slug>.png` AND `apps/kiosk/public/images/products/<slug>.png` (parity).
2. Edit catalogRepo line for that product → `.svg` → `.png`.
3. (If brand asset) verify each consumer in `apps/customer-web/src/**` and `apps/kiosk/src/**` references the new path.
4. Run `pnpm typecheck` after each batch.
5. Commit per asset with `feat(brand): real <kind> for <name>` so we can roll back per-image.

For iOS imagesets: drop file into `Assets.xcassets/<name>.imageset/`, update `Contents.json` to declare `1x`/`2x`/`3x` variants.

## 6. Hard rules

1. **Brand lock is binding.** Reject and regenerate any output that violates §1.
2. **Dimensions:**
   - Product cards: 1024×1024 (square)
   - OG card: 1200×630
   - Hero promo: 1200×600
   - Onboarding: 360×360
   - Empty states (cart, order-success): 240×240
   - Game logo: 200×200
   - Podium: 300×200
   - Posters: 1080×1350
   - Avatars: 256×256
3. **Backgrounds:** product photos = cream `#FEF3C7` solid OR transparent. Never pure white.
4. **Cost cap: 30 Pixa generations per session.** Spread to multiple sessions if more needed; commit-and-push per generation so progress isn't lost.
5. **Per-asset budget:** 1 base attempt + 1 variant retry. Don't burn budget chasing perfection on a single item.
6. **Reproducibility:** record prompt + seed (when available) in the commit body.
7. **Verification gate:** after each tier, run `pnpm --filter @cup-and-co/customer-web build` to catch broken image references early.

## 7. Execution order (this PR)

```
[Tier 1a]  Rewire 10 existing PNGs           (FREE, ~5 min)         ←  DO FIRST
[Tier 1b]  Pixa: 12 missing product photos   (~12 generations)
[Tier 2]   Canva: app icon, OG card          (~2 generations)
[Tier 2]   Pixa: hero promo                  (~1 generation)
[Tier 2]   Pixa: onboarding × 3              (~3 generations)
[Tier 2]   Pixa: empty-cart + order-success  (~2 generations)
[Tier 3]   Avatars × 7                       (~3-7 generations, batch-prompted)
[Tier 3]   Posters × 4                       (~2 Canva + 2 Pixa)
[Tier 3]   Game logo + podium                (~2 generations)
[Tier 3]   Payment glyphs verify/touchup     (Canva, no gen if crisp)
[iOS]      Regenerate AppIcon set via sharp  (FREE, scripted)
[iOS]      Avatars parity                    (FREE, file copy)
[Verify]   pnpm build customer-web + kiosk   ✓
[Ship]     PR → main
```

## 8. PR shape

Title: `feat(brand): editorial-grade image pass — products, brand, iOS parity`

Body sections:
- **Tier 1a — wired existing photography** (10 products)
- **Tier 1b — new product photography** (12 products, table with thumbnail + Pixa prompt)
- **Tier 2 — brand identity** (icon, OG, hero, onboarding, empty states, avatars)
- **Tier 3 — polish layer** (posters, game, podium, glyphs, cutouts)
- **iOS parity** (AppIcon set, avatars)
- **Verification:** typecheck + lint + build outputs
