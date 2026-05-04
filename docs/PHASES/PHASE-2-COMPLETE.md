# Phase 2 — Ordering Vertical Slice: ✅ Web + Admin Complete

**Started:** 2026-05-04
**Status:** ✅ API + Customer Web + Admin shipping. iOS Phase 2 deferred (agent hit rate limit; resume after reset).

## Goal

Real ordering: product detail → cart → checkout → tracking, plus admin status transitions on real line-item data.

## API expansion (commits `427334c`-class, latest)

| Service | What |
|---|---|
| `services/orders.ts` | Order model with items, statusHistory, pickupCode. State machine validates transitions (received → accepted → preparing → ready → completed/out_for_delivery; cancelled terminal; completed → refunded only). `trackingTimelineFor()` builds step-by-step view. `applyStatusTransition()` mutates with history append. |
| `services/push.ts` | Push fan-out helper. Phase 2 logs in dev. `statusNotificationCopy()` provides EN/AR copy per status with pickup code (delivery vs pickup variants). |

### New / upgraded endpoints

| Endpoint | What |
|---|---|
| `POST /orders` | Resolves products from catalog server-side, applies per-option price deltas, validates kiosk open + product availability, computes points awarded, decrements redeemed points with balance guard, returns `{ order, timeline }` |
| `GET /orders/:id` | Returns `{ order, timeline }` |
| `POST /webhooks/paymob` | Auto-advances paid card orders to `accepted`, fires push notification |
| `PATCH /admin/orders/:id/status` | Uses state machine, marks pickedUpAt on completed, auto-marks cash orders paid + awards points on completed, pushes status copy in user's language |
| `GET /admin/orders/:id` | Full order detail + timeline (admin) |
| `GET /admin/kiosk/status` | Read kiosk state |
| `PATCH /admin/kiosk/status` | Owner: full edit; barista: is_open only (server-enforced) |
| `PATCH /admin/menu/products/:id/availability` | Both roles |

**Tests:** +40 new (19 orders service, 4 push, 17 routes). **102/102 passing.**

## Customer Web (`apps/customer-web/`)

### New routes

```
src/app/(authed)/
  products/[id]/page.tsx    # Product detail — pixel-faithful + upgraded
  cart/page.tsx              # Line items + redeem-points slider
  checkout/page.tsx          # Fulfillment + time slots + payment + notes
  orders/page.tsx            # History list
  orders/[id]/page.tsx       # Tracking with vertical timeline + pickup code
```

### New library

- `src/lib/cart.ts` — Zustand cart store with persist-to-localStorage, stable `lineKey()` merging same product+options.
- `src/lib/api.ts` — Phase 2 endpoint helpers (createOrder, getOrder, listOrders, paymobIntention, loyalty).
- `src/lib/types.ts` — `ApiOrder`, `ApiOrderItem`, `TimelineStep`, `OrderResponse`, `CreateOrderRequest`, `PaymobIntentionResponse`, `LoyaltyResponse`.

### Polish on the product detail page (the most-important screen)

- **Circular hero image** with warm radial-gradient terracotta glow underneath.
- **Heart favourite** top-right, terracotta-filled when active (local state Phase 2).
- **Quantity stepper** with `−` / `+` (terracotta + button), animated digit transition via Framer Motion `AnimatePresence`.
- **Option chips** for Size / Sugar / Ice — spring bounce on select (response 0.35, damping 0.65), terracotta filled when active, cream filled otherwise.
- **Price-delta indicator** in italic small text on each chip showing `+10 EGP` etc.
- **Sticky bottom add-to-cart pill** with animated total counter.
- **Skeleton loading state**, error state with retry link.

### Polish on cart, checkout, tracking

- Cart: animated list (Framer Motion `AnimatePresence` exits with x-slide), points-redeem range slider with EGP-saved feedback.
- Checkout: 3 payment cards with sunrise-tinted selected state, ASAP + 4 future quarter-hour slots auto-generated.
- Tracking: **64px terracotta pickup code**, vertical timeline with active-step pulsing teal ring (`scale: [1, 1.3, 1]` 1.6s loop), collapsible items section.

## Admin Dashboard (`apps/admin/`)

### New route

