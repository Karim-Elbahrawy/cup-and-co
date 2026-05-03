# Cup & Co — Coffee Kiosk App Implementation Plan

## Context

You commissioned a coffee-kiosk app from a previous Codex session. It built a lot — iOS SwiftUI views, Next.js customer web, Next.js admin dashboard, an Express API with real business logic, Supabase migrations, Vitest service tests — but it failed three things you actually care about:

1. **Branding & naming.** It invented "Morning Pass", "Campus Scholars", "Faculty Circle", "Campus Office", "Brew Points" — awkward fictional naming that you specifically rejected. You want normal coffee-shop naming (Velvet Cappuccino, Caramel Macchiato, etc.) and category labels that match the simple Student / Faculty / Office tabs in your reference image.
2. **UI fidelity.** The screens do not pixel-match the Figma design you linked or the two reference images you shared (the Velvet Cappuccino product detail with size/sugar/ice chips, and the Karim Elbahrawy home with the orange "Today Only 70% OFF" promo and Student/Faculty/Office tabs).
3. **Trust.** Codex said Claude couldn't do this. This plan exists to do it perfectly.

**Decisions locked in this session (not re-litigated below):**

| Decision | Choice |
|---|---|
| Repo strategy | Salvage Codex's Express + Supabase + service code; rebuild every UI fresh against your Figma; rebrand everything |
| Source control | New GitHub repo (`cup-and-co`) + local clone at `E:\Kiosk App` working in parallel — every commit pushed to GitHub same day |
| Build order | iOS + Customer Web + Admin Dashboard in parallel (waved phases, all platforms ship per phase) |
| App name | **Cup & Co** |
| Game in v1 | Native iOS SpriteKit + Web Canvas, rebuilt from your existing prototype at [Coffe-Collector-Game](https://github.com/Karim-Elbahrawy/Coffe-Collector-Game) |
| Payments in v1 | Paymob with cash-on-pickup fallback |
| Languages in v1 | Arabic + English with full RTL |
| Design strategy | Figma reference is the floor; Claude + Figma MCP + Canva MCP used to *upgrade* visuals (animations, micro-interactions, illustrations, app-store screens) beyond the static reference |

The intended outcome is a 100% working, tested, deployed coffee-ordering ecosystem (iOS native + customer web/PWA + admin dashboard + Express API + Supabase) that the user can hand to baristas on day one.

---

## Tech Stack (locked)

| Layer | Choice | Why |
|---|---|---|
| iOS | SwiftUI + SpriteKit, iOS 17+ | User asked for Swift; SwiftUI is native and matches the warm rounded aesthetic |
| Customer Web/PWA | Next.js 15 (App Router) + Tailwind + Framer Motion | User asked for Next.js; PWA covers Android until native Android |
| Admin Dashboard | Next.js 15 (App Router) + Tailwind + shadcn/ui | Separate app for clean permission boundary |
| Backend | Node 20 + Express + TypeScript | User asked; salvageable from Codex |
| DB / Auth / Storage | Supabase (Postgres, Phone OTP, Storage, Realtime, RLS) | User asked; salvageable schema |
| Payments | Paymob (Egypt-first) | Egypt-supported; Stripe is not |
| Push | APNs (iOS) + Web Push via VAPID (PWA) | Standards-based, free |
| Deploy | Vercel (web apps) + Render free (API testing) + Supabase Cloud | User asked |
| Monorepo | pnpm workspaces | Matches existing Codex structure |
| CI | GitHub Actions: lint + typecheck + test + Playwright visual diff | Auto-gate every PR |

---

## Source Control — GitHub + Local in Parallel

A new GitHub repo `Karim-Elbahrawy/cup-and-co` (or your preferred name) is the source of truth. The local `E:\Kiosk App` directory is its working clone. Every commit lands in both — never local-only.

**Setup at start of Phase 0:**
1. Create GitHub repo `cup-and-co` (private at first, public at launch) under your account via `gh repo create` or the GitHub MCP.
2. `git init` inside `E:\Kiosk App`, add the remote, push the initial scaffold.
3. Default branch `main` is protected: PRs required, CI must pass, CodeRabbit review required.
4. Branch model: `main` (protected) + feature branches per phase (`phase-1-auth`, `phase-2-ordering`, ...).
5. Each commit signed; conventional-commit messages enforced via commit-msg hook.

**Parallel work guarantees:**
- A pre-push hook prevents pushing without CI green locally.
- A post-commit hook auto-pushes to the working branch (configurable; off if you prefer manual).
- `.github/workflows/ci.yml` runs lint + typecheck + Vitest + Playwright on every push and PR.
- Vercel auto-deploys preview URLs for `customer-web` and `admin` per PR.
- Supabase preview branches per PR for safe schema iteration.
- The repo's README has badges for CI, deploy status, and Codecov coverage.

**Existing game prototype** at [Karim-Elbahrawy/Coffe-Collector-Game](https://github.com/Karim-Elbahrawy/Coffe-Collector-Game) stays as-is — we'll fetch its game logic (scoring rules, asset list, mechanics) as a *design reference*, then rebuild it inside `apps/customer-web/components/game/` and `apps/ios/CupAndCo/Game/` to match the Cup & Co aesthetic and pass server-side score validation. We do not depend on the prototype repo at runtime.

---

## Repo Layout (`E:\Kiosk App`, mirrored to GitHub)

```
E:\Kiosk App\
  apps\
    ios\CupAndCo\           # SwiftUI iOS app (Xcode project)
    customer-web\           # Next.js customer PWA
    admin\                  # Next.js admin dashboard
    api\                    # Node/Express backend
  packages\
    design-tokens\          # Shared color/spacing/typography tokens
    types\                  # Shared TypeScript types (generated from Supabase schema)
    i18n\                   # Shared en/ar translation strings (web only; iOS uses Localizable.strings)
  supabase\
    migrations\             # SQL migrations (numbered, normal naming)
    seed.sql                # Demo data: 22 menu items, 5 demo users, 1 kiosk row
    functions\              # Supabase Edge Functions for cron (leaderboard settle)
  docs\
    figma-mapping.md        # Each Figma node ID → component path
    brand-guide.md          # Logo, colors, typography rules
    api-contract.md         # OpenAPI spec
  .github\workflows\        # CI/CD
  pnpm-workspace.yaml
  package.json
  PLAN.md                   # Reference to this plan
```

The existing `E:\Kiosk App\PLAN.md` (the old Codex plan) will be replaced with a one-line pointer to this plan.

**Salvaged from Codex** (`C:\Users\LEGION\Documents\Codex\2026-05-03\i-am-creating-a-mobile-app`):
- `apps/api/src/services/{loyalty,payments,games,permissions,receiptClaims}.ts` — refactor naming, keep business logic
- `apps/api/src/services/*.test.ts` — Vitest patterns
- `supabase/migrations/20260503190000_morning_pass_schema.sql` — refactor table/column names, keep structure
- `apps/api/src/app.ts` — base Express setup
- `package.json` workspace structure

**Discarded entirely** (rebuilt from scratch):
- Every iOS view (`ios/MorningPass/Views/*`)
- Every web component (`apps/customer-web/components/*`, `apps/admin-dashboard/components/*`)
- All Codex CSS / DesignSystem.swift (replaced with Cup & Co tokens from Figma)
- "Morning Pass" brand, "Campus Scholar" / "Brew Points" / etc. naming

---

## Design System (from your Figma reference)

Color tokens (verified against the two screenshots you sent):

```
Primary Orange       #FF8B3D   → CTAs, selected chips, primary accents
Secondary Orange     #FFA329   → quantity + button, secondary accents
Cream Highlight      #FFE2BD   → selected-chip background, soft fills
Paper Background     #FFF1DC   → main app background
Surface              #FFF8EE   → card surface
Coffee Brown (text)  #3D2914   → primary text on light surfaces
Muted Text           #8B7E6E   → secondary text
Stroke / Card Border #F0E5D6   → borders, dividers
Success Green        #4CAF50   → success states
Error Red            #E53935   → errors
Warning Amber        #FFB300   → warnings
Star Yellow          #FFC107   → rating stars
```

Typography:
- iOS: SF Pro Rounded (Display + Text)
- Web: `Sora` (headings) + `Inter` (body) via next/font
- Arabic: `Cairo` (Google Fonts) for both heading and body

Spacing scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 64`
Radius: `chip 12 / card 16 / button-pill 24`
Shadows: `0 4px 16px rgba(61, 41, 20, 0.08)` (warm-tinted, not gray)

Tokens live in `packages/design-tokens/` and are imported by all three frontends. The Figma node IDs are mapped per component in `docs/figma-mapping.md` (every screen we build has a Figma node ID we can re-pull via the Figma MCP for verification).

---

## Naming Conventions (no more campus jargon)

Database enums and API contracts use plain English:

| Domain | Values |
|---|---|
| `user_role` | `student` / `faculty` / `office` / `owner` / `barista` |
| `verification_status` | `pending` / `approved` / `rejected` / `blocked` |
| `fulfillment_type` | `pickup` / `delivery` |
| `order_status` | `received` / `accepted` / `preparing` / `ready` / `out_for_delivery` / `completed` / `cancelled` / `refunded` |
| `payment_method` | `paymob_card` / `paymob_wallet` / `cash` |
| `payment_status` | `unpaid` / `pending` / `paid` / `failed` / `refunded` |
| `loyalty_source` | `online_paid` / `cash_in_app` / `qr_receipt` / `game_reward` |
| Currency | `points` (one currency, no XP/Brew split) |

Product naming style — exactly like your Figma reference, no university metaphors:

| Category | Items |
|---|---|
| Coffee | Velvet Cappuccino, Caramel Macchiato, Honey Latte, Vanilla Cold Brew, Espresso Romano, Iced Americano, Mocha Royale, Hazelnut Latte, Spanish Latte, Flat White |
| Desserts | Tiramisu Cup, Brownie Bar, Almond Croissant, Cheesecake Slice, Chocolate Tart, Cinnamon Roll |
| Breakfast | Avocado Toast, Egg & Cheese Sandwich, Smoked Turkey Bagel, Granola Bowl, Acai Bowl, Spinach Feta Wrap |

---

## Database Schema (refactored from Codex)

```sql
-- Identity
users(id, phone, full_name, role, verification_status, university_id, major,
      department, language_pref, biometric_enabled, blocked, created_at)

-- Catalog
categories(id, slug, name_en, name_ar, sort_order)
products(id, category_id, name_en, name_ar, description_en, description_ar,
         base_price_egp, image_url, prep_minutes, is_available, sort_order, rating_avg, rating_count)
product_options(id, product_id, group_name, name_en, name_ar, price_delta_egp)
  -- group_name in: 'size','sugar','ice','milk','extras'

-- Ordering
orders(id, user_id, status, fulfillment_type, scheduled_for, subtotal_egp,
       discount_egp, points_redeemed, total_egp, payment_method, payment_status,
       pickup_code, created_at, picked_up_at, notes)
order_items(id, order_id, product_id, quantity, options_jsonb, line_total_egp)

-- Payments
payments(id, order_id, provider, provider_intent_id, amount_egp, status,
         raw_callback_jsonb, verified_at, created_at)

-- Loyalty
loyalty_points(id, user_id, source, order_id, qr_code_id, points, balance_after, created_at)
qr_receipts(id, order_id, code, points_value, used_at, used_by_user_id, expires_at)

-- Offers / discounts
offers(id, name_en, name_ar, type, value, starts_at, ends_at,
       target_roles_array, code, usage_limit, usage_count)

-- Engagement
reviews(id, user_id, product_id, order_id, rating, comment_en, comment_ar, hidden, created_at)
favorites(id, user_id, product_id, created_at)

-- Games
game_sessions(id, user_id, started_at, ended_at, score, server_max_score, validated)
leaderboard_weeks(id, week_start, week_end, prize_rules_jsonb, settled_at)
prizes(id, user_id, week_id, rank, type, code, redeemed_at, expires_at)

-- Operations
kiosk_status(id_singleton, is_open, message_en, message_ar,
             capacity_per_slot, slot_minutes, opens_at, closes_at)
push_devices(id, user_id, platform, token, last_seen_at)
audit_log(id, actor_id, action, target_type, target_id, before_jsonb, after_jsonb, created_at)
```

RLS policies:
- `users`: owner-only read/update on own row; service role full
- `products`, `categories`, `offers`: public read for active
- `orders`, `order_items`, `loyalty_points`: owner-only read; writes via Express service role
- `reviews`: public read where `hidden = false`; user writes own
- Admin endpoints bypass RLS via service role under server-side role check

---

## Backend API (Express + TypeScript)

**Customer routes** (`requires phone-OTP session`):
```
POST   /auth/otp/send              { phone }
POST   /auth/otp/verify            { phone, code } → session JWT
GET    /me
PATCH  /me                         (name, language_pref, biometric_enabled)
POST   /me/verification            (multipart: id_image)
GET    /catalog                    (categories + products + active offers)
GET    /products/:id               (details + reviews paged)
POST   /favorites/:product_id
DELETE /favorites/:product_id
POST   /orders                     (creates order, returns order_id + payment intent if not cash)
GET    /orders                     (paged history)
GET    /orders/:id                 (with realtime status)
POST   /payments/paymob/intention  { order_id, method } → iframe_url or payment_key
POST   /webhooks/paymob            (HMAC verified, no auth header)
GET    /loyalty                    (balance + paged history)
POST   /loyalty/redeem-qr          { code }
POST   /reviews                    { order_id, product_id, rating, comment }
POST   /games/sessions             → session_token, server_max_score
POST   /games/scores               { session_token, score }
GET    /leaderboard/current
GET    /leaderboard/me
POST   /push/register              { platform, token }
DELETE /push/register
```

**Admin routes** (`requires owner|barista session`):
```
GET    /admin/orders                       (live, with status filter)
PATCH  /admin/orders/:id/status            (status transition)
GET    /admin/menu/categories
POST   /admin/menu/categories              (owner)
PATCH  /admin/menu/categories/:id          (owner)
GET    /admin/menu/products
POST   /admin/menu/products                (owner)
PATCH  /admin/menu/products/:id            (owner)
PATCH  /admin/menu/products/:id/availability  (owner|barista)
DELETE /admin/menu/products/:id            (owner)
GET    /admin/offers
POST   /admin/offers                       (owner)
PATCH  /admin/offers/:id                   (owner)
GET    /admin/users                        (owner)
PATCH  /admin/users/:id/verify             (owner)
PATCH  /admin/users/:id/block              (owner)
POST   /admin/qr-receipts                  (owner|barista) → printable PNG/PDF
GET    /admin/reports/revenue              (owner)
GET    /admin/reports/top-items            (owner)
GET    /admin/reports/role-breakdown       (owner)
POST   /admin/leaderboard/settle           (owner; also runs on cron)
PATCH  /admin/kiosk/status                 (owner|barista)
GET    /admin/staff
POST   /admin/staff                        (owner)
DELETE /admin/staff/:id                    (owner)
GET    /admin/reviews                      (owner; includes hidden)
PATCH  /admin/reviews/:id/visibility       (owner)
```

OpenAPI spec auto-generated at `apps/api/openapi.yaml`, consumed by both web apps for typed clients.

---

## Information Architecture (every screen)

### Customer (iOS + Web — pixel-matched to your Figma)

| # | Screen | Notes |
|---|---|---|
| 1 | Splash | Logo on cream, 1.5s |
| 2 | Onboarding (3 slides) | Skippable; final CTA "Get Started" |
| 3 | Phone OTP | Country code default +20 (Egypt) |
| 4 | Face ID prompt | Optional after first login |
| 5 | Role select | Student / Faculty / Office cards |
| 6 | Verification | Upload student ID or staff badge |
| 7 | **Home** | Greeting "Good Morning, {name}", search bar with filter icon, "Today Only 70% OFF" promo card with Order Now CTA, role tabs (Student/Faculty/Office), product grid below — **exact match to your second reference image** |
| 8 | Menu list | Category-filtered |
| 9 | **Product Detail** | Hero circular image, heart icon top-right, name + ★ rating, +/- quantity stepper, Size (Small/Medium/Large) chips, Sugar (Normal/Less/No) chips, Ice (Normal/Less/No) chips, "Add to Cart" pill — **exact match to your first reference image** |
| 10 | Cart | Line items with edit, subtotal, points-redeem toggle |
| 11 | Checkout | Pickup time slot (or ASAP), fulfillment toggle, payment method picker, Paymob iframe / cash confirm |
| 12 | Order Tracking | Visual timeline (received → preparing → ready → completed), pickup code QR |
| 13 | Order History | Paged, filter by status |
| 14 | Rewards | Points balance, history, redeem, prize coupons |
| 15 | Game (student-only) | Coffee Collector + leaderboard tab |
| 16 | QR Scanner | Camera, scans receipt QR, awards points |
| 17 | Profile | Name, role, language toggle EN/AR, Face ID toggle, logout, support |
| 18 | Notifications | Inbox of push notifications |

### Admin Dashboard

| # | Screen | Owner | Barista |
|---|---|---|---|
| 1 | Login (email + password, optional 2FA) | ✅ | ✅ |
| 2 | Today Overview | ✅ | partial (no analytics) |
| 3 | Live Orders Board (kanban: received → preparing → ready → completed) | ✅ | ✅ |
| 4 | Menu Management (CRUD) | ✅ | availability toggle only |
| 5 | Offers (CRUD, target roles, schedule) | ✅ | — |
| 6 | Users (list, verification queue, block) | ✅ | — |
| 7 | Loyalty Settings | ✅ | — |
| 8 | Games / Leaderboard | ✅ | view-only |
| 9 | QR Receipt Generator | ✅ | ✅ |
| 10 | Reviews (incl. hidden) | ✅ | — |
| 11 | Reports | ✅ | — |
| 12 | Staff Accounts | ✅ | — |
| 13 | Settings (kiosk hours, capacity, brand content) | ✅ | open/close ordering only |

---

## Payment Flow (Paymob)

1. User completes cart → POST `/orders` (status=`received`, payment_status=`unpaid`)
2. User taps Pay → POST `/payments/paymob/intention { order_id, method }`
3. Server creates Paymob auth token → order → payment key; returns iframe URL (web) or payment key (iOS uses Paymob iOS SDK / `SFSafariViewController`)
4. User completes payment in Paymob hosted UI
5. Paymob calls `/webhooks/paymob` with HMAC signature over canonical body
6. Server verifies HMAC against `PAYMOB_HMAC_SECRET`, idempotent on `paymob_transaction_id`, updates `payments` + `orders.payment_status=paid`, awards loyalty points
7. Push notification to user; Supabase Realtime broadcasts to admin dashboard
8. **Cash fallback:** order created with `payment_method=cash`, `payment_status=pending`; barista marks paid in admin → award reduced points

---

## Loyalty Rules (defaults; owner-editable in admin)

- 1 point per 1 EGP for `online_paid` orders
- 0.5 point per 1 EGP for `cash_in_app` orders
- 0.25 point per 1 EGP for `qr_receipt` (offline)
- 100 points = 5 EGP discount at checkout
- Weekly prize tier (auto-issued as coupon, 7-day expiry):
  - 1st: free combo (1 drink + 1 dessert)
  - 2nd: free drink
  - 3rd: 50% off coupon

Settlement: Supabase Edge Function on cron, Sundays 00:00 Africa/Cairo. Manual override button in admin.

---

## Coffee Collector Game (v1)

Reference prototype: [Karim-Elbahrawy/Coffe-Collector-Game](https://github.com/Karim-Elbahrawy/Coffe-Collector-Game) — your existing React/Vite build. Used as a *design and rule reference* only; v1 ships native rebuilds in both platforms with server-side score validation:

- iOS: SpriteKit, native physics, 60s round, falling beans (good = +1, bad = -1, golden = +5). Re-uses the prototype's bean sprites and music with permission. Particle effects on catch via `SKEmitterNode`.
- Web: HTML5 Canvas + `requestAnimationFrame`, identical rules and timing as iOS so the leaderboard is fair across platforms.
- Asset migration: prototype's sprites, sound effects, and background pulled into `apps/customer-web/public/game/` and `apps/ios/CupAndCo/Game/Assets.xcassets/`. Re-skinned in Cup & Co orange/cream palette.
- Anti-cheat:
  - Server issues session token with `server_max_score` (calculated from beans-per-second × duration × max-multiplier)
  - Client posts final score; server rejects if `score > server_max_score`
  - Max 3 sessions per user per day
  - Time-velocity sanity check (score impossible-by-clock = reject)
- Difficulty curve: bean spawn rate increases linearly over 60s; the prototype's static rate is upgraded for retention.

---

## Design Upgrade Strategy

The Figma design is the *floor*, not the ceiling. We use available design tooling to *upgrade* every screen beyond the static reference:

| Tool | Where it upgrades |
|---|---|
| **Figma MCP** (`get_design_context`, `get_screenshot`, `get_variable_defs`) | Pulls exact tokens and reference renders per screen for pixel-faithful base implementation |
| **Claude design generation** | Generates richer illustrations for empty states (empty cart, no orders yet, no notifications), splash mascot, role-selection art, "your morning is handled" hero illustration |
| **Canva MCP** (if connected) | App Store / Play Store screenshots, marketing landing page imagery, social-launch assets, in-app promo banner refreshes |
| **Framer Motion / Lottie** (web) + **SwiftUI animations** (iOS) | Micro-interactions the static Figma cannot show: chip selection bounce, add-to-cart zoom, order-status timeline tick-through, points-earned counter, leaderboard rank-change confetti |
| **CSS gradients + warm shadows** | Soft, branded depth (warm-tinted `rgba(61,41,20,0.08)` shadows instead of gray) the Figma may use flat |
| **Dark mode pass** | Phase 6 — earned dark theme (espresso brown background + cream accents) the Figma doesn't include |

**Rule:** Every screen first matches Figma at <2% Playwright visual diff (the floor), then gets one explicit upgrade pass per phase that improves animation, illustration, or polish without breaking that diff. Diffs are intentionally regenerated when an upgrade lands; before/after recorded in `docs/upgrades/`.

The result: an app that matches the user's reference *and* feels noticeably more alive than the original Figma.

---

## Bilingual (Arabic + English)

- Web: `next-intl`, `/en` and `/ar` routes; HTML `dir` auto-set; logical CSS properties throughout (no `margin-left`, only `margin-inline-start`)
- iOS: `Localizable.strings` for both languages; `UIView.semanticContentAttribute` flips for Arabic; per-app language toggle (independent of system)
- Admin: same as customer web
- Database: `name_en` + `name_ar` columns on user-facing content; runtime selects by `user.language_pref`
- Push notification copy localized server-side using `user.language_pref`
- Verification: every screen has both an EN and an AR Playwright snapshot in CI

---

## Push Notifications

- iOS: APNs via `UNUserNotificationCenter`; permission prompted on home-screen first view (not at launch); device token POST'd to `/push/register`
- Web: VAPID Web Push; service worker handles `push` event; permission prompt after first order (not on landing)
- Triggered on: order status change, prize awarded, weekly leaderboard reset, new role-targeted offer
- Backend uses single `sendNotification(user_id, payload)` helper that fans out to all registered devices

---

## Roadmap (parallel waves; all three platforms ship per phase)

Each phase ends in a verification gate. No phase ships until its tests are green and Playwright visual diff against Figma is < 2% deviation.

**Phase 0 — Foundation (week 1)**
- Init monorepo, salvage backend services from Codex, refactor naming
- Create Supabase project, write fresh migrations
- Seed normal coffee menu (22 items, EN + AR + images)
- Create `packages/design-tokens` + `packages/i18n`
- Wire CI: lint, typecheck, Vitest, Playwright skeleton
- Deploy API stub to Render; both web stubs to Vercel

**Phase 1 — Auth + Catalog (week 2)**
- iOS: phone OTP, Face ID toggle, home shell with role tabs + product grid
- Web: same, plus PWA manifest + service worker
- Admin: email/password login, today overview shell, live orders skeleton
- API: `/auth/otp/*`, `/catalog`, `/me`, `/me/verification`

**Phase 2 — Ordering vertical slice (weeks 3–4)**
- Product Detail (pixel match to your reference image)
- Cart + Checkout
- Paymob intention + iframe + webhook with HMAC verify
- Order Tracking
- Admin live orders kanban with status transitions
- Push notifications on status change

**Phase 3 — Loyalty + QR (week 5)**
- Rewards screen + history
- QR scanner (AVCaptureSession on iOS, getUserMedia on web)
- Admin QR receipt generator (printable)
- Points awarding on every paid order

**Phase 4 — Games + Leaderboard (week 6)**
- iOS SpriteKit Coffee Collector
- Web Canvas Coffee Collector
- Server session token + score validation
- Weekly leaderboard + cron-settled prizes

**Phase 5 — Reviews + Offers + Admin polish (week 7)**
- Reviews on product detail, hidden by default in admin (your requirement)
- Offers CRUD with role targeting + coupon redemption
- Admin reports (revenue, top items, role breakdown)
- Verification queue + user blocking

**Phase 6 — i18n + Accessibility + Polish (week 8)**
- Full Arabic translations + RTL audit (Playwright AR snapshots)
- Accessibility (VoiceOver, large-text, contrast)
- Loading skeletons, empty states, error states, offline mode
- Onboarding, splash, App Store / Play Store assets

**Phase 7 — Test + Deploy + Launch (weeks 9–10)**
- Full E2E (Playwright web + admin, XCUITest iOS, Vitest backend)
- Load test: 50 concurrent orders simulating a lecture-break rush
- Paymob production keys; custom domain
- TestFlight build for kiosk staff
- 1-week soft launch → public

---

## Tooling We Will Use

| Tool | Use |
|---|---|
| Figma MCP | Pull each screen's exact tokens + assets node-by-node when implementing |
| Supabase MCP | Create project, run migrations, manage Edge Functions, check advisors |
| Vercel MCP | Deploy customer-web + admin per phase |
| GitHub MCP | PR-per-phase workflow, gh-cli for releases |
| Claude Preview MCP | Browser preview each web screen during dev |
| Playwright | Visual regression diff vs. Figma exports per screen, EN + AR |
| `gsd-plan-phase` / `gsd-execute-phase` | Drive each phase with strict planning + verification gates |
| CodeRabbit | PR review on every merge |

---

## Critical Files (paths to be created)

The plan replaces the placeholder `E:\Kiosk App\PLAN.md` (the old Codex one-pager) with a one-line pointer to this plan. All other paths below are created during execution:

- `E:\Kiosk App\pnpm-workspace.yaml` — workspace roots
- `E:\Kiosk App\packages\design-tokens\src\index.ts` — color/spacing/typography exports
- `E:\Kiosk App\supabase\migrations\0001_init.sql` — fresh schema with normal naming
- `E:\Kiosk App\supabase\seed.sql` — 22 menu items, 5 demo users, kiosk row
- `E:\Kiosk App\apps\api\src\app.ts` — Express bootstrap (refactored from Codex)
- `E:\Kiosk App\apps\api\src\routes\*.ts` — route modules per resource
- `E:\Kiosk App\apps\api\src\services\{loyalty,payments,games,permissions,receiptClaims}.ts` — salvaged from Codex with renamed types
- `E:\Kiosk App\apps\customer-web\app\(public)\page.tsx` — home (matches your reference image)
- `E:\Kiosk App\apps\customer-web\app\(authed)\products\[id]\page.tsx` — product detail (matches your reference image)
- `E:\Kiosk App\apps\admin\app\(authed)\orders\page.tsx` — live kanban
- `E:\Kiosk App\apps\ios\CupAndCo\CupAndCo.xcodeproj` — Xcode project
- `E:\Kiosk App\apps\ios\CupAndCo\Views\HomeView.swift` — home (matches your reference image)
- `E:\Kiosk App\apps\ios\CupAndCo\Views\ProductDetailView.swift` — product detail (matches your reference image)
- `E:\Kiosk App\apps\ios\CupAndCo\Game\CoffeeCollectorScene.swift` — SpriteKit game
- `E:\Kiosk App\.github\workflows\ci.yml` — lint + typecheck + test + Playwright

---

## Reused Patterns from Codex (with paths)

These are real, working files we copy and rename, not re-derive:

| File (Codex path) | Target | What survives |
|---|---|---|
| `apps/api/src/services/loyalty.ts` | `apps/api/src/services/loyalty.ts` | Point-calculation logic; rename `BrewPoints` → `Points` |
| `apps/api/src/services/payments.ts` | `apps/api/src/services/payments.ts` | Paymob intention flow + HMAC verify |
| `apps/api/src/services/games.ts` | `apps/api/src/services/games.ts` | Session-token + score-cap logic |
| `apps/api/src/services/permissions.ts` | `apps/api/src/services/permissions.ts` | Owner/barista RBAC matrix; rename roles |
| `apps/api/src/services/receiptClaims.ts` | `apps/api/src/services/qrReceipts.ts` | QR claim logic; rename file |
| `apps/api/src/services/*.test.ts` | matched paths | Vitest patterns; refactor names |
| `supabase/migrations/20260503190000_*.sql` | `supabase/migrations/0001_init.sql` | Schema *structure*; rename every `campus_*` and `morning_*` |

---

## Test Plan (gates each phase)

| Test type | Tooling | Coverage |
|---|---|---|
| Backend unit | Vitest | Loyalty math, payment HMAC, game score cap, RBAC matrix, QR redemption |
| API integration | Vitest + supertest | Full route surface against ephemeral Supabase test project |
| Web E2E | Playwright | Full user flows EN + AR, including Paymob sandbox |
| Web visual | Playwright `toHaveScreenshot` | < 2% diff vs. Figma exports per screen |
| iOS unit | XCTest | Same business logic where mirrored client-side |
| iOS UI | XCUITest | Smoke flows for ordering + game |
| Load | k6 or Artillery | 50 concurrent orders during simulated rush |
| Accessibility | axe-playwright | WCAG AA on every screen |

---

## Success Criteria (definition of "100% working")

- Every screen pixel-faithful to Figma (Playwright diff < 2%)
- Zero campus-jargon naming in user-facing text (EN or AR)
- Full ordering flow tested end-to-end with both Paymob sandbox and cash fallback
- Loyalty math verified: `online > cash > QR` ratios hold under property-based tests
- Game cannot be cheated (server-side score-cap prevents `score > server_max_score`)
- Arabic version visually correct with RTL on every screen
- Admin can run a full kiosk day: open ordering, accept orders, prepare, complete, generate QR receipts, settle weekly leaderboard, view daily revenue
- 1 hour cold-start of Render free tier does not break customer flow (cached catalog, optimistic UI)

---

## Verification (how to test the whole thing end-to-end)

```bash
cd "E:\Kiosk App"
pnpm install
pnpm db:reset    # supabase db reset && seed
pnpm dev         # api on :4000, customer-web on :3000, admin on :3001
```

Then:
- Open `http://localhost:3000` → land on home → log in with seeded `+201000000001` (OTP `000000` in dev)
- Place an order with Paymob sandbox card `4987654321098769` (Paymob test card)
- Open `http://localhost:3001` → log in as owner → see the order live, advance to `ready`, see push notification on web tab
- Open Xcode `apps/ios/CupAndCo/CupAndCo.xcodeproj` → run on iOS 17 simulator → repeat the flow
- Run `pnpm test` (Vitest backend + Playwright web) — all green required to merge
- Run `pnpm test:visual` — Playwright snapshots within 2% of Figma exports

---

## Open Risks (acknowledged up-front)

| Risk | Mitigation |
|---|---|
| Paymob production approval can take days | Begin Paymob merchant onboarding in Phase 0; sandbox unblocks all dev work |
| Render free tier spins down → cold-start UX | Customer web caches catalog locally; first order may show 5s spinner |
| Apple developer account needed for TestFlight | User provisions in parallel during Phase 0; not blocking until Phase 7 |
| Arabic typography quirks on iOS | Use Cairo font bundled in app; manual RTL audit per screen by week 8 |
| 50-concurrent-orders rush during lectures | Load-tested in Phase 7; Render upgrade or Fly.io migration ready as plan B |

---

## What I Need from You Before Phase 0

1. **GitHub access** — confirm the repo name (`cup-and-co` or your preference) and that I can create it under `Karim-Elbahrawy`. The GitHub MCP is already authenticated, so I can do this myself with your nod.
2. Paymob merchant account credentials (sandbox keys are enough to start)
3. Supabase organization access (or I create one under your email)
4. Vercel account access (already connected via MCP)
5. Apple Developer account (only blocks Phase 7 — TestFlight)
6. Logo asset for "Cup & Co" if you have one; otherwise I'll generate a wordmark in Phase 0 using Claude design + Canva
7. Photos of real products from your kiosk (or I'll seed with stock images for MVP)
8. Permission to import the Coffee Collector prototype's sprites/audio into the new repo (your own asset, but confirming intent)
