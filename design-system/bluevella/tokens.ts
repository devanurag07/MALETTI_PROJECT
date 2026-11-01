/**
 * Studio: values are CSS variables so each client's theme (StudioClient.theme → --bv-*) applies at runtime.
 * Defaults live in app/globals.css.
 *
 * Bluevella design tokens: navy-black ground, glass panels with aqua hairlines, white ink,
 * one aqua brand colour. Mirrored as CSS variables (`--bv-*`) and Tailwind colours (`bv-*`)
 * in app/globals.css; change both together. Contrast (WCAG): ink ≥ 12:1, inkMuted ≥ 5.4:1,
 * accent ≥ 6.8:1 on every surface; onAccent on accent 9.5:1; lineStrong ≥ 3:1.
 */
export const BV = {
  /** Page background (with `--bv-ground-glow` on top). */
  ground: "var(--bv-ground)",
  /** Glass panels and cards. */
  surface: "var(--bv-surface)",
  /** Tiles, inputs, inactive tab track, panels inside panels. */
  surfaceRaised: "var(--bv-surface-raised)",
  /** Aqua hairline on panels and dividers (decorative). */
  line: "var(--bv-line)",
  /** Outline of controls: tiles, outline buttons, unselected marks. */
  lineStrong: "var(--bv-line-strong)",
  /** Headings and body copy. */
  ink: "var(--bv-ink)",
  /** Secondary copy, hints, captions. */
  inkMuted: "var(--bv-ink-muted)",
  /** Brand aqua: primary buttons, selection, icons, progress. */
  accent: "var(--bv-accent)",
  /** Selected fill (white text on it). */
  accentSoft: "var(--bv-accent-soft)",
  /** Text and icons on an aqua fill (never white). */
  onAccent: "var(--bv-on-accent)",
  /** Halo on the selected item and the primary button. */
  glow: "var(--bv-glow)",
  /** Soft halo on resting panels. */
  glowSoft: "var(--bv-glow-soft)",
} as const;

export type BvToken = keyof typeof BV;