`src/app/(authed)/orders/[id]/page.tsx` — full operational view of a single order:
- 64px terracotta pickup code hero
- StatusPill + total + payment method/status
- Horizontal status timeline (`OrderTimeline` component)
- `ItemsTable` with image + options chips + qty + line total
- Summary panel (subtotal, discount, points redeemed, total, fulfillment, scheduled, picked-up)
- Notes panel (when present)
- Advance / move back / cancel / refund actions (refund owner-only)
- ←/→ keyboard advance/regress, `c` to cancel
- Print receipt via `window.print()` with print-only stylesheet
- 5s polling while non-terminal

### New components

- `OrderTimeline.tsx` — horizontal stepper visual (active pulses, done filled, future stroke-only)
- `ItemsTable.tsx` — line-item rows with images + options chips
- `Toast.tsx` — top-right toast host + `useToast()` hook for optimistic-revert UX

### Updated

- `OrderCard` shows real line summaries (`2× Velvet Cappuccino, 1× Tiramisu Cup`) replacing the Phase 1 placeholder.
- `(authed)/layout.tsx` wraps the app in `<ToastHost>`.

### Quality gates

`pnpm --filter @cup-and-co/admin typecheck` ✔ clean
`pnpm --filter @cup-and-co/admin lint` ✔ clean
`pnpm --filter @cup-and-co/customer-web typecheck` ✔ clean
`pnpm --filter @cup-and-co/customer-web lint` ✔ clean
`pnpm --filter @cup-and-co/api test` ✔ **102/102**

## iOS Phase 2 — deferred

The iOS agent hit the Anthropic API daily rate limit before completing. The **iOS Phase 1 scope (auth + Home + Profile + tabs) remains intact**; the deferred work is product detail / cart / checkout / tracking on the SwiftUI side. Mirror of the customer-web build, just translated to SwiftUI components.

Resume after rate limit clears (5:10am Africa/Cairo per the rate-limit notice). The brief and locked design language are unchanged.

## Stubs / Phase 3 follow-ups

- **Real APNs / Web Push delivery** — token store + helper exist, dev logs notifications. Phase 3 swaps in real APNs HTTP/2 + web-push.
- **Cart heart favourite is local-only** — Phase 3 wires `/favorites/:productId`.
- **Notes field is captured & sent** but admin doesn't yet expose a way to filter by notes.
- **Paymob iframe opens via `window.location`** in Phase 2 — Phase 3 will switch to a modal for in-app continuity.
- **Order detail "items load with realtime"** placeholder gone — admin order detail now shows full items, but the kanban list still polls every 5s. Phase 3 swaps to Supabase Realtime.
- **Kiosk status PATCH endpoint** wired in API + admin client; admin settings page UI wiring is the immediate next step.
- **Cancel order endpoint** wired in admin order detail; the customer side cancel button on tracking screen is not yet implemented (Phase 3).

## Verification

```bash
cd "E:\Kiosk App"
pnpm install
pnpm --filter @cup-and-co/api test            # 102/102
pnpm --filter @cup-and-co/customer-web typecheck
pnpm --filter @cup-and-co/customer-web lint
pnpm --filter @cup-and-co/admin typecheck
pnpm --filter @cup-and-co/admin lint
pnpm --filter @cup-and-co/admin build

# Run all dev servers
pnpm dev
# → API:           http://localhost:4000
# → customer-web:  http://localhost:3000
# → admin:         http://localhost:3001
```

End-to-end demo:
1. Open `/login` on customer web, enter `+201000000001`, OTP `000000`
2. Click any product on Home → product detail with size/sugar chips
3. Add to cart → review cart → continue to checkout
4. Pick Cash + ASAP → place order → land on tracking with pickup code
5. In another tab, open admin (`localhost:3001`), log in as `barista@cupandco.app`
6. See the order in the kanban → click into detail page → advance through statuses
7. Customer tracking auto-updates (5s poll)

## Phase 3 scope (when ready)

1. **iOS Phase 2 catch-up** — same screens as web, in SwiftUI
2. **Real APNs** + Web Push (real device delivery, not console.log)
3. **Loyalty UI** — points balance, history, redeem-at-checkout already wired but no rewards screen UI yet
4. **QR scanner** customer side (loyalty/redeem-qr)
5. **Supabase Realtime** for orders (replaces 5s polling)
6. **Real Supabase auth** wired in (current OTP is `000000` dev stub)
7. **Cancel/Refund customer-side**
8. **Reviews** UI on product detail (post-purchase)

See `docs/MASTER-PLAN.md` for the full roadmap.
