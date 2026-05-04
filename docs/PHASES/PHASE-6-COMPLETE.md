# Phase 6 — i18n + Accessibility + Polish: ✅ COMPLETE

**Started:** 2026-05-04  
**Status:** ✅ All platforms (API + Web + Admin + iOS)  
**Tests:** 117/117 passing

## Goal

Full Arabic translations audit, accessibility improvements (focus states, ARIA, semantic HTML), loading skeletons, empty states, error states with retry, offline mode indicator, and iOS feature parity.

---

## i18n — Full Arabic Translations Audit

### New translation keys added

| Key | EN | AR |
|---|---|---|
| `common.notifications` | Notifications | الإشعارات |
| `common.activeOffers` | Active Offers | عروض حالية |
| `checkout.couponCode` | Coupon Code | كوبون الخصم |
| `checkout.enterCode` | Enter code | أدخل الكود |
| `checkout.apply` | Apply | تطبيق |
| `checkout.couponDiscount` | Coupon Discount | خصم الكوبون |
| `games.preparing` | Preparing game… | جاري تحضير اللعبة… |
| `games.instructions` | How to play | كيفية اللعب |
| `games.catchBeans` | Catch beans — +10 pts each | اصطاد الحبات — +10 نقاط لكل حبة |
| `games.missBean` | Miss a bean — lose a heart | فوت حبة — تفقد قلب |
| `games.timeAndLives` | 60 seconds · 3 hearts · earn loyalty points! | 60 ثانية · 3 قلوب · اكسب نقاط الولاء! |
| `loyalty.noScores` | No scores yet this week. Be the first! | لا توجد نتائج هذا الأسبوع. كن الأول! |
| `loyalty.redeeming` | Redeeming… | جاري الاستبدال… |
| `loyalty.noPrizes` | No prizes yet. Play the game to win! | لا توجد جوائز بعد. العب لتفوز! |
| `profile.iOSOnly` | iOS only | iOS فقط |

### Hardcoded strings fixed

| Page | Before | After |
|---|---|---|
| Home | `aria-label="Notifications"` | `aria-label={t('common.notifications')}` |
| Home | `aria-label="Filter by category"` | `aria-label={t('common.filter')}` |
| Home | Inline "Active Offers" / "عروض حالية" | `t('common.activeOffers')` |
| Checkout | Inline coupon labels | `t('checkout.couponCode')`, `t('checkout.enterCode')`, etc. |
| Game | "Preparing game…", "How to play", instructions | All use `t()` keys |
| Game | "Game Over!", "Final Score", "Play Again" | All bilingual via `t()` or inline AR |
| Rewards | "No scores yet this week…", "Redeeming…" | `t('loyalty.noScores')`, `t('loyalty.redeeming')` |
| QR Scanner | "Redeeming…", "Done" | `t('loyalty.redeeming')`, `t('common.done')` |
| Profile | "iOS only" | `t('profile.iOSOnly')` |

---

## Accessibility Improvements

### Focus states
- Added `focus-visible` polyfill in `globals.css`:
  ```css
  :focus-visible { outline: 2px solid var(--cup-primary); outline-offset: 2px; }
  :focus:not(:focus-visible) { outline: none; }
  ```
- All interactive elements (buttons, links, inputs) now have visible focus rings

### ARIA & Semantic HTML
- `aria-label` on all icon-only buttons (notifications, back, close, increase/decrease)
- `role="alert"` on error banners
- `role="status"` on loading states
- `aria-labelledby` on product grid section
- `role="tablist"` on category filter chips

### Reduced motion
- `useReducedMotion()` from Framer Motion respected on all animated grids
- `@media (prefers-reduced-motion: reduce)` already in CSS

---

## UI Polish — Loading, Empty, Error, Offline

### New components

| Component | File | Description |
|---|---|---|
| `SkeletonCard` | `components/Skeleton.tsx` | Pulse animation card with image, title, price placeholders |
| `SkeletonProductGrid` | `components/Skeleton.tsx` | 2-column (responsive) skeleton grid |
| `EmptyState` | `components/EmptyState.tsx` | Icon + title + message + optional CTA button |
| `ErrorState` | `components/ErrorState.tsx` | Alert icon + title + message + retry button |
| `OfflineIndicator` | `components/OfflineIndicator.tsx` | Top banner when `navigator.onLine === false` |

### Integration

| Page | Loading | Error | Empty |
|---|---|---|---|
| Home | `SkeletonProductGrid` | `ErrorState` with retry | "No results" text |
| Orders | Inline pulse blocks | Inline error text | Translated empty state |
| Cart | — | — | Translated empty state (already existed) |
| Game | Spinner + text | Retry/back | Student-only gate |
| Rewards | — | — | Leaderboard empty state |

### Offline mode
- `OfflineIndicator` added to `(authed)/layout.tsx`
- Listens to `window online/offline` events
- Shows sticky red banner: "You are offline. Some features may not work."
- Animates in/out with Framer Motion

---

## iOS Feature Parity

### HomeView updates
- Added horizontal-scroll offer pills below promo banner
- Uses `LinearGradient` with sunrise colors (`#F4A261` → `#C2410C`)
- Displays localized offer name (`name_en` / `name_ar`)
- `RoleChipRow` renamed to `CategoryChipRow` (matching web)

### Offer model
- Added `localizedName(language:)` helper to `Offer` struct

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

### i18n verification
1. Log in at `/login` with `+201000000001`, OTP `000000`
2. Switch language to AR in Profile
3. Verify every screen shows Arabic text (no English leaks)
4. Check home offers section, game instructions, checkout coupon input

### Accessibility verification
1. Tab through home page — every button/link shows orange focus ring
2. Turn on screen reader — all icon buttons announce their purpose
3. Toggle browser "prefers-reduced-motion" — animations reduce to instant

### Offline verification
1. Open DevTools → Network → Offline
2. Banner appears at top: "You are offline. Some features may not work."
3. Re-enable network — banner disappears

---

## Phase 7 scope (when ready)

1. **Test + Deploy + Launch**
   - Full E2E (Playwright web + admin, XCUITest iOS, Vitest backend)
   - Load test: 50 concurrent orders simulating a lecture-break rush
   - Paymob production keys; custom domain
   - TestFlight build for kiosk staff
   - 1-week soft launch → public

See `docs/MASTER-PLAN.md` Phase 7 for full scope.
