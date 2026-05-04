# Phase 3 — Loyalty + QR + iOS Catch-up + SSE Real-time: ✅ COMPLETE

**Started:** 2026-05-04
**Status:** ✅ All platforms shipping (API + iOS + Customer Web + Admin)

## Goal

iOS Phase 2 catch-up, real-time order updates via SSE (replacing 5s polling), loyalty rewards screen with QR scanner, reviews on product detail, customer cancel, favorites wiring.

## API expansion (commit `b4a965f`)

### New endpoints

| Endpoint | What |
|---|---|
| `GET /orders/:id/events` | SSE stream for single order (customer tracking). Sends initial snapshot, then pushes on every status change. Auth via Bearer token. |
| `GET /admin/orders/events` | SSE stream for all orders (admin kanban). Sends full order list initially, then individual order updates. |
| `POST /orders/:id/cancel` | Customer cancel with state machine validation. Only allowed from received/accepted/preparing. |
| `POST /reviews` | Product review (rating 1-5 + comment). In-memory store. |
| `POST /favorites/:productId` | Add favorite |
| `DELETE /favorites/:productId` | Remove favorite |
| `GET /favorites` | List favorited product IDs |
| `GET /loyalty` | Now includes full `history[]` with source, points, balanceAfter, timestamps |

### Infrastructure

- `EventEmitter`-based order event bus (`orderEvents`) broadcasts to all connected SSE clients.
- `emitOrderUpdate()` called from: order creation, payment webhook, admin status transition, customer cancel.
- `recordLoyaltyEvent()` tracks loyalty history for: online_paid, cash_in_app, qr_receipt, redeemed.

**Tests:** 102/102 passing (no regressions).

## iOS (commits `f487a82`)

### Phase 2 catch-up — full ordering flow

| View | Description |
|---|---|
| `ProductDetailView` | Circular hero image with terracotta radial glow, heart favorite button, star rating, quantity stepper, Size/Sugar/Ice option chips with spring bounce animation + price deltas, sticky "Add to Cart" pill with animated total |
| `CartView` | Line items with product image/name/options/quantity steppers, points redemption slider (0 to balance, shows EGP saved), subtotal/discount/total summary, "Continue to Checkout" pill, empty cart state |
| `CheckoutView` | Fulfillment toggle (Pickup/Delivery), time slot picker (ASAP + 4 quarter-hour slots), payment method cards (Card/Wallet/Cash with sunrise tint), notes field, order summary, "Place Order" button → tracking |
| `OrderTrackingView` | 64px terracotta pickup code, vertical timeline (done=filled check, active=pulsing teal ring, pending=stroke circle), collapsible items, cancel button, 5s polling |
| `OrderHistoryView` | Past orders list with pickup code, status pill (color-coded), date, item count, total |

### Phase 3 — Rewards + QR

| View | Description |
|---|---|
| `RewardsView` | Sunrise gradient points balance card, "Scan QR Receipt" button, points history list with source-specific icons (creditcard/banknote/qrcode/gift/gamecontroller), formatted dates, empty state |
| `QRScannerView` | AVCaptureSession + AVCaptureMetadataOutput QR detection, camera permission flow, scan overlay with terracotta border, haptic feedback on scan, UIKit bridge via UIViewControllerRepresentable |

### New architecture

- **Models:** `Order`, `OrderItem`, `StatusEvent`, `TimelineStep`, `LoyaltyEntry` (all Codable/Sendable)
- **Stores:** `CartStore` (@Observable, lineKey-based item merging), `OrderStore` (@Observable, async order ops)
- **API:** `OrderAPI` (create/list/get/cancel), `LoyaltyAPI` (fetch/redeemQR), `FavoritesAPI` (add/remove)
- **APIClient:** Added `delete()` method
- **MainTabShell:** Cart tab → CartView, Rewards tab → RewardsView, cart badge on BottomTabBar
- **HomeView:** Product cards now NavigationLink to ProductDetailView

## Customer Web (commit `b952324`)

### New pages

| Route | What |
|---|---|
| `/rewards` | Points balance hero card (orange gradient), QR scan button, points history with source icons + labels, Framer Motion staggered list animations, empty state |
| QRScanner component | BarcodeDetector API camera scanner, getUserMedia permission flow, scanning animation (moving line), success/error/unsupported states |

### Enhanced pages

| Page | Enhancement |
|---|---|
| Product detail (`/products/[id]`) | Reviews section with 5-star rating selector + comment form, wired to `POST /reviews`. Favorite toggle wired to API with optimistic update + rollback. |
| Order tracking (`/orders/[id]`) | **Replaced 5s polling with fetch-based SSE.** ReadableStream parser with `\n\n` frame splitting. Falls back to polling if SSE fails. Added "Cancel Order" button (visible when status allows). |

### New API helpers

`loyaltyHistory`, `redeemQr`, `cancelOrder`, `submitReview`, `addFavorite`, `removeFavorite`. Exported `BASE_URL` for SSE fetch.

**Typecheck:** ✔ clean | **Lint:** ✔ clean

## Admin Dashboard (commit `654e9b3`)

### SSE real-time (replaces polling)

- **`useOrdersSSE` hook:** fetch-based SSE stream with ReadableStream parser, exponential backoff reconnect (1s→2s→4s→...→30s), fallback to 5s REST polling after 5 consecutive SSE failures, AbortController cleanup on unmount.
- **Kanban page:** Header shows live connection status indicator (green dot = "Live", yellow = "Reconnecting...", gray = "Auto-refresh 5s").
- **Order detail page:** Same SSE pattern for single-order updates.
- Existing `changeStatus`/`advance`/`cancel`/`refund` functions preserved with optimistic UI — SSE picks up server confirmation.

**Typecheck:** ✔ clean

## Quality gates

| Check | Result |
|---|---|
| `pnpm --filter @cup-and-co/api test` | **102/102** ✔ |
| `pnpm --filter @cup-and-co/customer-web typecheck` | ✔ clean |
| `pnpm --filter @cup-and-co/customer-web lint` | ✔ clean |
| `pnpm --filter @cup-and-co/admin typecheck` | ✔ clean |

## Verification

```bash
cd "E:\Kiosk App"
pnpm install
pnpm dev
# → API:           http://localhost:4000
# → customer-web:  http://localhost:3000
# → admin:         http://localhost:3001
```

### Customer Web flow
1. Log in at `/login` with `+201000000001`, OTP `000000`
2. Click any product → product detail with options + reviews section
3. Add to cart → cart page → checkout → place cash order → tracking with pickup code
4. See SSE real-time updates when admin advances order status
5. Visit `/rewards` → see points balance + history
6. Click "Scan QR" → camera scanner (requires HTTPS/localhost)

### Admin flow
1. Log in at admin (`localhost:3001`) as `barista@cupandco.app`
2. See kanban with "Live" green indicator (SSE connected)
3. Advance order → customer tracking updates instantly (no polling delay)

### iOS flow (Xcode simulator)
1. Launch → log in → home with product grid
2. Tap product → detail with option chips → add to cart
3. Cart tab (with badge) → checkout → place order → tracking
4. Rewards tab → points balance + history → scan QR

## Phase 4 scope (when ready)

1. **Coffee Collector Game** — iOS SpriteKit + Web Canvas, server-side score validation
2. **Weekly leaderboard** + cron-settled prizes
3. **Game reward points** integration
4. See `docs/MASTER-PLAN.md` Phase 4 for full scope.
