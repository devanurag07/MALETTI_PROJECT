/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  MALETTI THEME — the one file that styles the whole Studio Mirror frontend.
 * ─────────────────────────────────────────────────────────────────────────────
 * Values come from the "Smart Mirror Maletti" mockup and the Maletti brand guidelines
 * (C19A6B gold, 3B2A1F espresso, E9DCCB cream, 6B462C brown). Every screen and component
 * reads these through CSS variables (`var(--mm-<name>)`), so changing a value here
 * restyles the app. A new client = copy this file, change the values, point
 * `features/studio/theme/index.ts` at it.
 *
 * Sizes in components are in mockup pixels (the mockup is 540 × 960); the stage
 * is zoomed ×2 to fill the 1080 × 1920 mirror. `layout.stageZoom` controls that.
 */
export const malettiTheme = {
  brand: {
    name: "Maletti",
    /** Logo shown centred in the header (light artwork on the dark header). */
    logo: "/studio/maletti/logo.png",
    logoHeight: 50,
  },

  colors: {
    // Dark theme (like FLUX_VERSION_3): black screens, Maletti palette for everything on them —
    // C19A6B gold accent, E9DCCB cream text/buttons, 3B2A1F espresso text on cream, 6B462C brown glow.

    // Surfaces
    background: "#000000", // screen
    header: "#0B0806", // top bar
    headerLine: "rgba(193,154,107,0.35)", // top bar bottom border (gold)
    surface: "#15100C", // cards, rows
    surfaceRaised: "#211913", // selected cards, inputs
    photo: "#1C1510", // empty photo / arch fill
    halo: "rgba(107,70,44,0.55)", // brand colour 4 — warm glow behind the photo arch
    glass: "rgba(0,0,0,0.6)", // pills / labels on top of photos
    veil: "rgba(0,0,0,0.62)", // "processing" overlay on photos

    // Text
    ink: "#F2E9DD", // primary text on black; also the fill of primary buttons (cream)
    inkMuted: "#BBA791", // secondary text
    inkFaint: "#7C6C5E", // disabled / locked
    onDark: "#3B2A1F", // brand colour 2 (espresso) — text on cream ("ink") fills
    onDarkMuted: "#6B462C", // brand colour 4

    // Accent (gold)
    accent: "#C19A6B", // brand colour 1 — outlines, active tab, diamonds, selection rings
    accentSoft: "#C19A6B", // badges, button inner line
    accentLine: "rgba(193,154,107,0.45)", // decorative parallelograms

    // Lines
    line: "#2B221B", // card borders
    lineCard: "#2B221B",
    lineStrong: "#4A3C30", // outline buttons, inputs
    lineAccent: "#5C4733",
    divider: "#2B221B", // list / tab separators
    dividerSoft: "#1D1712",

    // Controls
    stepDone: "#E9DCCB",
    stepCurrent: "#C19A6B",
    stepTodo: "#3A2F27",
    segment: "#17110D", // segmented control track
    track: "#2E2620", // metric bar track
    iconBg: "#241B15",
    iconFg: "#C19A6B",
    lockedBg: "#16110E",
    phaseChip: "#2E2318",
    dashed: "#FFF8EE", // face oval, mesh highlights (drawn on the photo)

    // Data
    metricCool: "#7FA3B4", // hydration
    metricWarm: "#C19A6B", // sebum
    metricNeutral: "#A08A76",
    zoneOily: "#E8C27A",
    zoneDry: "#7FA3B4",
    compareBackground: "#000000", // letterbox behind before/after photos (square mode)

    // Messages
    errorInk: "#F0B9A9",
    errorBg: "rgba(138,42,30,0.28)",
    errorLine: "rgba(233,140,120,0.4)",

    // Home (welcome) screen
    homeBackground: "#000000",
    homeGlow: "rgba(107,70,44,0.55)", // brand colour 4, warm light from the top / bottom corners
    homeInk: "#FFFFFF",
    homeInkMuted: "rgba(255,255,255,0.82)",
    homeLine: "rgba(255,255,255,0.07)", // big faint parallelograms
    homeCta: "#E9DCCB", // brand colour 3 (guideline option 2: "#C19A6B")
    homeCtaInk: "#3B2A1F",
    homeCard: "rgba(255,255,255,0.05)", // catalogue cards on black
    homeCardLine: "rgba(255,255,255,0.14)",
  },

  fonts: {
    /** Headings: italic didone. Loaded in theme/fonts.ts. */
    display: "var(--font-bodoni), 'Bodoni Moda', 'Bodoni 72', Didot, Georgia, serif",
    body: "var(--font-jost), Jost, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  },

  shadows: {
    cta: "0 12px 26px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(193,154,107,0.6)",
    arch: "0 28px 56px rgba(0,0,0,0.6)",
    card: "0 16px 32px rgba(0,0,0,0.55)",
    swatch: "0 6px 14px rgba(0,0,0,0.5)",
    handle: "0 6px 16px rgba(0,0,0,0.55)",
  },

  shape: {
    /** Skew of the brand "diamond" parallelograms (from the logo). */
    skew: "-14deg",
    stepSkew: "-18deg",
    radiusCard: 22,
    radiusButton: 32,
    /** Before/after viewer: "square" (as in FLUX_VERSION_3) or "arch" (the mockup's rounded top). */
    compare: "square" as "square" | "arch",
  },

  layout: {
    width: 540,
    height: 960,
    /** 540 × 960 mockup → 1080 × 1920 mirror */
    stageZoom: 2,
    gutter: 34,
  },
} as const;

export type StudioTheme = typeof malettiTheme;
