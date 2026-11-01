import {
  CURRENT_SALON_STORAGE_KEY,
  DIONA_SKIN_REPORT_SALON_CODE,
} from "@/core/constants/common-constants";
import { rewriteUtfsUrls, toCdnUrl } from "@/core/utils/cdn-url";

export type CurrentSalonPayload = {
  id?: number;
  name?: string;
  code?: string;
  address?: string;
  logo_image?: string;
  show_hairstylists?: boolean;
  is_active?: boolean;
  show_questions?: boolean;
  show_pricing?: boolean;
  input_box_available?: boolean;
  skin_analysis_enabled?: boolean;
  advanced_skin_analysis_enabled?: boolean;
  hair_analysis_enabled?: boolean;
  look_advisor_enabled?: boolean;
  makeup_enabled?: boolean;
  bridal_makeup_enabled?: boolean;
  report_bg_color?: string;
  homepage_welcome_text?: string;
  homepage_doodle_image?: string;
  theme_primary_color?: string;
  theme_bg_color?: string;
  theme_accent_color?: string;
  skin_report_last_page?: string | null;
  screensaver_video?: string | null;
  user?: number;
  [key: string]: unknown;
};

export function persistCurrentSalon(data: CurrentSalonPayload): void {
  try {
    localStorage.setItem(
      CURRENT_SALON_STORAGE_KEY,
      JSON.stringify(rewriteUtfsUrls(data))
    );
  } catch (e) {
    console.error("persistCurrentSalon:", e);
  }
}

export function getStoredSalon(): CurrentSalonPayload | null {
  try {
    const raw = localStorage.getItem(CURRENT_SALON_STORAGE_KEY);
    if (!raw) return null;
    return rewriteUtfsUrls(JSON.parse(raw) as CurrentSalonPayload);
  } catch {
    return null;
  }
}

export function getStoredSalonCode(): string | null {
  const s = getStoredSalon();
  const c = s?.code;
  return typeof c === "string" && c.length > 0 ? c : null;
}

/** Skin analysis PDF pages 4–5 — Diona flyer images (salon `code` from `/salon/current`). */
export function isDionaSkinFlyerSalonCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return (
    code.trim().toUpperCase() === DIONA_SKIN_REPORT_SALON_CODE.trim().toUpperCase()
  );
}

/** Valid salon/report logo URL from API; null when missing or placeholder. */
export function resolveReportLogoUrl(apiLogo?: string | null): string | null {
  const logo = apiLogo?.trim();
  if (!logo || logo.toLowerCase().includes("placeholder")) return null;
  return toCdnUrl(logo);
}

/**
 * Whether the kiosk should show product prices.
 * Missing/undefined defaults to on so existing salons keep showing prices.
 */
export function isProductPricingEnabled(
  value?: boolean | null,
  salon?: CurrentSalonPayload | null,
): boolean {
  if (typeof value === "boolean") return value;
  const stored = salon ?? getStoredSalon();
  return stored?.show_pricing !== false;
}
