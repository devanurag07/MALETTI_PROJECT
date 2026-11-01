import { getStoredSalon, type CurrentSalonPayload } from "@/core/utils/salon-storage";

export type SalonServiceId = "skin-analysis" | "hair-analysis" | "look-advisor";

const SERVICE_FLAG_KEY: Record<
  SalonServiceId,
  keyof Pick<
    CurrentSalonPayload,
    "skin_analysis_enabled" | "hair_analysis_enabled" | "look_advisor_enabled"
  >
> = {
  "skin-analysis": "skin_analysis_enabled",
  "hair-analysis": "hair_analysis_enabled",
  "look-advisor": "look_advisor_enabled",
};

export function isSalonServiceEnabled(
  service: SalonServiceId,
  salon?: CurrentSalonPayload | null,
): boolean {
  const data = salon ?? getStoredSalon();
  if (!data) return true;

  const flag = data[SERVICE_FLAG_KEY[service]];
  return flag !== false;
}

/** Makeup try-on (female Look Advisor option) — controlled by superadmin `makeup_enabled`. Off by default. */
export function isMakeupEnabled(salon?: CurrentSalonPayload | null): boolean {
  const data = salon ?? getStoredSalon();
  if (!data) return false;
  return data.makeup_enabled === true;
}

/** Bridal makeup service — controlled by superadmin `bridal_makeup_enabled`. Off by default. */
export function isBridalMakeupEnabled(
  salon?: CurrentSalonPayload | null,
): boolean {
  const data = salon ?? getStoredSalon();
  if (!data) return false;
  return data.bridal_makeup_enabled === true;
}
