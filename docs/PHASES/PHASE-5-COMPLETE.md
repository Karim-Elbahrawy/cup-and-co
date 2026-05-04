# Phase 5 — Reviews + Offers + Admin Polish: ✅ COMPLETE

**Started:** 2026-05-04  
**Status:** ✅ All platforms shipping (API + Admin + Customer Web)  
**Tests:** 117/117 passing

## Goal

Admin reviews page, users verification queue, offers CRUD with role targeting, reports (revenue/top-items/role-breakdown). Web: offer display on home, coupon redemption UI at checkout.

---

## API (commit `b933620`)

### New endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /admin/reviews` | Owner | List all reviews (including hidden) with user names |
| `PATCH /admin/reviews/:id/visibility` | Owner | Toggle `hidden` flag on a review |
| `GET /admin/users` | Owner | List registered users. Query `?status=pending` filters by verification status |
| `PATCH /admin/users/:id/verify` | Owner | Approve or reject user verification |
| `PATCH /admin/users/:id/block` | Owner | Block or unblock a user |
| `GET /admin/offers` | Owner | List admin-managed offers. Query `?scope=active\|upcoming\|expired` |
| `POST /admin/offers` | Owner | Create offer (percentage/fixed/free_item, role targets, schedule, coupon code) |
| `PATCH /admin/offers/:id` | Owner | Update offer fields |
| `GET /admin/reports/revenue` | Owner | Today + total revenue, paid order count |
| `GET /admin/reports/top-items` | Owner | Best-selling products by quantity and revenue |
| `GET /admin/reports/role-breakdown` | Owner | Orders and revenue grouped by user role |

### Infrastructure

- `usersRegistry` Map: tracks all users created via OTP verify for admin management
- `adminOffers` shared array: mutable offers store consumed by both admin CRUD and customer catalog
- `catalogRouter` merges active `adminOffers` into `/catalog` response
- `assertAdminPermission` now throws errors with `status: 403` for consistent HTTP responses

### Tests

- `src/routes/admin.test.ts`: 15 new tests covering reviews, users, offers, reports, and permission gates
- All 117 tests passing (102 existing + 15 new)

---

## Admin Dashboard (commit `622ea39`)

### New pages

| Page | Route | Description |
|---|---|---|
| Reviews | `/reviews` | List all reviews with star rating, comment, hidden status. Toggle visibility with one click. |
| Users | `/users` | Table of registered users with phone, role, verification status, blocked state. Filter by status. Approve/reject pending users. Block/unblock users. |
| Offers | `/offers` | Card grid of offers with active/upcoming/expired badges. Create offer form with type, value, schedule, target roles, coupon code, usage limit. |
| Reports | `/reports` | Revenue cards (today/total/paid orders), top items table, role breakdown table. |

### Navigation

- Sidebar updated with 4 new nav items (owner-only, hidden from barista)
- Icons: Star (reviews), Users (users), Tag (offers), BarChart3 (reports)

---

## Customer Web (commit `44f3a74`)

### Home page

- Active offers displayed below promo card as horizontal-scroll gradient pills
- Shows offer name + coupon code badge

### Checkout

- Coupon code input section above order summary
- Client-side placeholder validation (e.g., `STUDENT15` → 15% off)
- Displays coupon discount in summary alongside points discount

---

## Quality gates

| Check | Result |
|---|---|
| `pnpm --filter @cup-and-co/api test` | **117/117** ✅ |
| `pnpm --filter @cup-and-co/customer-web typecheck` | ✅ clean |
| `pnpm --filter @cup-and-co/admin typecheck` | ✅ clean |

---

## Verification

```bash
cd "E:\Kiosk App"
pnpm install
pnpm dev
# → API:           http://localhost:4000
# → customer-web:  http://localhost:3000
# → admin:         http://localhost:3001
```

### Admin flow
1. Log in to admin as `owner@cupandco.app`
2. See new sidebar items: Reviews, Users, Offers, Reports
3. Create an offer in `/offers` → set name, type, value, target roles, coupon code
4. Navigate to `/users` → see registered users, verify/block actions
5. Navigate to `/reports` → see revenue, top items, role breakdown

### Customer Web flow
1. Log in at `/login` with `+201000000001`, OTP `000000`
2. Home page shows active offer pills below search bar
3. Add items to cart → checkout
4. Enter coupon code `STUDENT15` → see discount applied

---

## Phase 6 scope (when ready)

1. **i18n + Accessibility + Polish**
   - Full Arabic translations audit (Playwright AR snapshots)
   - Accessibility: VoiceOver, large-text, contrast checks
   - Loading skeletons, empty states, error states, offline mode
   - Onboarding, splash, App Store / Play Store assets
   - Coupon redemption wired to API (server-side validation)

See `docs/MASTER-PLAN.md` Phase 6 for full scope.
