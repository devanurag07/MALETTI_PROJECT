import { DEBUG_MODE_KEY, DEBUG_SALON_CODE } from "@/core/constants/common-constants";
import { getStoredSalonCode } from "@/core/utils/salon-storage";

/** The logged-in salon may turn Debug mode on (settings shows the switch). */
export function isDebugSalon(): boolean {
  return getStoredSalonCode()?.trim().toUpperCase() === DEBUG_SALON_CODE;
}

/** Debug mode is on: the debug salon is logged in and the switch is saved on. */
export function isDebugMode(): boolean {
  try {
    return isDebugSalon() && localStorage.getItem(DEBUG_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function persistDebugMode(on: boolean): void {
  try {
    localStorage.setItem(DEBUG_MODE_KEY, String(on));
  } catch (e) {
    console.error("persistDebugMode:", e);
  }
}
