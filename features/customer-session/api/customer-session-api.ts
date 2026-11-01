import axiosClient from "@/core/network/axios-client";
import { convertFileToJpeg } from "@/core/utils/common";
import {
  BRIDAL_LOOKS_RECOMMEND_URL,
  CLOTHING_CATALOGUE_TRYON_URL,
  CLOTHING_CATEGORIES_URL,
  CLOTHING_ITEMS_URL,
  CUSTOMER_SESSIONS_URL,
  CUSTOMER_SESSION_REPORT_URL,
  RECOMMEND_TREATMENT_URL,
  customerSessionCompleteUrl,
  customerSessionReportTokenUrl,
  customerSessionStepUrl,
  customerSessionUrl,
} from "@/core/constants/url-constants";
import type {
  ClothingCategoryDto,
  ClothingItemDto,
  CreateCustomerSessionInput,
  CustomerSessionDto,
  CustomerSessionReport,
  SessionStepDto,
  FinalStepStatus,
  StepId,
  TreatmentArea,
  TreatmentRecommendation,
} from "../types";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function createCustomerSession(
  input: CreateCustomerSessionInput,
): Promise<CustomerSessionDto> {
  const res = await axiosClient.post<ApiEnvelope<CustomerSessionDto>>(CUSTOMER_SESSIONS_URL, input);
  return res.data.data;
}

export async function getCustomerSession(id: number | string): Promise<CustomerSessionDto> {
  const res = await axiosClient.get<ApiEnvelope<CustomerSessionDto>>(customerSessionUrl(id));
  return res.data.data;
}

export async function updateCustomerSession(
  id: number | string,
  input: Partial<CreateCustomerSessionInput>,
): Promise<CustomerSessionDto> {
  const res = await axiosClient.patch<ApiEnvelope<CustomerSessionDto>>(customerSessionUrl(id), input);
  return res.data.data;
}

export async function saveSessionStep(
  id: number | string,
  step: StepId,
  data: Record<string, unknown>,
  status: FinalStepStatus = "completed",
): Promise<SessionStepDto> {
  const res = await axiosClient.put<ApiEnvelope<SessionStepDto>>(customerSessionStepUrl(id, step), {
    status,
    data,
  });
  return res.data.data;
}

/** Saves in-progress results; creates the step as "in_progress" if it has no record yet. */
export async function saveStepDraft(
  id: number | string,
  step: StepId,
  draft: Record<string, unknown>,
): Promise<SessionStepDto> {
  const res = await axiosClient.patch<ApiEnvelope<SessionStepDto>>(customerSessionStepUrl(id, step), { draft });
  return res.data.data;
}

export async function completeCustomerSession(
  id: number | string,
  customer: { customer_name?: string; phone?: string },
): Promise<{ session: CustomerSessionDto; token: string }> {
  const res = await axiosClient.post<ApiEnvelope<{ session: CustomerSessionDto; token: string }>>(
    customerSessionCompleteUrl(id),
    customer,
  );
  return res.data.data;
}

export async function createReportToken(id: number | string): Promise<string> {
  const res = await axiosClient.post<ApiEnvelope<{ token: string }>>(customerSessionReportTokenUrl(id));
  return res.data.data.token;
}

/** Token-gated; also used by the PDF renderer which has no salon login. */
export async function fetchSessionReport(token: string): Promise<CustomerSessionReport> {
  const res = await axiosClient.get<ApiEnvelope<CustomerSessionReport>>(CUSTOMER_SESSION_REPORT_URL, {
    params: { token },
  });
  return res.data.data;
}

export async function fetchClothingCategories(gender?: string): Promise<ClothingCategoryDto[]> {
  const res = await axiosClient.get<ApiEnvelope<ClothingCategoryDto[]>>(CLOTHING_CATEGORIES_URL, {
    params: gender ? { gender } : undefined,
  });
  return res.data.data;
}

export async function fetchClothingItems(category: string | number, gender?: string): Promise<ClothingItemDto[]> {
  const res = await axiosClient.get<ApiEnvelope<ClothingItemDto[]>>(CLOTHING_ITEMS_URL, {
    params: { category, ...(gender ? { gender } : {}) },
  });
  return res.data.data;
}

export interface CatalogueTryonResult {
  image_base64: string;
  output_url: string;
  clothing_result_id: number | null;
  item: ClothingItemDto;
  category: ClothingCategoryDto;
}

export async function clothingCatalogueTryon(
  customerSessionId: number,
  itemId: number,
  userImage: File,
): Promise<CatalogueTryonResult> {
  const formData = new FormData();
  formData.append("customer_session_id", String(customerSessionId));
  formData.append("item_id", String(itemId));
  formData.append("image", await convertFileToJpeg(userImage));
  const res = await axiosClient.post<ApiEnvelope<CatalogueTryonResult>>(CLOTHING_CATALOGUE_TRYON_URL, formData);
  if (!res.data.success) throw new Error(res.data.message);
  return res.data.data;
}

/**
 * AI picks (up to 4, best first) from the predefined bridal / function looks, each with a reason
 * (`customer_session/views/makeup.py`). Ids always come from `looks`.
 */
export async function recommendBridalLooks(params: {
  customerSessionId: number;
  image: File;
  looks: { id: string; name: string; description?: string }[];
  occasion?: string;
  outfitColor?: string | null;
}): Promise<{ id: string; reason: string }[]> {
  const formData = new FormData();
  formData.append("customer_session_id", String(params.customerSessionId));
  formData.append("image", await convertFileToJpeg(params.image, 1024, 0.85));
  formData.append("looks", JSON.stringify(params.looks));
  if (params.occasion) formData.append("occasion", params.occasion);
  if (params.outfitColor) formData.append("outfit_color", params.outfitColor);
  const res = await axiosClient.post<ApiEnvelope<{ looks: { id: string; reason: string }[] }>>(BRIDAL_LOOKS_RECOMMEND_URL, formData);
  if (!res.data.success) throw new Error(res.data.message);
  return res.data.data.looks;
}

/** Salon treatment for one area from its analysis scores (pair rules in customer_session/treatment_engine.py). */
export async function recommendTreatment(
  area: TreatmentArea,
  analysis: { name: string; score: number }[],
): Promise<TreatmentRecommendation> {
  const res = await axiosClient.post<ApiEnvelope<TreatmentRecommendation>>(RECOMMEND_TREATMENT_URL, { area, analysis });
  return res.data.data;
}
