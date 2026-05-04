# Phase 7 — Test + Deploy + Launch: ✅ COMPLETE

**Started:** 2026-05-04
**Completed:** 2026-05-04
**Tests:** 117/117 Vitest + 6/6 Playwright E2E (Chromium) + 50/50 Load test

## Goal

Full E2E testing (Playwright web + admin), load testing (50 concurrent orders), production deployment configs, CI/CD updates.

---

## E2E Testing

### Customer Web (`apps/customer-web/tests/`)

| Test File | Coverage | Status |
|---|---|---|
| `smoke.spec.ts` | Unauthenticated redirect to login, welcome screen visible | ✅ Passing |
| `auth-flow.spec.ts` | Full auth: phone OTP → verify → role select → profile-setup → verify-id skip → home | ✅ Passing |
| `ordering-flow.spec.ts` | Auth flow + home catalog with stubbed products | ✅ Passing |

**Key features tested:**
- Stubbed API routes for isolated testing (no backend required)
- UUID product IDs and PNG image URLs (matching real API since Phase 3)
- Full auth flow including profile-setup and verify-id skip
- Admin dashboard login and role-based nav restrictions

### Admin Dashboard (`apps/admin/tests/`)

| Test File | Coverage | Status |
|---|---|---|
| `admin-smoke.spec.ts` | Login, orders kanban, owner-only page visibility, barista restrictions | ✅ Passing |

**Key features tested:**
- Demo login with `owner@cupandco.app` and `barista@cupandco.app`
- Orders kanban columns (Received, Preparing, Ready, Completed)
- Role-based navigation (barista cannot see Reviews, Users, Offers, Reports)
- Relative URLs (uses playwright config baseURL, not hardcoded localhost)

### Test execution commands

```bash
# Customer web (Chromium only)
pnpm --filter @cup-and-co/customer-web test:e2e -- --project=chromium

# Admin dashboard (Chromium only)
pnpm --filter @cup-and-co/admin test:e2e -- --project=chromium

# Both (requires WebKit installed)
pnpm --filter @cup-and-co/customer-web test:e2e
pnpm --filter @cup-and-co/admin test:e2e
```

---

## Load Testing

### Script: `apps/api/load-test.js`

Simulates **50 concurrent users** placing orders using dev-mode auth bypass headers.

**What it measures:**
- Order creation latency (POST /orders)
- Status advancement latency (received → accepted → preparing → ready → completed)
- Total flow latency per user
- Success/failure rate with p95 percentile

**Usage:**
```bash
cd apps/api
node load-test.js http://localhost:4000
```

**Actual results (2026-05-04, localhost):**
```
Load test: 50 concurrent users → http://localhost:4000
Total: 1.126s

✅ Successful: 50/50
❌ Failed: 0/50

⏱ Order create avg: 945ms | max: 1033ms | p95: 1032ms
⏱ Status advance avg: 65ms | max: 89ms | p95: 84ms
⏱ Total flow avg: 1010ms | max: 1070ms | p95: 1069ms
```

---

## Production Deployment Configs

### Vercel (Customer Web + Admin)

`apps/customer-web/vercel.json` and `apps/admin/vercel.json`:
- Framework: Next.js
- API proxy: `/api/*` → `https://api.cupandco.app/*`
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin

### Render (API)

`render.yaml`:
- Docker-based deployment using `apps/api/Dockerfile`
- Environment variables for Supabase, JWT, Paymob, loyalty, and game config

### Dockerfile

`apps/api/Dockerfile`:
- Multi-stage build (base → deps → build → prod-deps → runner)
- Installs workspace dependencies, builds types package, then API
- Final image copies only `dist/`, `node_modules/`, and workspace types
- Exposes port 4000, runs `node dist/server.js`

### CI/CD

Updated `.github/workflows/ci.yml`:
- `lint-and-test` job: typecheck + Vitest + build
- `e2e` job: Customer web Playwright tests (Chromium)
- `admin-e2e` job: Admin dashboard Playwright tests (Chromium)
- `ios-build` job: Xcode build on macOS runner (with pnpm install + xcodegen)

---

## Quality Gates

| Check | Result |
|---|---|
| `pnpm --filter @cup-and-co/api test` | **117/117** ✅ |
| `pnpm --filter @cup-and-co/customer-web typecheck` | ✅ clean |
| `pnpm --filter @cup-and-co/admin typecheck` | ✅ clean |
| Customer web Playwright (Chromium) | **3/3** ✅ |
| Admin dashboard Playwright (Chromium) | **3/3** ✅ |
| Load test (50 concurrent) | **50/50** ✅ |

---

## Verification

```bash
cd "E:\Kiosk App"
pnpm install
pnpm dev
# → API:           http://localhost:4000
# → customer-web:  http://localhost:3000
# → admin:         http://localhost:3001

# Run E2E tests
pnpm --filter @cup-and-co/customer-web test:e2e -- --project=chromium
pnpm --filter @cup-and-co/admin test:e2e -- --project=chromium

# Run load test (requires dev server running)
cd apps/api
node load-test.js http://localhost:4000

# Run backend tests
pnpm test
```

---

## Pre-Launch Checklist

- [ ] Paymob production API key + HMAC secret + integration IDs
- [ ] Paymob integration IDs (card + wallet) + iframe ID
- [ ] Supabase project provisioned + migrations applied
- [ ] Vercel projects linked + env vars set
- [ ] Render/Fly.io API service deployed via Dockerfile
- [ ] Custom domain DNS configured
- [ ] Apple Developer account + TestFlight setup
- [ ] App Store screenshots (EN + AR)
- [ ] Privacy policy + terms of service pages
- [ ] Soft launch period (1 week) with monitoring

---

## Project Status: ALL PHASES COMPLETE ✅

**Ready for soft launch.**