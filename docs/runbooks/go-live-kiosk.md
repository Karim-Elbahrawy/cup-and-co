# Cup & Co Kiosk — Go-Live Runbook

> Read top-to-bottom on the day you put the iPad on the counter. Each section is independent — finish one before starting the next.

## At a glance

You'll do four things, roughly in this order:

1. **Database** — apply one migration on Supabase (~1 minute)
2. **Backend** — set one env var on Render (~2 minutes)
3. **Kiosk hosting** — create a Vercel project, set three env vars (~5 minutes)
4. **iPad** — open the URL, "Add to Home Screen", turn on Guided Access (~5 minutes)

---

## 1 — Apply the database migration

What this does: adds two columns to your `orders` table so each order is tagged with which surface placed it (kiosk vs phone app vs admin).

1. Go to https://supabase.com/dashboard → pick your Cup & Co project.
2. Left sidebar → **SQL Editor** → click **New query**.
3. Open `supabase/migrations/0013_placement_source.sql` in this repo, copy the whole file's contents into the SQL editor.
4. Click **Run**.

You should see `Success. No rows returned`. If it fails with "type already exists" you've already run it; safe to skip.

---

## 2 — Set the kiosk bearer token on Render (the backend)

What this does: gives all your kiosks a shared password that lets them place orders without a per-customer login.

1. Generate a random secret. On any device with a terminal:
   ```
   openssl rand -hex 32
   ```
   Or use any password generator. **Save this value — you'll paste it in 4 places.**

2. Go to https://dashboard.render.com → pick your `cup-and-co-api` service.
3. Left sidebar → **Environment**.
4. Add a new env var:
   - **Key**: `KIOSK_BEARER_TOKEN`
   - **Value**: the secret you just generated
5. Click **Save Changes**. Render will redeploy automatically (~2 minutes). Wait for the green "Live" status.

---

## 3 — Host the kiosk on Vercel

What this does: puts the kiosk web app on a URL the iPad can open.

### 3a — Create the project

1. Go to https://vercel.com/dashboard → **Add New** → **Project**.
2. Import from GitHub: pick `Karim-Elbahrawy/cup-and-co`.
3. **Important**: in the import dialog:
   - **Project name**: `cup-and-co-kiosk`
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: click **Edit** → set to `apps/kiosk`
   - **Build Command**: leave blank (Vercel reads `vercel.json`)
   - **Output Directory**: leave blank
4. Click **Environment Variables**, add three:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | Your Render API URL, e.g. `https://cup-and-co-api.onrender.com` |
   | `NEXT_PUBLIC_KIOSK_BEARER` | The same secret from step 2 |
   | `NEXT_PUBLIC_KIOSK_ID` | A new uuid for this iPad. Use https://www.uuidgenerator.net/ — save it for your records. |

5. Click **Deploy**. First build takes ~3 minutes. When done, Vercel shows a URL like `cup-and-co-kiosk.vercel.app`. **Open it on your laptop first** to confirm the attract loop renders.

### 3b — Wire the GitHub Action (optional but worth it)

So future kiosk deploys happen automatically on every push to `main`:

1. In your Vercel project → **Settings** → **General** → scroll to **Project ID**, copy it.
2. https://github.com/Karim-Elbahrawy/cup-and-co/settings/secrets/actions → **New repository secret**:
   - **Name**: `VERCEL_PROJECT_ID_KIOSK`
   - **Secret**: paste the project ID
3. Done. Next push to `main` will redeploy the kiosk via `.github/workflows/deploy.yml`.

---

## 4 — Install on the iPad

1. **Plug the iPad in** to power. Kiosks should never run on battery.
2. Open **Safari** → navigate to your Vercel URL (e.g. `cup-and-co-kiosk.vercel.app`).
3. Tap the **Share** button (square with up-arrow) → **Add to Home Screen** → name it "Cup & Co" → **Add**.
4. **Close Safari**. Open the new icon from the home screen — the kiosk fills the entire screen with no Safari chrome.
5. Optional but recommended: turn on **Guided Access** so customers can't exit:
   - Settings → **Accessibility** → **Guided Access** → toggle on
   - Set a passcode (write it down — only the manager knows this)
   - In the kiosk app, **triple-click the side button** to enter Guided Access
   - Tap **Start** in the top-right
6. Mount the iPad. **Heckler @Rest** for countertops or **Bouncepad** for wall mount.

### Day-1 sanity test

- Tap the screen → catalog opens
- Tap a coffee → customize screen opens with options
- Tap ADD TO ORDER → cart pill shows
- Tap pill → drawer opens with the line
- Tap CHECKOUT → "Pay at counter" → big pickup code shows
- Walk away for 90 seconds → "still there?" overlay appears, then resets to attract
- Tap 🇪🇬 AR pill → entire kiosk flips to Arabic with right-to-left layout

If any step fails, screenshot it and check the Render logs (https://dashboard.render.com → your service → Logs).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Catalog spinner forever | API URL wrong or unreachable | Check `NEXT_PUBLIC_API_URL` in Vercel; test by opening it directly in a browser — should return JSON |
| Catalog loads, checkout 401s | Kiosk bearer token mismatch | Re-paste `KIOSK_BEARER_TOKEN` (Render) and `NEXT_PUBLIC_KIOSK_BEARER` (Vercel) — they MUST be identical |
| Pickup code shows but order doesn't appear in admin | placement_source migration not applied | Re-run the SQL from step 1 |
| Top-left pill stuck on "Reconnecting" | iPad on captive-portal wifi | Switch to a non-captive network or hotspot |
| Customers swipe out of the kiosk | Guided Access not on | Triple-click side button to enter Guided Access |
| Arabic font looks wrong | Cairo font didn't load | Check that the iPad has internet — Cairo is loaded from Google Fonts on first paint |

---

## What's deferred

These features are planned but not in this build:

- **Card payments** ("Pay by card" is greyed out) — needs Paymob terminal SDK access. K3 of `docs/KIOSK-PLAN.md`.
- **Receipt printer** — Star TSP143IIIBI thermal printer, K5.
- **Multi-kiosk admin dashboard** — track per-iPad sales, K6.
- **Voice ordering** — Siri-style "I want a flat white", K7.

The kiosk is fully usable without any of these.
