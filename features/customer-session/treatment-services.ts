import type { TreatmentRecommendation, TreatmentService } from "./types";

export type ServiceRole = "recommended" | "also_suggested" | "after_assessment" | "follow_up";

export interface ServiceCard {
  service: TreatmentService;
  role: ServiceRole;
}

export const SERVICE_ROLE_LABEL: Record<ServiceRole, string> = {
  recommended: "Recommended",
  also_suggested: "Also suggested",
  after_assessment: "After assessment",
  follow_up: "Follow-up",
};

/**
 * Every service a recommendation names, in order: the main pick, the options, the follow-up.
 * Options sit beside a recommended pick, or follow the assessment otherwise.
 */
export function serviceCards(rec: TreatmentRecommendation): ServiceCard[] {
  const cards: ServiceCard[] = [];
  if (rec.service) cards.push({ service: rec.service, role: rec.status === "recommend" ? "recommended" : "after_assessment" });
  const optionRole: ServiceRole = rec.status === "recommend" ? "also_suggested" : "after_assessment";
  for (const option of rec.options ?? []) {
    if (!cards.some((c) => c.service.id === option.id)) cards.push({ service: option, role: optionRole });
  }
  const followUp = rec.follow_up?.service;
  if (followUp && !cards.some((c) => c.service.id === followUp.id)) cards.push({ service: followUp, role: "follow_up" });
  return cards;
}
