# Cup & Co — Final-Pass Review & Polish Plan

> Authoritative plan for the final-pass review-and-polish phase, drafted after a deep audit on 2026-05-05 of `apps/customer-web` (Next.js 15), `apps/ios/CupAndCo` (SwiftUI), `apps/api` (Express), `supabase/migrations`, and shared `packages/`. Every file:line reference was verified at the time of writing against branch `main` (~commit `cce77ff`). Read this in full before executing any phase.

## Brand lock

Espresso Sunrise palette — terracotta `#C2410C`, deep teal `#0F766E`, warm cream `#FEF3C7`, paper `#FAF6F0`, espresso text `#1C1917`. Sunrise gradient `#F4A261 → #C2410C` allowed. **No candy-bright orange. No cartoon vibes. Premium, editorial, warm, bold-but-confident.** See `docs/brand-guide.md` for full tokens.

## Defaults for unanswered open questions (apply silently during execution)

| Question | Default decision |
|---|---|
| Coupon system scope | Simple: single `POST /coupons/validate` endpoint, in-memory store, no admin CRUD UI for v1. |
| APNs / Web Push | Defer entirely (out of scope this run). Document as next-pass blocker. |
| Search implementation | Server-side ILIKE on `name_en` / `name_ar` / `description_en`, basic limit/offset pagination. |
| Profile dead rows | Hide for v1: drop Personal Info / Cards & Payments / Transaction History / Privacy & Data. Keep Account ID readonly + Logout + Language + Notifications-pref placeholder. |
| Verify-ID flow | Remove on both platforms. Strip web `verify-id/page.tsx` and the auth-phase reference; remove iOS `VerifyIDView.swift`. |
| Avatar refresh (Group G) | Skip — current avatars are already on-brand. |
| Dark mode | Skip. Keep `.preferredColorScheme(.light)` lock on iOS. |
| Game audio | Skip. |
| Admin app polish | Out of scope. Touch only when it shares files (e.g., `packages/i18n` keys). |

## Cross-platform parity gaps to close

This pass eliminates these divergences (full table in conversation; below is the actionable subset):

