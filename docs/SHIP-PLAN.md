---
name: Cup & Co — Ship Plan (Master)
description: The single authoritative plan to get Cup & Co into production. Supersedes MASTER-PLAN.md, REVIEW-AND-POLISH-PLAN.md, UPGRADE-PLAN.md, KIOSK-PLAN.md, POST-PROD-PLAN.md.
status: Active. Drafted 2026-05-09 after a full audit of main + recovery branches.
owner: Karim Elbahrawy (dev.karimmohammed@gmail.com)
supersedes:
  - docs/MASTER-PLAN.md
  - docs/REVIEW-AND-POLISH-PLAN.md
  - docs/UPGRADE-PLAN.md
  - docs/KIOSK-PLAN.md
  - docs/POST-PROD-PLAN.md
---

# Cup & Co — Ship Plan

> **One plan. Read this top-to-bottom. Every other plan in `docs/*` is historical context only — do not start work from them. If you're an AI agent picking this up: this is the source of truth.**

## TL;DR (read this first)

- Five separate plans accumulated over the project lifetime. They overlap, drift, and contradict.
- Several agents *deleted* features that previous agents had added. The branch `origin/recovery/musing-kilby-features` is sitting on 4 commits that contain critical lost work (Recent Orders strip, reports sections, profile rows). It has not been merged.
- The four apps (iOS, customer-web, admin, kiosk) drifted apart. **iOS is roughly 6 months behind web.**
- Two Supabase migrations are both numbered `0005` — a real schema-deployment hazard.
- The plan below is in execution order: Recovery → Go-Online → iOS parity → Hardening → Growth.
- Vercel + Render are kept (recommendation explained at the bottom). Free-tier go-live playbook is included.

---

## Phase ordering (the new pecking order)

| Phase | Name | Goal | Estimated effort | Blocking next phase? |
|---|---|---|---|---|
| **R** | Recovery | Pull lost work back into `main`, fix the migration collision, archive duplicate plans | 1–2 days | YES — must complete first |
| **0** | Go-Online (free-tier production) | A real public URL + iPad-PWA + admin-PWA running on free tiers, hitting a real Supabase | 2–3 days | NO (parallel-OK with iOS) |
| **1** | iOS parity must-haves | Things that block App Store submission or cause user-visible inconsistency | 5–7 days | NO |
| **2** | Operational hardening | Persist in-memory stores, fix race conditions, observability | 4–6 days | Light blocking on Phase 3 |
| **3** | Growth (Apple Pay / Google Pay / Tip / Voice) | Unblock revenue features when external dependencies arrive | 8–12 days, gated by Paymob SDK + APNs key | — |
| **4** | iOS nice-to-haves | Streaks, suggestions, referrals, dark mode, account delete | 5–7 days | NO |
| **5** | Wow extras | Live queue, voice ordering, gift cards, multi-location | As signals justify | NO |

Total to "production-ready, app-store-ready, free-tier-online": **Phases R + 0 + 1 ≈ 8–12 days of focused AI execution.**

---

## What's actually on main today (verified, not from memory)

### Web apps (Next.js 15)
- **`apps/customer-web`** — auth (phone/OTP), home, search, cart, checkout, payment success/cancel, orders + tracking, /usual (favorites), rewards, game, profile, profile/campus, profile/privacy, profile/refer, public referral landing (`r/[code]`).
- **`apps/admin`** — login, dashboard, orders + detail, KDS, menu CRUD (with Cup AI attrs editor), kiosks fleet, QR, offers, users, reviews, reports (3 sections only — see **Recovery losses** below), settings.
- **`apps/kiosk`** — landing (5-icon category tiles), catalog, product detail, checkout, confirmation, post-order rating.

### API (Express)
- All public + me + orders + favorites + push + loyalty + games + leaderboard + admin endpoints. The full route inventory lives in `apps/api/src/app.ts`.
- Cup AI ("concierge") endpoints: `POST /catalog/suggest`, `GET /me/suggestion`, `GET /admin/reports/cup-ai`, `…/menu/products/:id/attrs`, `…/auto-detect-attrs`.
- Admin reports: `revenue`, `top-items`, `role-breakdown`, `by-kiosk`, `cup-ai`. **Missing: `revenue-trend`, `peak-hours`, `reviews`** (these were in the recovery branch — see Phase R).

### iOS (`apps/ios/CupAndCo`, SwiftUI)
- Auth, home, product detail, cart, checkout (cash-only), order tracking (5s polling, not SSE), order history, profile, rewards (no tier badges), QR scanner, game, leaderboard.
- **Missing**: card payments, SSE prep ETA, real APNs registration, tier badges, streaks, smart suggestions, referrals, /usual route, account-delete UI, multi-campus, dark-mode toggle, reviews UI, Sentry/PostHog SDKs.

### Supabase (`supabase/migrations`)
- 13 migrations. **Two are both numbered `0005`** (`0005_add_concierge_attributes.sql` and `0005_multi_campus.sql`). This must be fixed before a fresh `supabase db push` against production.

### CI/CD
- GitHub Actions: `ci.yml` (lint + typecheck + test + build + Playwright × 2 + iOS simulator build).
- `deploy.yml` deploys API to Render, customer-web/admin/kiosk to Vercel — triggered on push to `main`.
- TestFlight upload block exists but is commented out (needs Apple secrets; see Phase 1.6).

