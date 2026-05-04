# Phase 4 — Games + Leaderboard: ✅ COMPLETE

**Started:** 2026-05-04  
**Status:** ✅ All platforms shipping (API + iOS + Customer Web)  
**Tests:** 102/102 passing

## Goal

Ship the Coffee Collector game on iOS (SpriteKit) and Web (Canvas), with server-side score validation, weekly leaderboard, and prize issuance. Anti-cheat enforced via server-issued session tokens with calculated maximum scores.

---

## API (commit `2d00037`)

### New endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `POST /games/sessions` | Bearer | Starts a game session. Returns `sessionToken`, `serverMaxScore`, and `expiresAt`. Validates user role/verification before issuing. |
| `POST /games/scores` | Bearer | Submits final score. Server rejects if `score > serverMaxScore` or session expired. Awards loyalty points equal to validated score. |
| `GET /leaderboard/current` | Public | Returns top entries for the current week. Includes rank, user name, score, and week key. |
| `GET /leaderboard/me` | Bearer | Returns current user's rank, total score, and week key for the active week. |
| `GET /prizes` | Bearer | Returns all prizes awarded to the authenticated user, sorted newest first. |
| `POST /admin/leaderboard/settle` | Admin (owner) | Manually triggers weekly prize settlement. Awards coupons to top 3 ranked players (free combo, free drink, 50% off). Idempotent per week. |

### Anti-cheat architecture

- **Session token:** Server generates `serverMaxScore` based on `beansPerSecond × duration × maxMultiplier` formula. Client cannot forge a valid token.
- **Score cap:** Any submitted score exceeding `serverMaxScore` is rejected with 400.
- **Daily limit:** Max 3 sessions per user per day (enforced by `createGameService`).
- **Time-velocity check:** Impossible scores (e.g., more points than seconds elapsed × theoretical max) are rejected.

### Game service (`apps/api/src/services/games.ts`)

- In-memory leaderboard store keyed by `weekKey` (ISO date string, Sunday-aligned Africa/Cairo).
- Scores aggregated per user per week; highest score wins rank.
- Prize generation creates coupon codes with 7-day expiry.

---

## iOS (commit `846bbc7`)

### New views

| View | File | Description |
|---|---|---|
| `GameView` | `Views/Game/GameView.swift` | SwiftUI wrapper presenting SpriteKit scene. Shows score, timer, and controls. |
| `CoffeeCollectorScene` | `Views/Game/CoffeeCollectorScene.swift` | SpriteKit scene with physics-based falling objects. Good beans (+1), bad beans (-1), golden beans (+5). Spawn rate increases over 60s. Particle effects on catch. |
| `LeaderboardView` | `Views/Game/LeaderboardView.swift` | Displays weekly leaderboard with rank badges, player names, and scores. Pull-to-refresh. |

### Integration

- **Rewards tab:** Shows active prizes with coupon codes and expiry countdown.
- **Networking:** `GameAPI.swift` handles session start, score submission, and leaderboard fetch.
- **State:** `CatalogStore` extended to cache leaderboard entries.

---

## Customer Web (commit `51826de`)

### New pages

| Route | Component | Description |
|---|---|---|
| `/game` | `CoffeeCollectorGame.tsx` | HTML5 Canvas game with `requestAnimationFrame`. Identical rules to iOS (60s, +1/-1/+5 scoring, increasing spawn rate). Touch + keyboard controls. |
| `/game` (leaderboard panel) | inline | Leaderboard sidebar showing top 10 + user's rank. |
| `/rewards` (prizes section) | inline | Lists active prizes with coupon code copy-to-clipboard and expiry countdown. |

### Integration

- **API helpers:** `startGameSession`, `submitGameScore`, `fetchLeaderboard`, `fetchPrizes` added to `apps/customer-web/src/lib/api.ts`.
- **Rewards page:** Displays "Prizes" section below points history when user has active coupons.

---

## Quality gates

| Check | Result |
|---|---|
| `pnpm --filter @cup-and-co/api test` | **102/102** ✅ |
| `pnpm --filter @cup-and-co/customer-web typecheck` | ✅ clean |
| `pnpm --filter @cup-and-co/customer-web lint` | ✅ clean |
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

### Game flow (Customer Web)
1. Log in at `/login` with `+201000000001`, OTP `000000`
2. Navigate to `/game` → tap "Start Game"
3. Catch falling beans for 60s → submit score
4. See leaderboard update → check `/rewards` for any prizes

### Game flow (iOS Simulator)
1. Launch app → log in → Rewards tab → "Play Coffee Collector"
2. Play 60s round → score submits automatically
3. View leaderboard → see rank and top players

### Admin settlement
1. Log in to admin (`localhost:3001`) as owner
2. Navigate to Settings → "Settle Leaderboard"
3. Top 3 players receive prize coupons visible in their Rewards screen

---

## Phase 5 scope (when ready)

1. **Reviews + Offers + Admin polish**
   - Admin reviews page (list all, toggle hidden)
   - Admin users page (verification queue, approve/reject/block)
   - Admin offers CRUD (role targeting, schedule, coupon codes)
   - Admin reports (revenue, top items, role breakdown)
   - Web + iOS: Offer display on home, coupon redemption at checkout

See `docs/MASTER-PLAN.md` Phase 5 for full scope.
