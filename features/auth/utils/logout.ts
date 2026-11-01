import {
  CURRENT_SALON_STORAGE_KEY,
  INPUT_AVAILABLE_KEY,
  SALON_LOGO_KEY,
  SESSION_ID_KEY,
  SHOW_QUESTIONS_KEY,
  TOKEN_KEY,
} from "@/core/constants/common-constants";
import { clearSessionAnalyses } from "@/core/utils/session-analyses";
import { defaultLocale, locales } from "@/i18n";

function homePathFromLocation(): string {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first && locales.includes(first) && first !== defaultLocale) {
    return `/${first}`;
  }
  return "/";
}

export function logoutMirror(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem(CURRENT_SALON_STORAGE_KEY);
  localStorage.removeItem(SALON_LOGO_KEY);
  localStorage.removeItem(SHOW_QUESTIONS_KEY);
  localStorage.removeItem(INPUT_AVAILABLE_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem("studio_state"); // Studio customer progress (photo, try-ons) belongs to this salon login
  try { sessionStorage.removeItem("studio_state"); } catch {}
  clearSessionAnalyses();
  window.location.replace(homePathFromLocation());
}
