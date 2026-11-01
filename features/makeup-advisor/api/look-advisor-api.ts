import axiosClient from "@/core/network/axios-client";
import { MAKEUP_LOOK_ADVISOR_URL } from "@/core/constants/url-constants";
import type {
  LookAdvisorPreferences,
  LookCombo,
  LookComboItem,
  ShadeCategory,
} from "@/features/makeup-advisor/types";

type RawComboItem = {
  category?: string;
  shade_name?: string;
  prompt?: string;
  hex?: string;
};

type RawCombo = {
  name?: string;
  description?: string;
  items?: RawComboItem[];
};

type LookAdvisorApiResponse = {
  success: boolean;
  message: string;
  data: { combos?: RawCombo[] } | null;
  errors: null | string[];
};

const VALID_CATEGORIES: ShadeCategory[] = ["lipstick", "blush", "eyeshadow"];

const normalizeCategory = (value?: string): ShadeCategory => {
  const lower = (value ?? "").trim().toLowerCase();
  return (VALID_CATEGORIES as string[]).includes(lower)
    ? (lower as ShadeCategory)
    : "lipstick";
};

const normalizeHex = (value?: string): string => {
  const hex = (value ?? "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : "#cccccc";
};

const mapItem = (raw: RawComboItem): LookComboItem => ({
  category: normalizeCategory(raw.category),
  shadeName: (raw.shade_name ?? "").trim() || "Shade",
  prompt: (raw.prompt ?? "").trim(),
  hex: normalizeHex(raw.hex),
});

const mapCombo = (raw: RawCombo): LookCombo => ({
  name: (raw.name ?? "").trim() || "Suggested Look",
  description: (raw.description ?? "").trim(),
  items: (raw.items ?? []).map(mapItem).filter((item) => item.prompt),
});

/**
 * Send the captured photo to the backend, which analyses it and returns
 * coordinated makeup looks (combos) to try on.
 */
export const fetchLookCombos = async (
  image: File,
  options: {
    preferences: LookAdvisorPreferences;
    sessionId?: string;
    gender?: string;
  }
): Promise<LookCombo[]> => {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("gender", options?.gender ?? "female");
  formData.append("desired_look", options.preferences.desiredLook);
  formData.append("outfit_color", options.preferences.outfitColor);
  if (options?.sessionId) {
    formData.append("session_id", options.sessionId);
  }

  const response = await axiosClient.post<LookAdvisorApiResponse>(
    MAKEUP_LOOK_ADVISOR_URL,
    formData
  );

  const payload = response.data;
  if (!payload.success || !payload.data?.combos) {
    throw new Error(payload.message || "Look advisor failed");
  }

  return payload.data.combos.map(mapCombo).filter((combo) => combo.items.length);
};
