---
name: Cup & Co — Kiosk Self-Ordering System Plan
description: Authoritative roadmap for the iPad self-ordering kiosk product. 36 features across 7 phases (~22-30 working days). Sibling to UPGRADE-PLAN.md; reuses the existing API + catalog + KDS unchanged.
status: Drafted 2026-05-08. Not yet started.
predecessor: docs/UPGRADE-PLAN.md (mostly merged into main as of 2026-05-07)
owner: dev.karimmohammed@gmail.com
---

# Cup & Co — Kiosk Self-Ordering System Plan

> The customer mobile app and admin dashboard cover personal devices and barista operations. **This plan adds a third surface: a fixed-position iPad kiosk at the counter** so customers can self-order without queuing at the cashier. It is a separate app (`apps/kiosk`) that reuses the entire existing API, catalog, KDS, loyalty engine, and admin tooling without modification.

---

## How to use this file (READ FIRST — applies to every AI agent)

This is the canonical kiosk roadmap. **If you are an AI agent picking up kiosk work, follow this protocol exactly:**

1. **Read the entire file before doing anything.** Skipping phases breaks dependency chains and creates rework. Budget ~10 minutes of context for the read.
2. **Check the Master Progress Tracker** (next section) to find the highest-priority `[ ]` (not started) or `[~]` (in progress) feature in the lowest-numbered incomplete phase. Work that one.
3. **Update the status checkbox in two places** as you progress:
   - The feature's own `**Status:**` line in its phase section
   - The master tracker row at the top
