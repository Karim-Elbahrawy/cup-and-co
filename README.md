# Cup & Co

Campus coffee kiosk ordering ecosystem — iOS native, customer web/PWA, admin dashboard, Express API, Supabase.

> Your morning, handled.

## Status

**Phase 0 — Foundation: complete.** Monorepo, design tokens, i18n (EN/AR), refactored backend services, Supabase schema with normal naming, customer web shell, admin dashboard shell, iOS Xcode project structure, and CI wired.

See [PLAN.md](./PLAN.md) for the full roadmap.

## Stack

- **iOS**: SwiftUI + SpriteKit (iOS 17+)
- **Customer web/PWA**: Next.js 15 + Tailwind + Framer Motion + next-intl
- **Admin dashboard**: Next.js 15 + Tailwind
- **Backend**: Node 20 + Express + TypeScript + Zod
- **Database**: Supabase (Postgres + Auth + Storage + Realtime + RLS)
- **Payments**: Paymob (Egypt-first), with cash-on-pickup fallback
- **Push**: APNs (iOS) + Web Push via VAPID (PWA)
- **Deploy**: Vercel (web) + Render (API) + Supabase Cloud
- **Monorepo**: pnpm workspaces

## Repo layout

```
apps/
  api/                 # Express API
  customer-web/        # Next.js PWA (port 3000)
  admin/               # Next.js admin dashboard (port 3001)
  ios/CupAndCo/        # SwiftUI iOS app
packages/
  design-tokens/       # Shared color, spacing, typography
  i18n/                # EN + AR translations
  types/               # Shared TypeScript domain types
supabase/
  migrations/          # Numbered SQL migrations
  seed.sql             # 22 menu items, 5 demo users, kiosk row
  config.toml          # Local Supabase config (Phone OTP test mode)
docs/                  # Figma mapping, brand guide, API contract
.github/workflows/     # CI: lint + typecheck + test + Playwright
```

## Quick start

```bash
# Install dependencies
pnpm install

# Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/customer-web/.env.example apps/customer-web/.env
cp apps/admin/.env.example apps/admin/.env

# Start Supabase locally (requires supabase CLI)
cd supabase && supabase start

# Run all apps in parallel
pnpm dev
# → API:           http://localhost:4000
# → customer-web:  http://localhost:3000
# → admin:         http://localhost:3001
```

## Demo accounts

Dev OTP code is always `000000`.

| Phone           | Role     | Name                  |
|-----------------|----------|-----------------------|
| +201000000001   | student  | Karim Elbahrawy       |
| +201000000002   | faculty  | Dr. Layla Hassan      |
| +201000000003   | office   | Omar Mahmoud          |
| +201000000004   | owner    | Cup & Co Owner        |
| +201000000005   | barista  | Nour the Barista      |

## Tests

```bash
pnpm test            # Backend Vitest tests
pnpm test:web        # Playwright E2E
pnpm test:visual     # Playwright visual diff vs Figma exports (Phase 1+)
```

## Roadmap

See [PLAN.md](./PLAN.md) for the full multi-phase plan. Phases ship in parallel waves across iOS, customer web, and admin.

| Phase | Focus | Status |
|---|---|---|
| 0 | Foundation | ✅ Done |
| 1 | Auth + Catalog | 🔜 Next |
| 2 | Ordering vertical slice (Paymob) | |
| 3 | Loyalty + QR | |
| 4 | Games + Leaderboard | |
| 5 | Reviews + Offers + Admin polish | |
| 6 | i18n + Accessibility + Polish | |
| 7 | Test + Deploy + Launch | |

## License

Private. © Cup & Co.
