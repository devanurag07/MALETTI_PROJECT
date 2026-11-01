# Studio Mirror

Config-driven smart-mirror kiosk for custom salon clients (first: **Maletti**). Built from the **beauty_platform template**
(same MirrorFrame 1080×1920 canvas, salon login, screensaver, Bluevella components, `[locale]` routing), with one
feature module: `features/studio/`.

- Backend: Django app `studio` in `../ADMIN---DJANGO/studio/` (`/api/studio/…`). Seed: `manage.py seed_studio_maletti --salon-code <CODE>`.
- **Frontend owns the UI text and the journey:** labels in `locales/{en,it}.json` → `studio.*` (from the mockup HTML),
  journeys in `features/studio/flows.ts`. Each custom client gets its own frontend, so labels/process can differ.
- **Backend owns the data:** `GET studio/config/` gives theme, modules on/off, catalog (shades, cuts, products + AI
  prompts), metric names. The session only records which flow key was picked.

## Layout
- `features/studio/api.ts` – typed Studio API (template `core/network/axios-client`, salon JWT).
- `features/studio/context/StudioContext.tsx` – config, `t(ns,key)` (next-intl `studio.<ns>.<key>`), `tx(i18n)` for catalog names, session + look draft
  (sessionStorage), theme → `--bv-*` CSS variables.
- `features/studio/screens/*` – one screen per mockup step; `app/[locale]/(main)/*` routes are thin wrappers.
- `app/[locale]/l/[token]` – public QR / e-mail page (outside MirrorFrame, no login).
- `/stylist` – stylist tablet inbox (polls every 5 s).

## Theming / design
- **The design is the "Smart Mirror Maletti" mockup, pixel for pixel.** Screens are ports of its 540×960 templates,
  built from `features/studio/ui/` (Stage zoomed ×2 → 1080×1920, Header, StepBar, Arch, CompareArch, Tabs, …).
- **One theme file styles everything:** `features/studio/theme/maletti.ts` (colours, fonts, shadows, skew, logo).
  `theme/index.tsx` turns it into `--mm-*` CSS vars (+ maps the template's `--bv-*` so login/screensaver match).
  New client look = copy that file and point `theme/index.tsx` at it. No raw hex in screens — use `c("ink")` etc.
- Backend `StudioClient.theme` is no longer used by this frontend.

## Working notes
- Screens use the template `FlowScreen` via `StudioScreen` (header, progress ring, EN/IT toggle, one primary CTA).
- `BASE_URL` = `NEXT_PUBLIC_API_URL` (fallback: production API). Dev: `npm run dev` → http://localhost:3011.
- The beauty_platform journey/report routes were removed; its `features/*` folders remain as libraries.
- Verify with `npx tsc --noEmit` and `npx next build`. Backend tests: scratch SQLite settings, never a real DB.
