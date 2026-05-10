---
name: Cup & Co — Post-Production Upgrade Plan
description: Authoritative roadmap for the work that comes AFTER the cafe goes live with kiosk + customer-web + admin. 8 phases (P1–P8). Sibling to UPGRADE-PLAN.md, KIOSK-PLAN.md, and the predecessor MASTER-PLAN.md.
status: Drafted 2026-05-09. Not yet started.
predecessors: docs/MASTER-PLAN.md, docs/UPGRADE-PLAN.md, docs/KIOSK-PLAN.md
owner: dev.karimmohammed@gmail.com
---

# Cup & Co — Post-Production Upgrade Plan

> **The cafe is live. The kiosk takes cash orders. The admin sees everything. Now what?**
>
> This file scopes the upgrades that come *after* the day-one launch. The work is grouped into 8 phases, each contributing a distinct kind of value. They are NOT strictly sequential — phases unblock independently as external dependencies clear (Paymob SDK access, hardware procurement, etc.). Read the master tracker first, then the phase you want to work on.

---

## How to use this file (READ FIRST — applies to every AI agent)

This is the canonical post-production roadmap. **If you are an AI agent picking up post-prod work, follow this protocol exactly:**

1. **Read the entire file before doing anything.** Skipping a phase header breaks dependency chains.
2. **Check the Master Progress Tracker** to find the highest-priority `[ ]` (not started) or `[~]` (in progress) item in the lowest-numbered incomplete phase. Work that one.
3. **Update the status checkbox** on completion in two places:
   - The item's `**Status:**` line in its phase section
   - The master tracker row at the top
4. **Status codes:**
   - `[ ]` Not started
   - `[~]` In progress (write your branch name + start date in parens, e.g. `[~] (claude/postprod-p2-paymob, 2026-06-01)`)
   - `[x]` Completed (write completion date + PR number, e.g. `[x] (2026-06-04, PR #88)`)
   - `[!]` Blocked (write reason, e.g. `[!] (waiting for Paymob SDK access)`)
   - `[-]` Deferred or skipped (write reason)
5. **One feature per PR.** Atomic commits, conventional-commit subjects.
6. **Always run before pushing:**
   - `pnpm typecheck` from repo root
   - `pnpm test` if the change touches API or shared packages
7. **Branch naming:** `claude/postprod-p<phase>-<short-slug>` (e.g. `claude/postprod-p2-apple-pay`).

---

## Master Progress Tracker

| Phase | Name | Status | % Done | Notes |
|---|---|---|---|---|
| P1 | Kiosk completion | `[ ]` | 0% | Finish the deferred items from `KIOSK-PLAN.md` |
| P2 | Payments unlocked | `[ ]` | 0% | Paymob terminal, Apple Pay, Google Pay |
| P3 | Persistence hardening | `[ ]` | 0% | Move new in-memory stores to Supabase migrations |
| P4 | Customer-web parity & polish | `[ ]` | 0% | Bring the customer app to the same craft level as the kiosk |
| P5 | Admin operations depth | `[ ]` | 0% | Receipt template editor, per-language assets, by-hour reports |
| P6 | Hardware integrations | `[ ]` | 0% | Thermal printer, optional Bluetooth barcode scanner |
| P7 | Multi-location | `[ ]` | 0% | Second cafe — multi-tenant scoping or per-tenant deploy |
| P8 | Premium wow | `[ ]` | 0% | Voice ordering, live queue display, gift cards |

**Estimated effort:** ~25–35 working days of focused work, but most phases unblock independently. P1 + P3 + P5 are pure-code (no external dependency) and can ship in any week.

---

## Strategic context

