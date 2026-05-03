# Cup & Co — Brand Guide

## Voice

**Warm, calm, briskly helpful.** We are the friend who has your coffee ready before you walk in.

- "Your morning, handled."
- "Skip the line."
- "Order now, grab on your way."

We do not say "campus", "scholar", "circle", or "office" as standalone branding. We are a coffee shop that happens to be on a university campus, not a campus that happens to have coffee.

## Naming Rules

- **Items** use real coffee-shop names (Velvet Cappuccino, Caramel Macchiato, Avocado Toast, Tiramisu Cup). No university metaphors.
- **Roles** are simply Student, Faculty, Office.
- **Loyalty** uses one currency: "Points". No XP/Brew/Bean split.
- **Order statuses** plain: received, accepted, preparing, ready, completed.

## Color Palette — "Espresso Sunrise"

Upgraded from the source Figma's saturated candy orange to a refined terracotta primary with an unexpected deep teal accent. The teal-against-warm contrast is our signature differentiator — never recolor steam to orange, never drop the teal.

### Primary

| Token | Hex | Use |
|---|---|---|
| Primary (Terracotta) | `#C2410C` | CTAs, selected chips, hero accents |
| Primary Hover | `#9A3412` | hover/pressed |
| Primary Tint | `#FED7AA` | tinted backgrounds, soft fills |

### Accent

| Token | Hex | Use |
|---|---|---|
| Accent (Deep Teal) | `#0F766E` | secondary CTA, steam in logo, success-adjacent highlights |
| Accent Hover | `#115E59` | hover/pressed |
| Accent Tint | `#CCFBF1` | tinted teal backgrounds (used sparingly) |

### Surfaces

| Token | Hex | Use |
|---|---|---|
| Cream | `#FEF3C7` | warm soft fills, selected chip background |
| Paper | `#FAF6F0` | main app background |
| Surface | `#FFFFFF` | card surface |

### Text

| Token | Hex | Use |
|---|---|---|
| Espresso | `#1C1917` | primary text |
| Cocoa | `#44403C` | body text |
| Muted | `#78716C` | secondary text |

### States

| Token | Hex | Use |
|---|---|---|
| Stroke | `#E7E5E4` | borders, dividers |
| Success | `#15803D` | success states |
| Error | `#B91C1C` | errors |
| Warning | `#D97706` | warnings |
| Star | `#F59E0B` | rating stars |

### Sunrise Gradient

Used on the hero promo card, splash screen, and the monogram cup wall:

```css
background: linear-gradient(135deg, #F4A261 0%, #C2410C 100%);
```

```swift
LinearGradient(colors: CupColors.sunriseStops, startPoint: .topLeading, endPoint: .bottomTrailing)
```

## Typography

- **Web headings**: Sora (Google Fonts) — geometric, friendly
- **Web body**: Inter
- **Web Arabic (RTL)**: Cairo
- **iOS**: SF Pro Rounded for headings + body

Sizes: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48px
Weights: 400 / 500 / 600 / 700

## Spacing & Radius

- Spacing scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 64`
- Radius: chip 12 / **card 20 / button-pill 999** / full 9999 (cards round generously, buttons are pure pills)

## Shadows (warm-tinted, never gray)

- Card: `0 4px 16px rgba(28, 25, 23, 0.06)`
- Elevated: `0 12px 32px rgba(28, 25, 23, 0.10)`
- Subtle: `0 1px 4px rgba(28, 25, 23, 0.04)`
- Warm glow (CTA): `0 8px 24px rgba(194, 65, 12, 0.18)`

## Logo

- **Wordmark**: Sora 700 "Cup" + italic teal "&" + Sora 700 "Co"
- **Monogram**: top-down coffee cup, sunrise gradient cup wall, espresso-black coffee, cream highlight, three teal steam strands
- **App icon**: rounded square in sunrise gradient with cup-from-above

Brand assets in `apps/customer-web/public/brand/`. Both apps share assets via the `public/brand/` directory.

## Tone Examples

| Don't | Do |
|---|---|
| "Welcome, Campus Scholar" | "Good Morning, Karim" |
| "Earn 50 Brew Points" | "Earn 50 Points" |
| "Visit the Faculty Circle" | "Faculty offers" |
| "Catch the Beans 🎮" | "Coffee Collector — play & climb the leaderboard" |

## Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (out), `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring/bounce on chip select)
- Durations: 120ms (micro), 200ms (base), 320ms (page), 480ms (intro)
- Reduced motion: respect `prefers-reduced-motion` everywhere
