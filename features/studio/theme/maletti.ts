/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  MALETTI THEME — the one file that styles the whole Studio Mirror frontend.
 * ─────────────────────────────────────────────────────────────────────────────
 * Values come from the "Smart Mirror Maletti" mockup. Every screen and component
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
    /** Logo shown centred in the header (light artwork on the header colour). */
    logo: "/studio/maletti/logo.png",
    logoHeight: 50,
  },

  colors: {
    // Surfaces
    background: "#F2EBE2", // screen
    header: "#C8BEB5", // top bar
    headerLine: "#A98E70", // top bar bottom border
    surface: "#FAF6F1", // cards, rows
    surfaceRaised: "#FFFDF9", // selected cards, inputs
    photo: "#E9DCCB", // empty photo / arch fill
    halo: "rgba(255,251,245,1)", // glow behind the photo arch

    // Text
    ink: "#3B2A1F", // primary text, dark buttons
    inkMuted: "#6B5444", // secondary text
    inkFaint: "#8E7A6A", // disabled / locked
    onDark: "#F7F1E8", // text on ink
    onDarkMuted: "#E8DCCD",

    // Accent (gold)
    accent: "#A47E4B", // outlines, active tab, diamonds, selection rings
    accentSoft: "#C4A06A", // badges, button inner line
    accentLine: "rgba(164,126,75,0.5)", // decorative parallelograms

    // Lines
    line: "#E6D9CB", // card borders
    lineCard: "#E1D3C3",
    lineStrong: "#CDB9A4", // outline buttons, inputs
    lineAccent: "#DCCAB7",
    divider: "#DCCEBF", // list / tab separators
    dividerSoft: "#ECE1D5",

    // Controls
    stepDone: "#3B2A1F",
    stepCurrent: "#A47E4B",
    stepTodo: "#DACCBC",
    segment: "#E8DDD0", // segmented control track
    track: "#E2D5C6", // metric bar track
    iconBg: "#EFE4D6",
    iconFg: "#7A5C3A",
    lockedBg: "#ECE4DA",
    phaseChip: "#E3D3BF",
    dashed: "#FFF8EE", // face oval, mesh highlights

    // Data
    metricCool: "#5F7D8C", // hydration
    metricWarm: "#C4A06A", // sebum
    metricNeutral: "#8C735F",
    zoneOily: "#E8C27A",
    zoneDry: "#5F7D8C",
    compareBackground: "#000000", // letterbox behind before/after photos (square mode)
  },

  fonts: {
    /** Headings: italic didone. Loaded in theme/fonts.ts. */
    display: "var(--font-bodoni), 'Bodoni Moda', 'Bodoni 72', Didot, Georgia, serif",
    body: "var(--font-jost), Jost, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  },

  shadows: {
    cta: "0 12px 26px rgba(59,42,31,0.22), inset 0 0 0 1px rgba(196,160,106,0.6)",
    arch: "0 28px 56px rgba(107,84,68,0.22)",
    card: "0 16px 32px rgba(59,42,31,0.22)",
    swatch: "0 6px 14px rgba(59,42,31,0.18)",
    handle: "0 6px 16px rgba(59,42,31,0.3)",
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
