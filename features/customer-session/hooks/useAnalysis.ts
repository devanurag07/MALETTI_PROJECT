"use client";
import { HAIR_ANALYSIS_URL, SKIN_ANALYSIS_URL, SKIN_VISUALIZATION_URL } from "@/core/constants/url-constants";
import axiosClient from "@/core/network/axios-client";
import { addSessionAnalysis } from "@/core/utils/session-analyses";
import type { SkinCategory } from "@/features/skin-analysis/types/skin-category";
import { filterSkinMetricsForMode } from "@/features/skin-analysis/utils/deep-skin-metrics";

/** Close-up field names expected by skin/analyze/ (advanced skin analysis). */
export type SkinCloseUpKey = "nose" | "side_cheek" | "forehead";
export type SkinCloseUpImages = Partial<Record<SkinCloseUpKey, File>>;

export interface HairAttribute {
  analysis: string;
  attribute: string;
  score: number;
  recommendation: string;
}

export interface SkinOutcome {
  resultId: number;
  accessToken: string;
  results: SkinCategory[];
  faceDetected: boolean;
  validCloseups: boolean;
}

export interface HairOutcome {
  resultId: number;
  accessToken: string;
  attributes: HairAttribute[];
  weeklyRoutine: string[];
}

/** FLUX skin-analysis request (scores scaled by 0.9 as in the FLUX page). */
export async function runSkinAnalysis(
  face: File,
  answers: Record<string, string[]>,
  closeUps: SkinCloseUpImages,
  advanced: boolean,
): Promise<SkinOutcome> {
  const formData = new FormData();
  formData.append("image", face, face.name);
  formData.append("answers", JSON.stringify(answers));
  if (advanced) {
    for (const [key, file] of Object.entries(closeUps)) if (file) formData.append(key, file, file.name);
  }
  const res = await axiosClient.post(SKIN_ANALYSIS_URL, formData);
  const data = res.data?.data;
  if (!data?.skin_analysis) throw new Error("Invalid skin analysis response");
  const scaled: SkinCategory[] = data.skin_analysis.map((s: SkinCategory) => ({ ...s, score: s.score * 0.9 }));
  addSessionAnalysis(data.skin_analysis_result_id, "skin");
  return {
    resultId: data.skin_analysis_result_id,
    accessToken: data.access_token,
    results: filterSkinMetricsForMode(scaled, advanced),
    faceDetected: data.face_detected,
    validCloseups: data.valid_closeup_images,
  };
}

/** FLUX deep hair analysis request (scores scaled by 0.9 as in the FLUX page). */
export async function runHairAnalysis(face: File, scalpImages: File[], answers: Record<string, string[]>): Promise<HairOutcome> {
  const formData = new FormData();
  for (const file of scalpImages) formData.append("images", file);
  formData.append("user_image", face, face.name);
  for (const [key, values] of Object.entries(answers)) for (const v of values) formData.append(key, v);
  const res = await axiosClient.post(HAIR_ANALYSIS_URL, formData);
  const data = res.data.data;
  addSessionAnalysis(data.hair_analysis_result, "hair");
  return {
    resultId: data.hair_analysis_result,
    accessToken: data.access_token,
    attributes: data.hair_attributes.map((a: HairAttribute) => ({ ...a, score: Math.floor(Math.max(0, a.score * 0.9)) })),
    weeklyRoutine: data.weekly_routine ?? [],
  };
}

/** Annotated skin map image; optional, failures are ignored. */
export async function fetchSkinVisualization(face: File, results: SkinCategory[]): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("image", face, face.name);
    formData.append("skin_metrics", JSON.stringify(results.map((r) => ({ name: r.name, score: r.score }))));
    const res = await axiosClient.post(SKIN_VISUALIZATION_URL, formData, { timeout: 180_000 });
    return res.data?.data?.image_url ?? res.data?.image_url ?? res.data?.url ?? null;
  } catch (e) {
    console.error("Skin visualization failed:", e);
    return null;
  }
}
