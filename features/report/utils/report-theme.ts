import { BV } from "@/design-system/bluevella/tokens";

export const DEFAULT_REPORT_BG_COLOR = "#042F2E";

export function normalizeReportBgColor(color?: string | null): string {
  if (!color) return DEFAULT_REPORT_BG_COLOR;
  const trimmed = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed}`;
  return DEFAULT_REPORT_BG_COLOR;
}

function mixHexWithWhite(hex: string, whiteRatio: number): string {
  const normalized = normalizeReportBgColor(hex).slice(1);
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * whiteRatio);
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function getReportTheme(reportBgColor?: string | null) {
  const primary = normalizeReportBgColor(reportBgColor);
  return {
    primary,
    accentBg: mixHexWithWhite(primary, 0.88),
    cardFrom: mixHexWithWhite(primary, 0.78),
    cardTo: mixHexWithWhite(primary, 0.76),
    cardBorder: mixHexWithWhite(primary, 0.55),
    textOnLight: primary,
  };
}

export function resolveReportBgColor(
  reportBgColor?: string | null,
  storedSalonColor?: string | null,
): string {
  return normalizeReportBgColor(reportBgColor ?? storedSalonColor);
}

/**
 * The customer-session report theme, from Bluevella tokens. The report is printed light,
 * so deep teal carries headings and filled marks; aqua only tints the backgrounds.
 */
export function getBluevellaReportTheme(): ReturnType<typeof getReportTheme> {
  return {
    primary: BV.accentSoft,
    accentBg: mixHexWithWhite(BV.accent, 0.88),
    cardFrom: mixHexWithWhite(BV.accent, 0.78),
    cardTo: mixHexWithWhite(BV.accent, 0.76),
    cardBorder: BV.lineStrong,
    textOnLight: BV.accentSoft,
  };
}
