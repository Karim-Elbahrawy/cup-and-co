# Cup & Co API — Contract Reference

Base URL (dev): `http://localhost:4000`

All non-webhook routes require `Authorization: Bearer <jwt>` from `/auth/otp/verify`.
In dev, you may instead pass `x-user-id`, `x-user-role`, `x-verification-status`, `x-user-phone` headers for fast manual testing.

## Auth

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/otp/send` | `{ phone }` | `{ ok, phone, devCode }` |
| POST | `/auth/otp/verify` | `{ phone, code }` | `{ token, user }` |

## Customer

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/me` | — | `{ user, points }` |
| POST | `/orders` | `CreateOrderInput` | `{ order }` |
| GET | `/orders/:id` | — | `{ order }` |
| GET | `/orders` | — | `{ orders }` |
| POST | `/payments/paymob/intention` | `{ orderId, method }` | `PaymentIntention` |
| GET | `/loyalty` | — | `{ balance, discountAvailableEgp }` |
| POST | `/loyalty/redeem-qr` | `{ code }` | `ReceiptClaimResult` |
| POST | `/games/sessions` | — | `GameSession` |
| POST | `/games/scores` | `{ sessionId, score, durationSeconds }` | `SubmitScoreResult` |
| GET | `/leaderboard/current` | — | `{ entries }` |
| GET | `/leaderboard/me` | — | `{ rank, totalScore, weekKey }` |

## Webhooks (no auth, HMAC verified)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/webhooks/paymob` | `PaymobCallbackPayload` (header `x-paymob-hmac`) | `PaymobCallbackResult` |

## Admin

All admin routes require `role` in `{ owner, barista }`. Specific permissions enforced per route.

| Method | Path | Required permission |
|---|---|---|
| GET | `/admin/orders` | `orders:update_status` |
| PATCH | `/admin/orders/:id/status` | `orders:update_status` |
| POST | `/admin/qr-receipts` | `qr_receipts:create` |
| GET | `/admin/summary` | `reports:view_today` |

(Phase 1 expands this with menu, offers, users, loyalty, leaderboard, staff, settings, reports endpoints.)

## Health

`GET /health` → `{ ok: true, service: 'cup-and-co-api', time }`

## Error format

```json
{ "error": "<message>", "details": { /* optional Zod flat */ } }
```

HTTP status codes: 400 (validation/business), 401 (auth), 403 (forbidden), 404 (not found), 500 (server).
