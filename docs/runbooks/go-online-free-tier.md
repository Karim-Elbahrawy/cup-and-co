# Cup & Co — Free-Tier Go-Online Playbook

> **Audience:** Karim. **Time:** ~60–90 min.
> **What you get when you finish:** three live URLs (customer-web, admin, kiosk) hitting a real Supabase, with error tracking + analytics + payments sandbox wired in. iOS device testing is deferred (no Apple Developer enrollment yet).

This is **SHIP-PLAN Phase 0**. You already have all the accounts (Supabase, Render, Vercel, Sentry, PostHog, Paymob); this playbook is configuration only — no signups.

---

## Before you start (2 min)

Open these 6 tabs in your browser. Keep all open while you go through the playbook — you'll alt-tab between them constantly.

1. https://supabase.com/dashboard
2. https://dashboard.render.com
3. https://vercel.com/dashboard
4. https://sentry.io
5. https://eu.posthog.com (or your PostHog region)
6. https://accept.paymob.com/portal2/en (sandbox / dashboard)

Plus: a scratchpad (Notes / Notion / a sticky note). You'll be copying ~15 secret values around.

---

## Step 1 — Supabase (10 min)

### 1a. Create the project

1. Supabase dashboard → **New project**.
2. Org: pick or create one. Region: **eu-west-2 (London)** is closest to Egypt; **eu-central-1 (Frankfurt)** is the best alternative. Either is ~80ms from a Cairo cafe.
3. Name: `cup-and-co-prod` (or `cup-and-co-staging` if you want a staging-first life).
4. Database password: generate a long random one (Supabase has a button) — paste it into your scratchpad. You may need it later for direct-DB tools.
5. Wait ~2 minutes for the project to provision.

### 1b. Get your keys

1. Project sidebar → **Settings** → **API**.
2. Copy these to scratchpad:
   - **Project URL** (e.g. `https://abcdefghijk.supabase.co`) → labeled `SUPABASE_URL` for you
   - **Project API key — anon / public** → labeled `SUPABASE_ANON_KEY`
   - **Project API key — service_role / secret** → labeled `SUPABASE_SERVICE_ROLE_KEY` (this is sensitive — never paste anywhere public)

### 1c. Apply the migrations

There are 13 migration files in `supabase/migrations/0001_*.sql` through `0013_*.sql`. Two ways to apply them:

**Option A — Supabase CLI (recommended if you have it):**
```bash
cd "E:\Kiosk App\supabase"
supabase login
supabase link --project-ref <ref-from-step-1a-URL>
supabase db push
```
Then load the seed: `supabase db reset --linked --include-seed` (or, on a fresh project where the data is empty, run `psql $DATABASE_URL < seed.sql` against the connection string from Settings → Database).

**Option B — paste each migration into the SQL editor (no CLI needed):**
1. Supabase project → **SQL Editor** → **New query**.
2. For each of the 13 migration files in order (0001 → 0013), open the file in this repo, copy its full contents into the SQL editor, click **Run**. Each one should say `Success`.
3. After all 13 land, run `supabase/seed.sql` the same way to load the demo menu (22 products) + 5 demo users + a kiosk row.
4. Verify: in SQL Editor, run `select count(*) from products;` → should return **22**. Run `select count(*) from users;` → should return **5**.

### 1d. (Optional but recommended) Pin the daily anonymize cron

The account-delete migration (`0004_account_lifecycle.sql`) creates a `users_due_for_hard_delete` view. To honour the 30-day grace period:

