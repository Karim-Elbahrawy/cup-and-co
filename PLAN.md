# Cup & Co — Master Plan

The authoritative implementation plan lives in the Claude plan file used during planning:

`C:\Users\LEGION\.claude\plans\sparkling-enchanting-sphinx.md`

That file is the source of truth for:

- Decisions locked (app name, salvage strategy, languages, payments, games)
- Tech stack, repo layout, design system, naming conventions
- Database schema, Express API surface, screen-by-screen IA
- Loyalty/games rules, push notifications, payment flow
- 7-phase roadmap with weekly checkpoints
- Test plan, success criteria, verification commands, open risks

This `PLAN.md` is intentionally short — it points at the canonical plan rather than duplicating it (so updates land in one place).

## Quick reference

- **App name**: Cup & Co
- **Build order**: iOS + customer web + admin in parallel waves
- **Languages**: Arabic + English (RTL on day one)
- **Payments**: Paymob with cash-on-pickup fallback
- **Loyalty**: 1 / 0.5 / 0.25 points-per-EGP for online / cash / QR; 100 pts = 5 EGP
- **Game**: Coffee Collector, students-only, server-validated, weekly leaderboard
