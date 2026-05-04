# Cup & Co — Working Context

> **For any AI chat resuming work on this project: read this file first, then `docs/MASTER-PLAN.md`, then `docs/PHASES/PHASE-3-COMPLETE.md`. They contain everything you need to continue without re-asking the user.**

## What this project is

A campus coffee kiosk ordering ecosystem for an Egyptian university kiosk. Native iOS app, customer web/PWA, admin dashboard, Express API, Supabase. The user (Karim Elbahrawy) commissioned this from a previous Codex session that produced working code with bad branding ("Morning Pass", "Campus Scholar", "Brew Points") and UI that didn't match the Figma reference. This rebuild salvages the backend logic and rebuilds the UI fresh.

**Authoritative plan**: [`docs/MASTER-PLAN.md`](./docs/MASTER-PLAN.md). Source of truth for every architectural decision.

## Locked decisions (don't re-litigate)

| Decision | Choice |
|---|---|
| App name | **Cup & Co** |
| Repo strategy | Salvage Codex's Express + Supabase + service code, refactor naming, rebuild every UI fresh against Figma |
| Source control | GitHub repo (`Karim-Elbahrawy/cup-and-co`) + local `E:\Kiosk App` working in parallel — commit + push every meaningful step |
| Build order | iOS + customer web + admin **in parallel** (waved phases) |
| Languages | Arabic + English with full RTL on day one |
| Payments | Paymob with cash-on-pickup fallback |
| Game | Native iOS SpriteKit + Web Canvas Coffee Collector (rebuilt from [Karim-Elbahrawy/Coffe-Collector-Game](https://github.com/Karim-Elbahrawy/Coffe-Collector-Game)) |
| Design strategy | Figma reference is the floor; Claude/Figma/Canva MCPs used to *upgrade* visuals (animations, illustrations, app store screens) beyond static reference |
| Loyalty math | 1 / 0.5 / 0.25 points-per-EGP for online / cash / QR; 100 pts = 5 EGP |
| Roles | `student`, `faculty`, `office`, `owner`, `barista` (no campus jargon) |
| Coffee menu | Real names: Velvet Cappuccino, Caramel Macchiato, Honey Latte, Tiramisu Cup, Avocado Toast, etc. |

## Reference design

Figma file: https://www.figma.com/design/JnPiZHivLqiYSYdKNYe7DA/Coffee-Shop-App-Design-UI-Kit--FREE---Community-

User-shared reference images (in chat history):
1. Product detail "Velvet Cappuccino" — circular hero image, ★ 4.9/5, +/- quantity stepper, Size (Small/Medium/Large), Sugar (Normal/Less/No), Ice (Normal/Less/No), orange "Add to Cart" pill
2. Home — "Karim Elbahrawy" greeting with "Good Morning", search bar with filter icon, "Today Only 70% OFF Super Discount" promo card with orange Order Now CTA, Student/Faculty/Office tabs

## Current status

**Phase 0 — Foundation: ✅ COMPLETE**
**Phase 1 — Auth + Catalog + Home: ✅ COMPLETE**
**Phase 2 — Ordering Vertical Slice: ✅ COMPLETE**
**Phase 3 — Loyalty + QR + iOS Catch-up + SSE Real-time: ✅ COMPLETE**
**Phase 4 — Games + Leaderboard: ✅ COMPLETE**
**Phase 5 — Reviews + Offers + Admin Polish: ✅ COMPLETE**
**Phase 6 — i18n + Accessibility + Polish: ✅ COMPLETE**

### Phase 6 highlights
- **i18n**: Full Arabic translations audit — 15 new translation keys, all hardcoded English strings replaced with `t()` calls across home, checkout, game, rewards, profile, QR scanner. **117/117 Vitest tests passing.**
- **Accessibility**: `focus-visible` rings on all interactive elements, ARIA labels on icon buttons, `role="alert"` on errors, `role="status"` on loading, semantic HTML throughout. Reduced motion respected.
- **UI Polish**: `SkeletonProductGrid`, `EmptyState`, `ErrorState` with retry, `OfflineIndicator` components. Integrated into home, orders, game pages.
- **iOS**: Active offers displayed as gradient pills on home. `localizedName(language:)` helper on `Offer` model. `CategoryChipRow` rename.

### Phase 5 highlights
- **API**: 11 new admin endpoints — reviews (list, toggle hidden), users (list, verify, block), offers (CRUD, role targeting, coupon codes), reports (revenue, top items, role breakdown). Shared `adminOffers` store merged into catalog response. `usersRegistry` for admin user management. **117/117 Vitest tests passing.**
- **Admin Dashboard**: 4 new pages — Reviews (visibility toggle), Users (verification queue + block), Offers (CRUD with schedule/roles/coupon), Reports (revenue cards + top items + role breakdown). Owner-only nav items hidden from barista.
- **Customer Web**: Active offers displayed on home page as gradient pills. Coupon code input at checkout with discount display.
- **Infrastructure**: `assertAdminPermission` now returns proper 403 status codes.

### Phase 4 highlights
- **API**: Game sessions (`POST /games/sessions`) with server-calculated `serverMaxScore` anti-cheat. Score submission (`POST /games/scores`) rejects impossible scores. Weekly leaderboard (`GET /leaderboard/current`, `/leaderboard/me`). Prize issuance (`GET /prizes`, `POST /admin/leaderboard/settle`). **102/102 Vitest tests passing.**
- **iOS**: SpriteKit `CoffeeCollectorScene` with physics-based falling beans (good/bad/golden), increasing spawn rate, particle effects. `GameView` wrapper + `LeaderboardView` with rank badges. Prizes displayed in `RewardsView`.
- **Customer Web**: Canvas `CoffeeCollectorGame` with identical rules and `requestAnimationFrame`. Leaderboard sidebar + user's rank. Prize section on `/rewards` with copy-to-clipboard coupon codes.
- **Anti-cheat**: Server token + max score validation, daily session limit (3), time-velocity sanity checks.

### Phase 3 highlights
- **API**: SSE real-time endpoints (`GET /orders/:id/events`, `GET /admin/orders/events`) via EventEmitter. Customer cancel (`POST /orders/:id/cancel`). Reviews (`POST /reviews`). Favorites (`POST/DELETE /favorites/:productId`). Loyalty history in `GET /loyalty`. **102/102 Vitest tests passing.**
- **iOS Phase 2+3**: Full ordering flow (ProductDetail with option chips + spring bounce, Cart with points slider, Checkout with time slots + payment cards, OrderTracking with 64px pickup code + vertical timeline, OrderHistory). Rewards screen with points balance card + history. QR Scanner via AVCaptureSession. CartStore + OrderStore (@Observable). Cart badge on BottomTabBar. NavigationLink from home to product detail.
- **Customer Web**: Rewards page with points balance hero + history list + QR Scanner (BarcodeDetector API). Reviews section on product detail with star selector. Cancel button on order tracking. Favorite toggle wired to API. **SSE replaces 5s polling** on order tracking (fetch-based ReadableStream parser with polling fallback).
- **Admin**: SSE replaces 5s polling on kanban + order detail. `useOrdersSSE` hook with exponential backoff reconnect + polling fallback. Live/reconnecting/polling status indicator.

### Next phase
**Phase 7 — Test + Deploy + Launch**. Full E2E (Playwright web + admin, XCUITest iOS, Vitest backend), load test (50 concurrent orders), Paymob production keys, TestFlight build, soft launch.

## How to run locally

```bash
cd "E:\Kiosk App"
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/customer-web/.env.example apps/customer-web/.env
cp apps/admin/.env.example apps/admin/.env

# Optional: start Supabase locally (requires supabase CLI)
cd supabase && supabase start && cd ..

# Run all apps
pnpm dev
# → API:           http://localhost:4000
# → customer-web:  http://localhost:3000
# → admin:         http://localhost:3001

# Run tests
pnpm test            # 102 backend Vitest tests pass
pnpm test:web        # Playwright (requires apps running)
```

## Demo accounts

Dev OTP code is always `000000`.

| Phone | Role | Name |
|---|---|---|
| +201000000001 | student | Karim Elbahrawy |
| +201000000002 | faculty | Dr. Layla Hassan |
| +201000000003 | office | Omar Mahmoud |
| +201000000004 | owner | Cup & Co Owner |
| +201000000005 | barista | Nour the Barista |

## Open items the user owes us

These are **not** blocking Phase 1, but get them ASAP:

1. Paymob sandbox API key + HMAC secret + integration IDs (card + wallet) + iframe ID
2. Supabase project (or confirm it's OK if the assistant creates one)
3. Vercel account confirmed (MCP is connected)
4. Apple Developer account (only blocks Phase 7 — TestFlight)
5. Logo asset for Cup & Co (or assistant generates wordmark + monogram)
6. Real product photos (or assistant uses stock for MVP)
7. Permission to import Coffee Collector prototype sprites/audio (your asset, just confirming)

## How to resume from any AI chat

Tell the next AI:

> "I'm working on the Cup & Co coffee kiosk app at `E:\Kiosk App` (also pushed to GitHub at `Karim-Elbahrawy/cup-and-co`). Read `CONTEXT.md`, then `docs/MASTER-PLAN.md`, then the latest file in `docs/PHASES/`. Continue from where the last phase ended. Do not re-ask locked decisions."

That's it. Every commit message references the phase number. Every phase produces a `docs/PHASES/PHASE-N-COMPLETE.md` summary so the next session knows exactly what shipped and what's next.

## Repo conventions

- **Commits**: conventional-commit style (`feat(api): ...`, `fix(web): ...`). Always include the phase number when relevant.
- **Branches**: `main` is protected. Feature branches per phase (`phase-1-auth`, `phase-2-ordering`, ...).
- **PRs**: required for `main`. CI must pass. CodeRabbit review on every merge.
- **No campus jargon** in user-facing text (English or Arabic). DB enums use plain English (`student`, `faculty`, `office`, `owner`, `barista`).
- **Bilingual** — every user-facing string lives in `packages/i18n` (web) or `Localizable.strings` (iOS) with both EN + AR.

## Useful pointers

- Master plan: [`docs/MASTER-PLAN.md`](./docs/MASTER-PLAN.md)
- Brand guide: [`docs/brand-guide.md`](./docs/brand-guide.md)
- API contract: [`docs/api-contract.md`](./docs/api-contract.md)
- Figma component mapping: [`docs/figma-mapping.md`](./docs/figma-mapping.md)
- Phase summaries: [`docs/PHASES/`](./docs/PHASES/)
- Original Codex attempt (for reference, do not modify): `C:\Users\LEGION\Documents\Codex\2026-05-03\i-am-creating-a-mobile-app`
