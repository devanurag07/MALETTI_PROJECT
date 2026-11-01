import { getStoredSalon } from "./salon-storage";

/**
 * Parse a hex color (#rrggbb) into [r, g, b] 0-255.
 * Returns null for invalid input.
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Relative luminance (WCAG 2.x formula). 0 = black, 1 = white. */
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Returns white or black hex depending on which has better contrast. */
function contrastForeground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  return luminance(...rgb) > 0.4 ? "#000000" : "#ffffff";
}

/**
 * Read salon theme colors from localStorage and apply them as CSS
 * custom properties on :root so every Tailwind utility (bg-primary,
 * text-primary, border-primary, etc.) picks them up globally.
 *
 * Call this after persistCurrentSalon() or on app mount.
 */
export function applySalonTheme(): void {
  const salon = getStoredSalon();
  if (!salon) return;

  const primary = (salon.theme_primary_color as string)?.trim();
  const accent = (salon.theme_accent_color as string)?.trim();
  const bg = (salon.theme_bg_color as string)?.trim();

  if (!primary && !accent && !bg) return;

  const root = document.documentElement;

  if (primary) {
    const fg = contrastForeground(primary);
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-foreground", fg);
    // Ring / focus should match the brand color
    root.style.setProperty("--ring", primary);
    // Sidebar brand
    root.style.setProperty("--sidebar-primary", primary);
    root.style.setProperty("--sidebar-primary-foreground", fg);
  }

  if (accent) {
    const fg = contrastForeground(accent);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-foreground", fg);
    root.style.setProperty("--sidebar-accent", accent);
    root.style.setProperty("--sidebar-accent-foreground", fg);
  }

  if (bg) {
    // Chart accent colours derived from the brand palette
    root.style.setProperty("--chart-1", primary || bg);
  }
}

/**
 * Remove all salon-applied CSS custom properties so the app
 * falls back to the defaults in globals.css.
 */
export function clearSalonTheme(): void {
  const root = document.documentElement;
  const props = [
    "--primary",
    "--primary-foreground",
    "--ring",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--accent",
    "--accent-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--chart-1",
  ];
  props.forEach((p) => root.style.removeProperty(p));
}