1. Supabase sidebar → **Database** → **Cron** → **Schedule a new cron job**.
2. Name: `anonymize-deleted-users`. Schedule: `0 3 * * *` (3 AM UTC daily).
3. SQL: `select anonymize_user(id) from users_due_for_hard_delete;`
4. Save. (Skip this if you'd rather rely on a manual review.)

✅ **Done with Supabase** when: your scratchpad has 3 values (URL, anon key, service role key) and `select count(*) from products` returns 22.

---

## Step 2 — Render API (15 min)

### 2a. Connect the repo

1. Render dashboard → **New +** → **Web Service**.
2. Connect the GitHub repo `Karim-Elbahrawy/cup-and-co`. Render will pull it.
3. **Important configs:**
   - **Name:** `cup-and-co-api`
   - **Region:** Frankfurt (closest free-tier region to Egypt)
   - **Branch:** `main`
   - **Runtime:** auto-detected as Docker (because the repo has `apps/api/Dockerfile` referenced from `render.yaml`)
   - **Root Directory:** leave blank — `render.yaml` at repo root handles paths
   - **Plan:** **Free** (you can switch to Starter $7/mo later)
4. Click **Create Web Service**. The first build takes ~5 min.

### 2b. Set the environment variables

While the first build runs, go to: **Environment** tab on the new service.

The `render.yaml` already declares which env vars exist; you fill in the secrets. Add these (all of them, even if some show "auto-generated"):

| Key | Value |
|---|---|
| `SUPABASE_URL` | from scratchpad (step 1b) |
| `SUPABASE_ANON_KEY` | from scratchpad |
| `SUPABASE_SERVICE_ROLE_KEY` | from scratchpad |
| `JWT_SECRET` | leave Render's auto-generated value (or generate yourself with `openssl rand -hex 32`) |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `LOYALTY_ONLINE_MULTIPLIER` | `1.0` |
| `LOYALTY_CASH_MULTIPLIER` | `0.5` |
| `LOYALTY_QR_MULTIPLIER` | `0.25` |
| `LOYALTY_POINTS_PER_DISCOUNT_BLOCK` | `100` |
| `LOYALTY_DISCOUNT_EGP_PER_BLOCK` | `5` |
| `GAME_DURATION_SECONDS` | `60` |
| `GAME_MAX_SCORE` | `300` |
| `GAME_DAILY_SESSIONS_PER_USER` | `3` |
| `KIOSK_BEARER_TOKEN` | run `openssl rand -hex 32` on any machine, paste here. **Save this value — you'll paste it again in Vercel for the kiosk.** |
| `SENTRY_DSN` | (will fill in step 5) |
| `POSTHOG_KEY` | (will fill in step 6) |
| `POSTHOG_HOST` | `https://eu.posthog.com` |
| `PAYMOB_API_KEY` | (will fill in step 7) |
| `PAYMOB_HMAC_SECRET` | (will fill in step 7) |
| `PAYMOB_INTEGRATION_ID_CARD` | (will fill in step 7) |
| `PAYMOB_INTEGRATION_ID_WALLET` | (will fill in step 7) |
| `PAYMOB_IFRAME_ID` | (will fill in step 7) |

Click **Save Changes**. Render redeploys automatically (~2 min).

### 2c. Get the public URL

After the deploy completes, the service shows a green **Live** badge with a URL like `https://cup-and-co-api.onrender.com`.

**Test it:**
```bash
curl https://cup-and-co-api.onrender.com/health
# Expected: {"ok":true}
```

If you get this on the **first** request, free-tier is awake. If not, wait ~30s and try again — the free tier sleeps after 15 min idle and takes 30s to cold-start. **This is fine for testing; upgrade to Starter ($7/mo) before any real traffic.**

✅ **Done with Render** when: `curl /health` returns `{"ok":true}`.

---

## Step 3 — Vercel × 3 projects (15 min)

You'll create three separate Vercel projects, all from the same GitHub repo, each pointing at a different `apps/<name>` root.

### 3a. customer-web

1. Vercel dashboard → **Add New** → **Project** → import `Karim-Elbahrawy/cup-and-co`.
2. **Root Directory:** click **Edit** → set to `apps/customer-web`.
3. **Framework Preset:** Next.js (auto-detected).
4. **Build Command + Output:** leave blank (Vercel reads `apps/customer-web/vercel.json`).
5. **Project name:** `cup-and-co-customer`.
6. Add environment variables (click **Environment Variables**):

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://cup-and-co-api.onrender.com` |
   | `NEXT_PUBLIC_SUPABASE_URL` | from scratchpad |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from scratchpad |
   | `NEXT_PUBLIC_SENTRY_DSN` | (step 5) |
   | `NEXT_PUBLIC_POSTHOG_KEY` | (step 6) |
   | `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.posthog.com` |

7. Click **Deploy**. First build ~3 min.
8. After deploy, Vercel shows a URL like `cup-and-co-customer.vercel.app` — open it on your phone and laptop. You should see the login screen.

### 3b. admin

Same process, but:
- Root Directory: `apps/admin`
- Project name: `cup-and-co-admin`
- Env vars: same `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + Sentry + PostHog. Admin doesn't have its own Sentry project; reuse the customer one or skip the DSN here for v1.

### 3c. kiosk

Same process, but:
- Root Directory: `apps/kiosk`
- Project name: `cup-and-co-kiosk`
- Env vars:

  | Key | Value |
  |---|---|
  | `NEXT_PUBLIC_API_URL` | `https://cup-and-co-api.onrender.com` |
  | `NEXT_PUBLIC_KIOSK_BEARER` | **must match** the `KIOSK_BEARER_TOKEN` you set on Render in step 2b |
  | `NEXT_PUBLIC_KIOSK_ID` | generate a UUID at https://www.uuidgenerator.net/ — save it; this is your "first iPad" id |

### 3d. Wire the GitHub Actions deploy step (one-time)

For future pushes to `main` to auto-deploy, we need the Vercel project IDs in GitHub secrets.

1. For each Vercel project: **Settings** → **General** → scroll to **Project ID**, copy it.
2. https://github.com/Karim-Elbahrawy/cup-and-co/settings/secrets/actions → **New repository secret**:
   - `VERCEL_PROJECT_ID_CUSTOMER` ← customer-web project ID
   - `VERCEL_PROJECT_ID_ADMIN` ← admin project ID
   - `VERCEL_PROJECT_ID_KIOSK` ← kiosk project ID
3. Also add (one-time):
   - `VERCEL_TOKEN` ← from https://vercel.com/account/tokens (create a new token, scope: full)
   - `VERCEL_ORG_ID` ← from any Vercel project's Settings → General
   - `RENDER_DEPLOY_HOOK_URL` ← Render service → Settings → Deploy Hook → "Create Hook" → copy URL

After this, every push to `main` triggers `.github/workflows/deploy.yml` which deploys all 4 services automatically.

✅ **Done with Vercel** when: all 3 URLs load in your browser and customer-web shows the login screen.

---

## Step 4 — Smoke test (5 min)

Before wiring observability, confirm the basic loop works.

### 4a. Open customer-web URL

1. Phone screen: `https://cup-and-co-customer.vercel.app`
2. Login → enter `+201000000001` → tap "Send code".
3. **Note:** in the dev DB (free Supabase + seeded data), the dev OTP `000000` works for the 5 demo users. In production with a real Twilio/SMS provider, OTPs are real — but you don't have one configured yet, so the dev path remains.
4. Land on home → menu loads → tap a product → add to cart → checkout → place order (Cash) → tracking page shows status.

### 4b. Open admin URL

1. `https://cup-and-co-admin.vercel.app`
2. Login as `+201000000004` (owner) / OTP `000000`.
3. Dashboard loads → see your test order from step 4a → click into orders → status transitions work.
4. Visit `/reports` — check that all sections load (Revenue Trend, Peak Hours, Top items, Reviews, etc.) — these were restored in PR #66.

### 4c. Open kiosk URL

1. `https://cup-and-co-kiosk.vercel.app`
2. The 5-icon category landing should appear immediately.
3. Tap a product → customize → cart → checkout (Cash) → confirmation page with pickup code.
4. The order should appear in the admin's KDS (`/kds`) within 1s (SSE).

If any step fails, **screenshot it** and check the Render logs (Render dashboard → service → Logs). Most failures are env-var mismatches.

✅ **Done with smoke test** when: all 3 URLs work end-to-end.

---

## Step 5 — Sentry (5 min)

You already have Sentry. Configure 2 projects.

1. Sentry → create project `cup-co-api` (Platform: Node.js / Express).
2. Copy the DSN (a URL like `https://abc@o123456.ingest.sentry.io/789`). Paste it into Render as `SENTRY_DSN`.
3. Create project `cup-co-web` (Platform: Next.js).
4. Copy that DSN. Paste into Vercel as `NEXT_PUBLIC_SENTRY_DSN` for **both** customer-web and admin projects.
5. (Optional) Create `cup-co-kiosk` similarly. Same env var name on the kiosk Vercel project.
6. Trigger a redeploy on Render (click **Manual Deploy** → **Deploy latest commit**) and on each Vercel project.

**Test:** in browser DevTools console, run `throw new Error("test sentry")`. Within 10s, the error should show up in the Sentry web project.

For source-map upload (optional, makes stack traces readable): in Vercel, also set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (token from sentry.io → Settings → Auth Tokens). Skip if you don't care about pretty stack traces in v1.

✅ **Done with Sentry** when: a test error shows up in the dashboard.

---

## Step 6 — PostHog (5 min)

You already have PostHog. Configure one project.

1. eu.posthog.com → **+ New project** → name `cup-co-prod`.
2. Project Settings → **Project API Key** → copy.
3. Paste into:
   - Render env: `POSTHOG_KEY`
   - Vercel customer-web: `NEXT_PUBLIC_POSTHOG_KEY`
   - Vercel admin: `NEXT_PUBLIC_POSTHOG_KEY` (same value)
   - Vercel kiosk: `NEXT_PUBLIC_POSTHOG_KEY` (same value)
4. Make sure `POSTHOG_HOST` and `NEXT_PUBLIC_POSTHOG_HOST` are set to `https://eu.posthog.com` on all 4 services.
5. Trigger a redeploy on Render and Vercel.

**Test:** visit `cup-and-co-customer.vercel.app`, tap around, then go to PostHog → **Live events**. You should see `$pageview`, `signup_started`, `product_viewed`, `checkout_started`, etc. within 30s (these 4 funnel events were wired in PR #15).

✅ **Done with PostHog** when: events show up in the Live events feed.

---

## Step 7 — Paymob sandbox (10 min)

You already have Paymob. We'll use sandbox keys for testing — no real money moves. **Switch to production keys later** when you're ready to take real payments.

1. Paymob portal → **Developers** → **Sandbox Credentials** (left sidebar).
2. Copy these into your scratchpad:
   - **API Key** (long base64 token)
   - **HMAC Secret** (32-char hex)
   - **Integration ID — Online Card** (a number)
   - **Integration ID — Wallet (Paymob Wallet)** (another number)
   - **Iframe ID** (used for the hosted checkout page)
3. Paste them into Render env vars (from step 2b):
   - `PAYMOB_API_KEY`
   - `PAYMOB_HMAC_SECRET`
   - `PAYMOB_INTEGRATION_ID_CARD`
   - `PAYMOB_INTEGRATION_ID_WALLET`
   - `PAYMOB_IFRAME_ID`
4. Configure the webhook URL in Paymob: **Developers** → **Transaction processed callback** → set to `https://cup-and-co-api.onrender.com/webhooks/paymob`. Paymob calls this when a transaction completes.
5. Trigger a Render redeploy.

**Test:** customer-web checkout → choose "Card" → Paymob iframe should open → use a sandbox card number from Paymob's docs (typically `4987654321098769` with any future expiry + CVV `123`).

✅ **Done with Paymob** when: you can complete a sandbox card payment and the order shows `payment_status: 'paid'` in admin.

---

## Step 8 — Final verification (5 min)

Open all 3 public URLs. Run through the same flows from step 4. Then:

- [ ] Sentry → no unexpected errors in the last 30 min
- [ ] PostHog → events flowing
- [ ] Render → API logs show no `[error]` lines
- [ ] Vercel → all 3 deployments green

Now anyone with the URLs can test the project. Send the kiosk URL to a tablet (Add to Home Screen + Guided Access — see `docs/runbooks/go-live-kiosk.md` for the iPad lockdown steps).

---

## What's deferred (intentionally)

These are NOT part of Phase 0 and don't block testing:

| Deferred | Why | When it unblocks |
|---|---|---|
| **iOS native app on TestFlight** | No Apple Developer enrollment ($99/yr) | When you enroll. Then SHIP-PLAN Phase 1.6 wires the GitHub Actions TestFlight upload. |
| **Apple Pay / Google Pay** | Needs Apple Pay Merchant Cert + Google Pay Merchant ID | SHIP-PLAN Phase 3.1 / 3.2. |
| **APNs (real iOS push)** | Needs APNs Auth Key (.p8) from Apple Dev portal | SHIP-PLAN Phase 1.1 + 3.4. |
| **Web Push (browser push)** | Out of scope for v1 (UPGRADE-PLAN deferred) | Future. |
| **Paymob terminal (kiosk card reader)** | Needs Paymob terminal SDK access | SHIP-PLAN Phase 3.3. |
| **Custom domain** | Optional — `*.vercel.app` URLs are fine for testing | When you buy `cupandco.app` or similar. |

The web/admin/kiosk loop works **completely** without any of these. iOS device testing waits until you decide to enroll in Apple Developer.

---

## Switching to "real production" later (free → paid)

When traffic justifies, here's what to upgrade — no code changes needed:

| Service | Free → Paid | Why upgrade | What to do |
|---|---|---|---|
| **Render** | Free → Starter ($7/mo) | Removes 30s cold start | Render dashboard → service → Settings → Plan → upgrade |
| **Supabase** | Free → Pro ($25/mo) | 8GB DB, daily backups, no 1-week pause | Supabase project → Settings → Billing → upgrade |
| **Vercel** | Hobby → Pro ($20/mo per user) | Required only when you commercialize (Hobby ToS forbids commercial use) | Vercel → Settings → Billing |
| **Sentry** | Free → Team ($26/mo) | Above 5k errors/mo, more retention | Sentry → Settings → Subscription |
| **PostHog** | Free → Pay-as-you-go ($0+ above 1M events) | Above 1M events/mo | PostHog → Billing |
| **Paymob** | Sandbox → Production | Real money | Paymob portal → Developers → Production Credentials → swap keys in Render |

**Rough total at "real production":** Render Starter $7 + Supabase Pro $25 + Vercel Pro $20 = **$52/mo** before traffic-based costs. PostHog and Sentry stay free until you hit the limits.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `curl /health` 404s | Render still building | Check **Logs** tab — wait until "Service is live" |
| customer-web shows blank page | `NEXT_PUBLIC_API_URL` wrong | Vercel → Settings → Env Variables → confirm it's the Render URL with `https://` |
| OTP `000000` rejected | Production NODE_ENV with no real SMS | Either set `DEV_OTP_OVERRIDE=000000` on Render (insecure for real customers; OK for testing) OR wire Twilio (out of scope here) |
| Kiosk shows "Reconnecting" | `NEXT_PUBLIC_KIOSK_BEARER` mismatch | Confirm Render `KIOSK_BEARER_TOKEN` and Vercel kiosk `NEXT_PUBLIC_KIOSK_BEARER` are byte-identical |
| Pickup code shows but admin doesn't see order | Migration `0013_placement_source.sql` not applied | Re-run that migration on Supabase |
| Paymob iframe shows but payment never completes | Webhook URL wrong | Paymob portal → Developers → Transaction Processed → confirm `https://cup-and-co-api.onrender.com/webhooks/paymob` |
| Sentry not receiving errors | DSN typo | Render dashboard → confirm `SENTRY_DSN` exactly matches Sentry project settings DSN |

If you hit something not listed here, screenshot the Render logs (last 50 lines) and the failing browser screen and share with me — I'll diagnose.

---

## Updating the master tracker when done

When all 8 steps are green:

1. Open `docs/SHIP-PLAN.md` and update Phase 0 rows to `[x]` with today's date.
2. Commit the SHIP-PLAN update on `main` directly (it's a status-only change).
3. Tell me — I'll move on to SHIP-PLAN Phase 1 (iOS parity) or Phase 2 (operational hardening), whichever you prefer.
