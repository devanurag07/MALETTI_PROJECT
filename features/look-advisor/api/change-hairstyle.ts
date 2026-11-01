import axiosClient from "@/core/network/axios-client";
import { CHANGE_HAIRSTYLE_URL } from "@/core/constants/url-constants";
import { convertFileToJpeg, imageUrlToBase64 } from "@/core/utils/common";

/** Same request the FLUX look-advisor page sends to `salon/mirror/hairstyle-change/`. */
export async function changeHairstyle(params: {
  image: File;
  sessionId: string;
  prompt: string;
  name: string;
  haircolor?: boolean;
  beard?: boolean;
  gender?: string | null;
}): Promise<{ outputUrl: string | null; base64: string | null }> {
  // The backend re-encodes the upload as PNG for gpt-image-2, whose output is 1024px anyway:
  // a 1024px JPEG keeps both uploads small. Falls back to the original if conversion fails.
  const image = await convertFileToJpeg(params.image, 1024, 0.9).catch(() => params.image);
  const formData = new FormData();
  formData.append("image", image);
  formData.append("session_id", params.sessionId);
  formData.append("prompt", params.prompt);
  formData.append("hairstyle_name", params.name);
  if (params.haircolor) formData.append("haircolor", "true");
  if (params.beard) formData.append("beard", "true");
  if (params.gender) formData.append("gender", params.gender);

  const response = await axiosClient.post(CHANGE_HAIRSTYLE_URL, formData);
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
