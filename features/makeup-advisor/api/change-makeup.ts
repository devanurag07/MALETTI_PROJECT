import axiosClient from "@/core/network/axios-client";
import { CHANGE_MAKEUP_URL } from "@/core/constants/url-constants";
import { imageUrlToBase64 } from "@/core/utils/common";

export interface MakeupTryonResult {
  outputUrl: string | null;
  base64: string | null;
}

/** Same request the FLUX look-advisor page sends to `salon/makeup/change/`. */
export async function changeMakeup(params: {
  image: File;
  sessionId: string;
  prompt: string;
  makeupName: string;
  makeupType: string;
}): Promise<MakeupTryonResult> {
  const formData = new FormData();
  formData.append("image", params.image);
  formData.append("session_id", params.sessionId);
  formData.append("prompt", params.prompt);
  formData.append("makeup_name", params.makeupName);
  formData.append("makeup_type", params.makeupType);
  formData.append("gender", "female");

  const response = await axiosClient.post(CHANGE_MAKEUP_URL, formData);
  const data = response.data;
  if (!data.success) throw new Error("API returned unsuccessful response");

  let raw = typeof data.image_base64 === "string" ? data.image_base64.trim() : "";
  if (raw.includes("base64,")) raw = raw.split("base64,").pop()?.trim() ?? "";
  if (!raw && data.output_url) {
    try {
      const dataUrl = await imageUrlToBase64(data.output_url);
      raw = dataUrl.includes(",") ? dataUrl.split(",").pop() ?? "" : dataUrl;
    } catch (e) {
      console.error("Failed to build preview from output_url:", e);
    }
  }
  return { outputUrl: data.output_url ?? null, base64: raw || null };
}

/** Combine several shade selections into one prompt (FLUX handleMakeupSubmit). */
export function buildMakeupPrompt(prompts: string[]): string {
  const base =
    prompts.length === 1
      ? prompts[0]
      : `Apply all of the following makeup together in one natural, cohesive look. ${prompts.join(". ")}.`;
  return `${base} Do not change any facial feature of the woman like lips, eyes or anything else.`;
}