The kiosk + customer-web + admin shipped end-to-end during the kiosk-plan run (PRs #33–#59). What remains:

| Decision | Choice | Reasoning |
|---|---|---|
| In-memory stores | Acceptable for v1, but persist before second cafe | The kiosks registry, ratings, featured-today, and pairs all live in `Map`s today. Single Render instance is fine; multi-instance demands Supabase. |
| Paymob terminal SDK | Wait for Karim to get access from Paymob commercial team | K3 + K6.5 + tip jar all blocked here. |
| Receipt printer hardware | Star TSP143IIIBI Bluetooth | Cafe standard, ESC/POS, ~$200, tested with iPad PWAs. |
| Voice ordering | Web Speech API (no third-party) | Free, runs on iPad Safari 16+, EN + AR support uneven (test before promising). |
| Multi-location | Reuse existing `campus_id` columns from upgrade-plan Phase 2 | Schema is ready; admin UI for second-cafe onboarding lives in the multi-campus playbook (`docs/runbooks/onboard-new-campus.md`). |
| Gift cards | Defer until a second concrete signal (the cafe sells > 2k/month consistently) | High implementation cost (PCI considerations, fraud), low until traffic justifies. |

---

## Sibling plans (for context)

| Plan | What it covers | Status |
|---|---|---|
| `docs/MASTER-PLAN.md` | Original founding plan, Phases 0–7 | ✅ Complete |
| `docs/UPGRADE-PLAN.md` | v1.5+ strategic upgrades (Sentry, multi-campus, KDS, loyalty tiers, dark mode, etc) | ✅ ~90% complete (PRs #9–#30) |
| `docs/KIOSK-PLAN.md` | iPad self-ordering kiosk (K0–K7) | 🟢 ~70% complete (PRs #33–#59); the deferred items are absorbed into **P1** below |
| `docs/REVIEW-AND-POLISH-PLAN.md` | Pre-launch polish pass | ✅ Merged via PR #5 |
| **`docs/POST-PROD-PLAN.md`** *(this file)* | **Post-launch upgrades** | 🆕 Just drafted |

---

# Phase P1 — Kiosk completion

**Goal:** Close out the kiosk items that were deferred during the K0–K7 sprint. After P1, every cell in `KIOSK-PLAN.md`'s master tracker is `[x]` or `[!]` (with a documented reason).

### P1.1 — K3 Card payments + tip jar
**Status:** `[!]` (blocked — waiting on Paymob terminal SDK access)
**Acceptance:**
- Paymob terminal handover via the iPad's Bluetooth or paired USB hub
- Customer taps "Pay by card" → terminal prompts for tap-to-pay / PIN
- Terminal returns auth → kiosk's POST /orders fires with paymentMethod 'paymob_card'
- Tip-jar prompt before payment confirms: 0%, 5%, 10%, custom
- Tips recorded as a separate line so reporting can break out tips per kiosk
- Falls back to "Pay at counter" if the terminal is unreachable

### P1.2 — K4.3 QR scan identify
**Status:** `[ ]`
**Acceptance:**
- Customer-web exposes a one-time QR code (5-min expiry) at `/profile/kiosk-link`
- Kiosk's identify modal gains a third path: "Scan QR" (alongside existing Phone+OTP)
- Camera viewfinder uses `BarcodeDetector` API (already polyfilled by jsQR for older Safari)
- New `POST /me/kiosk-link-code` (customer-web) and `POST /kiosk/link-session` (kiosk) endpoints
- One-tap identify in <5 seconds; phone+OTP becomes the slow-path fallback

### P1.3 — K5.4 Thermal receipt printer
**Status:** `[!]` (blocked — needs Star TSP143IIIBI hardware procurement)
**Acceptance:**
- Confirmation screen offers Print / SMS / None
- Print sends ESC/POS over Web Bluetooth to the paired Star printer
- Receipt template lives in `apps/kiosk/src/lib/receiptTemplate.ts`
- Falls back to "Printer offline" toast if pairing/connection fails (order still completes)

### P1.4 — K5.5 SMS receipt
**Status:** `[ ]`
**Acceptance:**
- Available only when customer is identified (we have their phone)
- New `POST /orders/:id/sms-receipt` endpoint sends a short SMS with pickup code + total + a deep link
- Twilio or local Egyptian SMS provider — choice is a separate decision
- Throttled to 1 SMS per order

### P1.5 — K6.2 Per-language admin assets
**Status:** `[ ]`
**Acceptance:**
- Admin Menu page gains a "Kiosk assets" tab
- Upload per-kiosk attract-loop hero images (EN + AR variants)
- Override per-kiosk featured-today + category labels (e.g. drive-thru kiosk shows breakfast first)
- Stored on `kiosks` table once P3 lands the migration; in-memory until then

### P1.6 — K6.5 Receipt template editor
**Status:** `[!]` (depends on P1.3 hardware)
**Acceptance:**
- Live 80mm-wide preview of the thermal receipt
- Editable: brand mark, footer message, language, tip line on/off
- Saves as `receipt_template` JSON column on `kiosks`

### P1.7 — Per-kiosk staff PIN
**Status:** `[ ]`
**Acceptance:**
- Move staff PIN from `NEXT_PUBLIC_KIOSK_STAFF_PIN` env var to per-kiosk admin config
- New PATCH endpoint on `/admin/kiosks/:id` accepts `{ pinHash }`
- Kiosk fetches its config on first attract paint + every 5 minutes
- Default '1234' stays as fallback for un-provisioned kiosks; admin sees a "PIN: default" warning

### P1.8 — Registration-token flow
**Status:** `[ ]`
**Acceptance:**
- Admin clicks "Register new kiosk" → server returns a 5-min single-use token
- New iPad's first-boot screen accepts the token → `POST /kiosks/register` returns the persistent kiosk_id
- Replaces the current "set NEXT_PUBLIC_KIOSK_ID env var" step in the runbook

---

# Phase P2 — Payments unlocked

**Goal:** Card payments live everywhere: kiosk, customer-web, iOS. Tap-to-pay on supported devices.

### P2.1 — Apple Pay (iOS native + web)
**Status:** `[ ]`
**Acceptance:**
- iOS native: PassKit / PKPaymentRequest sheet on checkout
- Customer-web: Apple Pay JS button in browser-supported contexts
- Both routes call the same Paymob intention endpoint with method `apple_pay`
- Falls back gracefully (button hidden) when not supported

### P2.2 — Google Pay (web)
**Status:** `[ ]`
**Acceptance:**
- Customer-web: Google Pay button on checkout for Chrome/Android browsers
- Single `paymob_intention(method='google_pay')` path on server
- A/B test default vs. checkout layout to measure conversion lift

### P2.3 — Paymob terminal (kiosk K3 dependency)
**Status:** `[!]` (blocked — Paymob SDK access)
**Acceptance:** *(see P1.1 above — same item, listed here for cross-phase visibility)*

### P2.4 — Tip jar across all surfaces
**Status:** `[ ]`
**Acceptance:**
- Pre-payment tip prompt: 0%, 5%, 10%, custom
- Defaults tuned for Egypt (consult Karim before locking)
- Tips recorded as a separate `tip_egp` field on `orders`
- Reports break out tips per surface + per-kiosk

---

# Phase P3 — Persistence hardening

**Goal:** Every in-memory store from the kiosk-plan run gets a Supabase migration so a Render redeploy or instance scale-up doesn't drop state.

### P3.1 — `kiosks` table migration
**Status:** `[ ]`
**Acceptance:**
- New `supabase/migrations/0013_kiosks.sql`:
  ```sql
  create table kiosks (
    id uuid primary key,
    name text not null,
    active boolean not null default true,
    last_seen_at timestamptz,
    last_state text,
    version text,
    created_at timestamptz not null default now()
  );
  alter table orders add foreign key (kiosk_id) references kiosks(id) on delete set null;
  ```
- `apps/api/src/db/kiosksStore.ts` reads/writes Supabase when `SUPABASE_URL` is set
- Falls back to in-memory when Supabase is unconfigured (preserves local dev)

### P3.2 — `kiosk_ratings` table migration
**Status:** `[ ]`
**Acceptance:**
- New table keyed by `(order_id, kiosk_id)` so the dedupe logic survives restarts
- `apps/api/src/db/kioskRatingsStore.ts` Supabase-backed
- Existing K7.3 endpoints unchanged from the client's perspective

### P3.3 — `featured_products` + `product_pairs` tables
**Status:** `[ ]`
**Acceptance:**
- `featured_products(product_id uuid pk, set_at timestamptz, set_by uuid)` — admin-toggled
- `product_pairs(product_id uuid pk, pair_ids uuid[], updated_at, updated_by)` — admin-overridden
- Both stores read from Supabase first, fall back to seeded defaults for slugs

### P3.4 — Idempotency-key store
**Status:** `[ ]`
**Acceptance:**
- The existing in-memory `orderIdempotency` map is process-local — multi-instance API would lose it
- Move to a small Redis or a Postgres table with TTL
- Existing client behaviour unchanged

---

# Phase P4 — Customer-web parity & polish

**Goal:** Bring the customer-web mobile experience to the same craft level as the kiosk. The kiosk got a recent impeccable refine pass (PR #53) and a 5-icon category landing (PR #59); customer-web hasn't.

### P4.1 — Mobile category landing
**Status:** `[ ]`
**Acceptance:**
- Same 5-icon top-level taxonomy as the kiosk (`docs/KIOSK-PLAN.md` K1.2 + this plan's P1.5)
- Single source of truth: `packages/category-groups/src/index.ts` — both web and kiosk import the same module
- Subgroup picker for Coffee + Drinks, leaf groups go straight to product list

### P4.2 — Drink builder on customer-web
**Status:** `[ ]`
**Acceptance:**
- Port `apps/kiosk/src/components/DrinkBuilder.tsx` to a phone-sized variant
- Lives on the customer-web product detail page
- Shares the layered SVG drink components

### P4.3 — Customer-web impeccable polish pass
**Status:** `[ ]`
**Acceptance:**
- Same `/impeccable` skill walk we did for the kiosk (PR #53)
- Apply PRODUCT.md voice + DESIGN.md tokens consistently
- Ban list: em dashes, gradient text, glassmorphism defaults — same as the kiosk

### P4.4 — Mobile drink-builder share card
**Status:** `[ ]`
**Acceptance:**
- After placing an order, customer can share their custom drink to Instagram / WhatsApp
- Renders a 1080×1920 OG card with the layered SVG + customer's chosen options + a referral code
- Drives both K7-style delight AND the existing referrals system

---

# Phase P5 — Admin operations depth

**Goal:** Cafe operator can run the business from `/admin` without ever opening a SQL console.

### P5.1 — By-hour trend chart on kiosk reports
**Status:** `[ ]`
**Acceptance:**
- Existing `/admin/reports` By-Kiosk section gets a new chart row
- Hourly bar chart per kiosk for today, side-by-side
- Click-through to a per-kiosk drill page

### P5.2 — CSV export per kiosk
**Status:** `[ ]`
**Acceptance:**
- Existing reports page gets a "Download CSV" button per by-kiosk row
- One file per kiosk: timestamp, items (JSON), total, payment method, rating
- One-shot daily, no scheduled job

### P5.3 — Per-kiosk drill page
**Status:** `[ ]`
**Acceptance:**
- New route `/admin/kiosks/[id]` — full kiosk detail
- Shows: today's full order list, error log (last 50), config, force-reset button
- "Force reset" sends a hidden command via SSE so the iPad clears state without staff intervention

### P5.4 — Audit log review
**Status:** `[ ]`
**Acceptance:**
- New `/admin/audit` page surfaces the existing `audit_log` table (RLS already in place via 0003_rls_gaps)
- Filter by user, action, date
- Searchable

### P5.5 — Bulk product editor
**Status:** `[ ]`
**Acceptance:**
- Admin Menu page gains a "Bulk edit" mode
- Toggle availability / out-of-stock / featured-today on multiple products at once
- Useful for end-of-day operations: "mark all desserts out of stock"

---

# Phase P6 — Hardware integrations

**Goal:** Anything physical the cafe might want to plug in.

### P6.1 — Thermal receipt printer
**Status:** `[!]` (blocked — same hardware as P1.3)
**Acceptance:** *(see P1.3 — same item, listed here for cross-phase visibility)*

### P6.2 — Bluetooth barcode scanner (optional)
**Status:** `[ ]` (defer until a real cafe asks)
**Acceptance:**
- Admin can pair a generic HID-mode Bluetooth scanner with the kiosk
- Scanning a printed pickup-code receipt in the cafe marks the order `picked_up`
- Useful only if the cafe has a hectic pickup counter; defer until that signal arrives

### P6.3 — Drive-thru screen mode
**Status:** `[ ]` (defer until a real cafe asks)
**Acceptance:**
- Same kiosk app, different layout when `NEXT_PUBLIC_KIOSK_MODE=drive_thru`
- Top-half: customer-facing carousel of items
- Bottom-half: barista-facing order list + status taps
- Both halves drive the same order surface

---

# Phase P7 — Multi-location

**Goal:** When Karim opens a second cafe, the platform supports it without a fork.

### P7.1 — Multi-tenant scoping audit
**Status:** `[ ]`
**Acceptance:**
- Walk every API endpoint and every store file
- Confirm `campus_id` (from upgrade-plan Phase 2) scopes EVERY mutation
- Specifically: `productAvailability`, `productStock`, `productsFeaturedToday`, `productPairsStore`, `kiosksStore`, `kioskRatingsStore` all need campus scope
- Tests: a barista at Campus A cannot mutate Campus B's products

### P7.2 — Per-cafe Vercel deploys
**Status:** `[ ]`
**Acceptance:**
- Each cafe gets its own Vercel project for kiosk + customer-web (admin stays single-tenant for the owner)
- Domain pattern: `kiosk-<cafe-slug>.cupandco.app`
- One Render API, one Supabase DB, multi-tenant via campus_id

### P7.3 — Cross-cafe loyalty
**Status:** `[ ]`
**Acceptance:**
- A customer's points balance is global, not per-cafe
- Tier calculation rolls up trailing-12m points across all locations
- Per-cafe leaderboard remains scoped (each cafe has its own weekly winners)

---

# Phase P8 — Premium wow

**Goal:** The features that don't ship the cafe but do generate Instagram posts.

### P8.1 — Voice ordering (kiosk K7.1)
**Status:** `[ ]`
**Acceptance:**
- Microphone icon on kiosk catalog screen
- Web Speech API → transcribe → match against catalog via existing `q=` search
- "I want a flat white with oat milk" → opens detail screen with options pre-applied
- EN + AR — test the AR path carefully, browser support is uneven

### P8.2 — Live queue display (kiosk K7.2)
**Status:** `[ ]`
**Acceptance:**
- Standalone full-screen route `/queue` runs on a separate iPad mounted near pickup
- Shows pickup codes about to be ready (status `preparing` or `ready`) in big type
- Customer's code highlights when ready
- Auto-refreshes via SSE — no taps required

### P8.3 — Post-order rating analytics (extend K7.3)
**Status:** `[ ]`
**Acceptance:**
- Trend rating over time (today/week/month)
- Cross-reference rating with product mix to surface "drinks that get downvoted"
- Surface in an admin "Quality" tab

### P8.4 — Gift cards
**Status:** `[-]` (deferred — high cost, low signal until traffic justifies)
**Acceptance:**
- Customer can buy a gift card via customer-web; recipient gets a redeem code via SMS / email
- Admin can issue manual cards (refunds, customer service)
- Defer until the cafe sells > 2k drinks/month consistently (rough heuristic — revisit)

### P8.5 — Coffee subscription
**Status:** `[-]` (deferred until P8.4 ships)
**Acceptance:**
- Recurring monthly charge → daily-credit balance
- Customer redeems against any drink
- Stripe-ish subscription flow on customer-web

---

## Sibling-plan cross-reference

After this plan completes, every formerly-deferred item from the predecessor plans ends up `[x]` or `[!]` (with a documented reason):

| Predecessor item | Captured in P# |
|---|---|
| KIOSK-PLAN K3 (card payments) | P1.1 + P2.3 |
| KIOSK-PLAN K4.3 (QR identify) | P1.2 |
| KIOSK-PLAN K5.4 (printer) | P1.3 + P6.1 |
| KIOSK-PLAN K5.5 (SMS receipt) | P1.4 |
| KIOSK-PLAN K6.2 (per-lang assets) | P1.5 |
| KIOSK-PLAN K6.5 (receipt editor) | P1.6 |
| KIOSK-PLAN K7.1 (voice) | P8.1 |
| KIOSK-PLAN K7.2 (live queue) | P8.2 |
| UPGRADE-PLAN 4.1 (Apple Pay) | P2.1 |
| UPGRADE-PLAN 4.2 (Google Pay) | P2.2 |
| UPGRADE-PLAN 4.3 (APNs) | *(separate notifications plan; defer)* |
| UPGRADE-PLAN 4.4 (Web Push) | *(separate notifications plan; defer)* |
| UPGRADE-PLAN 4.5 (notif prefs UI) | *(blocked on the above)* |
| UPGRADE-PLAN 7.2 (App Clips) | *(iOS native; defer until iOS app revives)* |
| UPGRADE-PLAN 8.3 (avatar refresh) | *(skip per polish-plan defaults)* |
| UPGRADE-PLAN 9.1 (Siri shortcuts) | *(iOS native; defer)* |
| UPGRADE-PLAN 10.1 (admin review) | P5.1–P5.5 |

---

## Open decisions

Things to talk through with Karim before starting the relevant phase:

| Decision | Phase | Question |
|---|---|---|
| Tip default percentages | P2.4 | What feels right for an Egyptian campus cafe? 5/10/15? Or 0/5/10? |
| SMS provider | P1.4 | Twilio (international) vs. an Egyptian local provider (cheaper, faster delivery)? |
| Receipt printer model | P1.3 / P6.1 | Confirm Star TSP143IIIBI — alternatives are Epson TM-m30 or Bixolon SRP-330II |
| Gift card UX | P8.4 | Standalone codes (PIN-style) or wallet-attached (Apple/Google Wallet pass)? |
| Drive-thru pilot | P6.3 | Wait for a real cafe to ask, or build it pre-emptively? |

---

## Recommended starting point

**P1 + P3 in parallel.** P1 closes the kiosk loose ends; P3 hardens the in-memory stores so a Render redeploy doesn't drop state. Both are pure-code, no external dependency, ~3–5 days of work each. After they land, the kiosk is genuinely production-grade and the rest of the plan unblocks naturally as Paymob / hardware / second-cafe signals arrive.
