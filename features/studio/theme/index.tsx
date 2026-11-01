import type { CSSProperties, ReactNode } from "react";
import { Bodoni_Moda } from "next/font/google";
import { malettiTheme, type StudioTheme } from "./maletti";

/** The active client theme. Swap this import to restyle the app for another client. */
export const theme: StudioTheme = malettiTheme;

const bodoni = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  style: ["italic", "normal"], // variable font: all weights
  variable: "--font-bodoni",
  display: "swap",
});

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** theme → CSS variables: colors.inkMuted → --mm-ink-muted, fonts.display → --mm-font-display, … */
export function themeVars(t: StudioTheme = theme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(t.colors)) vars[`--mm-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(t.fonts)) vars[`--mm-font-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(t.shadows)) vars[`--mm-shadow-${kebab(k)}`] = v;
  vars["--mm-skew"] = t.shape.skew;
  vars["--mm-step-skew"] = t.shape.stepSkew;
  // The salon login / screensaver come from the beauty_platform template (Bluevella tokens):
  // map them onto the client theme so the whole mirror shares one look.
  Object.assign(vars, {
    "--bv-ground": t.colors.background,
    "--bv-surface": t.colors.surface,
    "--bv-surface-raised": t.colors.surfaceRaised,
    "--bv-line": t.colors.line,
    "--bv-line-strong": t.colors.lineStrong,
    "--bv-ink": t.colors.ink,
    "--bv-ink-muted": t.colors.inkMuted,
    "--bv-accent": t.colors.ink,
    "--bv-accent-soft": t.colors.iconBg,
    "--bv-on-accent": t.colors.onDark,
    "--bv-glow": `0 0 0 3px ${t.colors.accentLine}`,
    "--bv-glow-soft": `0 0 0 2px ${t.colors.accentLine}`,
    "--bv-backdrop": t.colors.background,
    "--bv-glass": t.colors.surface,
    "--bv-button": t.colors.ink,
  });
  return vars;
}

const KEYFRAMES = `
@keyframes mmIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
@keyframes mmHalo { 0%, 100% { opacity: .6; transform: scale(.96) } 50% { opacity: 1; transform: scale(1.03) } }
@keyframes mmScan { 0% { top: 6% } 100% { top: 90% } }
@keyframes mmSpin { to { transform: rotate(360deg) } }
.mm-range { -webkit-appearance: none; appearance: none; background: transparent; }
.mm-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--mm-ink) var(--mm-fill, 50%), var(--mm-track) var(--mm-fill, 50%)); }
.mm-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -6px; border-radius: 8px; background: var(--mm-ink); border: 2px solid var(--mm-background); box-shadow: 0 0 0 1px var(--mm-ink); }
.mm-range::-moz-range-track { height: 4px; border-radius: 2px; background: var(--mm-track); }
.mm-range::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--mm-ink); }
.mm-range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 8px; background: var(--mm-ink); border: 2px solid var(--mm-background); }
`;

/** Wraps the app: theme CSS variables, fonts and the mockup's animations. */
export function StudioTheme({ children }: { children: ReactNode }) {
  return (
    <div className={bodoni.variable} style={{ ...themeVars(), display: "contents" } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {children}
    </div>
  );
}