- iOS hardcoded English `Sugar / Ice / Size` → drive from API + Localizable.strings.
- iOS missing coupon code field on Checkout → add to match web.
- iOS uses 5-sec polling on order tracking → switch to SSE (web does this; API supports it at `/orders/:id/events`).
- iOS "Your Usual" tile opens Order History → make it a real one-tap reorder.
- iOS language switch needs app restart → make live.
- iOS missing OTP resend cooldown timer → match web's 30-sec timer.
- iOS missing app icon + launch screen → critical App Store blocker.
- iOS cart loses contents on cold start → persist to UserDefaults.
- iOS `OrderSuccessOverlay` exists but is never instantiated → wire it.
- Web `/search` route linked but missing → build it (shared logic with iOS Search tab).
- Web profile dead nav rows → hide.
- Web sticky bottom bars span edge-to-edge on desktop → constrain to `max-w-3xl mx-auto`.
- Web `cup-orange-500` (#F97316) leaks next to brand `#C2410C` → sweep to `cup-primary`.
- Web missing `/payment/success` and `/payment/cancel` routes → build them.
- Web QR scanner has no fallback for iOS Safari < 17 → add jsQR polyfill.
- Both platforms hardcoded "Good Morning" greeting regardless of hour → time-of-day function.
- Both: bell icon shows red dot but does nothing → hide for v1 (until APNs lands).

---

## Phase 1 — Unblock & secure (DO FIRST, MOST CRITICAL)

### Security (in `apps/api/`)

1. **Replace dev header auth bypass.** `src/http/auth.ts:41-50` reads `x-user-id` / `x-user-role` headers when `NODE_ENV` is `'development'` or `'test'`. Default `NODE_ENV` is `'development'` (`src/config.ts:33`) — single misconfigured deploy = full owner takeover. **Fix:** gate behind a separate `ALLOW_HEADER_AUTH_BYPASS === '1'` env var (never set in production). Update test fixtures: `src/routes/me.test.ts:6-7,13-14,20-21,132`, `src/routes/orders.test.ts:6-7,13-14,20-21`, `src/routes/admin.test.ts:6-7,13-14,20-21`, plus any `vitest` setup file, to set `process.env.ALLOW_HEADER_AUTH_BYPASS = '1'`.

2. **Generate per-phone OTP.** `src/app.ts:225` returns hardcoded `'000000'`; `src/app.ts:237` accepts only `'000000'`. **Fix:** generate a random 6-digit code per phone-send, store in an in-memory `Map<phone, {code, expiresAt}>` with 5-min TTL, validate against it on verify (and clear on success). Keep a `DEV_OTP_OVERRIDE='000000'` env var as the explicit dev-only escape hatch. Stop emitting `devCode` in the response body unless `DEV_OTP_OVERRIDE` is set.

3. **Drop dev secret fallbacks.** `src/config.ts:42` (`'dev-only-secret-replace-me-in-production-32chars'`) and `src/config.ts:47` (`'local-dev-secret'`) — remove. Make `JWT_SECRET` and `PAYMOB_HMAC_SECRET` required in all envs (the `secret()` helper already throws in `production` — extend to throw whenever env is missing or <32 chars).

4. **Add ownership check on payments intention.** `src/app.ts:566-579` — currently any authed user can mint a Paymob URL for any `orderId`. **Fix:** before creating the intention, `if (order.userId !== req.user.id) return res.status(404).json({error: 'Order not found.'});`.

5. **Add reviewer-purchase check on `POST /reviews`.** `src/app.ts:539-563` — currently accepts arbitrary `productId`. **Fix:** require `orderId` in body. Verify `order.userId === req.user.id` AND `order.status === 'completed'` AND `order.items.some(i => i.productId === input.productId)`. Reject otherwise with 403.

6. **Fix wrong permission key on `/admin/leaderboard/settle`.** `src/app.ts:718-726` uses `'orders:update_status'` — both barista and owner have it; baristas should not be able to settle prize money. **Fix:** add `'leaderboard:settle'` to `src/services/permissions.ts`, grant only to `owner`, and use it here.

7. **Webhook amount-vs-order check.** `src/app.ts:587-606` — HMAC valid + tampered amount accepted. **Fix:** before marking paid, `if (Number(payload.amountEgp) !== order.totalEgp) return res.status(422).json({error: 'Amount mismatch.'});`.

8. **RLS on missing tables.** Create `supabase/migrations/0003_rls_gaps.sql`:
   ```sql
   alter table prizes enable row level security;
   create policy prizes_own_read on prizes for select using (auth.uid() = user_id);
   alter table leaderboard_weeks enable row level security;
   create policy leaderboard_weeks_no_anon on leaderboard_weeks for select using (false);
   alter table audit_log enable row level security;
   create policy audit_log_no_anon on audit_log for select using (false);
   ```

### Compile blockers (in `apps/ios/`)

9. **Replace `Color(hex:)` calls.** `apps/ios/CupAndCo/CupAndCo/Views/Home/DailyOrderBarView.swift:32` uses `[Color(hex: "#F4A261"), Color(hex: "#C2410C")]` and `:60` uses `Color(hex: "#C2410C").opacity(0.30)`. **`Color(hex:)` is NOT defined anywhere in the iOS codebase** (verified by `grep -r 'extension Color'` returning no matches). On a real iOS build this fails to compile (the `Stubs.swift` Tokamak preview build hides it). **Fix:** replace with `[CupColors.sunriseFrom, CupColors.primary]` and `CupColors.primary.opacity(0.30)`. Re-grep to confirm zero remaining `Color(hex:)` references.

### Silent UI breakage (in `apps/customer-web/`)

10. **Add missing Tailwind classes used in code but not defined.** Update `apps/customer-web/tailwind.config.ts` and/or `packages/design-tokens/src/index.ts`:
    - Add `100` step to `cup-cream` scale → used in `usual/page.tsx:319, 359` and `orders/[id]/page.tsx:347`. Suggested: `'#FEF3C7'` (i.e., the same as the cream surface) — verify against existing palette.
    - Add `100` step to `cup-brown` scale → used in `EmptyState.tsx:33` and `game/page.tsx:60`. Already exists in `tailwindColors['cup-brown']` as `'#F5F5F4'` — verify it's wired to Tailwind correctly; if not, fix.
    - Add `100`, `600`, `700` steps to `cup-teal` scale → used in `rewards/page.tsx:38, 313, 522`. Tokens already define these in `tailwindColors['cup-teal']`; verify Tailwind picks them up.
    - Add `shadow-warm-glow` to Tailwind `boxShadow` → currently `shadows.warmGlow` exists in tokens but isn't exposed in `tailwind.config.ts:14-18`. Used in `page.tsx:156`.
    - Add `scrollbar-hide` utility → used in `page.tsx:152, 171`. Either install `tailwind-scrollbar-hide` plugin OR add a custom utility via plugin section in `tailwind.config.ts`.

### Phase 1 verification

- Run `pnpm test` in `apps/api` (must pass — Vitest, currently 117 tests).
- Run `pnpm typecheck` and `pnpm lint` in `apps/customer-web`.
- Visually confirm no remaining `Color(hex:)` in iOS via grep.
- Run `pnpm build` on customer-web to confirm Tailwind classes resolve.

Commit messages:
- `fix(api): replace dev header auth bypass with explicit env gate`
- `fix(api): generate per-phone OTP with TTL`
- `fix(api): drop dev secret fallbacks`
- `fix(api): add ownership check on payments intention`
- `fix(api): require purchase verification on reviews`
- `fix(api): correct permission key on leaderboard settle`
- `fix(api): verify webhook amount matches order total`
- `feat(supabase): RLS on prizes, leaderboard_weeks, audit_log`
- `fix(ios): replace undefined Color(hex:) with CupColors tokens`
- `fix(web): expose missing Tailwind classes (cup-*-100, shadow-warm-glow, scrollbar-hide)`

---

## Phase 2 — Brand identity art (image manifest + stub assets)

**The remote agent does NOT have access to image-generation MCP servers.** Real premium imagery requires running brandkit/imagegen skills locally. This phase produces:

1. **Manifest:** `docs/IMAGE-MANIFEST.md` with the full image-generation specification, listing every image with: ID, subject, brand-locked style direction (1-2 sentences), target paths on web + iOS, dimensions, format. Group by purpose (App icon, Hero promo, Product shots, Empty states, Onboarding, Order success, Game, OG card, Payment logos). Include the current "stub" status of each so the user knows which paths are placeholder vs final.

2. **Stub generator:** `scripts/generate-stubs.mjs` (Node + `sharp`) that produces minimum-viable placeholder PNGs/SVGs so Phase 4 wiring works against real paths:
   - 1024×1024 sunrise-gradient PNG → `apps/customer-web/public/brand/app-icon-1024.png` and downscaled 180/192/512.
   - One simple SVG cup illustration in brand palette → `apps/ios/CupAndCo/CupAndCo/Assets.xcassets/AppIcon.appiconset/` with full Apple icon set generated by `sharp` resize. Include `Contents.json` listing all icon variants.
   - 21 stub product JPGs (warm cream `#FAF6F0` background + product slug in espresso text + soft drop shadow) → `apps/customer-web/public/images/products/{slug}.jpg`. These look unfinished but unblock per-product wiring.
   - 2 transparent cutouts → `apps/customer-web/public/images/products/cold_coffee-cutout.png` and `hot_coffee-cutout.png`.
   - Onboarding (3 stub SVGs), order-success (1 stub SVG), empty-cart (replace stub SVG with a minimal updated version).

3. **Wire per-product images.** Update `apps/api/src/db/catalogRepo.ts:32-53` so each product points at its dedicated image file (e.g., `'/images/products/velvet_cappuccino.jpg'`) instead of the four shared generics. Also update `supabase/seed.sql` if it exists with parallel data.

4. **iOS launch screen.** Create `apps/ios/CupAndCo/CupAndCo/Resources/LaunchScreen.storyboard` (or asset-based launch screen) — currently referenced in `project.yml:25` but missing. Use the new app-icon mark + wordmark on paper background.

5. **iOS AppIcon set.** Create `apps/ios/CupAndCo/CupAndCo/Assets.xcassets/AppIcon.appiconset/` with `Contents.json` declaring all required iOS icon sizes (1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40), and the corresponding PNGs.

Commit messages:
- `docs: image generation manifest`
- `feat(brand): stub asset generator + sunrise-gradient placeholders`
- `feat(api): wire per-product images in catalog fallback`
- `feat(ios): AppIcon set + LaunchScreen`

---

## Phase 3 — Functionality fixes (largest phase by file count)

### Web (`apps/customer-web/`)

3.1. **Build `/search` page.** New file `src/app/(authed)/search/page.tsx`. Use a debounced query input (300ms) → `GET /products?q=<query>` (Phase 3.5 builds this endpoint). Show 2-col grid of `ProductCard`. Loading skeleton, empty state ("No results — try `cappuccino` or `mocha`"), error state. Wire from home `page.tsx:197` "See All →" link.

3.2. **Hide dead Profile NavRows.** `profile/page.tsx:140-144` — comment out or wrap in `{/* v1: hidden */}`. Keep "Account ID" (display-only) + "Language" + "Logout".

3.3. **Hide dead toggles.** `profile/page.tsx:152-198` — Notifications (keep as a placeholder readonly indicator until APNs lands), 2FA, Passcode Lock, Face ID — comment out or hide.

3.4. **Wire profile name edit.** `profile/page.tsx:109-117` — on blur, call `api.patchMe({ fullName })` and toast on success/failure.

3.5. **Hide bell + dot.** `page.tsx:118-128` — remove until APNs lands. The Notifications page also doesn't exist.

3.6. **Wire DailyOrderBar filter button.** Either a category-filter sheet (price range, prep time, dietary tags) OR remove until Phase 5 polish. Recommend: remove for v1.

3.7. **Wire PromoCard CTA.** `page.tsx:139-144` — pass `onCtaClick={() => router.push('/?promo=hero-70')}` and on home read the promo query and apply it as a filter.

3.8. **Build `/payment/success` and `/payment/cancel` routes.** `payment/success/page.tsx` polls the order until `paid`, redirects to `/orders/{id}`. `payment/cancel/page.tsx` returns user to checkout with the cart intact. Update Paymob redirect URLs in API config.

3.9. **Real coupon validation.** API: new `POST /coupons/validate` endpoint accepts `{ code: string }`, returns `{ ok: true, type, value, descriptionEn, descriptionAr }` or `{ ok: false, reason }`. Backed by an in-memory `Map<code, CouponDefinition>` seeded with `STUDENT15`, `WELCOME10`, etc. Web: `checkout/page.tsx:180-186` — replace hardcoded check with `await api.validateCoupon(code)`.

3.10. **Reviews i18n keys.** Add to `packages/i18n/src/{en,ar}.ts` under `product.reviews`: `header`, `writeAReview`, `placeholder`, `submitButton`, `submittedThankYou`, `noReviewsYet`. Replace hardcodings in `products/[id]/page.tsx:360, 366, 393, 408, 419, 481`.

3.11. **Order history status translation.** `orders/page.tsx:95` — use `t(\`orders.${o.status}\`)` instead of raw enum.

3.12. **Leaderboard display name.** API: extend `LeaderboardEntry` to include `displayName: string` (initials or name fallback). Web: `rewards/page.tsx:405` uses `entry.displayName` instead of `…userId.slice(-6)`. iOS: same.

3.13. **SSE reconnect fix.** `orders/[id]/page.tsx:55-123` — when SSE drops or finishes mid-order (not at completion), return `false` from `connectSSE` so the polling fallback engages. Add 1-2-4-8-sec exponential backoff retry on the SSE itself before falling back. Depend `useEffect` only on `[id]` (the route param), not `[order?.id]`.

3.14. **Empty cart illustration.** `cart/page.tsx:57` — change `src` from `/brand/monogram.svg` to `/brand/empty-cart.svg`. Update CTA copy from "Back" to "Browse the menu".

3.15. **QR scanner jsQR fallback.** `rewards/QRScanner.tsx:48` — when `BarcodeDetector` is unavailable, lazy-import `jsqr` and fall back to canvas-frame scanning.

3.16. **Time-of-day greeting.** `page.tsx:111` — function `greetingKey(hour)` returning `home.goodMorning | home.goodAfternoon | home.goodEvening`. Add Arabic strings.

3.17. **Game daily-limit truth.** `CoffeeCollectorGame.tsx:91` — fetch true `sessionsLeft` from API (extend `/games/sessions/me` or include in catalog response). Don't compute locally.

3.18. **Verify-ID flow removal.** Delete `src/app/(auth)/verify-id/page.tsx` and any `VERIFY_ID` phase reference in the auth state machine.

### iOS (`apps/ios/CupAndCo/CupAndCo/`)

3.19. **Search tab.** Replace `ComingSoonView` at `CupAndCoApp.swift:101` with a real `SearchView` that: takes a debounced `query`, calls `CatalogAPI.search(q:)` (extend the API client), shows 2-col grid of `ProductCardView`, identical empty/loading/error states to web.

3.20. **Localize Sugar / Ice / Size options.** `Views/ProductDetail/ProductDetailView.swift:19-22` — replace hardcoded English with API-driven `product_options` (already exposed by `GET /products/:id` per `apps/api/src/db/catalogRepo.ts:127-138`). Use `option.name_en` / `option.name_ar` based on session language. Same for size deltas.

3.21. **Wire `OrderSuccessOverlay`.** `Views/Checkout/CheckoutView.swift:75-80` — present the orphan `OrderSuccessOverlay.swift` via `.fullScreenCover` for ~1.5s after `placeOrder` succeeds, then dismiss into `OrderTrackingView`. Respect `accessibilityReduceMotion`.

3.22. **iOS SSE on order tracking.** `Views/Orders/OrderTrackingView.swift:385-395` — replace 5-sec polling with an SSE client over `URLSession.bytes(for:)` against `/orders/:id/events`. Token in `Authorization: Bearer` header. Reconnect with exponential backoff on drop. Polling fallback retained for total failure.

3.23. **Cart persistence.** `State/CartStore.swift` — encode `[CartItem]` to JSON, save to `UserDefaults.standard` on every `addItem`/`removeItem`/`clear`. Restore on `init`.

3.24. **"Your Usual" tile fix.** `Views/Home/HomeView.swift:138`, `Views/Home/DailyOrderBarView.swift:29-64` — instead of opening `OrderHistoryView`, fetch the user's most-ordered combination from API (or last completed order as fallback) and add directly to cart with a "Added to cart — view cart" toast.

3.25. **Live language switch.** `Views/Profile/ProfileView.swift:289-298`, `CupAndCoApp.swift:147-156` — make `AppLanguage` a published property on `SessionStore` instead of a static computed prop. On change: `objectWillChange.send()` from the root, refresh locale via `Bundle.main.preferredLocalizations`. Test in both directions (EN→AR, AR→EN).

3.26. **OTP resend cooldown.** `Views/Auth/OTPVerifyView.swift:91` — add a 30-sec countdown timer that disables the Resend button until elapsed. Match web's UX.

3.27. **Cart row Arabic name.** `Views/Cart/CartView.swift:238` — replace `item.product.nameEn` with `item.product.localizedName(language)`.

3.28. **Time-of-day greeting on iOS.** `Views/Home/HomeView.swift:179` — `Calendar.current.component(.hour, from: Date())`-based switch.

3.29. **Bell/dot fix on iOS.** `Views/Home/HomeView.swift:194-211` — remove until APNs lands.

3.30. **Verify-ID flow removal on iOS.** Delete `Views/Auth/VerifyIDView.swift` and any reference.

3.31. **Remove orphan files.** `Views/Home/SearchBarView.swift` (dead — `DailyOrderBarView` replaces it). Strip from project.yml if listed.

3.32. **Profile sheet from Home.** `Views/Home/HomeView.swift:132-137` — remove the sheet path; keep only the Profile tab.

### Phase 3 verification

- API tests pass.
- Web: typecheck + lint clean. Manual smoke of /search, coupon flow, payment success, profile edit.
- iOS: re-grep for `Color(hex:)` (zero), `nameEn` (only in models, not in views), `Text("☕")` and 🥇🥈🥉 emojis (zero outside game-over states which become Phase 4).
- Run web Playwright E2E (`pnpm test:web`) — must still pass.

---

## Phase 4 — Polish + image wiring

This phase depends on Phase 2 (image manifest + stubs) being committed.

### Cross-platform palette / token sweep

4.1. **`cup-orange-500` → `cup-primary` sweep.** Replace `cup-orange-500` in CTA / chip / hero contexts. Worst offenders (verified):
- `rewards/page.tsx:134` (rewards hero gradient — currently fluorescent `from-cup-orange-500 to-cup-orange-600`; change to `from-[#F4A261] to-[#C2410C]` literal or new `bg-sunrise` token).
- `products/[id]/page.tsx:416` (review submit).
- `game/page.tsx:73, 105`.
- `EmptyState.tsx:44`.
- Multiple `QRScanner.tsx` buttons.
Keep `cup-orange-500` only as an intermediate scale step, never as a fill.

4.2. **iOS press-feedback consistency.** `apps/ios/CupAndCo/CupAndCo/DesignSystem/Buttons.swift:20-31` — add scale 0.98 + opacity 0.9 over 120ms to `CupSecondaryButtonStyle` to match `CupPrimaryButtonStyle`.

### Web screen polish

4.3. **Home — desktop polish.** `page.tsx`: cap content max-width at 1080px on the home rail. Active offers row → curated offer card (name + percent + remaining time, max 2 visible, "+N more" overflow). Header bell removed (already in 3.5). Hero promo height 320px on `md+`.

4.4. **Product detail polish.** `products/[id]/page.tsx`: replace `bg-cup-orange-600/12` arbitrary alpha with inline `radial-gradient` style. Add a mini rating-distribution bar above reviews (5/4/3/2/1 with bar widths from review counts). Add 1px `rgba(28,25,23,0.04)` stroke around 260×260 hero circle.

4.5. **Cart polish.** `cart/page.tsx`: item rows show options as "Medium · Less sugar · No ice" via translated keys. Discount cap message → small banner under the slider. Sticky checkout `max-w-3xl mx-auto`.

4.6. **Checkout polish.** `checkout/page.tsx`: harmonize ASAP chip default state with the others. Notes textarea visible counter `X / 500`. Coupon input + button height match. Place-order button → spinner. Sticky bar `max-w-3xl mx-auto`. Add Visa / Mastercard / Vodafone Cash / Etisalat / Cash brand glyphs in `public/brand/payments/` (use simple SVG marks; placeholder if needed).

4.7. **Order tracking polish.** `orders/[id]/page.tsx`: timeline thicker (3px), dotted line for pending. Replace "Status: …" footer line with a pill component. Replace ▲/▼ with lucide `ChevronDown`. Add "Reorder" CTA when `status==='completed'`.

4.8. **Rewards polish.** `rewards/page.tsx`: hero gradient → real sunrise (4.1). Three sections (history / leaderboard / prizes) get distinct visual weights. Tap-to-copy on prize codes with scale + check icon swap. Use `displayName` from API (3.12).

4.9. **Sticky bar constraint.** Apply `max-w-3xl mx-auto` to all sticky bottom bars: `cart/page.tsx:198`, `checkout/page.tsx:217`, `products/[id]/page.tsx:488`, `orders/[id]/page.tsx`.

### iOS screen polish

4.10. **Game start logo.** `Views/Game/GameView.swift:76` — replace `Text("☕")` with `MonogramView()` or new `Image("game_logo")` from imageset (Phase 2 stub).

4.11. **Leaderboard podium.** `Views/Game/LeaderboardView.swift:152-155` — replace 🥇🥈🥉 emoji with brand glyphs from imageset (Phase 2 stub `leaderboard_podium`). For now the imageset is a stub; final art comes when user runs imagegen locally.

4.12. **Bottom-tab safe-area inset.** `Views/Home/HomeView.swift:118` — replace `Color.clear.frame(height: 90)` magic number with `.safeAreaInset(edge: .bottom)` on the tab shell.

4.13. **Reduce-motion guards.** Add `@Environment(\.accessibilityReduceMotion)` checks in: `Views/Auth/RoleSelectView.swift`, `Views/ProductDetail/ProductDetailView.swift`, `Views/Orders/OrderTrackingView.swift`, `Views/Checkout/OrderSuccessOverlay.swift`, `Views/Checkout/CheckoutView.swift`, `Views/Rewards/RewardsView.swift`. Wrap spring animations.

### Phase 4 verification

- API + web tests pass.
- Web: visual smoke at 320 / 414 / 768 / 1440 viewports of every screen.
- iOS: re-grep for `Text("☕")`, 🥇🥈🥉 emojis, `cup-orange-500` in CTA contexts. Manual review of `Buttons.swift` press-feedback parity.

---

## Phases 5 and 6 — Out of scope this run

Documented below for the follow-up routine.

### Phase 5 — Responsive + a11y

- Web: 320px overflow fixes (OTP boxes, cart row clamps, rewards hero `clamp(2.5rem, 12vw, 3.5rem)`); tablet grid + promo height; desktop sticky bar; modals → real `role="dialog"` + focus trap (QRScanner first); heading hierarchy fix.
- iOS: define `DesignSystem/Typography.swift` with `@ScaledMetric` tokens; sweep replace `.font(.system(size: N, ...))` with new tokens (largest single piece of work); iPad size-class adaptation + lock to portrait for v1; hit-target padding sweep; OrderTrackingView accessibility combine + value.

### Phase 6 — Performance + remaining hardening

- API: Helmet + HSTS + `x-powered-by` disable + `trust proxy`; `express-rate-limit` with Redis; idempotency on `POST /orders`; strict CORS; JWT TTL 1h + refresh token + `requireActiveUser` enabled; pagination on every list endpoint; pino-http audit logging; game minimum-duration check.
- iOS: Keychain `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`; APIClient timeouts (15s request / 30s resource); `CachedAsyncImage` wrapper; pause `PromoBannerView` animation on disappear.
- Web: convert non-interactive surfaces to RSC; image regeneration pipeline (WebP/AVIF); conditional font loading per locale; OG card + sitemap + robots; minimal service worker; catalog SWR.
- Strip orphan files: confirmed dead = `apps/customer-web/src/components/SearchBar.tsx`, `apps/customer-web/src/components/EmptyState.tsx` (if not adopted), iOS `Views/Home/SearchBarView.swift` (handled in 3.31), iOS `Views/Auth/VerifyIDView.swift` (handled in 3.30 — verify nothing left over).

---

## Branch + PR strategy (for the executing remote agent)

- Branch from `main`: `claude/final-pass-phases-1-to-4`.
- Commit per task using conventional-commit style (`fix(api): …`, `feat(ios): …`, `feat(brand): …`).
- After each phase, run the verification commands listed under that phase. **Never commit a failing build.**
- Push the branch after every commit so progress isn't lost.
- Open a PR titled `Cup & Co — final-pass review & polish (Phases 1-4)` against `main` once Phase 1 lands. Update PR description after each subsequent phase with a checklist (✅ done, ⏸ partial, ⏭ deferred).
- **Never push directly to `main`.**

## If you run out of budget

Stop at the **last clean checkpoint** (last verified-passing commit). Push. Update PR description with:
- Phases ✅ complete
- Phase ⏸ partially done — what's done vs pending
- Phases ⏭ untouched
- Specific file:line for any breakages introduced and not yet repaired
- Recommended next-run scope

A clean partial PR is far better than a broken full one.