---

## Confirmed lost work (the "deleted by agents" problem)

**Source:** `git log main..origin/recovery/musing-kilby-features` — 4 commits. Verified by reading actual files on both branches. None of these are stale; main was changed *differently* on the same files, so a clean cherry-pick is impossible for one of them.

| # | Lost feature | Where it should live | Status today | Recovery method |
|---|---|---|---|---|
| L1 | **Recent Orders strip on home** with one-tap reorder | `apps/customer-web/src/components/RecentOrdersStrip.tsx` + integration in `app/(authed)/page.tsx` | File does not exist on main | Cherry-pick `b0803fb` + `9954be0` (additive, low conflict) |
| L2 | **iOS Recent Orders strip** | `apps/ios/CupAndCo/CupAndCo/Views/Home/RecentOrdersStripView.swift` | File does not exist on main | Same cherry-pick as L1 |
| L3 | **First tab renamed "Home" → "Orders"** (web + iOS) | `packages/i18n/src/{en,ar}.ts` + iOS `Localizable.strings` | Tabs still say "Home"/"الرئيسية" | Cherry-pick `0776994` (i18n only — trivial) |
| L4 | **Reports page sections**: Revenue Trend chart, Peak Hours, Most Ordered Products (sortable), Product Reviews, Rating Distribution, All Products list, Top 5, Date Range filter | `apps/admin/src/app/(authed)/reports/page.tsx` (main: ~347 lines / recovery: ~706 lines / sister branches go further) | Sections do not exist on main; only KPI cards + Top items + Customer breakdown + KioskBreakdown + CupAI tile | **Re-port manually** on top of current main (cherry-pick will conflict — main rewrote the same file) |
| L5 | **API endpoints backing those reports**: `GET /admin/reports/{revenue-trend, peak-hours, reviews}` | `apps/api/src/app.ts` | Routes do not exist | Same as L4 — manual re-port |
| L6 | **Profile rows**: Personal Info, Cards & Payments, Transaction History, Security (2FA / Face ID / Passcode toggles) | `apps/customer-web/src/app/(authed)/profile/page.tsx` | Rows do not exist; a comment at line ~230 explicitly says they were "hidden until APNs + biometric impl" | **Decision needed**: restore as visual-only stubs, OR keep hidden until the underlying impl lands. See Phase R.6 |

---

## Open bugs / hazards (verified from code)

| # | Bug | File | Severity | Phase |
|---|---|---|---|---|
| B1 | Two migrations numbered `0005` — `add_concierge_attributes.sql` and `multi_campus.sql` | `supabase/migrations/` | **High** — Supabase runs migrations in lex order; on a fresh DB, the alphabetically earlier file wins; on an already-deployed DB, the later one is skipped if the first ran. | R.2 |
| B2 | API uses in-memory stores for kiosks, ratings, featured-today, product pairs, idempotency | `apps/api/src/db/*Store.ts` | **Medium** — single Render instance is fine; a Render redeploy drops state for ~5s; multi-instance scaling drops state permanently | Phase 2 |
| B3 | iOS push toggle is cosmetic — no `UNUserNotificationCenter`, no `registerForRemoteNotifications` | `apps/ios/CupAndCo/CupAndCo/Views/Profile/ProfileView.swift:220` | **Medium** — App Store reviewers may flag this as misleading | Phase 1 |
| B4 | iOS hardcodes `.preferredColorScheme(.light)` in 5 auth views + `CupAndCoApp.swift:23` | `apps/ios/CupAndCo/CupAndCo/CupAndCoApp.swift:23` | Low — works fine, but blocks any future dark-mode parity | Phase 4 |
| B5 | Order-favorites endpoints assume `user_id` from JWT; kiosk synthetic user `kiosk:<id>` may panic on `/me/favorites/orders` | `apps/api/src/app.ts` (favorites routes) | Low — kiosk doesn't call these endpoints today, but a typo could break things | Phase 2 |
| B6 | TestFlight upload block in `ci.yml` is commented out; needs Apple secrets to enable | `.github/workflows/ci.yml:110-166` | Medium — blocks iOS device testing | Phase 1.6 |
| B7 | `apps/api/src/app.ts` is ~2300 lines and growing — cohesion risk | `apps/api/src/app.ts` | Low — refactor when convenient | Phase 2 |

---

# Phase R — Recovery (do this first, blocking everything)

**Goal:** Get the lost features back into `main`, fix the schema collision, archive prior plans, and have a single source of truth.