4. **Status codes:**
   - `[ ]` Not started
   - `[~]` In progress (write your branch name + start date in parentheses, e.g. `[~] (claude/kiosk-k1-attract, 2026-05-12)`)
   - `[x]` Completed (write completion date + PR # in parentheses, e.g. `[x] (2026-05-15, PR #42)`)
   - `[!]` Blocked (write reason in parentheses, e.g. `[!] (waiting for Paymob terminal SDK)`)
   - `[-]` Deferred or skipped (write reason)
5. **One feature per PR** — keep the diff small. Atomic commits. Squash-merge pattern matches the rest of the repo.
6. **Always run before pushing:**
   - `pnpm typecheck` from repo root (matches the CI command exactly)
   - `pnpm test` if the change touches API or shared packages
7. **Branch naming:** `claude/kiosk-k<phase>-<short-slug>` (e.g. `claude/kiosk-k1-attract-loop`).
8. **The kiosk reuses the existing API** — only add new endpoints when truly needed (see "New API surface" below). Default to consuming existing routes.

---

## Master Progress Tracker

Update the % column whenever a feature changes state. Update the Status column whenever the phase as a whole transitions.

| Phase | Name | Status | % Done | Started | Completed | Notes |
|-------|------|--------|--------|---------|-----------|-------|
| K0 | App scaffold | `[ ]` | 0% | — | — | New `apps/kiosk` Next.js app, brand tokens wired |
| K1 | Foundation — order without payment | `[ ]` | 0% | — | — | Attract → catalog → customize → cart → cash → confirmation |
| K2 | Premium UX polish | `[ ]` | 0% | — | — | Animated drink builder, transitions, sound feedback |
| K3 | Card payments | `[ ]` | 0% | — | — | Paymob terminal + Apple Pay via QR fallback + tip jar |
| K4 | Loyalty + identity | `[ ]` | 0% | — | — | Optional QR/phone identification + member personalization |
| K5 | Operations | `[ ]` | 0% | — | — | Offline queue + staff assist + receipt printing |
| K6 | Multi-kiosk + admin | `[ ]` | 0% | — | — | Per-kiosk config + health dashboard in admin |
| K7 | Premium "wow" extras | `[ ]` | 0% | — | — | Voice ordering, live queue display, post-order rating |

**Total estimated effort:** ~22-30 working days of focused work.

---

## Strategic Context (decisions locked, not re-litigated below)

| Decision | Choice | Reasoning |
|---|---|---|
| App boundary | New monorepo app `apps/kiosk` | Different user model (anonymous), different lifecycle (12+h unattended), different visual language (kiosk-mode big cards), independent deploy radius |
| Tech stack | Next.js 15 (App Router) + Tailwind + Framer Motion (matches `customer-web`) | Reuses brand tokens, dev tooling, deploy pipeline; no native iOS code needed because iOS PWA in standalone + Guided Access runs great on iPad |
| Distribution | Vercel as third project + iPad in **Guided Access** mode | No App Store needed; PWA goes to home screen, Guided Access locks the app on screen + disables home button + disables hardware buttons |
| Auth model | Anonymous by default; optional QR/phone identification | Public-facing device must not retain personal tokens between customers |
| Payments | Cash on day one; Paymob terminal in K3; Apple Pay via QR-to-mobile fallback | Card terminal is real hardware + new API integration; ship cash-only first to learn |
| Languages | EN + AR with RTL (matches existing `packages/i18n`) | Same i18n contract as customer-web |
| Hardware target | iPad Pro 12.9" M2+, mounted (Heckler @Rest or Bouncepad) | Bigger screen = bigger cards = faster ordering |
| Reset behaviour | 90s of no input → 10s "still there?" countdown → drop cart, return to attract | Privacy-by-default + readiness for next customer |
| Default fulfillment | `pickup` (existing enum) | Kiosk customer is on-premise; pickup is the only sensible default |
| New order field | `placement_source: 'kiosk' | 'customer_app' | 'admin_phone'` (single migration) | Lets analytics + admin reports break down by surface |
| Kiosk identity | Each iPad registers a `kiosk_id` (UUID) | Per-device config + health monitoring |

---

## Integration with the existing system

### Reused unchanged (no API work needed)

- **`GET /catalog`** — same products, categories, options, offers
- **`POST /orders`** — same order creation flow with new optional `placement_source` field
- **`prepEta` service** — powers "ready in ~N min" on confirmation
- **`tierEngine`, `streaks`, `referrals`, `suggestions`** — same hooks fire when a member identifies
- **KDS view** — picks up kiosk orders automatically; barista doesn't see a difference
- **Admin orders kanban + reports** — works for free; just gets a new placement-source column

### New API surface required (added incrementally per phase)

| Endpoint | Phase | Purpose |
|---|---|---|
| `placement_source` field on orders + `placement_source` enum migration | K1 | Track which surface placed the order |
| `kiosk_id` foreign key on orders | K1 | Track which physical kiosk |
| `POST /kiosks/register` | K6 | First-boot registration of a new iPad |
| `POST /kiosks/:id/heartbeat` | K6 | Health monitoring + uptime |
| `GET /admin/kiosks` | K6 | Admin dashboard listing |
| `POST /payments/paymob/terminal-intent` | K3 | Initiate physical card terminal flow |
| `POST /payments/paymob/qr-intent` | K3 | QR-to-mobile Apple Pay fallback |
| `POST /orders/:id/sms-receipt` | K5 | Optional SMS receipt for identified members |
| `POST /orders/:id/print-receipt` | K5 | Server-side receipt formatting (kiosk reads + sends to ESC/POS) |
| `POST /orders/:id/tip` | K3 | Apply tip after order placed |

### Hardware kit (for the runbook)

| Component | Recommendation | Reason |
|---|---|---|
| iPad | iPad Pro 12.9" M2+ | Bigger screen = bigger cards = faster orders |
| Mount | Heckler @Rest (countertop) or Bouncepad (wall) | Locks iPad, hides home button |
| Card terminal | Paymob SmartPOS, OR Stripe Terminal WisePOS E | Tap-to-pay + PIN entry |
| Receipt printer | Star TSP143IIIBI (Bluetooth ESC/POS) | Cafe standard, cheap thermal paper |
| Network | Cafe wifi + LTE backup hotspot | Single point of failure if wifi flaps |

---

## Phase K0 — App Scaffold

**Goal:** Empty kiosk app boots in fullscreen and shows a "Hello Cup & Co" placeholder.

### K0.1 — Create `apps/kiosk` Next.js app
**Status:** `[ ]`
**Acceptance:**
- New `apps/kiosk` directory with Next.js 15 App Router scaffold
- `package.json` follows the same `dev`/`build`/`start`/`typecheck`/`lint` script pattern as `customer-web`
- `pnpm-workspace.yaml` already includes `apps/*` (no change needed)
- Tailwind configured, brand tokens imported from `packages/design-tokens`
- Cup & Co brand colours render correctly
- `next.config.mjs` has standalone PWA mode + viewport `viewport-fit=cover`
- Manifest set up for iPad home-screen install (icon, name, theme colour)
- `pnpm --filter @cup-and-co/kiosk dev` runs on port `:3002`

### K0.2 — Vercel project + CI integration
**Status:** `[ ]`
**Acceptance:**
- New Vercel project `cup-and-co-kiosk` set up
- `.github/workflows/ci.yml` already runs typecheck for `apps/*` — no change needed
- `.github/workflows/deploy.yml` adds a `Deploy kiosk to Vercel` job (mirror of customer-web)
- First commit lands a "Cup & Co Kiosk — Coming Soon" placeholder + brand mark
- Vercel preview URL works on iPad in standalone PWA mode

### K0.3 — Layout primitives
**Status:** `[ ]`
**Acceptance:**
- Root layout with EN/AR direction support (`dir` attribute) like `customer-web`
- Fullscreen container with no scroll on the body
- Brand tokens injected via CSS variables (espresso, primary, cream, sunrise — same names as customer-web)
- Big-touch button primitive (min 88×88pt)
- Big-touch card primitive (min 160×160pt)
- Display-typography scale (`text-display`, `text-hero`, `text-card`) tuned for 12.9" viewing distance

---

## Phase K1 — Foundation: Order Without Payment

**Goal:** A customer can walk up, tap to start, browse the menu, customize a drink, add it to the cart, choose "pay at counter", and receive a pickup code. Card payment defers to K3.

**Pairs naturally with:** the existing KDS view (PR #27) — orders placed via kiosk show up in the barista's NEW column instantly.

### K1.1 — Feature 1: Attract loop
**Status:** `[ ]`
**Acceptance:**
- Fullscreen "TAP TO ORDER" splash with rotating hero product imagery (3-5 images crossfade every 5s)
- Subtle steam/coffee animation behind hero text
- Tap anywhere transitions to the catalog (smooth crossfade, ≤300ms)
- Falls back to attract loop after 90s of inactivity
- Hero imagery sourced from `/brand/posters/` — uses existing assets

### K1.2 — Feature 2: Browse catalog (category-tabbed grid)
**Status:** `[ ]`
**Acceptance:**
- Category chips along top: All, Coffee, Desserts, Breakfast (sourced from `GET /catalog`)
- Grid of product cards (3-4 across on 12.9" landscape)
- Each card: large image, name (EN or AR per session), price in EGP
- Cart pill bottom-right (sticky) showing item count + total; tap expands cart drawer
- "Featured today" hero card spans 2 columns at top of "All" tab if a featured product is configured

### K1.3 — Feature 3: Product detail with customization (matches the reference image)
**Status:** `[ ]`
**Acceptance:**
- Tap a product → fullscreen detail screen with:
  - Hero illustration (large, centred — matches reference image vibe)
  - "CUSTOMIZE YOUR DRINK" heading
  - Option chip groups by `group_name` (size / shots / sugar / ice / milk / extras) using existing `product_options` data
  - Big tappable chips with selected state (cream-tint background, primary border)
  - Quantity stepper (− N +) bottom-left
  - Big green pill "ADD TO ORDER" bottom-centre (matches reference)
  - Live total recalculates as options change
- Back button top-left returns to catalog without losing tab/scroll position

### K1.4 — Feature 9: Out-of-stock handling
**Status:** `[ ]`
**Acceptance:**
- Products with `is_out_of_stock === true` OR `stock_count === 0` are dimmed (50% opacity)
- "Out today" pill overlaid on dimmed cards (matches existing `ProductCard` styling)
- Tapping a dimmed card shows a brief toast "Out of stock today — please pick another" instead of opening detail
- Out-of-stock state respects the cart guard from PR #19 (server still rejects 409 on race)

### K1.5 — Feature 5: Cart drawer
**Status:** `[ ]`
**Acceptance:**
- Bottom-pill expansion → cart drawer slides up to ~70vh
- Each line item: image, name, customizations summary, quantity stepper, line total
- Subtotal, tax/discount lines if applicable, grand total
- "Checkout" big green pill at bottom
- Drawer is dismissable by tapping the overlay
- Cart state held in zustand store (mirror `customer-web/src/lib/cart.ts`)

### K1.6 — Feature 10: EN ↔ AR toggle
**Status:** `[ ]`
**Acceptance:**
- Flag pill top-right (🇬🇧 / 🇪🇬) with active state
- Tap toggles language; `dir` attribute flips to `rtl` for Arabic
- Persists for the session only (cleared on idle reset)
- All copy keyed off `packages/i18n` — extends with new `kiosk.*` namespace
- All product names / descriptions use the existing `name_ar` / `description_ar` fields

### K1.7 — Feature 6 (cash flow only): Checkout — pay at counter
**Status:** `[ ]`
**Acceptance:**
- Checkout screen: order summary + "How will you pay?" with two big cards
  - "Pay at counter (cash)" — primary button
  - "Pay by card" — disabled with "Coming soon" pill (replaced in K3)
- Tap cash → `POST /orders` with `paymentMethod: 'cash'`, `placement_source: 'kiosk'`, `kiosk_id`
- API returns the pickup code; kiosk transitions to confirmation

### K1.8 — Feature 7: Confirmation screen + auto-reset
**Status:** `[ ]`
**Acceptance:**
- Fullscreen confirmation:
  - Huge pickup code (text-9xl, primary colour)
  - "Show this at the counter" instruction (with cash icon)
  - "Ready in ~N min" using `prepEta` from order response
  - Subtle confetti or coffee-bean animation (Framer Motion) on first paint
  - 5-second countdown before auto-reset to attract loop
- "Place another order" button restarts immediately

### K1.9 — Feature 8: Idle reset
**Status:** `[ ]`
**Acceptance:**
- 90s of no touch / scroll / pointer event anywhere → start "still there?" overlay
- Overlay shows 10s countdown with two buttons: "I need more time" (resets the 90s timer) and "Start over" (drops cart now)
- After countdown expires, drops cart + returns to attract loop with a fade
- Any touch during the overlay rescues the session
- Implementation: single global `useIdleReset` hook with `addEventListener` on `pointerdown`/`scroll`/`keydown`

### K1.10 — Network online/offline indicator
**Status:** `[ ]`
**Acceptance:**
- Tiny pill in the top-left corner: green "Live" when online, amber "Reconnecting" when offline
- Hooks into `navigator.onLine` + a heartbeat ping to `/health` every 30s
- Cart submission shows a clear blocking error when offline (full offline queue is K5 work)

### K1.11 — API: `placement_source` migration + field
**Status:** `[ ]`
**Acceptance:**
- New Supabase migration `0012_placement_source.sql`:
  - Adds `placement_source` enum (`'kiosk' | 'customer_app' | 'admin_phone'`) to `orders` table, default `'customer_app'`
  - Adds `kiosk_id uuid NULL` foreign key (kiosks table created in K6)
- `POST /orders` accepts the new fields optionally
- `GET /orders` includes them in the response
- Existing customer-web orders default to `'customer_app'`

### K1.12 — API: shared kiosk auth token
**Status:** `[ ]`
**Acceptance:**
- New env var `KIOSK_BEARER_TOKEN` — single shared secret across all kiosks
- Kiosk requests include `Authorization: Bearer <KIOSK_BEARER_TOKEN>` + `x-kiosk-id: <uuid>`
- API middleware accepts kiosk auth as a third path alongside `Bearer <jwt>` and `x-user-id` dev bypass
- Kiosk-authed requests use a synthetic user id `kiosk:<kiosk_id>` so existing user-scoped queries don't crash

---

## Phase K2 — Premium UX Polish

**Goal:** The kiosk feels expensive. Drink customization animates. Transitions are smooth. Every tap gets visible feedback.

### K2.1 — Feature 4 + 32: Live drink-builder visual
**Status:** `[ ]`
**Acceptance:**
- On the product detail screen, the hero illustration is layered (cup base, milk fill, syrup drizzle, foam dome, whipped topping)
- As the customer toggles options, the corresponding layer fades in/out with a 200ms ease-out
- For drinks: size affects cup width; ice adds visible ice cubes; sugar level shifts liquid colour subtly; whipped cream adds a dome layer
- Implementation: per-product layered SVGs in `apps/kiosk/public/drink-builder/<product-id>/` OR a single Lottie file per drink class (latte, cappuccino, etc.)
- Falls back gracefully to the static hero if a product lacks a builder asset

### K2.2 — Smooth transitions across the whole app
**Status:** `[ ]`
**Acceptance:**
- All page-to-page transitions use Framer Motion `AnimatePresence` (consistent 250-300ms ease-out)
- Card-to-detail uses a shared layout transition (the tapped card "expands" into the detail hero)
- Cart drawer slides + scrim crossfades, not jank
- No transition exceeds 400ms (kiosk feels fast)

### K2.3 — Visual + audio tap feedback
**Status:** `[ ]`
**Acceptance:**
- Every primary tap shows a 100ms ripple/pulse on the touched element
- Optional Web Audio "tick" sound on tap (admin-toggleable per kiosk in K6 — defaults off to respect the cafe ambience)
- Ripples honour `prefers-reduced-motion`

### K2.4 — Guided Access setup runbook
**Status:** `[ ]`
**Acceptance:**
- New `docs/runbooks/setup-kiosk-ipad.md`:
  - Hardware unboxing checklist
  - iPadOS settings: disable auto-update during business hours, set screen to never sleep, brightness max
  - Add kiosk URL to home screen (PWA install)
  - Enable Guided Access (Settings → Accessibility → Guided Access)
  - Triple-press home/side button to lock the app
  - Set passcode for staff to exit
  - Test the lock behaviour
- Includes screenshots
- Linked from admin Settings page

---

## Phase K3 — Card Payments

**Goal:** Customer can tap "Pay by card" and complete payment without leaving the kiosk. Tip prompt before payment. Optional Apple Pay via QR-to-mobile.

⚠️ **Blocker check at K3 start:** confirm Paymob terminal SDK is reachable. If not, defer K3.1-K3.2 and ship K3.3 (QR fallback) only.

### K3.1 — Feature 12: Card via Paymob terminal
**Status:** `[!]` (waiting for Paymob terminal SDK access — confirm before starting)
**Acceptance:**
- New `POST /payments/paymob/terminal-intent` API endpoint that issues a transaction token bound to a specific kiosk + order
- Kiosk shows "Tap card or insert chip on the terminal" full-screen prompt with animated card+terminal illustration
- Polls terminal status every 1s (or via webhook callback if Paymob supports it)
- On success: `paymentStatus: 'paid'`, transition to confirmation
- On decline: clear error + "Try again or pay cash" buttons
- 90s timeout returns to checkout

### K3.2 — Apple Pay via NFC (if iPad has it)
**Status:** `[-]` (deferred — requires native iOS code; QR fallback K3.3 covers the same use case)

### K3.3 — Feature 13: Apple Pay via QR-to-mobile fallback
**Status:** `[ ]`
**Acceptance:**
- New `POST /payments/paymob/qr-intent` returning a Paymob hosted-payment-page URL
- Kiosk renders the URL as a large QR code (300×300pt+) with "Scan with your phone to pay" caption
- Kiosk polls order status every 2s
- On success: transition to confirmation
- 5-min timeout before returning to checkout

### K3.4 — Feature 14: Tip jar at checkout
**Status:** `[ ]`
**Acceptance:**
- Tip prompt shown AFTER payment method choice but BEFORE payment authorization
- Three preset percentages (10% / 15% / 20%), one custom amount keypad, one "Skip" button
- Selected tip applied to the payment intent total
- Tip recorded as a separate field on the order: `tip_egp` (new column on `orders` table)
- Tips per barista accrue into a separate ledger (new `barista_tips` table) and surface on admin Reports
- Admin can disable the tip prompt per-kiosk in K6

---

## Phase K4 — Loyalty + Identity

**Goal:** A returning member gets a personalized experience without slowing down the anonymous flow. Points credit, tier badge, "your usual" reorder.

### K4.1 — Feature 15: Anonymous mode by default
**Status:** `[ ]`
**Acceptance:**
- All kiosk flows work without ever asking for identity
- Orders are placed against the synthetic kiosk user (from K1.12)
- No "log in" prompt is ever shown unless the customer taps the optional "Earn points?" pill

### K4.2 — Feature 16a: "Earn points?" pill on cart screen
**Status:** `[ ]`
**Acceptance:**
- Subtle but visible pill on the cart drawer footer: "Earn points? Tap to identify"
- Tap opens an identification modal with three paths:
  - **Scan QR** (K4.3)
  - **Phone + OTP** (K4.4)
  - **Skip** (closes modal, proceeds anonymously)
- Identifying after items are in the cart attaches the existing cart to the identified user

### K4.3 — Feature 16b: QR scan flow
**Status:** `[ ]`
**Acceptance:**
- Tap "Scan QR" → kiosk requests camera permission (one-time per device install)
- Camera viewfinder with QR scan overlay
- Customer's mobile app shows a one-time QR (new `GET /me/kiosk-link-code` endpoint returns a 5-min token)
- Kiosk reads the QR, calls `POST /kiosk/link-session { code }`, gets back the user id
- Modal shows "Welcome back, [Name]!" with tier badge, then closes
- Implementation: `<video>` + `BarcodeDetector` API (works on iPad Safari)

### K4.4 — Feature 16c: Phone + OTP fallback
**Status:** `[ ]`
**Acceptance:**
- "Use phone instead" path: numeric keypad (digits 0-9 + backspace + country code +20 prefix)
- Submit → calls existing `POST /auth/otp/send`
- 6-digit verify keypad on next screen
- Submit → calls existing `POST /auth/otp/verify` with the kiosk-bearer auth context
- Successful verify links the order to the user

### K4.5 — Feature 17: Welcome-back personalization
**Status:** `[ ]`
**Acceptance:**
- After identification, the home screen shows a personalized header: "Welcome back, [first name]" + tier badge (Bronze/Silver/Gold) + current points balance
- The catalog "All" tab gets a new top section: "Your usual" with their most-frequent past order as a one-tap reorder card
- Idle reset (K1.9) clears the identification → returns to anonymous

### K4.6 — Feature 18: Streak preservation
**Status:** `[ ]`
**Acceptance:**
- A paid order from an identified member fires the existing streak hook (`recordOrderForStreak`)
- Streak day-7 bonus credits as on customer-web
- Confirmation screen surfaces the streak event: "🔥 7-day streak! +50 bonus points"

### K4.7 — Feature 19: Featured drink of the day
**Status:** `[ ]`
**Acceptance:**
- New `is_featured_today` flag on `products` table (or reuse `offers` mechanism)
- Admin Menu page gets a "Feature today" toggle per product
- Kiosk catalog "All" tab shows the featured product as a hero card spanning 2 columns at the top
- Falls back to a "drink of the week" curation if nothing is set

### K4.8 — Feature 20: Smart suggestion (logged-in)
**Status:** `[ ]`
**Acceptance:**
- For identified members, kiosk fetches `GET /me/suggestion` (existing endpoint from PR #22)
- Surfaces the suggestion as a card on the home screen above the catalog grid
- Anonymous fallback: top 3 bestsellers from the last 24h (new `GET /catalog/bestsellers` endpoint)

### K4.9 — Feature 21: "Complete the combo"
**Status:** `[ ]`
**Acceptance:**
- New `pairs_well_with: text[]` field on `products` (admin-managed)
- On cart screen, surface 1-2 complementary items: "Add a brownie for 35 EGP?"
- Tap adds the suggested item directly with default options
- Suggestions don't appear if the item is already in cart

### K4.10 — Feature 22: "Quick reorder your usual"
**Status:** `[ ]`
**Acceptance:**
- For identified members, computes the most-ordered product over the last 60 days from order history
- Displayed as a big card on the home screen with the customer's preferred customization pre-applied
- One tap drops it into cart
- Falls back to the smart suggestion if there's no clear "usual" yet

### K4.11 — Feature 23: Time-of-day promos
**Status:** `[ ]`
**Acceptance:**
- Kiosk catalog respects time-of-day buckets (existing logic from PR #22):
  - 06:00-11:00 → breakfast bundle promoted
  - 11:00-15:00 → iced drinks promoted
  - 15:00-19:00 → desserts promoted
- Cairo timezone (existing `Intl.DateTimeFormat`)
- Promoted items get a small "Morning special" / "Afternoon pick" pill on their card

---

## Phase K5 — Operations

**Goal:** The kiosk survives a wifi blip, a barista needs to mark something out of stock fast, the customer wants a printed receipt.

### K5.1 — Feature 24: Offline order queue
**Status:** `[ ]`
**Acceptance:**
- IndexedDB-backed queue of pending orders
- When `POST /orders` fails due to network, order is stored locally with a generated client-side temp pickup code
- Kiosk shows subtle "Offline — order will sync" pill on the confirmation screen
- Background retry every 30s when online
- On successful sync, the temp pickup code is replaced with the server one (and barista on KDS sees the order with a "synced from offline" badge — small KDS update)
- Customer is told to "show this code to the barista — full payment processing on reconnect"

### K5.2 — Feature 25: Health-check banner
**Status:** `[ ]`
**Acceptance:**
- If API health check fails 3 times consecutively → big banner: "Kiosk temporarily unavailable — please order at the counter"
- Auto-clears when health check recovers
- Card terminal disconnect (K3) shows a different banner: "Card payments unavailable — cash only"

### K5.3 — Feature 26: Staff assist mode
**Status:** `[ ]`
**Acceptance:**
- Quadruple-tap the Cup & Co logo (top-left of every screen) → numeric PIN modal
- PIN configured per-kiosk in admin (default 1234, must be changed on first boot)
- Successful PIN unlocks the staff overlay:
  - "Reset device now" — drops everything, returns to attract
  - "Mark item out of stock" — search products, toggle availability instantly
  - "Today's stats" — orders placed, total revenue, top items
  - "Lock for cleaning" — full-screen "Be right back" splash with a 5-min auto-unlock or PIN re-entry to unlock early
- 30s auto-close of the staff overlay

### K5.4 — Feature 27a: Print receipt (thermal)
**Status:** `[ ]`
**Acceptance:**
- Confirmation screen shows three receipt options: Print / SMS / None
- "Print" sends an ESC/POS command sequence to a paired Bluetooth printer (Star TSP143 or similar)
- Receipt format: brand mark, kiosk id, pickup code huge, items list, total, payment method, timestamp, "Thank you" message
- Receipt template lives in `apps/kiosk/src/lib/receiptTemplate.ts` so admin can preview/customize in K6.4
- Falls back to "Printer offline" toast if pairing/connection fails (order still completes)

### K5.5 — Feature 27b: SMS receipt
**Status:** `[ ]`
**Acceptance:**
- Available only if customer is identified (we have their phone)
- New `POST /orders/:id/sms-receipt` endpoint that sends a short SMS with the pickup code + total + a deep link to the order page
- "SMS" button on confirmation triggers it
- Throttled (max 1 SMS per order)

### K5.6 — Feature 27c: "Just remember the code"
**Status:** `[ ]`
**Acceptance:**
- Default "no receipt" option — fastest path
- Confirmation screen still shows the pickup code huge

---

## Phase K6 — Multi-Kiosk + Admin

**Goal:** Owner can register N kiosks across multiple campuses, configure each one, monitor health, and customize the experience per location.

### K6.1 — Feature 28: Per-kiosk config
**Status:** `[ ]`
**Acceptance:**
- New `kiosks` table:
  - `id uuid`, `campus_id uuid`, `name`, `pin_hash`, `attract_image_set`, `tip_prompt_enabled bool`, `tap_sound_enabled bool`, `printer_paired bool`, `created_at`
- New endpoints:
  - `POST /kiosks/register` — first-boot self-registration with a one-time admin code
  - `GET /kiosks/:id/config` — kiosk fetches its config on every load
  - `PATCH /admin/kiosks/:id` — admin updates config
- Kiosk page reads its config + applies it (attract images, tip prompt, sound, etc.)

### K6.2 — Feature 29: Multi-language admin assets
**Status:** `[ ]`
**Acceptance:**
- Admin can upload per-language attract-loop hero images
- Admin can override per-kiosk catalog category labels (e.g., specific kiosk near the breakfast bar shows breakfast first)
- Admin can override featured-today per kiosk

### K6.3 — Feature 31: Kiosk health dashboard in admin
**Status:** `[ ]`
**Acceptance:**
- New admin page `/admin/kiosks` listing all registered kiosks
- Each row: name, campus, last heartbeat (colour-coded green/amber/red), last order, current screen state (attract/browsing/checkout/paying), software version
- Clicking a row opens a detail page with: full config, today's orders, error log, "Force reset" button
- Heartbeat: kiosk POSTs `/kiosks/:id/heartbeat` every 60s with current state
- Auto-refresh every 30s via SSE or polling

### K6.4 — Feature 30: Daily report by kiosk
**Status:** `[ ]`
**Acceptance:**
- Existing admin Reports page extended with a "By Kiosk" breakdown
- Today's revenue per kiosk + order count + top-3 items
- Trend chart: orders per hour, by kiosk, side-by-side
- Export CSV per kiosk

### K6.5 — Receipt template editor in admin
**Status:** `[ ]`
**Acceptance:**
- Admin can preview and edit the thermal-receipt template (brand mark, footer message, language, tip line on/off)
- Live preview renders an 80mm-wide simulated receipt
- Saves as a `receipt_template` JSON column on `kiosks` table

---

## Phase K7 — Premium "Wow" Extras

**Goal:** The features that differentiate Cup & Co kiosks from the generic ones — only build after K1-K6 are solid.

### K7.1 — Feature 33: Voice ordering (EN + AR)
**Status:** `[-]` (deferred to v2 — research first)
**Acceptance:**
- Microphone button on the catalog screen
- Tap → "Listening…" state with waveform animation
- Web Speech API transcription (on-device on iPad Safari)
- Transcript matched against catalog with fuzzy product name + option keyword extraction
- Confirmation screen: "Did you mean: 1× Velvet Cappuccino, large, no sugar?" with confirm/edit buttons
- Languages: EN-US + AR-EG dialects

### K7.2 — Feature 34: Camera-based loyalty
**Status:** `[-]` (privacy-questionable; skip unless explicitly requested)

### K7.3 — Feature 35: Live order queue display on confirmation
**Status:** `[ ]`
**Acceptance:**
- Confirmation screen shows "3 orders ahead of you, ~6 min" using existing `prepEta` + active-order count from `/orders` admin endpoint
- Real-time pulse animation when the queue moves forward
- Disappears when the customer's order moves to "preparing"

### K7.4 — Feature 36: Post-order rating
**Status:** `[ ]`
**Acceptance:**
- For identified members who completed an order in the last 24h, the next time they identify on the kiosk, surface a 5-star prompt: "How was your last order?"
- Skippable
- Submits to the existing `POST /reviews` endpoint (uses the per-product review prompt component from PR #30 as a base)

---

## Open questions (resolve before starting the relevant phase)

1. **Paymob terminal SDK access** (K3 blocker). Can we get a sandbox terminal + API credentials? If not, K3.1 deferred indefinitely; ship K3.3 (QR fallback) only.
2. **Receipt printer** (K5.4). Buy the Star TSP143IIIBI or use whatever the cafe already has? ESC/POS is standard, so most thermal printers will work.
3. **Featured-today vs offers system overlap** (K4.7). Reuse the existing `offers` table or add a simpler `is_featured_today` boolean? Suggest the boolean for simplicity; offers stay for actual discounts.
4. **Drink-builder asset pipeline** (K2.1). Manually composed SVGs per product, or a single Lottie file per drink class with parameter overrides? Lottie is more elegant but requires animator work; SVGs ship faster.
5. **Tip default percentages** (K3.4). 10/15/20%? Or culturally-tuned for Egypt — many local apps don't prompt at all. Confirm with owner.
6. **Per-kiosk auto-restart schedule** (K5/K6). Restart at 04:00 daily? Some kiosk best practices recommend it for memory hygiene; ours is a PWA so probably unnecessary.
7. **Tip recipient model** (K3.4). Pool across all baristas or per-shift attribution? Per-shift requires tracking who's clocked in (no shift system yet).

---

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-08 | Plan drafted with 36 features across 7 phases (K0-K7) | User approved all 36 features; phasing matches dependency order |
| 2026-05-08 | Separate `apps/kiosk` Next.js app | Different lifecycle, security posture, visual language vs `customer-web` |
| 2026-05-08 | iOS PWA + Guided Access (no native app) | Avoids App Store; user has no Mac for native development; Guided Access is the standard kiosk lock pattern |
| 2026-05-08 | Anonymous-by-default with optional ID | Matches public-kiosk privacy expectations; loyalty stays opt-in |
| 2026-05-08 | Reuse all existing API endpoints; only add `placement_source` + `kiosk_id` + payment-terminal endpoints | Minimizes blast radius; KDS, admin reports, loyalty all "just work" |
| 2026-05-08 | Cash-only on day one; defer card terminal to K3 | De-risks v1; learn from real customers before integrating hardware |

---

## Recommended starting point

**Begin with K0 + K1.1 in a single PR.** That's:
- Scaffold `apps/kiosk` with brand tokens
- First Vercel deploy
- Attract loop with one rotating hero

Once that's on a real iPad in the cafe and tapping it goes somewhere, the rest of K1 follows naturally over ~5-7 days. Don't try to ship everything at once — kiosk UX needs real-customer feedback at every layer.

🤖 Maintained by Claude Code agents. Update this file with `[~]`/`[x]`/`[!]` status changes alongside every PR.
