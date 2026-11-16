# Studio Mirror

Config-driven smart-mirror kiosk for custom salon clients (first: **Maletti**). Built from the **beauty_platform template**
(same MirrorFrame 1080×1920 canvas, salon login, screensaver, Bluevella components, `[locale]` routing), with one
feature module: `features/studio/`.

- Backend: Django app `studio` in `../ADMIN---DJANGO/studio/` (`/api/studio/…`). Seed: `manage.py seed_studio_maletti --salon-code <CODE>`.
- **Frontend owns the UI text and the journey:** labels in `locales/{en,it,es,fr,de}.json` → `studio.*` (from the mockup HTML),
  languages in `STUDIO_LOCALES` (StudioContext), journeys in `features/studio/flows.ts`. Each custom client gets its own frontend, so labels/process can differ.
- **Backend owns the data:** `GET studio/config/` gives theme, modules on/off, catalog (shades, cuts, products + AI
  prompts), metric names. The session only records which flow key was picked.

## Layout
- `features/studio/api.ts` – typed Studio API (template `core/network/axios-client`, salon JWT).
- `features/studio/context/StudioContext.tsx` – config, `t(ns,key)` (next-intl `studio.<ns>.<key>`), `tx(i18n)` for catalog names, session + look draft
  (sessionStorage), theme → `--bv-*` CSS variables.
- `features/studio/screens/*` – one screen per mockup step; `app/[locale]/(main)/*` routes are thin wrappers.
- `/` = dark welcome screen (`HomeScreen`, `home*` colours in the theme) → `/capture` (step 1, camera).
- Consultation: Profile (Male/Female, none pre-selected) → `/analysis` (face analysis scan → Facial analysis page) →
  Haircut → Beard (men) → Armocromia (intro → 5 s scan → the first two colour-harmony pages: season, undertone + palette)
  → Hair colour → Make-up (women) → Skin; then review + QR (`JOURNEY` in flows.ts). The analysis runs in two calls side by
  side (`pending-upload.ts`): face first (`ensureFaceAnalysis`, the face / haircut / beard pages), then colour + skin
  (`ensureAnalysis` = all). Armocromia isn't a numbered "Service n". Only Armocromia and Skin have an intro page and a
  5 s scan (`HAS_INTRO`); try-on services open on their recommendations.
  Recommendations: 3 for haircut / beard, 5 for hair colour / make-up. Skin: results → map → products → services.
- No step bar: only the consultation's `JourneyBar` shows progress.
- **Maletti AI prompts** (backend `studio/maletti_prompts.py`, `CLIENT_PIPELINES` in `studio/pipelines.py`): face +
  armocromia, one prompt per gender; the AI picks the cuts (+ fade / bangs / styling → `metrics.hair_params`), beards,
  hair colours (FLUX shades, `metrics.hair_recs`) and make-up (FLUX lipstick / blush / eyeshadow, `metrics.makeup_recs`).
  `data/ai-recs.ts` turns the colour ones into the tab's hair_shade / makeup_look recommendations; AI make-up looks are
  `mix.<lip>.<eye>.<blush>` keys (`data/makeup.ts`), saved in `params.makeup_mix`. A gender change drops the analysis.
- Custom hair colours = FLUX_VERSION_3's 24 shades only, frontend data (`features/studio/data/haircolor.ts` + its JSON, no
  seeding), 4×4 per page. Try-on sends `shade_key` + FLUX `shade_prompt`; a saved look keeps it in `params.hair_colour`.
- `app/[locale]/l/[token]` – public QR / e-mail page (outside MirrorFrame, no login).
- `/stylist` – stylist tablet inbox (polls every 5 s).

## Theming / design
- **The design is the "Smart Mirror Maletti" mockup, pixel for pixel.** Screens are ports of its 540×960 templates,
  built from `features/studio/ui/` (Stage zoomed ×2 → 1080×1920, Header, Arch, CompareArch, Tabs, …).
- **Dark theme** (black screens, like FLUX_VERSION_3) in the Maletti palette: C19A6B gold accent, cream text (`ink`),
  cream-filled buttons with 3B2A1F espresso text (`on-dark`), 6B462C brown glow. Photo overlays use `glass` / `veil` tokens.
- **One theme file styles everything:** `features/studio/theme/maletti.ts` (colours, fonts, shadows, skew, logo).
  `theme/index.tsx` turns it into `--mm-*` CSS vars (+ maps the template's `--bv-*` so login/screensaver match).
  New client look = copy that file and point `theme/index.tsx` at it. No raw hex in screens — use `c("ink")` etc.
- Backend `StudioClient.theme` is no longer used by this frontend.

## Working notes
- Screens use the template `FlowScreen` via `StudioScreen` (header, progress ring, EN/IT toggle, one primary CTA).
- `BASE_URL` = `NEXT_PUBLIC_API_URL` (fallback: production API). Dev: `npm run dev` → http://localhost:3011.
- The beauty_platform journey/report routes were removed; its `features/*` folders remain as libraries.
- Verify with `npx tsc --noEmit` and `npx next build`. Backend tests: scratch SQLite settings, never a real DB.