### R.1 — Cherry-pick the additive recovery commits
**Status:** `[~]` (PR #63 open, awaiting review/merge)
**Branch:** `claude/recover-additive`
**Steps:**
1. `git fetch origin`
2. `git checkout main && git pull`
3. `git checkout -b claude/recover-additive`
4. `git cherry-pick 0776994` — tab i18n rename (Home → Orders)
5. `git cherry-pick b0803fb` — Recent Orders strip (web + iOS)
6. `git cherry-pick 9954be0` — empty-state for the strip
7. `pnpm typecheck && pnpm test` — must pass
8. PR titled "recover: Recent Orders strip + Orders tab rename"

**Acceptance:** L1, L2, L3 close. Files `apps/customer-web/src/components/RecentOrdersStrip.tsx` and `apps/ios/.../RecentOrdersStripView.swift` exist; `packages/i18n/src/{en,ar}.ts` shows `home: 'Orders'` / `'الطلبات'`.

### R.2 — Fix the duplicate-`0005` migration
**Status:** `[~]` (PR #64 open, awaiting review/merge)
**Branch:** `claude/fix-migration-collision`
**What was done:** Kept `0005_multi_campus.sql` (older, more references in repo) and renamed `0005_add_concierge_attributes.sql` → `0006_…`. Every later migration shifted +1: `0006_product_inventory` → `0007`, `0007_product_image_cdn` → `0008`, `0008_order_favorites` → `0009`, `0009_user_streaks` → `0010`, `0010_tiered_loyalty` → `0011`, `0011_referrals` → `0012`, `0012_placement_source` → `0013`. All in-code references in `apps/api/src/db/*Repo.ts`, `apps/api/src/services/tierEngine.ts`, `packages/types/src/index.ts`, `supabase/migrations/0013_placement_source.sql` (header), and `docs/runbooks/go-live-kiosk.md` updated to match.

**Acceptance:** B1 closes. Every migration filename has a unique numeric prefix; numbering increases monotonically.

### R.3 — Re-port the lost reports sections + API
**Status:** `[ ]`
**Branch:** `claude/restore-reports-sections`
**Why this is not a cherry-pick:** Main rewrote `reports/page.tsx` and `app.ts` differently. A 3-way merge would produce non-trivial conflicts.
**Steps:**
1. `git show 8468bbe -- apps/admin/src/app/(authed)/reports/page.tsx` — read the recovery version.
2. On a new branch off main, *re-add* these reports sections in this order: Revenue Trend (line chart, last 7/30 days), Peak Hours (bar chart by hour), Most Ordered Products (sortable table), Product Reviews (sortable + sentiment), Rating Distribution, All Products list, Top 5, Date Range filter.
3. Add the matching API endpoints to `apps/api/src/app.ts`: `GET /admin/reports/revenue-trend?days=N`, `GET /admin/reports/peak-hours?date=YYYY-MM-DD`, `GET /admin/reports/reviews?sort=…&page=…`.
4. Reuse the existing data sources (`ordersStore`, `reviewsStore`) — no new tables.
5. PR titled "feat(admin): restore reports sections lost in earlier merges"

**Acceptance:** L4, L5 close. `/admin/reports` shows all 7 sections. The 3 new API endpoints respond 200 with shape `{ data: [...] }`.

### R.4 — Decide on profile rows (Personal Info / Cards / Transactions / Security)
**Status:** `[ ]` (decision pending)
**The recovery branch restores them** as visual-only stubs because the underlying impl wasn't there. Main *intentionally* removed them with a comment "hidden until APNs + biometric impl".

**Two options:**
- **(a) Recommended for v1 launch** — leave them hidden. Add a TODO comment with phase numbers. Resurrect when Phase 4.iOS lands real APNs + Phase 1.5 lands a real biometric prompt.
- **(b) Restore as stubs** — re-add the rows but mark each as "Coming soon" with a disabled state. Useful only if the user wants the *appearance* of the surface for screenshots / pitch decks.

**Karim, pick (a) or (b) before R.4 starts.** Default if no answer in 24h: **(a)**.

### R.5 — Archive the old plan files
**Status:** `[ ]`
**Branch:** `claude/archive-old-plans`
**Steps:**
1. Create `docs/_archive/` directory.
2. Move:
   - `docs/MASTER-PLAN.md` → `docs/_archive/MASTER-PLAN.md`
   - `docs/REVIEW-AND-POLISH-PLAN.md` → `docs/_archive/REVIEW-AND-POLISH-PLAN.md`
   - `docs/UPGRADE-PLAN.md` → `docs/_archive/UPGRADE-PLAN.md`
   - `docs/KIOSK-PLAN.md` → `docs/_archive/KIOSK-PLAN.md`
   - `docs/POST-PROD-PLAN.md` → `docs/_archive/POST-PROD-PLAN.md`
3. Keep this `docs/SHIP-PLAN.md` in `docs/`.
4. Update `CONTEXT.md` to point any "read first" pointers to `docs/SHIP-PLAN.md`.
5. Update `README.md` Roadmap section.
6. PR titled "docs: archive prior plans, point everything at SHIP-PLAN.md"

**Acceptance:** A future agent has *one* plan to read.

### R.6 — Delete or merge the dead branches
**Status:** `[ ]`
**Steps:** A lot of remote branches are sitting around. Most are stale (matched a merged PR). Delete with `git push origin --delete <branch>`:
- `origin/claude/jolly-beaver-08c151` (review-polish docs — already merged via PR #4)
- `origin/claude/post-prod-plan` (already merged via PR #60)
- `origin/claude/kiosk-category-landing` (already merged via PR #59)
- `origin/claude/kiosk-impeccable-refine` (already merged via PR #53)
- `origin/claude/kiosk-k4-combo` (already merged via PR #50)
- … and any others where `git log main..origin/<branch>` returns ≤ 1 commit and that commit's title matches a merged PR title.
- **Keep** `origin/recovery/musing-kilby-features` until R.1 + R.3 are confirmed.
- **Keep** `origin/ai-staging` (CI integration branch).

**Local branches:** `git branch -D` everything except `main`.

---

# Phase 0 — Go online (free-tier production)

**Goal:** A real public URL the user can hit from any device, on free tiers, swappable to paid later without code changes.

### 0.1 — Supabase project (free tier)
**Status:** `[ ]`
**Steps:**
1. Create Supabase project at app.supabase.com (free tier: 500MB DB, 2GB bandwidth/mo, unlimited API).
2. From Project Settings → API: copy `URL`, `anon key`, `service_role key`.
3. From Project Settings → Database → Connection: copy `db URL` (for migrations).
4. `cd supabase && supabase link --project-ref <ref>`
5. `supabase db push` — applies migrations 0001 → 0013 (after R.2 renumbers them).
6. `supabase db push --include-seed` to load `seed.sql` (22 menu items, 5 demo users).
7. Verify: `select count(*) from products;` returns 22.

**Note:** Free Supabase pauses after 1 week of inactivity. Production-quality use needs the $25/mo Pro tier.

### 0.2 — Render API (free tier with cold start)
**Status:** `[ ]`
**Steps:**
1. Create Render account, connect GitHub.
2. New Web Service → Docker → repo `cup-and-co` → root `apps/api` → branch `main`.
3. Free tier: 512MB RAM, sleeps after 15 min idle (cold start ~30s).
4. Set env vars from `render.yaml`:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_ANON_KEY` = anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = service role
   - `JWT_SECRET` = leave Render's auto-generated value
   - Paymob vars: leave empty for now (cash-only flows still work)
5. Get the public URL (e.g. `https://cup-and-co-api.onrender.com`).
6. Smoke test: `curl https://cup-and-co-api.onrender.com/health` → `{"ok":true}` (after cold start).

**Upgrade path:** Render Starter ($7/mo) removes cold start.

### 0.3 — Vercel projects (free Hobby tier)
**Status:** `[ ]`
**Steps for each of customer-web, admin, kiosk:**
1. Create Vercel project, import repo, point at `apps/<app>` as root directory.
2. Build command: already in each `vercel.json`.
3. Env: `NEXT_PUBLIC_API_URL` = the Render URL from 0.2.
4. Optional custom domains: free `*.vercel.app` URLs are fine for now.
5. After first deploy, copy the project ID into GitHub repo secrets (`VERCEL_PROJECT_ID_CUSTOMER`, `VERCEL_PROJECT_ID_ADMIN`, `VERCEL_PROJECT_ID_KIOSK`).
6. Future pushes to `main` auto-deploy via `.github/workflows/deploy.yml`.

### 0.4 — Wire production env to Sentry + PostHog (already in code)
**Status:** `[ ]`
**Steps:**
1. Sign up sentry.io free tier (5k errors/mo).
2. Create projects `cup-co-api`, `cup-co-web`. Copy DSNs.
3. Add `SENTRY_DSN` to Render. Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel customer-web + admin.
4. Sign up eu.posthog.com free tier (1M events/mo).
5. Create project `cup-co-prod`. Copy keys.
6. Add `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com` to Vercel.
7. Add `POSTHOG_API_KEY` + `POSTHOG_HOST` to Render.

**Acceptance:** A test error on the API shows up in Sentry within 30s.

### 0.5 — Test the public flow end-to-end
**Status:** `[ ]`
**Smoke test:**
1. `https://cup-and-co-customer.vercel.app` → log in with `+201000000001` + OTP `000000` → home loads with menu.
2. Add product → cart → checkout (cash) → order placed → tracking page shows status.
3. `https://cup-and-co-admin.vercel.app` → log in with `+201000000004` (owner) → see new order on KDS → mark "ready".
4. `https://cup-and-co-kiosk.vercel.app` → tap a product → checkout → confirmation shows pickup code.
5. Sentry + PostHog dashboards both show events from the smoke test.

### 0.6 — Public-URL hardening
**Status:** `[ ]`
**Steps:**
1. Verify CORS allowlist in `apps/api/src/app.ts` includes the three Vercel URLs.
2. Verify HSTS + helmet headers active on Render (already wired).
3. Confirm `JWT_SECRET` is the Render-generated one, not the dev fallback.
4. Confirm `NODE_ENV=production` on Render.
5. Confirm `ALLOW_HEADER_AUTH_BYPASS` is **unset** in production.

**Why now:** these are correctness gates that prevent the dev backdoor from leaking to production.

---

# Phase 1 — iOS parity must-haves

**Goal:** Close the gaps that block App Store submission or break the demo on iOS.

### 1.1 — Real APNs registration (replace cosmetic toggle)
**Status:** `[ ]`
**Acceptance:** `apps/ios/CupAndCo/CupAndCo/CupAndCoApp.swift` calls `UNUserNotificationCenter.current().requestAuthorization` on first launch; device token uploaded via `POST /push/register`; toggle in Profile actually controls notification authorization status.

### 1.2 — SSE order tracking (replace 5s polling)
**Status:** `[ ]`
**Acceptance:** `OrderTrackingView.swift` uses URLSession streaming or a `EventSource` Swift package against `GET /orders/:id/events`. Falls back to polling on connection error. Matches web's behavior.

### 1.3 — Card payments via Paymob
**Status:** `[ ]` (blocked on Paymob production keys, but can ship sandbox)
**Acceptance:** Checkout offers Cash + Card. Card opens Paymob iframe via `WKWebView` against `POST /payments/paymob/intention`. Success returns user to `OrderSuccessOverlay` (already exists, currently unwired). Cancel returns to checkout with toast.

### 1.4 — Tier badges (Bronze/Silver/Gold)
**Status:** `[ ]`
**Acceptance:** `RewardsView.swift` shows the user's tier next to the points balance. `HomeView.swift` greeting shows the tier badge. Reads from `GET /me/tier` (already exists).

### 1.5 — Account delete + data export (App Store 5.1.1(v) requirement)
**Status:** `[ ]`
**Acceptance:** New `Views/Profile/PrivacyView.swift` with "Delete account" (calls `POST /me/account/delete-request`) and "Export my data" (calls `POST /me/data/export`). Wire from Profile screen. Match the web flow.

### 1.6 — TestFlight pipeline
**Status:** `[!]` (blocked on Karim's Apple Developer enrollment)
**Acceptance:** `.github/workflows/ci.yml` TestFlight block uncommented; secrets `APPLE_CERTIFICATE_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_PROVISIONING_PROFILE_BASE64`, `APP_STORE_CONNECT_API_KEY_*`, `APPLE_DEVELOPER_TEAM_ID` all set in repo settings; merge to main produces a TestFlight build automatically.

**One-time setup the user does** (any browser, no Mac required):
1. Apple Developer Program enrollment ($99/yr).
2. Create App ID `com.cupandco.app` with push capability.
3. Create distribution certificate + provisioning profile (P12 + .mobileprovision).
4. Create App Store Connect record + API key.
5. Base64-encode the P12 + .mobileprovision + .p8 → paste into GitHub secrets.

### 1.7 — Sentry SDK on iOS
**Status:** `[ ]` (depends on 1.6 — needs a real device build)
**Acceptance:** `getsentry/sentry-cocoa` SPM dep added; `SentryClient.swift` initializes on app launch; PII scrubbing in `beforeSend`.

### 1.8 — Light cosmetic fixes
**Status:** `[ ]`
**Acceptance:**
- iOS app icon + launch screen present (currently placeholder).
- iOS cart persists across cold start (`UserDefaults` save/load on `CartStore`).
- iOS language switch live (no app restart needed).
- iOS `OrderSuccessOverlay` actually fires after order placement (it's defined but never instantiated).

---

# Phase 2 — Operational hardening

**Goal:** The platform survives a Render redeploy, multi-instance scale, and a real outage.

### 2.1 — Persist `kiosks`, `kiosk_ratings`, `featured_products`, `product_pairs` to Supabase
**Status:** `[ ]`
**Acceptance:** New migration `0014_persistence.sql` adds tables. Stores read Supabase-first, fall back to in-memory when `SUPABASE_URL` unset (preserves local dev). No client-visible behaviour change.

### 2.2 — Move idempotency-key store off in-memory
**Status:** `[ ]`
**Acceptance:** Either Postgres-backed (`POST /orders` writes a row in `order_idempotency` with TTL) or Redis-backed. Multi-instance Render now safe.

### 2.3 — App.ts split
**Status:** `[ ]` (lower priority)
**Acceptance:** `apps/api/src/app.ts` is broken into `routes/<resource>.ts` files mounted from a thin `app.ts`. Reduces the 2300-line file to a navigable surface.

### 2.4 — Healthcheck improvements
**Status:** `[ ]`
**Acceptance:** `GET /health/ready` returns 200 only when Supabase is reachable (used by Render health check); `GET /health/live` returns 200 always (process liveness).

---

# Phase 3 — Growth (gated by external dependencies)

### 3.1 — Apple Pay (iOS native + web)
**Status:** `[!]` (blocked — needs Apple Pay Merchant ID + Payment Processing Cert)
**Acceptance:** Defined in archived `docs/_archive/POST-PROD-PLAN.md` P2.1.

### 3.2 — Google Pay (web)
**Status:** `[ ]`
**Acceptance:** P2.2 in archived plan.

### 3.3 — Paymob terminal + tip jar (kiosk K3)
**Status:** `[!]` (blocked — Paymob terminal SDK access)
**Acceptance:** K3 in archived KIOSK-PLAN; P1.1 + P2.4 in archived POST-PROD plan.

### 3.4 — APNs key + push backend
**Status:** `[!]` (blocked — needs Karim's APNs Auth Key from Apple Dev portal)

---

# Phase 4 — iOS nice-to-haves

These are features web has and iOS doesn't, but they don't block launch. Pull from `docs/_archive/UPGRADE-PLAN.md` Phase 6 + Phase 8 sections.

- 4.1 Streaks UI (`PR #20` equivalent)
- 4.2 Smart time-of-day suggestions (`PR #22` equivalent)
- 4.3 Referrals page + share sheet
- 4.4 Dark mode toggle (remove `.preferredColorScheme(.light)` lock)
- 4.5 Multi-campus picker (`PR #13` equivalent)
- 4.6 Reviews UI on order tracking
- 4.7 Active order banner on home

---

# Phase 5 — Wow extras

Pull from archived `docs/_archive/POST-PROD-PLAN.md` P5–P8 as signals justify. None should be started without:
- A working production deployment with > 100 paid orders, AND
- Specific user signal (cafe owner asks for a printer, second cafe coming online, etc.)

---

## Vercel + Render decision (you asked)

**Recommendation: KEEP both. They're appropriate for this architecture.**

| Concern | Verdict | Rationale |
|---|---|---|
| **Vercel for 3 Next.js apps** | ✅ Keep | Vercel is the canonical Next.js host. Free Hobby tier handles all 3 projects. Edge network is great for the kiosk's iPad-on-cafe-wifi scenario. The `vercel.json` files are already correctly configured. Switching to Cloudflare Pages or Netlify saves nothing and re-introduces config work. |
| **Render for the API** | ✅ Keep, with caveat | Render's Docker-based deploy works directly with `render.yaml` and `apps/api/Dockerfile`. Free tier has 30s cold starts (acceptable for non-production testing). Production should be Starter ($7/mo) or Standard. **Alternative considered**: Fly.io has better cold-start and worldwide regions, but requires a `fly.toml` rewrite and re-doing CI. Not worth it. **Railway** has a similar tradeoff. |
| **Supabase** | ✅ Keep, no question | Already in heavy use (auth, storage, RLS, migrations). Switching cost is enormous; benefit is zero. |

**When to revisit:**
- If Render free-tier cold starts annoy real testers, switch to Render Starter ($7/mo) — same code, same config.
- If you ever need globally-distributed API (a cafe in another country), Cloudflare Workers + D1 becomes interesting, but that's a 3-week port.
- If Vercel's Hobby limits start hitting (unlikely for this product), Cloudflare Pages is a one-week migration.

**Net:** the deployment pipeline as it stands is genuinely production-grade. Don't burn time switching. Spend that time on Phase R + Phase 0 instead.

---

## Free-tier go-online playbook (the steps in plain English)

These are the exact steps to take Cup & Co live for testing **without paying anything**:

1. **GitHub** — your repo is already there.
2. **Supabase** (free tier, 500MB) — create project at app.supabase.com → run `supabase db push` → seed.
3. **Render** (free tier, cold-start API) — connect GitHub → new Web Service → Docker → `apps/api` → paste the Supabase env vars → deploy. URL: `https://cup-and-co-api.onrender.com`.
4. **Vercel** (free Hobby) — connect GitHub → 3 separate projects, one each for `apps/customer-web`, `apps/admin`, `apps/kiosk` → set `NEXT_PUBLIC_API_URL` to the Render URL → deploy. URLs: `https://cup-and-co-{customer,admin,kiosk}.vercel.app`.
5. **Sentry** (free, 5k errors/mo) — create org + 2 projects → paste DSNs into Vercel + Render env.
6. **PostHog Cloud EU** (free, 1M events/mo) — create project → paste keys.
7. **iPad PWA install** — open the kiosk URL in iPad Safari → Share → Add to Home Screen → Guided Access → done.

When you want to upgrade to "real production":
- Switch Render to Starter ($7/mo) — same `render.yaml`, no code change.
- Switch Supabase to Pro ($25/mo) when storage > 500MB or you need daily backups.
- Add a custom domain on Vercel (free) + DNS (your registrar).
- Vercel Hobby remains fine until you commercialize the product (Pro is $20/mo).

**Total monthly cost to go from "free testing" to "real production": $32/mo + your domain.**

---

## Subagent prompts you can fire (save your tokens)

These are self-contained prompts. Open a new chat, paste one in, the agent does it without your involvement. Each one ends with a self-merge or PR.

### Subagent prompt #1 — Run Phase R.1 (cherry-pick recovery commits)

```
You are working on the Cup & Co monorepo at E:\Kiosk App. Read docs/SHIP-PLAN.md
section "Phase R — Recovery" first. Then execute Phase R.1 only:

1. git fetch origin
2. git checkout main && git pull
3. git checkout -b claude/recover-additive
4. Cherry-pick these three commits in order:
   - 0776994 (chore(nav): rename first tab from Home to Orders)
   - b0803fb (feat(home): orders-forward strip with one-tap reorder)
   - 9954be0 (fix(home): keep Recent Orders section visible with empty state)
5. If a conflict happens, resolve it preserving the recovery branch's intent
   (this is restoring lost work, not introducing new design).
6. Run: pnpm typecheck && pnpm test
7. Commit message style: conventional commits.
8. git push -u origin claude/recover-additive
9. gh pr create --base main --title "recover: Recent Orders strip + Orders tab rename"
   --body with a clear description and a checklist mapping to L1, L2, L3 in SHIP-PLAN.md.

Do not start Phase R.2, R.3, or anything else. Stop after the PR is open.
Report the PR URL when done.
```

### Subagent prompt #2 — Run Phase R.2 (renumber migrations)

```
Working dir: E:\Kiosk App. Read docs/SHIP-PLAN.md "Phase R — Recovery" section R.2.
Branch: claude/fix-migration-collision off main.

Two migrations are both numbered 0005:
  supabase/migrations/0005_add_concierge_attributes.sql  (KEEP this number)
  supabase/migrations/0005_multi_campus.sql              (RENUMBER to 0006)

Renumber every later file by +1:
  0006_product_inventory.sql → 0007_product_inventory.sql
  0007_product_image_cdn.sql → 0008_product_image_cdn.sql
  0008_order_favorites.sql → 0009_order_favorites.sql
  0009_user_streaks.sql → 0010_user_streaks.sql
  0010_tiered_loyalty.sql → 0011_tiered_loyalty.sql
  0011_referrals.sql → 0012_referrals.sql
  0012_placement_source.sql → 0013_placement_source.sql

Use git mv so history is preserved. Then:
1. git grep '0005_multi_campus' — update any reference (likely none in code, maybe in docs).
2. git grep '0006_product_inventory' — same.
3. Read docs/runbooks/onboard-new-campus.md and update if it cites a migration number.
4. cd supabase && supabase db reset (locally) to confirm migrations apply in order.
5. pnpm test.
6. PR: "fix(supabase): renumber migrations to remove 0005 collision"

Do not change SQL contents. Just rename + update references. Report PR URL.
```

### Subagent prompt #3 — Run Phase 0 (provision the free-tier production)

```
Working dir: E:\Kiosk App. Read docs/SHIP-PLAN.md "Phase 0 — Go online" section.

You don't have access to the user's accounts. Your job is to PRODUCE a checklist
the user can execute in 1 hour, then verify the result against the codebase.

1. Read .github/workflows/deploy.yml — understand the CI/CD pipeline.
2. Read render.yaml — understand the API deployment.
3. Read all three vercel.json files in apps/*/vercel.json.
4. Read apps/api/.env.example, apps/customer-web/.env.example, apps/admin/.env.example,
   apps/kiosk/.env.example (or .env.production.example, whichever exists).
5. Produce a single document at docs/runbooks/go-online-free-tier.md with:
   - A literal checklist Karim can copy-paste through (Supabase, Render, Vercel × 3, Sentry, PostHog).
   - Each step says exactly what URL to visit, what value to copy, where to paste it.
   - At the end, a "smoke-test" section with curl commands to verify each service is live.
   - A "swap to paid" section: which env vars or settings change when upgrading.

Commit + PR titled "docs(runbooks): free-tier go-online playbook".
Do not actually deploy anything. The user does that step themselves.
```

### Subagent prompt #4 — Run Phase 1.1 (real APNs registration on iOS)

```
Working dir: E:\Kiosk App. Read docs/SHIP-PLAN.md section "Phase 1 — iOS parity"
specifically item 1.1.

Today: apps/ios/CupAndCo/CupAndCo/Views/Profile/ProfileView.swift line ~220 has a
push-notifications toggle that's purely cosmetic — it just flips a UserDefaults bool.
There's no UNUserNotificationCenter, no requestAuthorization, no APNs registration,
no device-token upload.

Your task:
1. Add real iOS push registration to apps/ios/CupAndCo/CupAndCo/CupAndCoApp.swift:
   - On app launch, request authorization via UNUserNotificationCenter
   - On approval, call UIApplication.shared.registerForRemoteNotifications()
   - Implement application(_:didRegisterForRemoteNotificationsWithDeviceToken:) — convert
     the data to hex, upload to POST /push/register (the endpoint already exists; check
     apps/api/src/app.ts to confirm the request body shape).
2. Wire the Profile toggle to actually request/revoke authorization (use
   UNUserNotificationCenter.current().getNotificationSettings to read the real status).
3. Add Push Notifications capability to apps/ios/CupAndCo/CupAndCo/CupAndCo.entitlements
   (or whatever the project uses — check project.yml for XcodeGen).
4. The app builds clean: cd apps/ios/CupAndCo && xcodegen generate && xcodebuild ...
5. PR titled "feat(ios): real APNs registration replaces cosmetic push toggle"

Do NOT add a notification handler / actually display notifications — that's out of
scope for this PR. Registration only.

Report PR URL when done.
```

### Subagent prompt #5 — Run Phase 1.2 (SSE on iOS order tracking)

```
Working dir: E:\Kiosk App. Read docs/SHIP-PLAN.md section "Phase 1 — iOS parity"
specifically item 1.2. Also read the web reference implementation:
apps/customer-web/src/app/(authed)/orders/[id]/page.tsx (look for "EventSource" or
"text/event-stream").

Today: apps/ios/CupAndCo/CupAndCo/Views/Orders/OrderTrackingView.swift uses a 5-second
Timer to poll GET /orders/:id every 5 seconds. Web has used SSE (Server-Sent Events)
against GET /orders/:id/events for months — iOS hasn't been updated.

Your task:
1. Replace the polling Timer with a streaming URLSession data task against
   GET /orders/:id/events. Parse the "data:" lines per the SSE spec.
2. On any connection error, fall back to the existing polling (don't delete that code —
   make it the fallback path).
3. Show a tiny "Live" or "Reconnecting" pill on the tracking view (mirror the web
   behaviour at apps/customer-web/src/components/LiveStatus.tsx if it exists).
4. The view must respect orderStore @Observable updates the same way it does today;
   only the data source changes.
5. PR titled "feat(ios): SSE order tracking replaces 5s polling"

Build: cd apps/ios/CupAndCo && xcodegen generate && xcodebuild build (simulator OK).
Report PR URL.
```

### Subagent prompt #6 — Run Phase 2.1 (persist kiosks/ratings/featured/pairs to Supabase)

```
Working dir: E:\Kiosk App. Read docs/SHIP-PLAN.md "Phase 2 — Operational hardening"
section 2.1.

Four in-memory stores need to move to Supabase:
  - apps/api/src/db/kiosksStore.ts
  - apps/api/src/db/kioskRatingsStore.ts
  - apps/api/src/db/productsFeaturedTodayStore.ts (check actual filename via Glob)
  - apps/api/src/db/productPairsStore.ts (check actual filename)

For each:
1. Create a migration in supabase/migrations/ with the next available number (after R.2
   landed, that's 0014, 0015, 0016, 0017 — or one combined 0014_persistence.sql).
2. Add a Supabase-backed implementation; keep the existing in-memory fallback when
   SUPABASE_URL is empty (preserves local dev without Supabase).
3. The store's external API (function names + signatures) must NOT change — only the
   internal data source.
4. Add a vitest unit test that exercises the in-memory fallback.
5. Verify pnpm test still passes.

Commits:
  feat(api): persist kiosks store to Supabase
  feat(api): persist kiosk ratings to Supabase
  feat(api): persist featured products + product pairs to Supabase
  feat(supabase): migration 0014 — persistence tables

PR titled "feat(api): move in-memory stores to Supabase (operational hardening)".
Report PR URL.
```

---

## How to use this file going forward

**For Karim:** When you start a new chat, your first message can be:
> "Working on Cup & Co at `E:\Kiosk App`. Read `docs/SHIP-PLAN.md` end-to-end before doing anything. Then tell me which Phase R / Phase 0 / Phase 1 task to run next."

**For an AI agent:** This file is the source of truth. The five plans in `docs/_archive/` are historical context only. Status checkboxes in this file get updated in the same PR as the work — `[ ] → [~] (branch, date) → [x] (date, PR #)`.

**Do NOT** create a new "MASTER" or "PLAN" or "ROADMAP" doc. Update this one.

---

## Master tracker (update as you go)

| Phase | Item | Status |
|---|---|---|
| R | R.1 Cherry-pick additive recovery | `[x]` (2026-05-10, PR #63) |
| R | R.2 Renumber migrations | `[x]` (2026-05-10, PR #64) |
| R | R.3 Re-port reports sections | `[x]` (2026-05-10, PR #66) |
| R | R.4 Profile rows — chose option B (Coming soon stubs) | `[x]` (2026-05-10, PR #66) |
| R | R.5 Archive old plans | `[x]` (2026-05-10, PR #65) |
| R | R.6 Delete dead branches | `[ ]` |
| 0 | 0.0 Playbook authored | `[x]` (2026-05-10, PR #67 — see `docs/runbooks/go-online-free-tier.md`) |
| 0 | 0.1 Supabase project | `[x]` (2026-05-10, applied via MCP — `Cup&co` project, all 11 missing migrations 0003–0013 added on top of existing 0001+0002, 27 products / 5 users / 1 campus / 1 kiosk live) |
| 0 | 0.2 Render API | `[ ]` (Karim — follow playbook step 2) |
| 0 | 0.3 Vercel × 3 | `[ ]` (Karim — follow playbook step 3) |
| 0 | 0.4 Sentry + PostHog | `[ ]` (Karim — follow playbook steps 5–6) |
| 0 | 0.5 E2E smoke test | `[ ]` (Karim — follow playbook step 4 + 8) |
| 0 | 0.6 Public-URL hardening | `[ ]` |
| 1 | 1.1 APNs | `[ ]` |
| 1 | 1.2 SSE order tracking | `[ ]` |
| 1 | 1.3 Card payments | `[ ]` |
| 1 | 1.4 Tier badges | `[ ]` |
| 1 | 1.5 Account delete UI | `[ ]` |
| 1 | 1.6 TestFlight pipeline | `[!]` (Apple Dev enrollment) |
| 1 | 1.7 Sentry SDK | `[ ]` (after 1.6) |
| 1 | 1.8 Cosmetic fixes | `[ ]` |
| 2 | 2.1 Persistence | `[ ]` |
| 2 | 2.2 Idempotency store | `[ ]` |
| 2 | 2.3 App.ts split | `[ ]` |
| 2 | 2.4 Healthcheck | `[ ]` |
| 3 | 3.1 Apple Pay | `[!]` |
| 3 | 3.2 Google Pay | `[ ]` |
| 3 | 3.3 Paymob terminal + tip | `[!]` |
| 3 | 3.4 APNs key | `[!]` |
| 4 | 4.1–4.7 iOS nice-to-haves | `[ ]` |
| 5 | 5.x Wow extras | `[ ]` |
