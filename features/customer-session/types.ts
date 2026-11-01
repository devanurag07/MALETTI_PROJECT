export type SessionType = "bridal" | "function" | "makeover" | "app";
export type Occasion = "bridal" | "engagement" | "party";
export type Gender = "female" | "male";
export type MakeoverService = "haircut" | "haircolor" | "hair_treatment" | "skin_treatment";
/** Single-service apps opened from the home screen's Apps menu (session_type "app"). */
export type AppId = "skin_analysis" | "hair_analysis" | "makeup" | "hairstyle" | "haircolor" | "clothing";

export type StepId =
  | "services"
  | "skin_analysis"
  | "hair_analysis"
  | "treatment"
  | "hair_plan"
  | "skin_plan"
  | "makeup"
  | "full_makeup"
  | "hairstyle"
  | "haircolor"
  | "clothing";

/** "in_progress": only a draft has been saved; the step isn't finished yet. */
export type StepStatus = "in_progress" | "completed" | "skipped";
export type FinalStepStatus = Exclude<StepStatus, "in_progress">;

export interface SessionStepDto {
  id: number;
  step: StepId;
  status: StepStatus;
  data: Record<string, unknown>;
  /** Results saved while the step is open, used to restore the screen. Not in the report payload. */
  draft?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CustomerSessionDto {
  id: number;
  salon_session_id: number;
  session_type: SessionType;
  occasion: Occasion | "";
  gender: Gender | "";
  makeover_services: MakeoverService[];
  app: AppId | "";
  customer_name: string | null;
  phone: string | null;
  status: "active" | "completed";
  report_url: string | null;
  created_at: string;
  completed_at: string | null;
  steps: SessionStepDto[];
}

export type TreatmentArea = "skin" | "hair";

export interface TreatmentService {
  id: number;
  title: string;
  description: string;
  image: string | null;
  duration: string;
  price: number;
  currency: string;
  service_type: TreatmentArea;
  /** Focus-area labels this service is for, e.g. ["Hair Thinning"]. Absent on older saved results. */
  helps?: string[];
  /** One short line on what it does for the customer. */
  benefit?: string;
}

/** Response of customer-session/recommend-treatment/; saved per area in SessionStep.data.recommendation. */
export interface TreatmentRecommendation {
  area: TreatmentArea;
  status: "all_green" | "recommend" | "assessment_first" | "consultation";
  /** The two lowest-scoring parameters the decision is based on. */
  priority_pair: { name: string; label: string; score: number }[];
  /** The recommended service (status "recommend"). Older saved results also used it for assessment_first. */
  service: TreatmentService | null;
  reason: string;
  follow_up: { service: TreatmentService | null; text: string; weeks: number } | null;
  /** assessment_first / consultation: up to 2 services that may follow the check (rule's own, else LLM-picked). */
  options?: TreatmentService[];
  options_note?: string;
  /** Scores tied for second place, so staff should confirm the focus areas. */
  staff_review: boolean;
  missing: string[];
  rule_id: number | null;
}

export interface CreateCustomerSessionInput {
  session_type: SessionType;
  gender?: Gender;
  occasion?: Occasion;
  makeover_services?: MakeoverService[];
  app?: AppId;
}

/** Expanded records attached to each completed step in the report payload. */
export interface ReportTryon {
  id: number;
  name: string;
  output_url: string;
  makeup_type?: string;
  created_at: string;
}

export interface ReportAnalysis {
  id: number;
  image: string;
  result: unknown;
  selected_products: unknown;
  recommended_services: unknown;
  report_url: string | null;
  created_at: string;
}

export interface ReportStep extends SessionStepDto {
  expanded?: {
    skin_analyses?: ReportAnalysis[];
    hair_analyses?: ReportAnalysis[];
    tryons?: ReportTryon[];
    products?: Record<string, unknown>[];
    services?: Record<string, unknown>[];
  };
}

export interface CustomerSessionReport extends Omit<CustomerSessionDto, "steps"> {
  steps: ReportStep[];
  salon: {
    id: number;
    name: string;
    address: string;
    logo: string | null;
    report_bg_color: string;
  };
}

export interface ClothingCategoryDto {
  id: number;
  salon_id: number | null;
  name: string;
  slug: string;
  gender: "female" | "male" | "unisex";
  image: string | null;
  order: number;
  is_active: boolean;
}

export interface ClothingItemDto {
  id: number;
  category_id: number;
  name: string;
  image: string;
  prompt: string;
  gender: "female" | "male" | "unisex";
  order: number;
  is_active: boolean;
}
