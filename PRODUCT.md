# Cup & Co — Product Brief

## Product purpose
Cup & Co is a specialty coffee shop ordering app for a university campus in Egypt. Students, faculty, and staff order ahead via the mobile web app or an on-site kiosk, skip the queue, and collect at the counter. The admin panel lets the owner and baristas manage orders, the menu, and availability in real time.

## Register
product

## Users
- **Primary**: University students (18–26, phone-native, Arabic or English, time-pressured between lectures)
- **Secondary**: Faculty and office staff (more deliberate, often Arabic-language preference)
- **Operators**: Baristas and owners managing orders, availability, and stock from the admin panel

## Brand personality
Three words: **warm, grounded, earned**. A specialty cafe that knows its community by name — not a chain, not a hipster project, not a generic delivery app. The best cafe on campus. The one that feels like it belongs.

**Tone**: Direct, warm, slightly playful. Confident without being cute.
**Anti-tone**: Corporate, cold, fast-food energy, generic SaaS beige.

## Design principles
1. **Mobile-first**: The customer app lives inside a ~430 px phone frame. Desktop is a fallback, not a target.
2. **Warm over cool**: Terracotta primary, warm cream/paper backgrounds, espresso text. Deep teal is the surprising secondary that stops it from feeling orange-monochrome.
3. **Arabic is equal**: RTL-ready, Cairo font for Arabic, not bolted on.
4. **Hierarchy over decoration**: No decorative dividers, no gradient text, no ambient blur. Every element earns its place.
5. **Premium, earned**: Shadows are warm and subtle — not glassy. Corners are decisive (20 px cards, pill buttons). Nothing looks like a Figma kit export.

## Palette
- Primary: `#C2410C` (terracotta)
- Primary hover: `#9A3412`
- Accent: `#0F766E` (deep teal)
- Paper background: `#F7F7F5`
- Surface: `#FFFFFF`
- Espresso text: `#1C1917`
- Cocoa text: `#44403C`
- Muted text: `#78716C`
- Stroke: `#E7E5E4`
- Success: `#15803D`
- Error: `#B91C1C`
- Star: `#F59E0B`

## Typography
- Headings: **Sora** (web)
- Body: **Inter** (web)
- Arabic: **Cairo**

## Product categories
Hot coffee, cold coffee, milk coffee, hot teas, hot drinks, blended, desserts, breakfast. Prices in EGP (Egyptian pounds).

## Anti-references
- Generic food delivery apps (Talabat / Uber Eats aesthetic)
- White-on-white SaaS minimal
- Neon-on-dark "premium coffee" aesthetics
- Busy, colorful grocery-store energy
- Social-media-kit pastel rounds

---

# Kiosk Surface — Product Context

> Source-extracted from `docs/brand-guide.md` and `docs/KIOSK-PLAN.md`. Authoritative for any UI/UX work in `apps/kiosk`. The companion `apps/customer-web` and `apps/admin` have overlapping but distinct contexts; this section is kiosk-specific.

## Register

**product** — design serves the ordering flow, not the brand identity. The customer is in front of the iPad with a clear job: place a coffee order in under 60 seconds. The kiosk is a tool, not a marketing surface. Brand expression lives in palette, typography, and the drink-builder craft, never in copy density.

## Users

A single primary persona, lit by the time they walk up:

**The Cup & Co customer at the cafe counter.** Egyptian university campus. Could be a student between classes, a faculty member on a coffee run, a visitor finding the cafe for the first time. They have:

- 30–90 seconds before they want their drink in hand
- Both hands occasionally full (laptop, books, phone)
- One mental model: "tap → pick → pay"
- A 50/50 split on EN vs. AR literacy preference (the lang toggle is a primary affordance, not a settings-screen detail)
- Often no Cup & Co account, and no desire to make one to order

Secondary read: a returning member who taps the optional "Earn points?" pill and identifies via OTP. They get a personalized hero ("Your usual"), but the anonymous flow stays the default and the dominant path.

## Product purpose

Replace the cashier-line bottleneck for in-cafe orders. The customer self-serves on a wall- or counter-mounted iPad, gets a 4-digit pickup code, walks to the counter to pay cash (K1) or tap-to-pay (K3), and the order appears in the barista's KDS automatically. The flow has to feel **faster than the line**, otherwise customers won't switch.

## Voice

From `docs/brand-guide.md`: **warm, calm, briskly helpful.** "We are the friend who has your coffee ready before you walk in."

In the kiosk specifically:

- Headings are imperative and short. *"Tap to order."* *"How will you pay?"* *"Show this at the counter."*
- Body copy is one sentence, never two. Two sentences means you wrote a paragraph, which means the customer is reading instead of tapping.
- AR copy is colloquial Egyptian, not Modern Standard Arabic. *"كمّل الكومبو"* not *"أكمل الوجبة"*. Lift this from the existing kiosk components when in doubt.
- No university metaphors anywhere. We are a coffee shop that happens to be on a campus, not a campus that happens to have coffee.

## Anti-references

These are the failure modes to actively reject:

- **McDonald's-style kiosk** — clutter, multiple primary CTAs per screen, garish photography, marketing banners between menu items.
- **Generic SaaS dashboard** — sidebar + header + content; this is a kiosk, not a tool. No persistent navigation.
- **Glossy 3D coffee renders** — we have flat product photography on warm cream surfaces. Stay there.
- **Rounded-everything Material 3** — our radii are deliberate (chip 999px, card 24px, pill 999px). Never apply 999px to cards or 8px to chips.
- **Candy-bright orange that looks like Fanta** — terracotta `#C2410C` only. The pre-rebrand `#FF8B3D` is banned.

## Strategic principles (locked, not re-litigated per design)

| Principle | What it means in the UI |
|---|---|
| Anonymous-first | No "log in" prompt anywhere on the dominant path. Identification is opt-in at one place: the cart drawer footer pill. |
| Big-touch primitives | Min 88×88pt tappable targets. Chips, pills, buttons all hit this floor. Cards 160×160pt minimum. |
| One primary action per screen | The hero CTA per screen is unmistakable. Secondary actions are smaller, paler, never compete. |
| 60-second target | From attract-loop tap to pickup code on screen, the median customer should land in ≤60s. Optimize for taps not pixels. |
| Privacy-by-default reset | 90s no input → "still there?" → 10s grace → cart cleared, language reset, identity cleared, attract loop. The next customer cannot see anything personal. |
| Brand-locked palette | `#C2410C` terracotta + `#0F766E` teal + `#FEF3C7` cream + `#FAF6F0` paper + `#1C1917` espresso. The teal-against-warm contrast is the differentiator and is non-negotiable. |
| EN ↔ AR + RTL | Direction flips on `<html dir>`. Use `start/end` not `left/right` in any new layout. Numbers stay tabular-nums. Cairo font for AR. |
| Reduced motion respected | Every animation degrades gracefully under `prefers-reduced-motion: reduce`. Confirmation confetti, drink-builder layer fades, "still there?" countdown ring all already comply. |

## Surface taxonomy

| Surface | Role | Register touchpoint |
|---|---|---|
| `/` (attract loop) | Standby + invitation | Almost brand register — sunrise gradient, big poster crossfades — but always in service of the call to action |
| `/catalog` | Decision surface | Pure product register — fast scanning, instant visual recognition |
| `/products/[id]` | Customize surface | Product register — the live drink builder is the showpiece |
| `/checkout` | Confirmation surface | Product register — order summary + one decisive payment action |
| `/confirmation` | Handover surface | Brand-tinged product — the pickup code is huge, the language is warm |
