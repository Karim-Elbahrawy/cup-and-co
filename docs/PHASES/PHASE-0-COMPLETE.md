# Phase 0 — Foundation: Complete

**Date completed:** 2026-05-04
**Status:** ✅ Done. All gate criteria met.

## Goal

Stand up the monorepo, refactored backend, fresh Supabase schema, and stubbed-but-wired customer web + admin + iOS scaffolds — with CI green and 100% naming hygiene (no "Morning Pass", "Campus Scholar", "Brew Points").

## What shipped

### Monorepo

- pnpm workspace at `E:\Kiosk App`, mirrored to GitHub
- `tsconfig.base.json`, `.prettierrc`, `.editorconfig`, `.npmrc` configured
- `.gitignore` covers Node, Next, Vercel, iOS DerivedData, env files

### Packages

- `packages/design-tokens` — Cup & Co palette (`#FF8B3D`, `#FFE2BD`, `#FFF1DC`, `#3D2914`...), spacing scale, radii, shadows (warm-tinted), Tailwind color palette, EN + AR typography stack
- `packages/i18n` — full English + Arabic translation strings: `common`, `auth`, `roles`, `home`, `product`, `cart`, `checkout`, `orders`, `loyalty`, `games`, `profile`
- `packages/types` — domain types (`UserRole`, `OrderStatus`, `PaymentStatus`, `LoyaltySource`, all entity interfaces)

### Supabase

- `supabase/migrations/0001_init.sql` — full schema with normal naming:
  - Identity: `users`
  - Catalog: `categories`, `products`, `product_options`
  - Orders: `orders`, `order_items`
  - Payments: `payments`
  - Loyalty: `loyalty_points`, `qr_receipts`
  - Offers: `offers`
  - Engagement: `reviews`, `favorites`
  - Games: `game_sessions`, `leaderboard_weeks`, `prizes`
  - Operations: `kiosk_status`, `push_devices`, `audit_log`
  - RLS policies: public read for catalog; user-owned read for orders/loyalty/favorites; admin via service role
- `supabase/seed.sql` — 10 coffees + 6 desserts + 6 breakfast = **22 items**, 5 demo users (one per role), kiosk row, sample 70% offer, current leaderboard week
- `supabase/config.toml` — local Supabase config with phone OTP test mode (`+201000000001..5` → `000000`)

### Backend (Express + TypeScript)

- `apps/api/src/services/loyalty.ts` — points calculation (online > cash > QR ratios)
- `apps/api/src/services/payments.ts` — Paymob intention + HMAC verification
- `apps/api/src/services/games.ts` — session token + score validation + Cairo-week leaderboard + daily session cap
- `apps/api/src/services/permissions.ts` — Owner / Barista RBAC matrix (16 permissions)
- `apps/api/src/services/qrReceipts.ts` — single-use receipt generation + claim with phone-verified gating + expiry
- `apps/api/src/app.ts` — Express app with auth, customer routes (`/me`, `/orders`, `/payments/paymob/intention`, `/loyalty`, `/games`, `/leaderboard`), webhook (`/webhooks/paymob` HMAC verified), admin routes (`/admin/orders`, `/admin/qr-receipts`, `/admin/summary`)
- `apps/api/src/http/auth.ts` — JWT signing + middleware + dev-mode header bypass
- `apps/api/src/http/errors.ts` — Zod-aware error handler
- `apps/api/src/db/supabase.ts` — service-role client factory
- `apps/api/src/config.ts` — env-typed config

### Tests

- **42 Vitest tests passing**:
  - `loyalty.test.ts` (15) — point calculation across sources, edge cases, ratio property
  - `payments.test.ts` (6) — intention creation, HMAC verify success/failure, tamper rejection
  - `games.test.ts` (8) — student-only gate, score cap, double-submit, daily limit, leaderboard ordering
  - `permissions.test.ts` (6) — owner all-perms, barista limited, leaderboard settle gate
  - `qrReceipts.test.ts` (7) — create, claim, double-claim, unverified phone, invalid token, expiry

### Customer Web (Next.js 15)

- `apps/customer-web` — App Router, Tailwind, next-intl, PWA manifest
- Tailwind theme imports tokens from `@cup-and-co/design-tokens`
- Sora + Inter (latin) + Cairo (arabic) fonts via `next/font`
- Phase 0 placeholder home page with branded promo card
- Playwright config + smoke spec
- `.env.example` template

### Admin Dashboard (Next.js 15)

- `apps/admin` — same Tailwind theme, runs on port 3001
- Phase 0 placeholder console page

### iOS (SwiftUI)

- `apps/ios/CupAndCo/project.yml` — xcodegen spec for the Xcode project (capabilities: Face ID, Camera, Push, EN + AR localizations)
- `CupAndCoApp.swift` — `@main`, RootView with placeholder Cup & Co branding + 70% OFF promo card
- `DesignSystem/Colors.swift` — exact mirror of `@cup-and-co/design-tokens`
- `DesignSystem/Buttons.swift` — primary + secondary pill buttons
- `Networking/APIClient.swift` — typed HTTP wrapper to Express
- `Networking/AuthStore.swift` — Keychain-backed JWT storage
- `Auth/BiometricAuthManager.swift` — Face ID / Touch ID async API
- `Localization/{en,ar}.lproj/Localizable.strings` — full bilingual strings
- `Tests/CupAndCoTests/` — XCTest entry

### CI / Docs

- `.github/workflows/ci.yml` — lint, typecheck, Vitest, Next.js build, Playwright (iOS build job ready to enable)
- `README.md` — quickstart, demo accounts, roadmap table
- `PLAN.md` — pointer to canonical plan
- `docs/MASTER-PLAN.md` — full canonical implementation plan
- `docs/brand-guide.md` — voice, palette, typography, naming rules
- `docs/api-contract.md` — endpoint reference
- `docs/figma-mapping.md` — Figma node → component path mapping (filled in Phase 1)
- `CONTEXT.md` — single-source resume guide for any AI chat

## Verification

```bash
cd "E:\Kiosk App"
pnpm install                    # 514 packages installed
pnpm --filter @cup-and-co/api test  # 42/42 passing
```

## What's NOT in Phase 0 (deferred to next phases)

- Real Phone OTP wired to Supabase (Phase 1)
- Real Home page pixel-matching Figma reference (Phase 1)
- Real Product Detail page (Phase 2)
- Cart, Checkout, Paymob iframe (Phase 2)
- Order tracking timeline (Phase 2)
- Loyalty UI + QR scanner (Phase 3)
- Coffee Collector game (Phase 4)
- Reviews, offers, admin polish (Phase 5)
- Full RTL audit (Phase 6)
- Production deploy + TestFlight (Phase 7)

## How to start Phase 1

The next AI session reads:
1. `CONTEXT.md` — locked decisions, current state
2. `docs/MASTER-PLAN.md` — full plan
3. This file (`docs/PHASES/PHASE-0-COMPLETE.md`)

Then tackles the Phase 1 scope listed in MASTER-PLAN.md → "Roadmap" → "Phase 1 — Auth + Catalog (week 2)":
- iOS: phone OTP, Face ID toggle, home shell with role tabs + product grid
- Web: same, plus PWA service worker
- Admin: email/password login, today overview shell, live orders skeleton
- API: `/auth/otp/*` (real Supabase), `/catalog` (real Supabase), `/me`, `/me/verification`
