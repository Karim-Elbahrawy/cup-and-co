# Cup & Co — Design System (kiosk-relevant subset)

> Source-extracted from `docs/brand-guide.md`. Kiosk-specific extensions noted inline. The brand-guide is canonical for web + iOS + admin; this file scopes the parts the kiosk consumes and the kiosk-only extensions on top.

## Color — "Espresso Sunrise"

Every neutral is tinted toward warm. We never use `#000` or `#fff`.

### Brand

| Role | Hex | OKLCH-ish read | Use |
|---|---|---|---|
| Primary terracotta | `#C2410C` | warm, ~chroma 0.16 | CTAs, selected states, hero accents |
| Primary hover | `#9A3412` | one step darker | hover/pressed |
| Primary tint | `#FED7AA` | very low chroma | tinted backgrounds |
| Accent teal | `#0F766E` | the differentiator | secondary CTA, steam, success-adjacent highlights |
| Accent hover | `#115E59` | one step darker | hover/pressed |
| Accent tint | `#CCFBF1` | sparingly | tinted backgrounds |

The teal-against-warm contrast is non-negotiable. Never recolor steam to orange. Never drop the teal.

### Surfaces

| Role | Hex | Use |
|---|---|---|
| Cream | `#FEF3C7` | warm soft fills, selected chip background |
| Paper | `#FAF6F0` | main app background |
| Surface | `#FFFFFF` | card surface |

### Text

| Role | Hex | Use |
|---|---|---|
| Espresso | `#1C1917` | primary text |
| Cocoa | `#44403C` | body text |
| Muted | `#78716C` | secondary text |

### States

| Role | Hex | Use |
|---|---|---|
| Stroke | `#E7E5E4` | borders, dividers |
| Success | `#15803D` | success states |
| Error | `#B91C1C` | errors |
| Warning | `#D97706` | warnings, offline-queue pill |
| Star | `#F59E0B` | rating stars, gold tier badge |

### Sunrise gradient

```css
background: linear-gradient(135deg, #F4A261 0%, #C2410C 100%);
```

Used on the attract splash, the featured-today hero card, the welcome banner for identified members, the K0 placeholder. Never on the regular product grid (it would compete with the products).

### Strategy per surface

- **Attract loop**: drenched (the surface IS the color)
- **Catalog grid**: restrained (paper background + tinted neutrals + one accent ≤10% via featured hero)
- **Product detail**: restrained (white cards on paper, terracotta only on the ADD CTA)
- **Cart drawer**: restrained
- **Checkout**: committed (the primary action card carries the terracotta fill)
- **Confirmation**: committed (160px terracotta pickup code dominates the surface)

## Typography

- **Headings**: Sora (Google Fonts) — geometric, friendly. Weights 600/700/800.
- **Body**: Inter. Weights 400/500/600.
- **Arabic (RTL)**: Cairo. Same weights as Inter.

### Standard sizes (rest of the apps)
12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 px

### Kiosk-only display scale

The customer is ~50cm from a 12.9" iPad. Standard sizes are too small.

| Token | Size | Line height | Tracking | Weight | Use |
|---|---|---|---|---|---|
| `text-k-display` | 96px | 1.05 | -0.02em | 800 | Headline pickup code, attract hero |
| `text-k-hero` | 64px | 1.1 | -0.015em | 800 | Page H1s |
| `text-k-card` | 28px | 1.2 | normal | 700 | Card titles, primary buttons |
| `text-k-body` | 22px | 1.4 | normal | 500 | Body copy, secondary buttons |

Tabular-nums is on by default for any number that updates (countdowns, prices, pickup codes).

## Spacing & Radius

- **Spacing scale** (used as Tailwind values via px): `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`
- **Radius**:
  - chip: 12px
  - card: 20px (regular) / 28px (hero card) / 40px (drawer top corners)
  - pill: 999px (buttons + chips of pill shape)
- **Touch targets**: 88×88pt minimum (chip, button); 160×160pt minimum (card)

## Shadows (warm-tinted, never gray)

- **card**: `0 4px 16px rgba(28, 25, 23, 0.06)`
- **elevated**: `0 12px 32px rgba(28, 25, 23, 0.10)`
- **subtle**: `0 1px 4px rgba(28, 25, 23, 0.04)`
- **warm-glow** (CTA): `0 8px 24px rgba(194, 65, 12, 0.18)`

## Motion

- **Easing**:
  - exit/standard: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart)
  - chip-select / spring: `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot, used sparingly)
- **Duration**:
  - micro (press feedback, hover): 120ms
  - base (chip toggles, layer fades): 200–220ms
  - page transitions: 300ms
  - intro (attract crossfades): 1000ms
- **Reduced motion**: every animation is wrapped or degrades. The decorative steam plume + condensation droplets are kept under reduced-motion (they're decorative, not directional) but their durations effectively become 0 via the global `@media (prefers-reduced-motion)` rule.

## Component primitives (apps/kiosk)

| Component | Min size | Variants | Notes |
|---|---|---|---|
| `BigButton` | 88pt h | primary / secondary / ghost; lg / xl | CSS-only press feedback (active:scale-0.98 + brightness) — no Framer for the active state, the GPU handles it |
| `BigCard` | 160×160pt | interactive / disabled / selected | Selected uses 4px terracotta ring, never inset shadow |
| `LanguageToggle` | 48pt h | EN / AR | Flag emoji + 2-letter label, never icon-only |
| `CartPill` | 64pt h | static | Floats bottom-end, hidden when cart empty |
| `CartDrawer` | 78vh max | — | Spring slide from bottom, backdrop tap closes |

## What we don't do

- **Side-stripe borders** as decoration. Banned globally per impeccable.
- **Gradient text**. Never `background-clip: text`.
- **Glassmorphism as default**. The drawer's backdrop dim is `bg-espresso/40`, not a blur.
- **Identical card grids**. The featured-today hero, the personal hero, and the regular tiles are visually distinct on purpose.
- **Modal as first thought**. Identify modal exists because the keypad UX warrants it. "Still there?" is a true dialog. Everything else inlines.
- **Em dashes in copy**. Use periods, commas, or colons.
