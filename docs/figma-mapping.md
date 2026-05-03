# Figma → Component Mapping

Source Figma file: https://www.figma.com/design/JnPiZHivLqiYSYdKNYe7DA/Coffee-Shop-App-Design-UI-Kit--FREE---Community-

This document maps each Figma frame to its component path in code so the Figma MCP can be re-pulled per screen during implementation, and so visual regression tests know which Figma export to diff against.

## Phase 0 — placeholder
Phase 0 ships a generic landing card on each platform. Phase 1 fills this table in with real node IDs and component paths once we begin pulling per-screen.

| Figma node ID | Screen | Customer Web path | iOS path | Admin path |
|---|---|---|---|---|
| TBD | Splash | `apps/customer-web/src/app/(public)/splash/page.tsx` | `Views/SplashView.swift` | — |
| TBD | Phone OTP | `apps/customer-web/src/app/(auth)/login/page.tsx` | `Auth/PhoneOTPView.swift` | — |
| TBD | Role select | `apps/customer-web/src/app/(auth)/role/page.tsx` | `Auth/RoleSelectView.swift` | — |
| TBD | Home (greeting + promo + tabs + grid) | `apps/customer-web/src/app/(authed)/home/page.tsx` | `Views/HomeView.swift` | — |
| TBD | Product Detail (size/sugar/ice) | `apps/customer-web/src/app/(authed)/products/[id]/page.tsx` | `Views/ProductDetailView.swift` | — |
| TBD | Cart | `apps/customer-web/src/app/(authed)/cart/page.tsx` | `Views/CartView.swift` | — |
| TBD | Checkout | `apps/customer-web/src/app/(authed)/checkout/page.tsx` | `Views/CheckoutView.swift` | — |
| TBD | Order Tracking (timeline) | `apps/customer-web/src/app/(authed)/orders/[id]/page.tsx` | `Views/OrderTrackingView.swift` | — |
| TBD | Rewards | `apps/customer-web/src/app/(authed)/rewards/page.tsx` | `Views/LoyaltyView.swift` | — |
| TBD | QR Scanner | `apps/customer-web/src/app/(authed)/scan/page.tsx` | `Views/QRScannerView.swift` | — |
| TBD | Game | `apps/customer-web/src/app/(authed)/game/page.tsx` | `Game/CoffeeCollectorScene.swift` | — |
| TBD | Profile | `apps/customer-web/src/app/(authed)/profile/page.tsx` | `Views/ProfileView.swift` | — |
| TBD | Admin login | — | — | `apps/admin/src/app/login/page.tsx` |
| TBD | Admin overview | — | — | `apps/admin/src/app/(authed)/page.tsx` |
| TBD | Admin live orders | — | — | `apps/admin/src/app/(authed)/orders/page.tsx` |
| TBD | Admin menu | — | — | `apps/admin/src/app/(authed)/menu/page.tsx` |
| TBD | Admin offers | — | — | `apps/admin/src/app/(authed)/offers/page.tsx` |
| TBD | Admin users / verify / block | — | — | `apps/admin/src/app/(authed)/users/page.tsx` |
| TBD | Admin loyalty | — | — | `apps/admin/src/app/(authed)/loyalty/page.tsx` |
| TBD | Admin leaderboard | — | — | `apps/admin/src/app/(authed)/leaderboard/page.tsx` |
| TBD | Admin QR generator | — | — | `apps/admin/src/app/(authed)/qr/page.tsx` |
| TBD | Admin reports | — | — | `apps/admin/src/app/(authed)/reports/page.tsx` |
| TBD | Admin staff | — | — | `apps/admin/src/app/(authed)/staff/page.tsx` |
| TBD | Admin settings | — | — | `apps/admin/src/app/(authed)/settings/page.tsx` |
