---
name: Cup & Co — v1.5+ Upgrade Plan
description: Authoritative roadmap for 22 strategic upgrades after the v1 final-pass polish (REVIEW-AND-POLISH-PLAN.md Phases 1-4) lands. Phased by dependency, sized for execution by AI agents over ~14-18 weeks of work.
status: Drafted 2026-05-07. Not yet started.
predecessor: docs/REVIEW-AND-POLISH-PLAN.md (must complete first)
owner: dev.karimmohammed@gmail.com
---

# Cup & Co — v1.5+ Upgrade Plan

> The v1 polish run (`REVIEW-AND-POLISH-PLAN.md`, Phases 1-4) closes correctness, security, and brand-consistency gaps in the existing app.
> **This document picks up after that lands** and adds the 22 strategic upgrades that turn Cup & Co from a working campus app into a defensible, scalable, retention-engine product.

---

## How to use this file (READ FIRST — applies to every AI agent)

This is the canonical upgrade roadmap. **If you are an AI agent picking up work on Cup & Co upgrades, follow this protocol exactly:**

1. **Read the entire file before doing anything.** Skipping phases breaks dependency chains and creates rework. Budget ~15 minutes of context for the read.
2. **Check the Master Progress Tracker** (next section) to find the highest-priority `[ ]` (not started) or `[~]` (in progress) task in the lowest-numbered incomplete phase. Work that one.
3. **Update the status checkbox in two places** as you progress:
   - The task's own `**Status:**` line
   - The Master Progress Tracker row at the top
   - Status codes:
     - `[ ]` Not started
     - `[~]` In progress (write your branch name + start date in parentheses)
     - `[x]` Completed (write completion date + PR # in parentheses, e.g. `[x] (2026-06-12, PR #47)`)
     - `[!]` Blocked (write reason in parentheses, e.g. `[!] (waiting for APNs key)`)
     - `[-]` Deferred or skipped (write reason)
4. **Do not re-ask defaults.** The "Defaults locked in" section is the source of truth. If a default needs to change, document the change request in "Open questions" and ping the user — don't silently override.
5. **One feature → one PR → one plan update.** Update this file in the same PR as the feature code, so reviewers see status sync.
6. **If you discover something not in this plan**, add it to "Open questions" or "Discovered work" appendix. Don't silently expand scope.
7. **When a phase completes**, update the memory entry at `C:\Users\LEGION\.claude\projects\E--Kiosk-App\memory\project_upgrade_plan.md` with a one-line status note and date.
8. **Estimates are calendar-time at AI-agent pace** (1 dev-day ≈ 4-6 hours of focused execution). They're targets, not contracts.
9. **Branch naming:** `claude/upgrade-pXX-feature-slug` (e.g., `claude/upgrade-p01-sentry-instrumentation`). One branch per task; one PR per branch.
10. **Do not push directly to `main`.** Always PR. The `REVIEW-AND-POLISH-PLAN.md` PR strategy applies here too.

---

## Status legend

| Code | Meaning |
|------|---------|
| `[ ]` | Not started — available to pick up |
| `[~]` | In progress — someone (or some agent) is actively working on it |
| `[x]` | Completed — with date and PR link in parentheses |
| `[!]` | Blocked — with reason in parentheses |
| `[-]` | Deferred or skipped — with reason |

---

## Master Progress Tracker

Update the % column whenever a sub-task changes state. Update the Status column whenever the phase as a whole transitions.

| Phase | Name | Status | % Done | Started | Completed | Notes |
|-------|------|--------|--------|---------|-----------|-------|
| 1 | Observability & Compliance Foundation | `[~]` | 75% | 2026-05-07 | — | Sentry web+API done (PR #9); PostHog web+API done (PR #10); Account Delete + Data Export web+API done (PR pending); iOS portion of all 3 deferred until TestFlight |
| 2 | Multi-Campus Architecture | `[~]` | 65% | 2026-05-07 | — | Stage-1 migration in PR #12; campus selector + API endpoints in PR #13; onboarding playbook in PR #14; admin support (2.3) pending |
| 3 | Operational Tools | `[ ]` | 0% | — | — | KDS, inventory, prep-ETA, CDN |
| 4 | Payments & Notifications | `[ ]` | 0% | — | — | Needs APNs key + Apple Pay merchant ID |
| 5 | Experimentation Platform | `[ ]` | 0% | — | — | GrowthBook self-host |
| 6 | Retention Engagement | `[ ]` | 0% | — | — | Favorites, streaks, tiers, suggestions |
| 7 | Growth & Acquisition | `[ ]` | 0% | — | — | Referrals + App Clips |
| 8 | Resilience & Polish | `[ ]` | 0% | — | — | Offline cache, dark mode, avatars |
| 9 | Voice & Shortcuts | `[ ]` | 0% | — | — | Siri intents |
| 10 | Admin App Review Pass | `[ ]` | 0% | — | — | 7-area review of admin |

**Total estimated effort:** ~14-18 weeks of focused work.
**Critical path:** Phase 2 (multi-campus) blocks Phases 3, 6, 7. Phase 1 (observability) should be in place before Phases 4-10 so all new features ship instrumented.

---

## Defaults locked in (do not re-ask)

These are the assumptions every phase operates under. If you need to change one, file an "Open question" and tag the user.

| Decision | Default | Rationale |
|----------|---------|-----------|
| Crash reporting backend | **Sentry SaaS (sentry.io)** — free tier first, upgrade when events exceed 5K/month | No ops overhead; can self-host later if cost demands |
| Product analytics backend | **PostHog Cloud (EU region)** — free tier (1M events/month) | EU data residency aligns with Egyptian PDPL; rich SDK across all 3 platforms |
| A/B testing framework | **GrowthBook self-hosted on the same Supabase Postgres** | OSS, no per-seat cost, integrates with PostHog for metrics |
| Image CDN | **Cloudflare Images** ($5/mo + $1/100k images delivered) | Best price/performance for product imagery |
| Push notifications backend | **Web Push: VAPID + custom Express endpoint. iOS: APNs HTTP/2 via `apn` Node lib (no Firebase)** | Avoid Firebase lock-in; APNs HTTP/2 is straightforward |
| Apple Pay integration | **Direct PassKit + Paymob token bridge** | Paymob supports Apple Pay tokens; native sheet feels best |
| Google Pay integration | **Web only initially** (no Android app yet) | iOS Apple Pay covers iOS users; Google Pay on web for Android users |
| Multi-campus model | **`campus_id` on every transactional table; one Supabase project, RLS isolates by campus** | Single DB easier than per-campus instances at this scale |
| Dark mode strategy | **System-preference-driven by default; manual toggle in Profile** | Standard iOS/web pattern |
| Voice ordering scope | **Siri shortcuts only ("order my usual")** — no full conversational ordering | Conversational ordering is a v2.0 effort; shortcuts give 80% value for 20% effort |
| Account delete grace period | **30 days soft-delete, then hard-delete** | Allows accidental-delete recovery + compliance |
| Data export format | **JSON in a zip file, emailed as time-limited Supabase Storage URL** | Machine-readable + easy to deliver |
| Streak break grace | **One free skip per week** ("frozen streak") | Reduces churn from minor disruptions |
| Tier reset cadence | **Annual rolling reset** based on trailing 12 months of points | Predictable, fair |
| Referral reward | **50 pts to referrer + 30 pts to referee on referee's first paid order** | Aligns reward with revenue event |
| App Clip max binary | **<10MB** (Apple's hard limit for full-experience clips) | Hard constraint |
| Offline order queue | **Out of scope for v1.5** — offline read-only menu cache only | Conflict resolution is hard; defer until proven need |

---

## Sequencing rationale

The phase order is **not** simply value-ordered. It's dependency-ordered with value as a tiebreaker:

- **Phase 1 (Observability) goes first** because every later phase ships better when instrumented. You can't measure success of "tiered loyalty" without analytics.
- **Phase 2 (Multi-campus) goes second** because it's a schema migration that touches every transactional table. Doing it after Phases 3-7 would require rewriting all those queries.
- **Phase 3 (Operational tools)** unblocks Phase 4 (KDS depends on real order flow), Phase 6 (inventory-aware menu depends on stock data), and Phase 5 (A/B testing on real ordering).
- **Phase 4 (Payments + Push)** depends on Phase 1 (PostHog to measure conversion lift) and external secrets (APNs key, Apple Pay merchant ID) the user must provision.
- **Phase 5 (A/B platform)** is a prerequisite for Phase 6 (loyalty experiments) and Phase 7 (referral A/B tests).
- **Phase 7 (App Clips)** depends on Phase 4 (Apple Pay is required by Apple inside App Clips).
- **Phase 10 (Admin pass)** comes last so it can audit all the new admin surfaces (KDS, multi-campus, inventory, coupons).

If a phase is non-blocking and idle agent-time is available, the following pairs can run in parallel:
- Phase 5 ‖ Phase 6 (after Phase 4 lands)
- Phase 8 ‖ Phase 9 (independent)
- Phase 10 ‖ end of Phase 8

---

## Phase 1 — Observability & Compliance Foundation

> **Goal:** Make every later feature measurable and compliant from day one.
> **Estimated effort:** 7-10 days.
> **Dependencies:** REVIEW-AND-POLISH-PLAN.md Phases 1-4 must be merged.
> **Outputs:** Sentry projects live on all 3 platforms; PostHog event taxonomy; account-delete + data-export user flows; Egyptian PDPL compliance review.

---

### 1.1 Sentry crash reporting on iOS + web + API

**Status:** `[~]` (web + API completed 2026-05-07; iOS deferred — see notes below)
**Estimated effort:** 1.5 days (web+API portion: 0.5 day actual)
**Dependencies:** None
**Branch:** `claude/upgrade-p01-sentry-api-web` (PR pending)

**Sub-status:**
- [x] **API (Express)** — `@sentry/node` v8 wired via `apps/api/src/instrument.ts`; `Sentry.setupExpressErrorHandler` registered before our handler; user-id tagged in JWT auth middleware (no PII)
- [x] **Web (Next.js 15)** — `@sentry/nextjs` v8 wired via `instrumentation.ts` + `sentry.{client,server,edge}.config.ts`; `withSentryConfig` wraps `next.config.mjs`; tunnel route `/monitoring` set
- [x] **Env templates** — `SENTRY_DSN` (and `SENTRY_AUTH_TOKEN`/`ORG`/`PROJECT` for source-map upload) added to both `.env.example` files
- [x] **PII scrubbing** — `beforeSend` strips email/username/IP from user, `Authorization`/`Cookie` headers, JWT-like patterns from breadcrumbs
- [ ] **iOS** — Deferred until TestFlight pipeline is operational (per memory `project_ios_testing_todo.md`); will be its own PR
- [ ] **Source-map upload in CI** — pending (requires `SENTRY_AUTH_TOKEN` in CI secrets, deferred to user setup)
- [ ] **dSYM upload for iOS** — blocked on iOS task above

**User action required to fully activate:**
1. Create Sentry org + projects `cup-co-api` and `cup-co-web` at sentry.io
2. Paste DSN into Vercel env (`NEXT_PUBLIC_SENTRY_DSN`) and API host env (`SENTRY_DSN`)
3. Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to Vercel env for source-map upload at build time
4. Run `pnpm approve-builds` once locally to allow `@sentry/cli` postinstall (or accept that source maps won't upload from local builds)

#### Why
Without crash reporting, bugs ship and users churn silently. Foundational — every feature added in Phases 2-10 should be instrumented from day 1, and every regression caught before users complain.

#### Specification
- 3 Sentry projects in one organization: `cup-co-ios`, `cup-co-web`, `cup-co-api`
- Source maps uploaded on every web build (CI step)
- iOS dSYMs uploaded on every TestFlight build (CI step — depends on TestFlight pipeline being set up; may need to land first)
- Release tagging from CI (commit SHA → Sentry release)
- PII scrubbing config (no email/phone/JWT in error events)
- Performance monitoring: 10% sample rate
- Alerts: any new crash signature → email to `dev.karimmohammed@gmail.com`

#### Implementation steps

**iOS (`apps/ios/CupAndCo/`):**
1. Add `getsentry/sentry-cocoa` SPM dependency (pin to `~> 8.0`)
2. Create `apps/ios/CupAndCo/CupAndCo/Services/SentryClient.swift`:
   ```swift
   import Sentry
   enum SentryClient {
     static func start() {
       SentrySDK.start { options in
         options.dsn = Bundle.main.object(forInfoDictionaryKey: "SENTRY_DSN") as? String
         options.tracesSampleRate = 0.1
         options.environment = isDebug ? "dev" : "production"
         options.releaseName = Bundle.main.releaseName
         options.beforeSend = { event in
           // Scrub PII
           event.user?.email = nil
           event.user?.username = nil
           return event
         }
       }
     }
   }
   ```
3. Call `SentryClient.start()` in `CupAndCoApp.swift` `init()`, BEFORE any other initialization
4. Add `SENTRY_DSN` to Info.plist (will be templated from xcconfig in CI)
5. Set user ID after auth (NOT phone, just `user_id`):
   ```swift
   SentrySDK.configureScope { $0.setUser(User(userId: id)) }
   ```
6. Update GitHub Actions iOS workflow to upload dSYMs:
   ```yaml
   - name: Upload dSYMs to Sentry
     run: sentry-cli upload-dif --org cup-co --project cup-co-ios <archive_path>/dSYMs/
   ```

**Web (`apps/customer-web/`):**
1. `pnpm add @sentry/nextjs`
2. Run `npx @sentry/wizard@latest -i nextjs --org cup-co --project cup-co-web` — accept defaults
3. Verify `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` exist
4. In each, add `tracesSampleRate: 0.1`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0` (privacy)
5. Add to `next.config.mjs` Sentry webpack plugin config:
   ```js
   { silent: true, org: 'cup-co', project: 'cup-co-web', authToken: process.env.SENTRY_AUTH_TOKEN }
   ```
6. Add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` to `.env.example` and Vercel env
7. In `app/layout.tsx`, add error boundary that calls `Sentry.captureException`

**API (`apps/api/`):**
1. `pnpm add @sentry/node @sentry/profiling-node`
2. In `apps/api/src/index.ts`, BEFORE express setup:
   ```typescript
   import * as Sentry from '@sentry/node';
   import { ProfilingIntegration } from '@sentry/profiling-node';
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     release: process.env.GIT_SHA,
     tracesSampleRate: 0.1,
     profilesSampleRate: 0.1,
     integrations: [new ProfilingIntegration()],
   });
   ```
3. Add Sentry middleware in `apps/api/src/app.ts`:
   ```typescript
   app.use(Sentry.Handlers.requestHandler());
   app.use(Sentry.Handlers.tracingHandler());
   // ... routes ...
   app.use(Sentry.Handlers.errorHandler());
   ```
4. Tag user context after auth (in `apps/api/src/http/auth.ts`, after JWT decode):
   ```typescript
   Sentry.setUser({ id: claims.sub });
   ```
5. Add `SENTRY_DSN`, `GIT_SHA` to `.env.example` and Render/Railway env

#### Acceptance criteria
- [ ] Test crash on iOS appears in Sentry within 30s with readable Swift stack trace (dSYM uploaded)
- [ ] Test error on web appears in Sentry within 30s with readable TS source (source maps uploaded)
- [ ] Test error on API appears in Sentry within 30s with readable TS source
- [ ] Manually verify 5 events have NO email, phone, or JWT in payload
- [ ] Release tag matches commit SHA in Sentry
- [ ] Sentry dashboard shows correct user count after 24h
- [ ] DSN added to all `.env.example` files; secrets added to CI/hosting

#### Open questions
- Self-hosted Sentry later if costs grow? **Default: no, stay on cloud.**
- Performance monitoring sample rate? **Default: 10%.**

#### Testing
- Unit: middleware order in API
- Integration: deliberate crash → assert Sentry HTTP POST (use Sentry test mode)
- Manual: trigger 1 crash on each platform in staging; verify in dashboard

#### Rollout
- Stage: deploy to staging, watch for 48h
- Production: deploy alongside next normal release
- Monitor: error rate baseline established in first 7 days; tune `tracesSampleRate` if cost spikes

---

### 1.2 PostHog product analytics on iOS + web + API

**Status:** `[~]` (web + API completed 2026-05-07; iOS deferred)
**Estimated effort:** 2 days (web+API portion: 0.5 day actual)
**Dependencies:** 1.1 (so error events and analytics events share the same release tag)
**Branch:** `claude/upgrade-p01-posthog-instrumentation` (PR pending)

**Sub-status:**
- [x] **API (Express)** — `posthog-node` v4 wrapped in `apps/api/src/services/analytics.ts` with typed event union; `track()` mirrored from `recordLoyaltyEvent` (points_earned/redeemed); `order_placed` fired in `POST /orders`; `order_status_changed` + `order_completed` fired in `PATCH /admin/orders/:id/status`; `identify(userId, {role})` called from `requireAuth`; `shutdownAnalytics()` called on SIGTERM/SIGINT for graceful flush
- [x] **Web (Next.js)** — `posthog-js` v1 wrapped in `apps/customer-web/src/lib/analytics.ts` with typed event union; `<AnalyticsProvider>` mounted in root layout fires `app_opened` (with first-open detection via localStorage) + `page_viewed` on every route change; `add_to_cart` fired in zustand cart store; `identify` called from session store on `setSession`/`setRole`; `resetAnalytics` called on `logout`
- [x] **Privacy** — autocapture OFF, session recording OFF, capture_pageview OFF (we fire manually), `respect_dnt: true`, `person_profiles: 'identified_only'`, EU region default
- [x] **Env templates** — `POSTHOG_KEY` (API) and `NEXT_PUBLIC_POSTHOG_KEY` (web) added with EU host defaults
- [ ] **iOS** — Deferred until TestFlight pipeline operational
- [~] **Web events** — Foundational ones wired in PR #10. PR #15 adds `signup_started` (login OTP send), `product_viewed` (detail page mount), `checkout_started` (checkout mount with non-empty cart), `payment_method_selected` (checkout method picker). Still pending in a smaller follow-up: `product_customized`, `cart_viewed`, `coupon_applied`, `game_started`. `referral_invited` waits on Phase 7; `notification_permission_*` waits on Phase 4.
- [ ] **API events still to wire** — `signup_completed` (needs OTP-send-time tracking), `referral_converted` (waits on Phase 7), `push_sent` (waits on Phase 4)

**User action required to fully activate:**
1. Sign up at eu.posthog.com (free tier — 1M events/mo)
2. Create one project: `cup-co-prod`
3. Paste the project key into:
   - API host env: `POSTHOG_KEY=phc_...`
   - Vercel env: `NEXT_PUBLIC_POSTHOG_KEY=phc_...`
4. Validate funnel `app_opened → product_viewed → add_to_cart → order_placed` appears in PostHog Live View within 24h

#### Why
Right now there is zero visibility into the funnel: open → browse → cart → checkout → order. Without analytics, every later phase (loyalty, referrals, A/B tests) flies blind. PostHog is chosen over Mixpanel for OSS-friendliness, EU region (PDPL), and bundled feature flags (which Phase 5 will use).

#### Specification
- One PostHog project: `cup-co-prod` (EU region cloud)
- Three SDKs: `posthog-ios`, `posthog-js`, `posthog-node`
- Single user ID across all platforms (= Cup & Co `user_id`)
- Event taxonomy (see "Event catalogue" below) — defined once, reused everywhere
- Anonymous events allowed (pre-login browse), then aliased on first identify
- Feature flags enabled (will be used in Phase 5)
- Session recording: **disabled** (privacy + cost)
- Autocapture: **disabled** (we use explicit events for clean data)

#### Event catalogue (canonical — implement these names exactly)

| Event | Properties | Where fired |
|-------|-----------|-------------|
| `app_opened` | `platform`, `app_version`, `is_first_open` | App launch |
| `signup_started` | `platform` | First OTP screen |
| `signup_completed` | `role`, `time_to_complete_sec` | Role pick complete |
| `product_viewed` | `product_id`, `category`, `price`, `position_in_list` | Product detail open |
| `product_customized` | `product_id`, `size`, `sugar`, `ice` | Customize change |
| `add_to_cart` | `product_id`, `quantity`, `unit_price`, `currency` | Add-to-cart tap |
| `cart_viewed` | `item_count`, `subtotal`, `currency` | Cart open |
| `checkout_started` | `subtotal`, `item_count`, `currency` | Checkout open |
| `payment_method_selected` | `method` (`card`/`wallet`/`cash`/`apple_pay`/`google_pay`) | Method pick |
| `coupon_applied` | `code`, `discount_amount`, `valid` | Apply tap |
| `order_placed` | `order_id`, `total`, `payment_method`, `fulfillment` (`pickup`/`delivery`), `item_count`, `points_earned` | Order create success |
| `order_status_changed` | `order_id`, `from_status`, `to_status` | Status update received |
| `order_completed` | `order_id`, `time_to_completion_min` | Order marked complete |
| `points_earned` | `source` (`order`/`scan`/`game`/`referral`), `amount`, `new_balance` | Points credited |
| `points_redeemed` | `discount_amount`, `points_spent`, `new_balance` | Redeem in cart |
| `game_started` | `game_id` (`coffee_collector`) | Game tap |
| `game_completed` | `game_id`, `score`, `points_earned`, `lives_lost` | Game over |
| `referral_invited` | `channel` (`whatsapp`/`copy`/`other`) | Share tap |
| `referral_converted` | `referrer_id`, `referee_id`, `reward_amount` | First paid order from referee |
| `notification_permission_prompted` | `platform` | First permission ask |
| `notification_permission_granted` | `platform` | Granted |
| `push_received` | `category`, `notification_id` | Notification arrived |
| `push_opened` | `category`, `notification_id` | User tapped |

#### Implementation steps

**iOS:**
1. Add `PostHog/posthog-ios` SPM dependency
2. Create `apps/ios/CupAndCo/CupAndCo/Services/Analytics.swift` with typed wrapper:
   ```swift
   enum AnalyticsEvent {
     case appOpened(version: String, isFirstOpen: Bool)
     case productViewed(id: String, category: String, price: Decimal)
     // ... one case per canonical event
   }
   enum Analytics {
     static func track(_ event: AnalyticsEvent) { /* posthog send */ }
     static func identify(userId: String) { /* posthog identify */ }
   }
   ```
3. Initialize in `CupAndCoApp.swift` after Sentry, before view tree
4. Identify after auth: `Analytics.identify(userId: session.userId)`
5. Track at every fire-point listed in catalogue (estimate 30-40 call sites)

**Web (`apps/customer-web/`):**
1. `pnpm add posthog-js`
2. Create `apps/customer-web/src/lib/analytics.ts` with typed wrapper (same shape as iOS)
3. Initialize in `app/layout.tsx` (client component) with Posthog Provider:
   ```tsx
   posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
     api_host: 'https://eu.posthog.com',
     autocapture: false,
     capture_pageview: false, // we'll fire manually for control
     session_recording: { enabled: false },
   })
   ```
4. Add `usePageView` hook in `app/(authed)/layout.tsx` to fire `app_opened` on route change
5. Track at every fire-point (estimate 30-40 call sites)

**API:**
1. `pnpm add posthog-node`
2. In `apps/api/src/services/analytics.ts`:
   ```typescript
   import { PostHog } from 'posthog-node';
   export const analytics = new PostHog(process.env.POSTHOG_KEY!, { host: 'https://eu.posthog.com' });
   ```
3. Server-side fire for events that originate at the server (e.g., `order_status_changed` from the KDS update endpoint; `points_earned` from the loyalty engine)
4. Always pass `distinct_id: userId` so events join with client-side ones

#### Acceptance criteria
- [ ] All 23 catalogue events fire in dev with correct properties
- [ ] Events from iOS, web, API for the same user collapse to one user record (verify by placing one order on each platform)
- [ ] Funnel `app_opened → product_viewed → add_to_cart → order_placed` visible in PostHog dashboard within 24h
- [ ] No PII in event properties (manually verify 10 events; no phone, no full address)
- [ ] Feature flag fetch latency < 50ms p95 (will be measured in Phase 5)
- [ ] All 3 `.env.example` files updated

#### Open questions
- Region? **Default: EU (Frankfurt) for PDPL alignment.**
- Self-hosted later? **Default: no.**

#### Testing
- Unit: typed event wrapper compile-checks
- Manual: place an order on each platform; inspect events in PostHog Live View

#### Rollout
- Stage: 7 days of dev events to validate taxonomy
- Production: deploy alongside Sentry rollout
- Iterate: weekly review of event volume; add/remove based on dashboard usage

---

### 1.3 Account Delete + Data Export (PDPL compliance)

**Status:** `[~]` (web + API completed 2026-05-07; iOS deferred; Edge Functions deferred to v1.5.1)
**Estimated effort:** 3 days (web+API portion: 1 day actual)
**Dependencies:** 1.1 (audit trail goes to Sentry on errors), 1.2 (track deletion events)
**Branch:** `claude/upgrade-p01-account-delete` (PR pending)

**Sub-status:**
- [x] **Migration `0004_account_lifecycle.sql`** — adds `deleted_at` + `deletion_requested_at` to users (with partial indexes); creates `data_exports` table with RLS; creates `anonymize_user(uuid)` plpgsql function with anonymize-in-place strategy (NOT cascade-delete) preserving FK chains; creates `can_request_export()` rate-limit helper; creates `users_due_for_hard_delete` view for the daily cron
- [x] **API service module `accountLifecycle.ts`** — separate delete-confirmation OTP store (cannot be reused for login); in-memory deletion state; export job tracking; rate-limit (1/week)
- [x] **6 API endpoints** — `POST /me/account/delete-request`, `POST /me/account/delete-confirm`, `POST /me/account/cancel-deletion`, `GET /me/account/status`, `POST /me/data/export`, `GET /me/data/exports/:jobId`, `GET /me/data/exports/:jobId/download` (synchronous in dev — Edge Function path lives in plan for v1.5.1)
- [x] **`assertAccountActive` guard** — applied to `POST /orders`, `POST /reviews`, `POST /games/sessions`, `POST /games/scores`. Cancel-deletion remains accessible during grace.
- [x] **Web UI** — `/profile/privacy` page with Download + Delete sections, OTP-confirmation flow with 6-digit input, deletion-pending banner with "Cancel deletion" CTA. Profile page now links to it.
- [x] **i18n** — full EN + AR strings (28 keys) covering all states (idle, preparing, ready, rate-limited, awaiting-code, success, pending banner, undo). Strict TypeScript types updated.
- [x] **Anonymization cascade SQL** — `anonymize_user(uid)`: strips PII from users row (phone becomes `[deleted-{uuid}]` tombstone), DELETEs push_devices/favorites/game_sessions, NULLs review.comment but keeps rating, leaves orders/loyalty linked to the now-tombstoned user for accounting. Records audit_log entry with sha256 of prior phone (never the phone itself).
- [ ] **iOS UI** — Deferred until TestFlight pipeline operational (Apple App Store guideline 5.1.1(v) compliance — required before iOS public release)
- [ ] **Edge Function `account-hard-delete`** — Deferred to v1.5.1; for now the cron is a manual SQL job: `select anonymize_user(id) from users_due_for_hard_delete; update users set deletion_requested_at=null where id in (...);`
- [ ] **Edge Function `data-export-worker`** — Deferred; for v1.5 export is synchronous and inline (the API JSON-streams the file directly). Bigger users with thousands of orders may want async; revisit when seen.
- [ ] **Production wiring to Supabase** — `users.deleted_at` column + RLS policies live in the migration but the API still uses the in-memory state mirror. Production swap is a 2-line change in the API to also UPDATE the Supabase row; deferred until the API repos move from in-memory Maps to Supabase across the board.

**Designed-in privacy choices:**
- Anonymize-in-place over cascade-delete: preserves FK chains, keeps non-PII transactional data for accounting/legal, satisfies "right to erasure" without breaking analytics
- Phone tombstone format `[deleted-{uuid}]` keeps unique constraint without leaking anything identifiable
- Audit log stores `sha256(prior_phone)` not the phone itself
- Delete-confirmation OTP is keyed to userId (not phone) and stored separately from login OTP — cannot be intercepted and used for login
- 30-day grace period — generous but standard
- Apple App Store guideline 5.1.1(v) compliance — required for the next iOS submission

**User actions required:**
1. Apply migration on Supabase: `supabase db push` (or via the Supabase dashboard)
2. Schedule a cron to run daily: `select anonymize_user(id) from users_due_for_hard_delete; update users set deletion_requested_at=null where deletion_requested_at < now() - interval '30 days' and deleted_at is not null;` (Edge Function for this is in v1.5.1 plan)
3. Set up Supabase Storage bucket `data-exports` (private; signed URLs only) — needed when async export worker lands

#### Why
Egypt's Personal Data Protection Law (Law No. 151 of 2020) requires that controllers grant data subjects the right to delete and the right to portability on request. Cup & Co handles phone numbers, order history, and payment metadata — all in scope. Building this now (before user counts grow) is far cheaper than retrofitting under a complaint.

Apple App Store guideline 5.1.1(v) also requires in-app account deletion for any iOS app that supports account creation. Without it, the app will be rejected on next review.

#### Specification

**Account delete flow:**
- Triggered from Profile → Privacy & Data → Delete Account
- Two-step confirmation:
  1. Modal: "This will delete your account and all data after 30 days. Until then, you can recover by signing in. After 30 days, deletion is permanent."
  2. OTP re-verification (send fresh code to phone, must enter to confirm)
- On confirm: set `users.deleted_at = now()`, sign out, force re-OTP for any sign-in attempt during grace
- Background job (daily Supabase Edge Function): hard-delete records where `deleted_at < now() - interval '30 days'`
- Hard delete cascades:
  - `users` row → DELETE
  - `orders`, `order_items` → anonymize (set `user_id = NULL`, scrub `notes`); keep for accounting
  - `points_history` → DELETE (no longer attributable)
  - `reviews` → anonymize (set `user_id = NULL`, keep text)
  - `push_tokens`, `sessions`, `face_id_credentials` → DELETE
  - `referral_codes`, `streaks`, `tier_history` → DELETE

**Data export flow:**
- Triggered from Profile → Privacy & Data → Download My Data
- Endpoint: `POST /me/export` → returns `{ jobId }`
- Backend (Supabase Edge Function): query all user data, write JSON files to a zip, upload to Supabase Storage with 7-day signed URL
- Send email + push notification with download link
- One export per 7 days per user (rate limit)
- Format: `cup-co-data-{userId}-{date}.zip` containing:
  - `profile.json` — user record (without password hash)
  - `orders.json` — all orders with items
  - `points.json` — points history
  - `reviews.json` — written reviews
  - `referrals.json` — outbound and inbound
  - `README.txt` — explanation of fields, contact for questions

#### Implementation steps

**Database (`supabase/migrations/`):**
1. Create migration `00XX_account_lifecycle.sql`:
   ```sql
   ALTER TABLE users ADD COLUMN deleted_at timestamptz;
   ALTER TABLE users ADD COLUMN deletion_requested_at timestamptz;
   CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

   CREATE TABLE data_exports (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES users(id),
     status text NOT NULL DEFAULT 'pending', -- pending | running | done | failed
     storage_path text,
     expires_at timestamptz,
     created_at timestamptz DEFAULT now()
   );
   CREATE INDEX idx_data_exports_user ON data_exports(user_id);
   ```
2. Update RLS on all tables to filter `deleted_at IS NULL` for the current user
3. Create migration `00XX_anonymization_helpers.sql` with stored procedures for the anonymization cascade

**API:**
1. Add endpoints to `apps/api/src/app.ts`:
   - `POST /me/delete/request` — sends OTP for confirmation; sets `deletion_requested_at`
   - `POST /me/delete/confirm` — verifies OTP; sets `deleted_at = now()`; signs out
   - `POST /me/delete/cancel` — clears `deleted_at` if within grace period
   - `POST /me/export` — creates `data_exports` row with status pending; returns `jobId`
   - `GET /me/exports/:jobId` — returns status + URL when ready
2. Add Zod schemas in `apps/api/src/schemas/account.ts`
3. Add audit log entries for each action

**Edge Functions (`supabase/functions/`):**
1. `account-hard-delete` — runs daily via cron; processes `deleted_at < now() - 30 days`
2. `data-export-worker` — runs every 5 minutes; processes `data_exports` with `status='pending'`; uploads zip; updates row to `done` with `storage_path` + `expires_at = now() + 7 days`

**Web (`apps/customer-web/`):**
1. Build `app/(authed)/profile/privacy/page.tsx` (replaces dead row from v1)
2. UI: two prominent buttons — "Download my data" and "Delete my account"
3. Both go through OTP modal (reuse existing OTP component)
4. After delete confirm: sign out, redirect to `/auth/login` with banner "Your account is scheduled for deletion. Sign in within 30 days to cancel."

**iOS (`apps/ios/CupAndCo/`):**
1. Build `Views/Profile/PrivacyView.swift`
2. Same flow as web; reuse `OTPVerificationView`
3. After delete confirm: clear Keychain, navigate to Auth root

#### Acceptance criteria
- [ ] Delete request → OTP → confirm → user signed out
- [ ] Within 30 days, sign-in shows "Account scheduled for deletion. Cancel?" — accepting cancel restores account
- [ ] After 30 days, all related rows hard-deleted or anonymized per cascade table above
- [ ] Data export delivers zip within 5 minutes for typical user (< 1000 orders)
- [ ] Export URL expires after 7 days (verify with `curl` after expiry)
- [ ] Manual privacy review: no orphaned PII after hard-delete (run `SELECT phone FROM users WHERE id = <deleted-id>` returns 0 rows)
- [ ] iOS in-app delete flow live (App Store rejection blocker resolved)
- [ ] PDPL compliance checklist signed off (see Appendix B)

#### Open questions
- Should grace period be configurable? **Default: hardcoded 30 days.**
- Should we email a "your account was deleted" confirmation? **Default: yes, on hard-delete day.**
- Anonymized order names in admin reports? **Default: show as "Deleted user".**

#### Testing
- Unit: anonymization SQL on a fixture row
- Integration: full flow with test user; verify all cascades
- E2E: web Playwright + iOS XCUITest

#### Rollout
- Stage: 7 days with internal test users
- Production: roll out behind feature flag (initially admin-only) for 14 days; then full
- Compliance: send a PDPL notice email to all users on rollout day

---

## Phase 2 — Multi-Campus Architecture

> **Goal:** Make every transactional table aware of `campus_id` so the product can scale to multiple universities without rewriting the data layer.
> **Estimated effort:** 8-10 days.
> **Dependencies:** Phase 1 complete (so we can measure rollout impact).
> **Outputs:** All tables have `campus_id`; customer can pick/switch campus; admin filters by campus; one Supabase project handles N campuses via RLS.

---

### 2.1 Database schema migration: campus_id everywhere

**Status:** `[~]` (Stage 1 of 2 completed 2026-05-07; Stage 2 queued)
**Estimated effort:** 3 days (Stage 1 actual: 1 day; Stage 2 estimate: 1 day after API adopts campus_id)
**Dependencies:** Phase 1.1 (so migration errors hit Sentry)
**Branch:** `claude/upgrade-p02-campus-schema` (PR #12 pending)

**Staged rollout — design upgrade vs original plan:**
The original spec had a single migration that added campus_id NOT NULL with RLS in one shot. That race-conditions with API deploy: if migration lands first, old API code can't INSERT (no campus_id supplied). If API lands first, columns don't exist yet. Two-stage approach eliminates this:
- **Stage 1 (this PR — `0005_multi_campus.sql`)**: ADDITIVE-ONLY. New tables + columns NULLABLE with backfilled values. Existing API code keeps working without modification.
- **Stage 2 (`0006_multi_campus_enforce.sql`, follow-up PR)**: After API adopts campus_id on every INSERT, ALTER TABLE ... SET NOT NULL on the columns and update RLS policies to filter by current_setting('app.current_campus_id'). At that point old API code stops working — but new API code is already deployed.

**Sub-status:**
- [x] **`campuses` table** — id, slug, name_en, name_ar, timezone, currency, default_language, is_active. Public-read RLS for the campus picker. Seeded with `cairo-main`.
- [x] **`kiosks` table** — replaces singleton `kiosk_status` with per-kiosk state. Each campus has N kiosks with their own building/lat/lng/hours. Migrated existing `kiosk_status` row into the seeded `main` kiosk for `cairo-main`. Public-read RLS.
- [x] **`campus_id` columns added (nullable)** to: users (current_campus_id), products, categories, orders (+kiosk_id), loyalty_points, reviews, offers, prizes, leaderboard_weeks, game_sessions, qr_receipts, push_devices
- [x] **Backfill done** — every existing row tagged with `cairo-main` campus_id; orders also tagged with `main` kiosk_id
- [x] **Indexes** — partial-or-full B-tree indexes on every new campus_id column
- [x] **`kiosk_status_with_campus` view** — combines kiosk + campus for the per-campus admin dashboard (Phase 2.3)
- [x] **TypeScript types** — `Campus`, `Kiosk`, `CampusListResponse`, `CampusKiosksResponse` in `@cup-and-co/types`
- [ ] **Stage 2 — NOT NULL flip + RLS isolation** (separate PR after API adopts campus_id)
- [ ] **Stage 2 — drop `kiosk_status` table** (after API reads from `kiosks` table)
- [ ] **API filtering** — done in 2.2 (customer campus selector) and 2.3 (admin)
- [ ] **JWT claim for current_campus_id** — done in 2.2

**User actions to apply:**
1. `supabase db push` — applies migration to staging first, then prod
2. Verify `select count(*) from campuses;` returns 1
3. Verify `select count(*) from kiosks;` returns 1
4. Verify backfill: `select count(*) from products where campus_id is null;` returns 0
5. (Stage 2 only — after follow-up PR) `supabase db push` again to apply NOT NULL flip + RLS

**Rollback in stage 1**: fully reversible — drop new columns + new tables. The migration's last comment block has the rollback SQL.

**Rollback in stage 2**: destructive (data loss for any row created after stage 2 migration that doesn't have campus_id). By design.

#### Why
Without `campus_id`, every menu, every order, every points balance is implicitly tied to "the campus" — which works only as long as there's exactly one. The moment you onboard campus #2, you'd have to either run a separate Supabase instance per campus (operations nightmare) or do a destructive migration on a live DB (data-loss risk). Doing it now while there's one campus and modest data costs ~3 days; doing it later costs weeks plus downtime.

#### Specification
- Create `campuses` table with `id`, `name`, `name_ar`, `slug`, `timezone`, `currency`, `default_language`, `created_at`
- Create `kiosks` table with `id`, `campus_id`, `name`, `lat`, `lng`, `is_active`
- Add `campus_id` column to: `users`, `orders`, `order_items` (denormalized for analytics), `products`, `categories`, `coupons`, `offers`, `prizes`, `leaderboard_weeks`, `points_history`, `reviews`, `push_tokens`
- Backfill all existing rows with the single existing campus's id
- Update RLS on every table to add `campus_id = current_setting('app.current_campus_id')::uuid` filter
- Add `current_campus_id` to JWT claims (set during sign-in based on user's selected campus)

#### Implementation steps

1. Create migration `supabase/migrations/00XX_campuses_table.sql`:
   ```sql
   CREATE TABLE campuses (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL,
     name_ar text NOT NULL,
     slug text UNIQUE NOT NULL,
     timezone text NOT NULL DEFAULT 'Africa/Cairo',
     currency text NOT NULL DEFAULT 'EGP',
     default_language text NOT NULL DEFAULT 'en' CHECK (default_language IN ('en', 'ar')),
     is_active boolean NOT NULL DEFAULT true,
     created_at timestamptz DEFAULT now()
   );
   INSERT INTO campuses (slug, name, name_ar) VALUES ('cairo-main', 'Cairo Main Campus', 'الحرم الجامعي الرئيسي');

   CREATE TABLE kiosks (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     campus_id uuid NOT NULL REFERENCES campuses(id),
     name text NOT NULL,
     name_ar text NOT NULL,
     building text,
     lat numeric(10,7),
     lng numeric(10,7),
     is_active boolean NOT NULL DEFAULT true,
     created_at timestamptz DEFAULT now()
   );
   CREATE INDEX idx_kiosks_campus ON kiosks(campus_id);
   ```

2. Create migration `00XX_add_campus_id_to_all.sql`:
   - Add `campus_id` column (nullable initially) to each transactional table
   - Backfill: `UPDATE products SET campus_id = (SELECT id FROM campuses LIMIT 1)`; same for each table
   - Set `NOT NULL` after backfill: `ALTER TABLE products ALTER COLUMN campus_id SET NOT NULL`
   - Add foreign key + index on each

3. Create migration `00XX_rls_campus_isolation.sql`:
   - Drop existing RLS policies on each table
   - Recreate with `campus_id = current_setting('app.current_campus_id', true)::uuid` clause
   - Add a "current campus or all campuses (admin)" variant for staff users

4. Update API JWT (`apps/api/src/http/auth.ts` `signSession`):
   ```typescript
   const claims = {
     sub: userId,
     role: userRole,
     campus_id: user.current_campus_id,  // NEW
   };
   ```
5. Add Express middleware that runs `SET LOCAL app.current_campus_id = '...'` on every request after auth
6. Add `campusId` to `apps/api/src/db/*.ts` repository helpers; update every query

#### Acceptance criteria
- [ ] Single existing campus seeded; all data migrated cleanly
- [ ] Every transactional table has `campus_id NOT NULL` with FK and index
- [ ] RLS enforces isolation: a request with campus A's JWT cannot SELECT campus B's products (verify with manual test query)
- [ ] All API responses unchanged from client perspective (transparent migration)
- [ ] All existing tests still pass
- [ ] No N+1 queries introduced (verify with EXPLAIN on top 5 queries)
- [ ] Migration rollback documented in commit message

#### Open questions
- Per-campus pricing? **Default: same price across campuses for v1.5; revisit when 2nd campus onboards.**
- Cross-campus loyalty (points earned at A redeemable at B)? **Default: yes, points are global; orders are scoped.**
- Per-campus admin staff? **Default: yes, staff users get a `campus_id` (or `NULL` for super-admin).**

#### Testing
- Migration: run on a copy of prod data; verify zero data loss
- Unit: RLS policy for each table
- Integration: create test campus B, create products in B, verify campus A user cannot see them
- Performance: top 5 endpoints p95 latency before/after — must not regress > 10%

#### Rollout
- Stage: deploy migration to staging; run smoke tests
- Production: schedule a 30-min maintenance window; back up DB; apply migration; verify; monitor Sentry for 24h
- Rollback plan: keep pre-migration snapshot for 7 days

---

### 2.2 Customer-facing campus selector & onboarding

**Status:** `[~]` (Profile-side campus picker + API endpoints completed 2026-05-07; first-launch onboarding intentionally silent for v1.5 because only one campus exists)
**Estimated effort:** 2 days (actual: 0.5 day for the v1.5 single-campus subset)
**Dependencies:** 2.1 (PR #12)
**Branch:** `claude/upgrade-p02-campus-selector-v2` (PR #13 pending)

**Sub-status:**
- [x] **In-memory `campusRepo.ts`** — mirrors the migration seed; production swap is straightforward
- [x] **API endpoints** — `GET /campuses` (public), `GET /campuses/:id` (returns campus + its kiosks), `GET /me/campus` (authed), `PATCH /me/campus { campus_id }` (authed; validates campus exists/is_active)
- [x] **API client helpers** — `api.listCampuses`, `api.getCampus`, `api.myCampus`, `api.setMyCampus`
- [x] **`/profile/campus` page** — single-campus mode shows the current campus card without a switch affordance; multi-campus mode shows full picker with "Current" indicator. Switching clears cart (since menus are campus-scoped)
- [x] **Profile NavRow** — extended with `href` prop; Campus row added linking to `/profile/campus`
- [x] **i18n** — full EN + AR coverage (5 keys: title, intro, current, switchNotice, noneAvailable)
- [ ] **First-launch onboarding picker** — Deferred until 2nd campus exists. The plan's default ("If only one campus is active, skip the picker silently") makes the onboarding picker pointless for v1.5. When campus #2 is onboarded, the onboarding picker becomes a 1-day add: same `<CampusCard>` component reused.
- [ ] **Distance from CoreLocation / Geolocation API** — Deferred (no need with one campus)
- [ ] **JWT claim for campus_id** — Deferred. Currently `current_campus_id` lives on the user profile; reads via `GET /me/campus`. Stage 2 of the migration (with NOT NULL + RLS) is the right time to add the JWT claim because that's when the API code starts filtering queries by campus.

**User actions:** none — the page activates the moment 2.1's migration is applied AND the API restarts (the in-memory campusRepo seed mirrors the migration seed).

#### Why
Once the schema supports multiple campuses, the customer needs a way to pick which one they're ordering from. Even with one campus today, building this UX now means it Just Works on day one of campus #2.

#### Specification
- During first-launch onboarding (after role pick), show a campus picker: "Where are you ordering from?"
- Default selected campus = nearest by lat/lng (if location permission granted) OR first active campus
- Store choice in `users.current_campus_id`
- Surface in Profile → "Campus: Cairo Main" with "Change" affordance
- If user changes campus mid-session: clear cart (campus B may not have the same products), re-fetch menu, show toast "Switched to <campus>"
- If only one campus is active, skip the picker silently

#### Implementation steps

**Web (`apps/customer-web/`):**
1. Create `app/(auth)/onboarding/campus/page.tsx` after role-pick step
2. Component: `<CampusPicker>` — list of cards with name, building, distance (if available)
3. On select: `PATCH /me { current_campus_id }` → JWT refresh → redirect to home
4. Add `app/(authed)/profile/campus/page.tsx` for changing later
5. Add `useCampus()` hook reading from JWT claims

**iOS (`apps/ios/CupAndCo/`):**
1. Create `Views/Onboarding/CampusPickerView.swift`
2. Inject after `RolePickerView`
3. Use CoreLocation for distance (with permission prompt)
4. Add Profile row to switch later
5. On switch: clear local cart cache (CartStore.clear()), re-fetch menu

**API:**
1. Add `PATCH /me` endpoint to update `current_campus_id`
2. Issue fresh JWT with new `campus_id` claim

#### Acceptance criteria
- [ ] First-time user sees campus picker after role pick (when 2+ campuses exist)
- [ ] Single-campus mode silently picks the only campus (no UX overhead)
- [ ] Profile shows current campus + change CTA
- [ ] Switching campus clears cart and re-fetches menu
- [ ] Distance shown when location permission granted; gracefully omitted otherwise

#### Open questions
- Should anonymous (pre-login) users pick a campus? **Default: yes, default to nearest, persist in localStorage.**
- Should campus pick affect language default? **Default: yes — campus's `default_language` becomes initial value.**

#### Testing
- E2E: create campuses A and B; full onboarding flow for new user; switch in profile; verify cart clears

#### Rollout
- Direct deploy after 2.1; no flag needed (single-campus state is silent)

---

### 2.3 Admin multi-campus support

**Status:** `[ ]`
**Estimated effort:** 2 days
**Dependencies:** 2.1, 2.2
**Branch:** `claude/upgrade-p02-admin-multi-campus`

#### Why
Admin app currently assumes one campus. Once multiple exist, every list (orders, products, offers, KDS) needs a campus filter, and staff users need a campus assignment.

#### Specification
- Add `campus_id` column to `staff_users` (nullable for super-admin)
- Add global campus selector in admin nav (if user is super-admin or assigned to multiple campuses)
- Default selected campus = staff user's primary campus
- Every list query passes `?campus_id=` to API
- Per-campus dashboards: orders today, revenue, active offers
- Cross-campus comparison view (super-admin only)

#### Implementation steps
1. Add `campus_id uuid REFERENCES campuses(id)` to `staff_users` (nullable; NULL = super-admin)
2. Update admin auth middleware to set `current_campus_id` based on staff user's assignment OR query param (super-admin only)
3. Build `<CampusContext>` in `apps/admin/src/contexts/`
4. Add campus selector dropdown in `apps/admin/src/components/AdminNav.tsx`
5. Update every list page (orders, products, offers, kiosks, staff) to filter by campus

#### Acceptance criteria
- [ ] Staff user assigned to campus A sees only campus A's data
- [ ] Super-admin sees campus selector; can switch and see different data
- [ ] Cross-campus comparison view shows orders/revenue per campus side-by-side
- [ ] All admin tests pass with new campus filter

#### Testing
- Integration: staff user A cannot read staff user B's campus data via API
- Manual: full admin walkthrough on each campus

#### Rollout
- Direct deploy; no flag

---

### 2.4 Migration playbook & data backfill audit

**Status:** `[x]` (completed 2026-05-07; PR #14 — landed before 2.3 because 2.3 is bigger and the playbook is independent)
**Estimated effort:** 1 day (actual: 0.3 day)
**Dependencies:** 2.1, 2.2 (2.3 referenced but not blocking)
**Branch:** `claude/upgrade-p02-onboard-playbook`

**What shipped:**
- `docs/runbooks/onboard-new-campus.md` — full step-by-step playbook from pre-flight checklist through smoke test, with rollback paths and a common-gotchas table. Time estimate: 30 min for a clean onboarding from a staged baseline.
- `docs/runbooks/sql/seed-campus.sql` — single-transaction template with named placeholders for slug/timezone/currency/etc. Inserts the campus, then its first kiosk, then verifies with SELECTs the operator can run after.

**Coverage:**
- Pre-flight checklist (database state + missing values)
- 6 steps: campus seed, menu seed (3 options: copy/admin/skip), payment routing, staff assignment, smoke test, announce
- Rollback procedures: soft (`is_active = false`) and hard (full delete with safety check)
- Common gotchas table (5 frequent issues + fixes)
- Forward-looks to Stage 2 of multi-campus migration so the runbook stays correct after `0006_multi_campus_enforce.sql` lands

#### Why
Document the whole multi-campus migration so the next person (or AI) onboarding a 3rd, 4th, Nth campus has a runbook.

#### Specification
- Markdown playbook at `docs/runbooks/onboard-new-campus.md`
- Steps: provision kiosks, seed menu, configure RLS, set timezone, configure payment routing
- SQL templates for the seed
- Smoke-test checklist after onboarding

#### Acceptance criteria
- [ ] Playbook reviewed by non-author; can follow without questions
- [ ] Smoke-test checklist runs in < 30 minutes

---

## Phase 3 — Operational Tools

> **Goal:** Give the kiosk staff and ops team the tools to run the day.
> **Estimated effort:** 10-12 days.
> **Dependencies:** Phase 2 complete (everything is campus-scoped now).
> **Outputs:** Staff KDS for kitchen; menu reflects real stock; customers see realistic prep ETAs; product images load fast and adapt to device.

---

### 3.1 Kitchen Display System (KDS) view in admin

**Status:** `[ ]`
**Estimated effort:** 4 days
**Dependencies:** Phase 2 complete
**Branch:** `claude/upgrade-p03-kds`

#### Why
Currently the admin app surfaces orders in a list optimized for desk review, not a barista juggling 8 espressos. A KDS view turns the same admin app into a kitchen tool — large touch targets, audio alerts, status flow buttons, station filtering. Without it, baristas use paper or another app, and order-status updates lag, breaking the customer-facing tracking experience.

#### Specification
- New admin route: `/kds` (also accessible at `/kds/<station>` for filtered view)
- Tablet-first design (1024×768 portrait or 1366×768 landscape) — touchable, no hover states
- Real-time order list, sorted by created_at ascending (oldest first = highest priority)
- Each order card shows:
  - Order number (large, top-left)
  - Customer pickup code (large, top-right)
  - Items with customizations (size, sugar, ice icons)
  - Time-since-placed counter (turns yellow at 5 min, red at 10 min)
  - Status flow buttons: `Accept → Preparing → Ready` (one tap each, large)
- Audio alert (chime) when new order arrives (configurable per station)
- Mute button + volume slider in header
- Station filter (espresso bar / food / cold drinks) — based on item categories
- Auto-refresh via SSE (already exists in API at `/admin/orders/stream`)
- "All caught up" empty state when no active orders
- Print receipt button (integrate with existing receipt printer if present; otherwise A4 print fallback)
- Auto-archive completed orders after 5 minutes (kept in regular orders list)

#### Implementation steps

**API (`apps/api/`):**
1. Verify `/admin/orders/stream` SSE endpoint emits on every status change (already exists per audit; double-check)
2. Add station-tag derivation: `GET /admin/orders/active?station=espresso` filters by item category
3. Add audit log row on every status change with `staff_user_id`, `from_status`, `to_status`

**Admin (`apps/admin/`):**
1. Create `apps/admin/src/app/kds/page.tsx`
2. Component tree:
   - `<KDSHeader>` — campus dropdown, station filter, mute, "X orders active"
   - `<KDSGrid>` — CSS Grid with auto-fit columns (1-4 cards per row depending on viewport)
   - `<KDSOrderCard>` — large card with all the spec elements
3. SSE consumer: `useEventSource('/admin/orders/stream?campus_id=...')`
4. State management: Zustand store for active orders
5. Audio: `Audio('/sounds/new-order-chime.mp3')`; preload; respect mute setting
6. Style: Tailwind, large fonts (text-2xl minimum), high-contrast, dark-mode-by-default (kitchens have dim/bright lighting)
7. Print: trigger `window.print()` with print-only stylesheet matching receipt template

#### Acceptance criteria
- [ ] New order appears within 2s of customer placing it
- [ ] Status update from KDS reflects in customer app within 2s
- [ ] All buttons easily tappable on a 10" tablet (44px+ touch targets)
- [ ] Chime plays on new order; mute disables it
- [ ] Print produces a usable receipt (manual test on a printer if available; A4 PDF otherwise)
- [ ] Station filter works: switching to "espresso" hides food-only orders
- [ ] Auto-archive removes completed orders from grid after 5 min

#### Open questions
- Receipt printer model? **Default: assume ESC/POS over USB; build the integration in Phase 8 if needed; for v1.5 use browser print.**
- Multiple stations per kiosk? **Default: yes, derived from item categories.**

#### Testing
- Manual: full barista flow on a tablet for 1 hour with simulated orders
- Performance: 50 active orders renders < 100ms

#### Rollout
- Stage: deploy to staging; have a barista test for one shift
- Production: roll out to one campus first; expand after a week

---

### 3.2 Inventory-aware menu

**Status:** `[ ]`
**Estimated effort:** 2 days
**Dependencies:** Phase 2, 3.1 (admin needs the inventory toggle)
**Branch:** `claude/upgrade-p03-inventory`

#### Why
Right now there's no concept of "out of stock". A customer can order an item that's been 86'd, leading to refunds, awkward calls, and brand damage. Adding a stock_quantity (or simpler `out_of_stock` boolean) lets staff toggle items off and lets the customer see grayed-out states with "Back tomorrow at 8am" labels.

#### Specification
- Add columns to `products`:
  - `is_out_of_stock boolean DEFAULT false`
  - `out_of_stock_until timestamptz` (nullable; if set, auto-clears at that time)
- Customer-facing: out-of-stock products show grayed image, "Out of stock" badge, optional ETA, are not addable to cart (button disabled)
- Admin KDS sidebar / Products page: toggle per product with optional "Back at..." time picker
- Real-time push to all clients when toggled (SSE channel: `inventory_changed`)
- Auto-clear: cron every 5 min sets `is_out_of_stock = false WHERE out_of_stock_until < now()`
- Audit log entry on every toggle

#### Implementation steps
1. Migration: add columns to `products`
2. API:
   - `PATCH /admin/products/:id/stock { is_out_of_stock, out_of_stock_until? }`
   - Update `GET /products` to include the flag
   - SSE channel `/inventory/stream?campus_id=...` emitting on toggle
3. Customer web: update `ProductCard.tsx` to gray out + disable add when `is_out_of_stock`
4. iOS: update `ProductCardView.swift` similarly; add SSE consumer for inventory changes
5. Admin: add toggle UI in product list and a quick-toggle in KDS header for fast 86'ing

#### Acceptance criteria
- [ ] Toggling product in admin reflects in customer app within 2s
- [ ] Out-of-stock products cannot be added to cart
- [ ] If item already in cart when toggled, show banner: "Caramel macchiato just sold out — removed from cart"
- [ ] Auto-clear runs and clears expired holds

#### Testing
- Integration: toggle from admin → SSE → client UI updates
- E2E: cart with an item → admin toggles out of stock → customer cart auto-clears that item

#### Rollout
- Direct deploy

---

### 3.3 Real-time prep ETA (with historical median)

**Status:** `[ ]`
**Estimated effort:** 3 days
**Dependencies:** 3.1 (KDS provides the timestamps that train the model)
**Branch:** `claude/upgrade-p03-prep-eta`

#### Why
Today's "prep_time" is a static number on the product. In reality, prep takes longer when the queue is deep and shorter when it's quiet. Showing a real ETA ("ready in ~6 min") instead of "12 min" (the static guess) is a major trust signal.

#### Specification
- Track `accepted_at`, `preparing_at`, `ready_at` timestamps on every order (already partially present)
- Compute per-product median of `ready_at - accepted_at` over trailing 14 days
- Compute current queue depth (orders with status in {accepted, preparing} for this campus)
- ETA formula: `productMedian + (queueDepth * 30s)` (tunable coefficient)
- Show on:
  - Product card: "Usually 6 min"
  - Cart: "Total prep ~8 min"
  - Order tracking: "Ready in ~5 min" (live countdown, refreshed via SSE)
- Bound: floor at 2 min, ceiling at 30 min; if no historical data, fall back to static `prep_time`
- Display: round to nearest minute; show range if uncertainty is high (e.g., "5-8 min")

#### Implementation steps

**Database:**
1. Ensure timestamp columns exist on `orders`: `accepted_at`, `preparing_at`, `ready_at`
2. Create materialized view `prep_time_medians`:
   ```sql
   CREATE MATERIALIZED VIEW prep_time_medians AS
   SELECT
     oi.product_id,
     o.campus_id,
     percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM (o.ready_at - o.accepted_at))) AS median_seconds,
     COUNT(*) AS sample_size
   FROM orders o
   JOIN order_items oi ON oi.order_id = o.id
   WHERE o.ready_at IS NOT NULL
     AND o.accepted_at IS NOT NULL
     AND o.created_at > now() - interval '14 days'
   GROUP BY oi.product_id, o.campus_id;
   CREATE INDEX idx_prep_medians_pc ON prep_time_medians(product_id, campus_id);
   ```
3. Refresh hourly via cron Edge Function

**API:**
1. New endpoint: `GET /products/:id/eta?campus_id=X` → `{ etaSeconds, low, high }`
2. Add ETA to order tracking SSE: `data: {"status":"preparing","etaSeconds":300}`

**Customer web + iOS:**
1. Product card: fetch + cache ETA (5 min TTL); display "Usually X min"
2. Cart: sum ETAs; display "Total prep ~X min"
3. Order tracking: live countdown using `etaSeconds`; tick every 30s; refresh on SSE

#### Acceptance criteria
- [ ] Materialized view refreshes hourly without errors
- [ ] ETA shown on product card matches median in dashboard query
- [ ] Order tracking ETA decreases over time
- [ ] No-data fallback to static `prep_time` works
- [ ] Ranges shown when sample size < 10

#### Testing
- Unit: ETA formula with known inputs
- Integration: seed 100 orders, refresh view, verify median
- E2E: place order, advance through statuses via KDS, verify customer ETA updates

#### Rollout
- Stage: 7 days collecting data; verify medians are sane
- Production: enable display behind flag; monitor support tickets for "ETA wrong" complaints

---

### 3.4 Image CDN with on-the-fly resize

**Status:** `[ ]`
**Estimated effort:** 2 days
**Dependencies:** None (can run parallel)
**Branch:** `claude/upgrade-p03-image-cdn`

#### Why
Right now product PNGs are served full-resolution from Vercel's static asset path. A 1200px hero image is being delivered to a 320px thumbnail slot. This kills LCP on mobile (the audience is mostly phones) and inflates bandwidth costs. A CDN with on-the-fly resize (`?w=400&q=80&fmt=webp`) cuts payloads by 5-10×.

#### Specification
- **Cloudflare Images** as the CDN ($5/month + $1 per 100k images delivered) — chosen over imgix/Bunny for price + Cloudflare ecosystem
- Migrate all current product images to Cloudflare Images (one-time bulk upload)
- New URL pattern: `https://imagedelivery.net/<account_hash>/<image_id>/<variant>` where variant is one of `thumb` (160px), `card` (400px), `hero` (1200px)
- Replace `<Image>` source paths in customer web with helper `cdnImage(id, variant)`
- iOS: same — helper `CDNImage.url(id:variant:)`
- Variants for both EN and AR text overlays (none for now; image-only)
- Cache headers: `Cache-Control: public, max-age=31536000, immutable` (the variant URL changes when the image changes)

#### Implementation steps

1. Create Cloudflare Images account, get `account_hash`, `api_token`
2. Define 3 variants in Cloudflare dashboard: `thumb`, `card`, `hero`
3. Write upload script `scripts/upload-images-to-cdn.ts`:
   - Read all `apps/customer-web/public/images/products/*.png`
   - Upload each to Cloudflare Images
   - Update `products.image_id` (new column) with returned ID
4. Migration: add `image_id text` column to `products`; backfill from script
5. Build `apps/customer-web/src/lib/cdnImage.ts`:
   ```typescript
   export function cdnImage(id: string, variant: 'thumb'|'card'|'hero'): string {
     return `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CF_HASH}/${id}/${variant}`;
   }
   ```
6. Replace every product image reference in web; use `next/image` with `unoptimized` (CF handles it)
7. iOS: `CDNImage` helper; `AsyncImage` already supports remote URLs
8. Update old image paths to redirect to CDN for any cached old links (use Next.js `redirects()`)
9. Decommission `apps/customer-web/public/images/products/` after 30 days of monitoring

#### Acceptance criteria
- [ ] Lighthouse mobile LCP improves by ≥ 30% on home screen
- [ ] Bandwidth from Vercel image origin drops to near-zero (verify in Vercel analytics)
- [ ] All variants serve correctly; thumb is small (~10KB), hero is ~80KB
- [ ] Fallback path works if CDN is down (graceful degradation to placeholder)
- [ ] No broken images on web or iOS
- [ ] Cost monitoring: alert if monthly spend > $20

#### Testing
- E2E: visit every product page; verify image loads from CDN
- Performance: compare LCP before/after on mobile throttled

#### Rollout
- Stage: deploy to staging; full audit
- Production: behind flag; gradually ramp from 10% → 100% over 7 days

---

## Phase 4 — Payments & Notifications

> **Goal:** Reduce checkout abandonment with native payment sheets; bring users back with timely notifications.
> **Estimated effort:** 9-11 days.
> **Dependencies:** Phase 1 complete; user must provide APNs auth key + Apple Pay merchant ID before starting.
> **Outputs:** Apple Pay sheet on iOS + web; Google Pay on web; APNs + Web Push working; granular notification preferences.

---

### 4.1 Apple Pay (iOS native sheet + web)

**Status:** `[ ]`
**Estimated effort:** 3 days
**Dependencies:** APNs key + Apple Developer Apple Pay merchant ID (USER ACTION)
**Branch:** `claude/upgrade-p04-apple-pay`

#### Why
Native Apple Pay sheet is the highest-converting payment UX on iOS. Egyptian iPhone users increasingly use Apple Pay (live in EG since Jan 2024). Without it, every iOS checkout is a 3DS Paymob redirect — measurable drop-off.

#### Specification
- Apple Pay merchant ID: `merchant.com.cupandco.app`
- Domain verification file deployed at `/.well-known/apple-developer-merchantid-domain-association`
- iOS: PassKit `PKPaymentRequest` integrated with checkout flow
- Web: Apple Pay JS API (works in Safari only — fallback to Paymob redirect on other browsers)
- Backend: Paymob "Apple Pay" endpoint accepts the encrypted token from PassKit; routes to gateway
- Fallback: card form for users without Apple Pay enabled (existing Paymob redirect path)

#### Implementation steps

**Apple Developer account (USER ACTION first):**
1. Create Merchant ID at developer.apple.com → Certificates, Identifiers & Profiles
2. Generate Apple Pay Payment Processing Certificate
3. Add `merchant.com.cupandco.app` to iOS app's capabilities
4. Provide certificate + private key to backend (stored in Supabase Vault)

**iOS:**
1. Enable Apple Pay capability in Xcode
2. Add to `apps/ios/CupAndCo/CupAndCo/Services/PaymentService.swift`:
   ```swift
   import PassKit
   class ApplePayHandler: NSObject, PKPaymentAuthorizationControllerDelegate {
     func startPayment(amount: NSDecimalNumber, completion: @escaping (Result<String, Error>) -> Void) {
       let request = PKPaymentRequest()
       request.merchantIdentifier = "merchant.com.cupandco.app"
       request.supportedNetworks = [.visa, .masterCard, .amex]
       request.merchantCapabilities = .capability3DS
       request.countryCode = "EG"
       request.currencyCode = "EGP"
       request.paymentSummaryItems = [PKPaymentSummaryItem(label: "Cup & Co", amount: amount)]
       // present controller, handle delegate callback, POST token to API
     }
   }
   ```
3. Replace "Pay with Card" button on `CheckoutView.swift` with `<PaymentButton style: .black, type: .pay>` when device supports

**Web:**
1. Add Apple Pay JS to `apps/customer-web/src/components/checkout/ApplePayButton.tsx`:
   ```typescript
   if (window.ApplePaySession?.canMakePaymentsWithActiveCard(MERCHANT_ID)) {
     // show button; on click, create ApplePaySession
   }
   ```
2. Deploy domain verification file to `apps/customer-web/public/.well-known/apple-developer-merchantid-domain-association`
3. Verify domain in Apple Developer console

**API (`apps/api/`):**
1. New endpoint: `POST /payments/apple-pay/process`
   - Body: `{ orderId, paymentData: PKPaymentToken }`
   - Decrypt `paymentData` using Paymob's Apple Pay endpoint
   - On success: mark order paid, return success
2. Add Apple Pay merchant cert + key to Supabase Vault; load into Paymob client config

#### Acceptance criteria
- [ ] Apple Pay button appears on iOS for users with cards in Wallet
- [ ] Apple Pay sheet on Safari for users with Apple Pay enabled
- [ ] End-to-end test purchase succeeds in sandbox
- [ ] Fallback to card form on non-Apple Pay browsers/devices
- [ ] Conversion lift measured via PostHog: track `payment_method_selected` and `order_placed` to compute conversion delta

#### Open questions
- Should Apple Pay be the default selected method when available? **Default: yes.**
- Subscription support via Apple Pay? **Default: deferred (subscriptions are a separate v2 feature).**

#### Testing
- Unit: PassKit request construction
- Integration: sandbox payment in TestFlight + Safari
- E2E: full checkout flow; verify points earned correctly

#### Rollout
- Stage: TestFlight + staging Vercel for 7 days with internal users
- Production: roll behind feature flag; ramp 10% → 100% over 14 days

---

### 4.2 Google Pay (web)

**Status:** `[ ]`
**Estimated effort:** 1.5 days
**Dependencies:** 4.1 (similar pattern; reuse Paymob token bridge)
**Branch:** `claude/upgrade-p04-google-pay`

#### Why
Web users on Android (and Chrome on any platform) get a native Google Pay sheet — same conversion benefit as Apple Pay. There's no Android app yet, so this is web-only for v1.5.

#### Specification
- Google Pay JS API integrated on web checkout
- Merchant ID + Gateway: Paymob (or compatible)
- Show button when `PaymentRequest.canMakePayment` is true and Google Pay is supported
- Fallback to card form otherwise

#### Implementation steps
1. Add `pnpm add @google-pay/button-react`
2. Create `apps/customer-web/src/components/checkout/GooglePayButton.tsx`:
   ```tsx
   <GooglePayButton
     environment="PRODUCTION"
     paymentRequest={{
       apiVersion: 2,
       allowedPaymentMethods: [{
         type: 'CARD',
         tokenizationSpecification: { type: 'PAYMENT_GATEWAY', parameters: { gateway: 'paymob', gatewayMerchantId: '...' } },
         parameters: { allowedCardNetworks: ['VISA','MASTERCARD'] }
       }],
       merchantInfo: { merchantId: '...', merchantName: 'Cup & Co' },
       transactionInfo: { totalPriceStatus: 'FINAL', totalPrice: amount, currencyCode: 'EGP' }
     }}
     onLoadPaymentData={async (data) => { /* POST token to API */ }}
   />
   ```
3. New API endpoint: `POST /payments/google-pay/process` (mirrors Apple Pay handler)

#### Acceptance criteria
- [ ] Google Pay button on Chrome with saved card
- [ ] End-to-end sandbox payment succeeds
- [ ] Fallback works when Google Pay not available

#### Testing
- E2E: sandbox payment in Chrome with test card

#### Rollout
- Same as 4.1

---

### 4.3 APNs push notifications (iOS)

**Status:** `[ ]`
**Estimated effort:** 2.5 days
**Dependencies:** APNs auth key from Apple Developer (USER ACTION)
**Branch:** `claude/upgrade-p04-apns-push`

#### Why
"Your latte is ready" is the highest-value message a coffee app sends. Without push, customers stand at the counter staring at their phone for status. With it, they walk up at the right moment.

#### Specification
- APNs HTTP/2 with token-based auth (.p8 key)
- Categories: `order_status`, `promo`, `points`, `streak_reminder`, `leaderboard`
- Each category respects user's `notification_preferences` (per-category opt-in)
- Deep linking: tapping notification opens specific screen (order tracking, offers, etc.)
- Backend: `apn` Node library, lightweight worker pattern (queue → APNs)
- Token registration: `POST /me/push-tokens { token, platform: 'ios' }` after permission grant
- Token cleanup: on `Unregistered` response from APNs, mark token as invalid

#### Implementation steps

**Apple Developer (USER):**
1. Create APNs Auth Key (.p8) at developer.apple.com
2. Note Key ID, Team ID
3. Provide .p8 file to backend (Supabase Vault)

**iOS:**
1. Enable Push Notifications + Background Modes (Remote notifications) in Xcode
2. In `CupAndCoApp.swift`:
   ```swift
   func application(_ app: UIApplication, didFinishLaunchingWithOptions launchOptions: ...) {
     UNUserNotificationCenter.current().delegate = self
     return true
   }
   func application(_ app: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
     let token = deviceToken.map { String(format: "%02x", $0) }.joined()
     APIClient.registerPushToken(token)
   }
   ```
3. Permission flow: ask AFTER first order placed (better grant rate than asking on launch)
4. Notification categories with custom actions:
   ```swift
   let viewOrder = UNNotificationAction(identifier: "VIEW_ORDER", title: "View order", options: .foreground)
   let orderCategory = UNNotificationCategory(identifier: "ORDER_STATUS", actions: [viewOrder], ...)
   ```
5. Handle deep link in `userNotificationCenter(_:didReceive:withCompletionHandler:)` — parse `userInfo.deeplink`, navigate

**API:**
1. `pnpm add apn`
2. Create `apps/api/src/services/pushService.ts`:
   ```typescript
   import apn from 'apn';
   const provider = new apn.Provider({
     token: { key: APNS_P8_KEY, keyId: APNS_KEY_ID, teamId: APNS_TEAM_ID },
     production: process.env.NODE_ENV === 'production'
   });
   export async function sendOrderStatusPush(userId: string, orderId: string, status: string) { ... }
   ```
3. Add `push_tokens` table:
   ```sql
   CREATE TABLE push_tokens (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES users(id),
     campus_id uuid NOT NULL REFERENCES campuses(id),
     platform text NOT NULL CHECK (platform IN ('ios', 'web')),
     token text NOT NULL,
     is_valid boolean NOT NULL DEFAULT true,
     created_at timestamptz DEFAULT now(),
     UNIQUE (token)
   );
   ```
4. Hook into order status changes (in admin KDS handler): after `UPDATE orders SET status = ...`, queue push
5. Use Supabase Realtime or pg_notify for fire-and-forget; or a simple in-process queue with retry

#### Acceptance criteria
- [ ] Permission prompt shown after first order; grant rate measured
- [ ] Push delivered within 5 seconds of status change
- [ ] Tap on push opens correct order screen
- [ ] Invalid tokens auto-cleaned on `Unregistered` response
- [ ] Per-category preferences respected (test by disabling promo, verify no promo pushes)

#### Open questions
- Bundle ID for APNs? **Default: `com.cupandco.ios` (verify in Xcode).**
- Quiet hours? **Default: yes — no promo pushes 9pm-8am Cairo time. Order-status pushes always sent.**

#### Testing
- Unit: token serialization, payload generation
- Integration: send to sandbox APNs; verify receipt
- E2E: place order on phone, advance status from KDS, push arrives within 5s

#### Rollout
- Stage: send to internal team only for 7 days
- Production: roll out gradually; monitor APNs reject rates

---

### 4.4 Web Push notifications (PWA)

**Status:** `[ ]`
**Estimated effort:** 2 days
**Dependencies:** 4.3 (same backend service, different transport)
**Branch:** `claude/upgrade-p04-web-push`

#### Why
Same value as APNs but for web users. Especially relevant for desktop/laptop users who keep the tab open between classes.

#### Specification
- VAPID keys generated; public key in client, private in API
- Service worker registration on first visit
- Permission ask: same UX trigger as iOS (after first order)
- Same category model as iOS
- Push payload includes `tag` for grouping (one notification per order, replaced on update)

#### Implementation steps

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add public key to `apps/customer-web/.env`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
3. Add private key to API env: `VAPID_PRIVATE_KEY`
4. Create `apps/customer-web/public/sw.js` (service worker):
   ```javascript
   self.addEventListener('push', event => {
     const data = event.data.json();
     event.waitUntil(self.registration.showNotification(data.title, {
       body: data.body,
       icon: '/icons/notification-192.png',
       badge: '/icons/badge-96.png',
       tag: data.tag,
       data: { url: data.url },
     }));
   });
   self.addEventListener('notificationclick', event => {
     event.notification.close();
     event.waitUntil(clients.openWindow(event.notification.data.url));
   });
   ```
5. Register in `app/layout.tsx`:
   ```typescript
   if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
   ```
6. Subscribe button (only after order placed):
   ```typescript
   const reg = await navigator.serviceWorker.ready;
   const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUB });
   await fetch('/me/push-tokens', { method: 'POST', body: JSON.stringify({ token: JSON.stringify(sub), platform: 'web' }) });
   ```
7. API: extend `pushService.ts` to handle web (use `web-push` npm lib alongside `apn`)

#### Acceptance criteria
- [ ] Permission prompt only after order placed
- [ ] Service worker registers without errors
- [ ] Push delivered within 5s on Chrome/Edge/Firefox
- [ ] Safari supported (iOS 16.4+ for web push on iOS Safari)
- [ ] Notifications grouped correctly via `tag`
- [ ] Tap opens correct URL

#### Testing
- Manual: subscribe on Chrome, place order, advance status from KDS, observe notification
- Cross-browser: Chrome, Firefox, Safari, Edge

#### Rollout
- Same as APNs

---

### 4.5 Notification preferences UI (both platforms)

**Status:** `[ ]`
**Estimated effort:** 1 day
**Dependencies:** 4.3, 4.4
**Branch:** `claude/upgrade-p04-notif-prefs`

#### Why
Pushes without preferences = unsubscribe rate of 30%+. Granular per-category control ("yes for orders, no for promos") keeps people opted in.

#### Specification
- Profile → Notifications page
- Per-category toggles: Order Status, Promotions, Points & Rewards, Streak Reminders, Leaderboard
- Stored in `users.notification_preferences jsonb`
- Backend respects preferences before sending
- Quiet hours toggle: 9pm-8am Cairo time (disabled by default; user can enable)

#### Implementation steps
1. Migration: add `notification_preferences jsonb DEFAULT '{"order_status":true,"promo":true,"points":true,"streak":true,"leaderboard":true,"quiet_hours":false}'` to `users`
2. API: `GET /me/notifications`, `PATCH /me/notifications`
3. Web: `app/(authed)/profile/notifications/page.tsx` (replaces dead row)
4. iOS: `Views/Profile/NotificationPreferencesView.swift`
5. Update `pushService` to check preferences before send

#### Acceptance criteria
- [ ] Toggling off "Promotions" stops promo pushes immediately (verify)
- [ ] Order status pushes always sent regardless of toggles (transactional)
- [ ] Quiet hours respected for non-transactional categories

#### Testing
- Manual: toggle each, send each category, verify

---

## Phase 5 — Experimentation Platform

> **Goal:** Stand up A/B testing so future features (loyalty, copy, hero treatments) can be measured against control.
> **Estimated effort:** 5-6 days.
> **Dependencies:** Phase 1.2 (PostHog provides metric layer).
> **Outputs:** GrowthBook self-hosted; SDK on all 3 platforms; first sample experiment running.

---

### 5.1 GrowthBook self-hosted on Supabase Postgres

**Status:** `[ ]`
**Estimated effort:** 5 days
**Dependencies:** Phase 1.2
**Branch:** `claude/upgrade-p05-growthbook`

#### Why
GrowthBook is the OSS A/B testing platform of choice — pairs with PostHog (metrics) cleanly, has SDKs for every platform, and self-hosts cheaply on existing infra. Without it, every feature change is "ship and pray" instead of "measure and improve".

#### Specification
- GrowthBook server deployed on Render/Railway (small instance, ~$7/mo)
- Connected to a separate Supabase database (or schema)
- Metrics datasource = PostHog (warehouse mode)
- Three SDK integrations: web (`@growthbook/growthbook-react`), iOS (`GrowthBook-IOS`), API (`@growthbook/growthbook`)
- SSR-safe variant assignment (cookies for web, JWT claim for API, persisted preference for iOS)
- First experiment to validate end-to-end: "Hero promo card copy A vs B" — measure `add_to_cart` rate

#### Implementation steps

1. Provision GrowthBook server (follow GrowthBook self-hosted Docker docs)
2. Configure GROWTHBOOK_DATABASE_URL → Supabase Postgres
3. Connect PostHog as metrics source in GrowthBook UI
4. Define metrics: `add_to_cart_rate`, `order_placed_rate`, `aov`, `points_earned_avg`, `7d_retention`
5. Create first experiment in GrowthBook dashboard
6. Install SDKs:
   - Web: `pnpm add @growthbook/growthbook-react`
   - iOS: SPM `https://github.com/growthbook/growthbook-swift`
   - API: `pnpm add @growthbook/growthbook`
7. Initialize each SDK with API key + user attributes (`user_id`, `role`, `campus_id`, `tier`, `days_since_signup`)
8. Variant pattern:
   ```typescript
   const showNewHero = useFeatureIsOn('new-hero-card');
   return showNewHero ? <NewHero/> : <ClassicHero/>;
   ```
9. Document the experiment lifecycle in `docs/runbooks/run-experiment.md`

#### Acceptance criteria
- [ ] GrowthBook UI accessible at internal URL
- [ ] First experiment running with traffic split 50/50
- [ ] PostHog metrics flowing into GrowthBook
- [ ] Variant assignment is sticky per user across sessions
- [ ] Statistical significance computation works (verify with seeded data)

#### Open questions
- Self-host vs cloud? **Default: self-host (no per-seat fee).**
- LaunchDarkly later? **Default: no, GrowthBook fits the budget.**

#### Testing
- Manual: assign 100 test users to variants; verify split
- Integration: SDK assignment matches across platforms for same user

#### Rollout
- Stage: ship with one experiment running; monitor for 14 days
- Production: enable for all production traffic

---

## Phase 6 — Retention Engagement

> **Goal:** Build the loops that bring users back daily/weekly.
> **Estimated effort:** 10-12 days.
> **Dependencies:** Phases 1-5 complete.
> **Outputs:** Order favorites with one-tap reorder, daily streaks, three-tier loyalty system, smart contextual order suggestions.

---

### 6.1 Order favorites + one-tap reorder

**Status:** `[ ]`
**Estimated effort:** 2 days
**Dependencies:** Phase 2 (campus scoping)
**Branch:** `claude/upgrade-p06-favorites`

#### Why
Coffee is a daily habit. Once a student finds their order, they want to reorder it without re-walking the customizer every morning. The "Usual" tab is already in nav but currently underbuilt — turn it into a real retention engine.

#### Specification
- Users can star any past order ("Save as favorite") OR build favorites from scratch in a new flow
- Each favorite has: name (default = "Iced caramel macchiato w/ less sugar"; user can rename), products + customizations, optional default time of day
- "Usual" tab redesigned:
  - Hero: most-ordered (auto-detected, top 1)
  - List: starred favorites
  - Each card has 1-tap "Reorder now" button → adds to cart, jumps to checkout
  - Long-press / swipe: edit, delete, set as default
- Default favorite gets `app_opened` morning push: "Your usual? Tap to reorder."

#### Implementation steps

1. Migration: add `favorites` table:
   ```sql
   CREATE TABLE favorites (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES users(id),
     campus_id uuid NOT NULL REFERENCES campuses(id),
     name text NOT NULL,
     items jsonb NOT NULL, -- [{ product_id, customizations, qty }]
     time_of_day text, -- 'morning' | 'midday' | 'evening' | null
     is_default boolean DEFAULT false,
     created_at timestamptz DEFAULT now()
   );
   ```
2. API endpoints:
   - `GET /me/favorites`
   - `POST /me/favorites` (create from order or scratch)
   - `PATCH /me/favorites/:id`
   - `DELETE /me/favorites/:id`
   - `POST /me/favorites/:id/reorder` → returns cart payload
3. Web: build out `app/(authed)/usual/page.tsx`
4. iOS: build out `Views/Usual/UsualView.swift`
5. Hook morning push into Phase 4 push categories

#### Acceptance criteria
- [ ] Star button on past order saves to favorites
- [ ] Reorder loads cart with all items + customizations preserved
- [ ] Out-of-stock products in favorite show as "currently unavailable" but rest reorders
- [ ] Default favorite respected in morning push (if push enabled)

#### Testing
- E2E: star order → reorder → verify cart matches

---

### 6.2 Streaks

**Status:** `[ ]`
**Estimated effort:** 2 days
**Dependencies:** 6.1 (related retention surface)
**Branch:** `claude/upgrade-p06-streaks`

#### Why
Daily ritual + loss-aversion. "You've ordered 7 days in a row" is intrinsically motivating. Adds a daily-active driver that costs almost nothing to build.

#### Specification
- Streak = consecutive days with at least one paid order (delivery or pickup)
- One free skip per calendar week ("frozen streak") — won't break if missed
- Display: home screen widget showing current streak + flame icon
- Bonus: every 7 days = +50 pts (visible as "Day 7 bonus" celebration)
- Push reminder: at 7pm if no order today AND streak ≥ 3 ("Your 5-day streak is at risk!")
- Profile page: streak history graph (last 30 days)

#### Implementation steps

1. Migration: add `streaks` table:
   ```sql
   CREATE TABLE streaks (
     user_id uuid PRIMARY KEY REFERENCES users(id),
     current_streak int NOT NULL DEFAULT 0,
     longest_streak int NOT NULL DEFAULT 0,
     last_order_date date,
     freezes_used_this_week int NOT NULL DEFAULT 0,
     freezes_reset_at timestamptz NOT NULL DEFAULT date_trunc('week', now())
   );
   ```
2. Trigger / cron: on `order_placed` event with `paid=true`, update streak (increment if new day, hold if same day, freeze-or-break if gap)
3. Daily cron at midnight Cairo time: check users whose `last_order_date < today - 1 day - freezes`; if no freezes available, set `current_streak = 0`
4. API: `GET /me/streak`
5. Web + iOS: home widget + profile page
6. Push: 7pm trigger via Phase 4 push service

#### Acceptance criteria
- [ ] Order on day 1, day 2 → streak = 2
- [ ] Skip day 3 with freeze available → streak still 2 (now 3 next day)
- [ ] Skip day 3 with no freezes → streak resets to 0
- [ ] Day-7 bonus credits 50 pts and shows celebration
- [ ] Reminder push fires at 7pm if streak at risk

#### Testing
- Unit: streak calculation logic with various scenarios
- Integration: simulate orders across days; verify state

---

### 6.3 Tiered loyalty (Bronze / Silver / Gold)

**Status:** `[ ]`
**Estimated effort:** 3 days
**Dependencies:** 6.1, 6.2 (visual surface for tier badge)
**Branch:** `claude/upgrade-p06-tiered-loyalty`

#### Why
Tiers add aspiration, predict spend (Gold customers spend 3-5× Bronze on average in coffee chains), and create a clear progression visualization. Aligns with how customers already think about loyalty programs.

#### Specification
- Three tiers based on trailing-12-month points earned:
  - **Bronze:** 0-499 pts/yr (default)
  - **Silver:** 500-1999 pts/yr
  - **Gold:** 2000+ pts/yr
- Tier benefits:
  - Bronze: standard
  - Silver: 1.25× points multiplier; free upsize 1×/month; birthday drink free
  - Gold: 1.5× points multiplier; free upsize 4×/month; birthday drink free; priority queue badge in KDS
- Tier-up celebration: full-screen animation + confetti + push
- Tier badge on profile, leaderboard, and order cards in KDS
- Annual rolling reset (look at last 365 days continuously, not calendar year)

#### Implementation steps

1. Migration:
   ```sql
   CREATE TABLE tier_history (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES users(id),
     from_tier text,
     to_tier text NOT NULL,
     trailing_12m_points int NOT NULL,
     changed_at timestamptz DEFAULT now()
   );
   ALTER TABLE users ADD COLUMN current_tier text NOT NULL DEFAULT 'bronze';
   ALTER TABLE users ADD COLUMN tier_calculated_at timestamptz;
   ```
2. Tier calculation function (PL/pgSQL, runs nightly per user):
   ```sql
   CREATE FUNCTION recalculate_user_tier(uid uuid) RETURNS void AS $$ ... $$;
   ```
3. Edge Function cron: nightly run for all active users
4. On tier change: insert into `tier_history`, update `users.current_tier`, fire push, fire `tier_changed` analytics event
5. Apply multiplier in points calculation: `apps/api/src/services/loyaltyEngine.ts`
6. Apply benefits at checkout: free upsize, birthday drink, etc.
7. UI:
   - Tier badge component (Bronze/Silver/Gold + colored ring)
   - Profile: progress bar to next tier ("180 pts to Gold")
   - Tier-up overlay with confetti animation

#### Acceptance criteria
- [ ] Tier auto-promotes when threshold crossed
- [ ] Tier auto-demotes if trailing-12m drops below threshold
- [ ] Multiplier correctly applied to points
- [ ] Birthday drink redeemable (verify date check)
- [ ] Free upsize benefit deducts from monthly count

#### Open questions
- Pause demotion for one cycle ("grace period")? **Default: yes, demote takes 2 consecutive sub-threshold months.**
- Tier-specific colors? **Default: bronze=#CD7F32, silver=#C0C0C0, gold=#FFD700 (subtle metallic gradients).**

#### Testing
- Unit: tier calculation with various trailing-12m values
- Integration: simulate spend pattern, verify tier transitions
- E2E: birthday drink redemption

---

### 6.4 Time-of-day + seasonal order suggestions

**Status:** `[ ]`
**Estimated effort:** 3 days
**Dependencies:** Phase 1.2 (PostHog data needed for personalization), 6.1 (suggest favorites)
**Branch:** `claude/upgrade-p06-smart-suggestions`

#### Why
"Your usual afternoon iced latte?" is the most underrated UX moment. Cuts friction to zero, increases AOV, and feels personal. Egyptian campus context: HOT summers (Apr-Oct) → iced drinks; mild winters (Nov-Mar) → hot drinks.

#### Specification
- Suggestion card on home screen, just below greeting, contextual to:
  - **Time of day:** morning (6-11am) / midday (11am-3pm) / evening (3pm-9pm)
  - **Season:** summer (Apr-Oct in Cairo, avg > 25°C) / winter (Nov-Mar)
  - **Weather:** optional integration with OpenWeather API for "extra hot today" boost on iced
  - **History:** what user has ordered before in this slot
- Algorithm:
  1. Look up user's most-ordered product in current time-of-day bucket over last 30 days
  2. If iced/hot variant exists, prefer the seasonal one
  3. If no history, suggest the campus's bestseller for this slot
- Tap → adds to cart in 1 tap
- Dismiss → hides for 4 hours
- A/B test the algorithm vs no suggestion (Phase 5 first)

#### Implementation steps

1. Edge Function `suggestion-engine`: nightly job that pre-computes per-user, per-time-bucket suggestions; cache in `user_suggestions` table
2. Migration:
   ```sql
   CREATE TABLE user_suggestions (
     user_id uuid REFERENCES users(id),
     time_bucket text NOT NULL CHECK (time_bucket IN ('morning','midday','evening')),
     season text NOT NULL CHECK (season IN ('summer','winter')),
     suggested_product_id uuid REFERENCES products(id),
     reason text, -- 'history' | 'bestseller' | 'weather'
     computed_at timestamptz DEFAULT now(),
     PRIMARY KEY (user_id, time_bucket, season)
   );
   ```
3. API: `GET /me/suggestion?bucket=morning&season=summer` returns the cached row
4. Optional: integrate OpenWeather API (`api.openweathermap.org`) for current Cairo temp; if > 32°C, weight iced higher
5. UI: suggestion card on home screen with hero image + "Add" button + "Hide" affordance

#### Acceptance criteria
- [ ] User who ordered iced latte 5 mornings in a row sees iced latte morning suggestion
- [ ] First-time user sees campus bestseller for the bucket
- [ ] Hide persists for 4 hours
- [ ] Seasonal switch happens automatically (test by mocking date)
- [ ] A/B test result available in GrowthBook after 14 days

#### Testing
- Unit: bucket calculation by hour
- Integration: seed orders for a user; verify suggestion matches

---

## Phase 7 — Growth & Acquisition

> **Goal:** Make Cup & Co easy to invite friends to and effortless to start using from a kiosk.
> **Estimated effort:** 8-10 days.
> **Dependencies:** Phases 1-4 complete (Apple Pay required for App Clips).
> **Outputs:** Referrals system; App Clips on every kiosk QR; universal link routing.

---

### 7.1 Referrals system

**Status:** `[ ]`
**Estimated effort:** 3 days
**Dependencies:** Phase 1.2 (track conversions), Phase 4 (push to celebrate)
**Branch:** `claude/upgrade-p07-referrals`

#### Why
Campuses are dense social graphs — referrals are explosively viral when the reward is right. "Free coffee" is concrete, valuable, and immediately actionable.

#### Specification
- Each user gets a referral code on signup (`KARIM50`, format: first 5 chars of name + random digits)
- Sharing UX: "Invite friends, both get free coffee"
- Reward structure (default):
  - Referrer: +50 pts when referee places first paid order
  - Referee: +30 pts on first paid order (basically a starter discount)
- Anti-fraud:
  - Same device fingerprint = no reward
  - Referrer must be Bronze+ for ≥ 7 days (no fresh-account farming)
  - Referee's first order ≥ 30 EGP (can't redeem the bonus on a 5 EGP item)
- Tracking: every share → unique deep link with `?ref=KARIM50`
- Conversion attribution: 30-day window from first link click
- Leaderboard: "Top referrers this month" + monthly prize for #1

#### Implementation steps

1. Migration:
   ```sql
   ALTER TABLE users ADD COLUMN referral_code text UNIQUE;
   CREATE TABLE referrals (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     referrer_id uuid NOT NULL REFERENCES users(id),
     referee_id uuid REFERENCES users(id), -- null until signup
     code text NOT NULL,
     status text NOT NULL DEFAULT 'pending', -- pending | signed_up | converted | rejected
     ref_clicked_at timestamptz,
     signed_up_at timestamptz,
     converted_at timestamptz,
     reason_rejected text,
     campus_id uuid REFERENCES campuses(id)
   );
   CREATE INDEX idx_referrals_code ON referrals(code);
   CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
   ```
2. Backfill referral codes for existing users (random 5-char + 2-digit)
3. API endpoints:
   - `GET /me/referrals` — list outbound + inbound
   - `GET /me/referrals/stats` — count, total points earned
   - `POST /referrals/track-click { code }` (called from landing page)
   - Hook into signup: if `?ref=` in localStorage, link to referral
   - Hook into first paid order: trigger conversion + reward
4. Share UI:
   - Web: native share API with fallback to copy
   - iOS: `UIActivityViewController` with WhatsApp pre-formatted text in Arabic + English
5. Landing page: `/r/[code]` shows app store/web app prompt + auto-applies code on signup
6. Push on conversion: "Sara just used your referral! +50 pts"
7. Leaderboard widget on rewards page

#### Acceptance criteria
- [ ] Every user has a referral code
- [ ] Sharing produces a working deep link
- [ ] Click → signup → first paid order chain attributes correctly
- [ ] Anti-fraud: same device prevented
- [ ] Both parties receive points
- [ ] Push fires on conversion

#### Open questions
- Allow user to customize their code? **Default: no (collision risk + abuse).**
- Referral expiry? **Default: 30 days from click; signup window 14 days.**

#### Testing
- E2E: open referral link in incognito, sign up, place order, verify both parties credited
- Anti-fraud: same device → reward denied with reason logged

---

### 7.2 App Clips + universal QR codes

**Status:** `[ ]`
**Estimated effort:** 5 days
**Dependencies:** 4.1 (Apple Pay required by App Clips), Phase 2 (campus + kiosk model)
**Branch:** `claude/upgrade-p07-app-clips`

#### Why
The killer feature for a kiosk-based coffee app. Print a QR on every kiosk countertop. Customer scans → instant ordering UI appears with no install → picks drink → pays with Apple Pay → walks away. 0 friction. Competitors won't build this. Adoption advantage compounds quickly.

#### Specification
- App Clip target in Xcode (`apps/ios/CupAndCo/CupAndCoClip/`)
- Bundle ID: `com.cupandco.ios.Clip`
- Max binary size: 10MB (use full experience)
- Streamlined flow inside the clip:
  1. Tap → opens to product list for the specific kiosk (encoded in QR URL)
  2. Pick item, customize
  3. Apple Pay sheet (only payment available in App Clip)
  4. Order confirmation + pickup code
  5. Optional "Get the full app" CTA at end
- App Clip Card metadata: `Cup & Co — Order Now`, hero image, action button
- Universal link domain: `cupandco.app` with AASA file at `/.well-known/apple-app-site-association`
- QR codes generated per-kiosk encoding `https://cupandco.app/kiosk/<kiosk_id>`
- Smart App Banner on web at same URL for non-iOS users (deep links to web app)
- Anonymous order: clip can place an order without account; phone number captured for SMS pickup notification

#### Implementation steps

**Apple Developer:**
1. Configure App Clip in App Store Connect
2. Configure App Clip Card (image, title, action button text)
3. Add Associated Domains capability with `appclips:cupandco.app`

**iOS Xcode:**
1. Add new target: `App Clip` (template)
2. Share core code via Swift Package: extract `Network`, `Models`, `Design` packages
3. App Clip-specific code:
   - `ClipApp.swift` — entrypoint
   - `KioskOrderFlow.swift` — streamlined product list → cart → ApplePay
4. Enforce 10MB binary: use only Apple Pay (no card form), minimal images, no video
5. Handle invocation URL:
   ```swift
   .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
     guard let url = activity.webpageURL else { return }
     // parse /kiosk/<id>, load that kiosk's menu
   }
   ```

**Backend:**
1. Add anonymous order support: `POST /clip/orders` accepts phone number (no account needed)
2. SMS pickup notification: integrate with Twilio / Vonage for SMS to anonymous orderers
3. Store anonymous orders in `users` table with `is_anonymous=true` (or separate `anonymous_orders` table)

**Web:**
1. Deploy AASA file at `apps/customer-web/public/.well-known/apple-app-site-association`:
   ```json
   {
     "applinks": {
       "details": [
         {"appIDs": ["TEAM.com.cupandco.ios", "TEAM.com.cupandco.ios.Clip"], "components": [{"/": "/kiosk/*"}]}
       ]
     },
     "appclips": {
       "apps": ["TEAM.com.cupandco.ios.Clip"]
     }
   }
   ```
2. Build `/kiosk/[kiosk_id]/page.tsx` for non-iOS users (web ordering at the kiosk)

**QR generation:**
1. Script `scripts/generate-kiosk-qrs.ts` reads all kiosks from DB, generates branded QR codes
2. Output: high-res PDF per kiosk for printing

#### Acceptance criteria
- [ ] App Clip < 10MB
- [ ] Scan QR on iPhone → App Clip opens to that kiosk's menu within 3s
- [ ] Apple Pay completes order
- [ ] SMS sent to anonymous orderer with pickup code
- [ ] Non-iOS scan → web kiosk page works
- [ ] App Clip Card preview matches design

#### Open questions
- Allow account-linked orders in App Clip? **Default: yes — if user is signed in to full app, clip detects and uses account; otherwise anonymous.**
- Loyalty points for clip orders? **Default: only if signed-in (anonymous orders earn nothing).**
- Receipt printing for anonymous orders? **Default: print on KDS; no app delivery.**

#### Testing
- TestFlight: scan QR with internal device; verify clip flow
- Cost: print 5 sample QR codes, test in real kiosk environment

#### Rollout
- Stage: internal testing for 14 days
- Production: print QRs for 1 kiosk first; measure conversion vs full-app installs; expand if positive

---

## Phase 8 — Resilience & Polish

> **Goal:** Make the app feel solid offline, work in the dark, and look like you remember how it should.
> **Estimated effort:** 7-9 days.
> **Dependencies:** Phases 1-7 mostly complete (this is a maturation phase).
> **Outputs:** Menu cached for offline browsing; full dark-mode support; refreshed avatar set.

---

### 8.1 Offline-first menu cache

**Status:** `[ ]`
**Estimated effort:** 3 days
**Dependencies:** Phase 3.4 (CDN images for offline caching)
**Branch:** `claude/upgrade-p08-offline-cache`

#### Why
Campus wifi is flaky. Cellular dead zones inside lecture halls. Today, opening the app on a flaky connection → blank screen. With offline-first menu, users browse and customize even without connection; order submission queues when online.

#### Specification
- **In scope:** Menu read cache (products, categories, prices, customizations)
- **Out of scope (v1.5):** Offline order placement (conflict resolution complexity)
- Cache strategy:
  - Web: PWA with workbox; menu cached in IndexedDB; refresh on every successful API call
  - iOS: SwiftData (or CoreData) local store; same refresh strategy
- Display "last updated" indicator when offline
- Disable add-to-cart with toast when offline; re-enable on reconnect
- Reconnect detection: ping a known endpoint every 30s when online indicator says offline

#### Implementation steps

**Web (PWA):**
1. Add Workbox to Next.js: `pnpm add next-pwa`
2. Configure `next.config.mjs`:
   ```js
   const withPWA = require('next-pwa')({ dest: 'public', register: true, skipWaiting: true });
   module.exports = withPWA({ ... });
   ```
3. Cache strategy in `apps/customer-web/src/lib/swCache.ts`:
   - `/api/products` → CacheFirst, TTL 1 hour
   - `/api/categories` → CacheFirst, TTL 1 hour
   - Product images (CDN) → CacheFirst, TTL 1 day
4. Online indicator: `useNetworkStatus` hook + banner component

**iOS:**
1. Add SwiftData model `CachedProduct`, `CachedCategory`
2. On every successful fetch, write to SwiftData
3. On fetch failure, read from SwiftData
4. Network monitor: `NWPathMonitor` for connectivity status
5. Banner: `OfflineBanner.swift`

#### Acceptance criteria
- [ ] Web: turn off network, browse menu — works
- [ ] iOS: airplane mode, browse menu — works
- [ ] Add to cart disabled with clear messaging when offline
- [ ] Reconnect: order placement re-enabled within 5s
- [ ] No stale data older than 1 hour shown without staleness warning

#### Testing
- Manual: airplane mode test on iOS; Network throttle on web

---

### 8.2 Dark mode

**Status:** `[ ]`
**Estimated effort:** 2.5 days
**Dependencies:** None (can run parallel)
**Branch:** `claude/upgrade-p08-dark-mode`

#### Why
Table stakes for modern apps. Coffee app at 7am is bright on a tired phone screen. Plus the existing palette (terracotta + teal) translates beautifully into a dark mode with subtle warmth.

#### Specification
- System-preference-driven by default
- Manual override in Profile → Appearance: System / Light / Dark
- Respects iOS Dynamic Type settings
- Semantic color tokens (instead of raw hex) so themes can swap cleanly
- Logo and illustration variants for dark backgrounds
- Game (SpriteKit) gets dark-mode background variant

#### Implementation steps

1. Refactor `packages/design-tokens/src/index.ts` to expose semantic tokens:
   ```typescript
   export const semanticLight = {
     surface: colors.paperBackground,
     surfaceRaised: colors.surface,
     textPrimary: colors.espresso,
     textMuted: colors.mutedText,
     // ...
   };
   export const semanticDark = {
     surface: '#1A1715',
     surfaceRaised: '#252220',
     textPrimary: '#F5F0E8',
     textMuted: '#A8A29E',
     // ...
   };
   ```
2. Update Tailwind config to use CSS vars + dark variants:
   ```js
   colors: { surface: 'var(--color-surface)' }
   ```
3. Add CSS vars in `globals.css` with `@media (prefers-color-scheme: dark)` and `[data-theme=dark]`
4. iOS: swap `.preferredColorScheme(.light)` → respect environment; build dark variants of every Asset catalog color
5. Logo: add white variant for dark mode in `public/brand/logo-dark.svg` and `Assets.xcassets/Logo Dark`
6. Profile setting: `app/(authed)/profile/appearance/page.tsx` + iOS equivalent
7. Manually QA every screen on both modes

#### Acceptance criteria
- [ ] System dark mode preference picked up automatically
- [ ] Manual override works
- [ ] No contrast issues (WCAG AA verified)
- [ ] All hardcoded colors replaced with semantic tokens
- [ ] No "black hole" empty states (illustrations have dark variants)
- [ ] Game adapts background

#### Testing
- Visual: every screen, both modes
- Accessibility: contrast checker on every screen

---

### 8.3 Avatar refresh

**Status:** `[ ]`
**Estimated effort:** 1.5 days (mostly design work; coding is small)
**Dependencies:** Brand kit refresh
**Branch:** `claude/upgrade-p08-avatars`

#### Why
Current avatars (per audit) are stock-feeling. With the rest of the brand maturing (real product photos, dark mode), avatars are the last placeholder visible to every user.

#### Specification
- New set: 12 illustrated avatars + neutral fallbacks
- Style: matches brand illustration direction (TBD — depends on brand-kit decision)
- Inclusive: skin tones, headwear options, accessories (glasses, beanies)
- All in single SVG sprite for fast loading
- iOS: ship as Asset Catalog variants
- Custom upload: deferred to v2 (privacy/moderation overhead)

#### Implementation steps
1. Brief brand-kit skill or design pass for 12 avatars
2. Export SVG sprite + iOS variants
3. Update `apps/customer-web/public/avatars/` and `Assets.xcassets/Avatars/`
4. Avatar picker UI: grid of 12 in profile settings
5. Migration: keep existing user avatar IDs; map old IDs to new (or set sensible defaults)

#### Acceptance criteria
- [ ] All 12 avatars render at target sizes (40px, 96px, 200px)
- [ ] Dark mode variants exist
- [ ] Picker UI works on web + iOS
- [ ] Existing users seamlessly migrated (no broken avatar references)

---

## Phase 9 — Voice & Shortcuts

> **Goal:** Make ordering a one-phrase Siri shortcut.
> **Estimated effort:** 3-4 days.
> **Dependencies:** 6.1 (favorites give the "usual" to order).
> **Outputs:** Siri shortcuts for "Order my usual", "Show my points", "Where's my order".

---

### 9.1 Siri shortcuts + voice ordering

**Status:** `[ ]`
**Estimated effort:** 3 days
**Dependencies:** 6.1 (favorites)
**Branch:** `claude/upgrade-p09-siri-shortcuts`

#### Why
"Hey Siri, order my usual" while walking to class is the platonic ideal of a coffee app. iOS Shortcuts integration is a 3-day task that compounds value. Apple promotes Shortcuts-enabled apps in their UX showcases — also good marketing.

#### Specification
- 3 intents:
  1. **Order Usual** — places order for default favorite (must be signed in)
  2. **Check Points** — speaks current points balance
  3. **Track Order** — opens latest active order
- "Hey Siri" voice activation (after user adds shortcut)
- Confirmation flow for Order Usual: "Place your order for iced caramel macchiato? Tap to confirm" (security against accidental orders)
- Donate intents proactively after relevant actions (e.g., after first order: "Would you like to add 'Order my usual' to Siri?")

#### Implementation steps

**iOS:**
1. Add Intents Extension target in Xcode
2. Create `OrderUsualIntent.swift` conforming to `AppIntent` (iOS 16+):
   ```swift
   struct OrderUsualIntent: AppIntent {
     static var title: LocalizedStringResource = "Order My Usual"
     func perform() async throws -> some IntentResult & ProvidesDialog {
       guard let favorite = try await FavoritesAPI.getDefault() else {
         return .result(dialog: "You haven't set a default favorite yet. Open Cup & Co to set one.")
       }
       // confirmation flow
       // call API to place order
       return .result(dialog: "Order placed. Pickup code: \(code).")
     }
   }
   ```
3. Donate after each order:
   ```swift
   IntentDonationManager.shared.donate(intent: OrderUsualIntent())
   ```
4. Localize intent phrases for English and Arabic

#### Acceptance criteria
- [ ] Shortcut appears in iOS Shortcuts app
- [ ] "Hey Siri, order my usual" works on locked phone
- [ ] Confirmation flow prevents accidental orders
- [ ] Arabic voice command works
- [ ] Donation prompt after first order

#### Open questions
- Charge silently or always ask? **Default: always ask, no silent charges.**
- Apple Watch complication for points? **Deferred to v2.**

#### Testing
- Manual: Siri test in English and Arabic
- Manual: lock screen test

---

## Phase 10 — Admin App Review Pass

> **Goal:** Same 7-area review (functionality, security, UI, responsiveness, performance, accessibility, images) applied to admin app — now including all new admin surfaces from Phases 2-7 (multi-campus, KDS, inventory, coupons CRUD if added, referrals reporting, etc.).
> **Estimated effort:** 5-7 days.
> **Dependencies:** Phases 2-7 complete (so the new admin surfaces exist to review).
> **Outputs:** Admin parity with v1.5 customer app; security hardening; UI polish.

---

### 10.1 Admin app comprehensive review

**Status:** `[ ]`
**Estimated effort:** 5-7 days
**Dependencies:** Phases 2-7 complete
**Branch:** `claude/upgrade-p10-admin-review`

#### Why
Admin app has been a second-class citizen during the customer-facing v1.5 build. Time to give it the same depth of review the customer app got in REVIEW-AND-POLISH-PLAN.md.

#### Specification
Run a parallel of REVIEW-AND-POLISH-PLAN.md scoped to admin app:
- Functionality / bugs audit
- Security / auth audit (staff RBAC, audit log completeness)
- UI polish (admin uses same design tokens; verify)
- Responsive (admin is desktop-first but verify tablet for KDS use)
- Performance (large dataset rendering — orders list, products list)
- Accessibility (WCAG AA; staff with disabilities matter too)
- New surfaces specific to v1.5:
  - Multi-campus selector + cross-campus comparisons
  - KDS view
  - Inventory toggles
  - Coupons CRUD (if added in this phase)
  - Referrals reporting
  - Tier overrides (manual promote/demote with reason)
  - Push composer (for marketing-style push)

#### Implementation steps
1. Launch `general-purpose` agent: "Audit `apps/admin/` against the REVIEW-AND-POLISH-PLAN.md framework, scoped to admin context. Produce `docs/ADMIN-REVIEW-AND-POLISH-PLAN.md`."
2. Triage findings → execution plan with phases (mirror the v1 structure)
3. Execute phases 1-3 of admin plan (security, functionality, polish)
4. Defer phases 4+ to v1.6 if time-bound

#### Acceptance criteria
- [ ] `docs/ADMIN-REVIEW-AND-POLISH-PLAN.md` exists with file:line citations
- [ ] All P0 (security) issues fixed
- [ ] KDS audit passes (real barista test for 1 day)
- [ ] All v1.5 admin surfaces present and functional

---

## Appendix A — Cross-cutting concerns

### A.1 Security
- Every new endpoint must enforce authorization (see existing `requireAuth`, `requirePermission` patterns)
- Every new table needs RLS policies, including campus isolation
- All secrets in Supabase Vault or hosting platform's secret store; never in repo
- Sentry PII scrubbing must cover new event types
- New attack surfaces (App Clip anonymous orders, push token endpoints) need rate limiting

### A.2 Internationalization
- Every new string must exist in `packages/i18n/src/en.ts` AND `packages/i18n/src/ar.ts`
- New iOS strings in `Localizable.strings` AND `Localizable.strings (Arabic)`
- RTL: any new layout must be tested in Arabic
- Date/number formatting: use locale-aware formatters (Intl on web, NumberFormatter on iOS)

### A.3 Accessibility
- Every new interactive element: 44px minimum tap target
- Color contrast WCAG AA (verify on both light and dark)
- Screen reader labels on every icon/image
- Focus order on web makes sense
- Reduced motion respected (don't autoplay confetti for users with motion-reduce preference)

### A.4 Performance budgets
- Web LCP: < 2.5s on mobile 3G throttle
- iOS app launch: < 1s on iPhone 12
- API p95 latency: < 200ms for read endpoints, < 500ms for write
- Push delivery: < 5s end-to-end

### A.5 Testing
- Every API endpoint: contract test with Zod
- Every UI flow: at least one E2E (Playwright web, XCUITest iOS)
- Every cron job: unit test the logic + integration test the schedule

---

## Appendix B — Open questions requiring user input

| Phase | Question | Suggested default | Status |
|-------|----------|-------------------|--------|
| 1.1 | Sentry self-hosted later? | No | Open |
| 1.3 | Email confirm on hard-delete? | Yes | Open |
| 2.1 | Per-campus pricing? | No (same price across campuses for v1.5) | Open |
| 2.2 | Anonymous users pick campus? | Yes, default to nearest | Open |
| 3.1 | Receipt printer model? | ESC/POS via USB | Open |
| 4.1 | Apple Pay default selected? | Yes | Open |
| 4.3 | Quiet hours for non-transactional pushes? | Yes, 9pm-8am Cairo | Open |
| 6.3 | Tier demotion grace period? | 2 consecutive sub-threshold months | Open |
| 7.1 | Custom referral codes? | No | Open |
| 7.2 | Loyalty points for App Clip orders? | Only if signed in | Open |
| 9.1 | Always-confirm voice orders? | Yes | Open |

If you start working on a phase and the user hasn't answered the relevant questions, **proceed with the suggested default** but flag the assumption clearly in the PR description.

---

## Appendix C — Estimated total effort & resource needs

| Phase | Days (focused AI execution) | Real calendar weeks (with reviews + iteration) |
|-------|----------------------------|-----------------------------------------------|
| 1 | 7-10 | 1.5-2 |
| 2 | 8-10 | 2 |
| 3 | 10-12 | 2.5 |
| 4 | 9-11 | 2 |
| 5 | 5-6 | 1 |
| 6 | 10-12 | 2.5 |
| 7 | 8-10 | 2 |
| 8 | 7-9 | 1.5 |
| 9 | 3-4 | 0.5-1 |
| 10 | 5-7 | 1.5 |
| **Total** | **72-91 days** | **16-19 weeks (~4-5 months)** |

### External resources / accounts needed (USER ACTION)
- [ ] Sentry account (free tier OK initially)
- [ ] PostHog Cloud EU account (free tier OK initially)
- [ ] GrowthBook self-host on Render/Railway (~$7/mo)
- [ ] Cloudflare Images account (~$5/mo + bandwidth)
- [ ] Apple Pay Merchant ID + Payment Processing Certificate
- [ ] APNs Auth Key (.p8) from Apple Developer
- [ ] Google Pay Merchant ID
- [ ] VAPID keys for Web Push (generate locally)
- [ ] OpenWeather API key (free tier; for 6.4)
- [ ] SMS provider account (Twilio / Vonage) for App Clip anonymous order pickup notifications

### Estimated monthly recurring cost (after launch)
- Sentry: $0 (free tier) → $26/mo (developer tier when scaling)
- PostHog: $0 (free tier) → $0 likely sufficient through v1.5
- GrowthBook: $7/mo (Render small instance)
- Cloudflare Images: $5/mo + ~$1/100k delivers (~$10/mo at moderate traffic)
- SMS (App Clip): ~$0.05 per SMS × estimated 500/mo = $25/mo
- Cloudflare/Vercel hosting: existing line items
- **Total new recurring: ~$50-80/mo** at v1.5 scale

---

## Appendix D — Branching & PR strategy

- One branch per task: `claude/upgrade-pXX-feature-slug`
- One PR per branch
- PR title format: `[Upgrade pX.Y] Feature name`
- Every PR description must include:
  - Link to this plan + the specific section
  - Status checkbox update (the same one updated in the file)
  - Test plan
  - Rollback procedure if applicable
- Every PR must update this plan's checkbox in the same commit (so reviewers see status sync)
- Squash-merge to `main`
- Tag release after each phase completes: `v1.5.0-phase-N`

---

## Appendix E — Discovered work (running list)

> Add items here as you uncover them mid-execution. Don't silently expand scope.

| Date | Discovered by | Description | Severity | Disposition |
|------|---------------|-------------|----------|-------------|
| — | — | — | — | — |

---

## Appendix F — Memory pointer

When phases complete, update:
- `C:\Users\LEGION\.claude\projects\E--Kiosk-App\memory\project_upgrade_plan.md` (one-line status)
- `C:\Users\LEGION\.claude\projects\E--Kiosk-App\memory\MEMORY.md` index (if first time)

---

## Change log

| Date | Author | Change |
|------|--------|--------|
| 2026-05-07 | Claude (initial draft) | Created from user's 22-feature priority list |

