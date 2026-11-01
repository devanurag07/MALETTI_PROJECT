import type { AppId, CustomerSessionDto, MakeoverService, Occasion, SessionType, StepId } from "../types";

export interface SessionTypeMeta {
  id: SessionType;
  title: string;
  description: string;
  defaultOccasion: Occasion | "";
  /** Clothing categories (slugs) shown first for this session type. */
  clothingCategories: string[];
}

export const SESSION_TYPES: Record<SessionType, SessionTypeMeta> = {
  bridal: {
    id: "bridal",
    title: "Bridal",
    description: "Complete bridal look: skin & hair prep, makeup, hairstyle and outfit.",
    defaultOccasion: "bridal",
    clothingCategories: ["bridal-wear", "haldi-wear", "mehndi-wear", "party-wear"],
  },
  function: {
    id: "function",
    title: "Function-Ready",
    description: "Get event-ready for an engagement, party or family function.",
    defaultOccasion: "party",
    clothingCategories: ["party-wear", "haldi-wear", "mehndi-wear", "casual-wear"],
  },
  makeover: {
    id: "makeover",
    title: "Makeover",
    description: "Haircut, hair colour, hair or skin treatment with a personalised plan.",
    defaultOccasion: "",
    clothingCategories: [],
  },
  app: {
    id: "app",
    title: "App",
    description: "One service on its own, opened from the Apps menu on the home screen.",
    defaultOccasion: "",
    clothingCategories: ["bridal-wear", "party-wear", "haldi-wear", "mehndi-wear", "casual-wear"],
  },
};

/** Journeys shown on Select Journey; "app" sessions start from the home screen's Apps menu instead. */
export type JourneyType = Exclude<SessionType, "app">;
export const SESSION_TYPE_ORDER: JourneyType[] = ["bridal", "function", "makeover"];

export interface AppMeta {
  id: AppId;
  title: string;
  description: string;
  /** Asks "Who is this for?" before starting; Makeup looks are female-only. */
  asksGender: boolean;
}

export const APPS: Record<AppId, AppMeta> = {
  skin_analysis: {
    id: "skin_analysis",
    title: "Skin Analysis",
    description: "Scan your skin and get a personalised treatment plan.",
    asksGender: true,
  },
  hair_analysis: {
    id: "hair_analysis",
    title: "Hair Analysis",
    description: "Check your hair and scalp health with a treatment plan.",
    asksGender: true,
  },
  makeup: {
    id: "makeup",
    title: "Makeup",
    description: "Try bridal, engagement and party looks on your photo.",
    asksGender: false,
  },
  hairstyle: {
    id: "hairstyle",
    title: "Hairstyle",
    description: "Find and try on haircuts that suit you.",
    asksGender: true,
  },
  haircolor: {
    id: "haircolor",
    title: "Hair Colour",
    description: "Preview new hair colours before you commit.",
    asksGender: true,
  },
  clothing: {
    id: "clothing",
    title: "Clothing / Boutique",
    description: "Try outfits from the salon's boutique on your photo.",
    asksGender: true,
  },
};

export const APP_ORDER: AppId[] = ["skin_analysis", "hair_analysis", "makeup", "hairstyle", "haircolor", "clothing"];

export function isAppId(value: string | null | undefined): value is AppId {
  return !!value && value in APPS;
}

/** Flow screens for each app, before the report. */
const APP_STEPS: Record<AppId, FlowStepId[]> = {
  skin_analysis: ["analysis", "treatment"],
  hair_analysis: ["analysis", "treatment"],
  makeup: ["makeup"],
  hairstyle: ["hairstyle"],
  haircolor: ["haircolor"],
  clothing: ["clothing"],
};

export const appFlowSteps = (app: AppId) => APP_STEPS[app];

export const OCCASIONS: { id: Occasion; title: string }[] = [
  { id: "bridal", title: "Bridal Look" },
  { id: "engagement", title: "Engagement Look" },
  { id: "party", title: "Party Look" },
];

export const MAKEOVER_SERVICES: { id: MakeoverService; title: string }[] = [
  { id: "haircut", title: "Haircut" },
  { id: "haircolor", title: "Hair Colour" },
  { id: "hair_treatment", title: "Hair Treatment" },
  { id: "skin_treatment", title: "Skin Treatment" },
];

export const STEP_TITLES: Record<StepId, string> = {
  services: "Select Service",
  skin_analysis: "Skin Analysis",
  hair_analysis: "Hair Analysis",
  treatment: "Treatment Recommendations",
  hair_plan: "Hair Plan",
  skin_plan: "Skin Plan",
  makeup: "Makeup Look",
  full_makeup: "Bridal Makeup",
  hairstyle: "Occasion Hairstyle",
  haircolor: "Hair Colour",
  clothing: "Clothing / Boutique",
};

/**
 * Screens the customer moves through. `analysis` / `treatment` are the combined Hair & Skin screens
 * (Makeover, Apps); Bridal and Function-Ready use one analysis and one plan per area instead.
 */
export type FlowStepId =
  | "services"
  | "analysis"
  | "treatment"
  | "hairstyle"
  | "hair_analysis"
  | "hair_plan"
  | "skin_analysis"
  | "skin_plan"
  | "makeup"
  | "full_makeup"
  | "haircolor"
  | "clothing";

export const FLOW_STEP_TITLES: Record<FlowStepId, string> = {
  services: "Select Service",
  analysis: "Hair & Skin Analysis",
  treatment: "Your Treatment Plan",
  hair_analysis: "Hair Analysis",
  hair_plan: "Your Hair Plan",
  skin_analysis: "Skin Analysis",
  skin_plan: "Your Skin Plan",
  makeup: "Makeup Look",
  full_makeup: "Bridal Makeup",
  hairstyle: "Occasion Hairstyle",
  haircolor: "Hair Colour",
  clothing: "Clothing / Boutique",
};

type SessionShape = Pick<CustomerSessionDto, "session_type" | "makeover_services"> &
  Partial<Pick<CustomerSessionDto, "gender" | "app">>;

/** "Bridal Journey", or the app name ("Makeup") for single-app sessions. */
export function sessionTitle(session: SessionShape): string {
  if (session.session_type === "app" && isAppId(session.app)) return APPS[session.app].title;
  return `${SESSION_TYPES[session.session_type].title} Journey`;
}

/** "Skin" / "Hair" / "Hair & Skin": what the analysis step covers for this session. */
export function analysisAreaLabel(session: SessionShape): string {
  const { skin, hair } = getAnalysisScope(session);
  return skin && hair ? "Hair & Skin" : skin ? "Skin" : "Hair";
}

/** Step title for this session; the analysis step is named after what it actually analyses. */
export function flowStepTitle(step: FlowStepId, session: SessionShape | null): string {
  if (step === "analysis" && session) return `${analysisAreaLabel(session)} Analysis`;
  if (step === "full_makeup" && session?.session_type === "function") return "Function Makeup";
  return FLOW_STEP_TITLES[step];
}

/** Bridal and Function-Ready (the journeys with clothing) take a second, full-body photo after Select Journey. */
export function needsFullBody(session: Pick<CustomerSessionDto, "session_type">): boolean {
  return session.session_type === "bridal" || session.session_type === "function";
}

/** Which analyses the combined Hair & Skin step runs for this session. */
export function getAnalysisScope(session: SessionShape): { skin: boolean; hair: boolean } {
  if (session.session_type === "app") return { skin: session.app === "skin_analysis", hair: session.app !== "skin_analysis" };
  if (session.session_type !== "makeover") return { skin: true, hair: true };
  const services = session.makeover_services ?? [];
  const skin = services.includes("skin_treatment");
  const hair = services.some((s) => s !== "skin_treatment");
  return { skin, hair: hair || !skin };
}

/** Bridal / Function-Ready, before the makeup and clothing steps: haircut, then hair colour, then hair, then skin. */
const OCCASION_PREP_STEPS: FlowStepId[] = ["hairstyle", "haircolor", "hair_analysis", "hair_plan", "skin_analysis", "skin_plan"];

/**
 * Ordered flow screens. Bridal and Function-Ready share one flow; Makeover is built
 * from the chosen services and never includes makeup, occasion hairstyle or clothing.
 * App sessions run only that app's screens.
 */
export function getFlowSteps(session: SessionShape): FlowStepId[] {
  if (session.session_type === "app") return isAppId(session.app) ? APP_STEPS[session.app] : [];
  if (session.session_type !== "makeover") {
    // Makeup (close-up, then full-body) is female-only; male Function-Ready goes straight to clothing.
    return session.gender === "male"
      ? [...OCCASION_PREP_STEPS, "clothing"]
      : [...OCCASION_PREP_STEPS, "makeup", "full_makeup", "clothing"];
  }
  const services = session.makeover_services ?? [];
  const steps: FlowStepId[] = ["services", "analysis", "treatment"];
  if (services.includes("haircut")) steps.push("hairstyle");
  if (services.includes("haircolor")) steps.push("haircolor");
  return steps;
}

/** Backend SessionStep records a flow screen writes. */
export function backendStepsFor(step: FlowStepId, session: SessionShape): StepId[] {
  if (step !== "analysis") return [step as StepId];
  const scope = getAnalysisScope(session);
  return [...(scope.skin ? ["skin_analysis" as const] : []), ...(scope.hair ? ["hair_analysis" as const] : [])];
}

export function isFlowStep(value: string): value is FlowStepId {
  return value in FLOW_STEP_TITLES;
}

export const sessionStepPath = (sessionType: SessionType, step: FlowStepId) =>
  `/session/${sessionType}/${step}`;

/** Landing → photo → journey: the photo is taken before a journey is chosen. */
export const CAPTURE_PATH = "/capture";
export const JOURNEY_PATH = "/journey";

/** Apps menu → photo → (who is it for?) → the app's screens. `?app=` carries the choice. */
export const appCapturePath = (app: AppId) => `${CAPTURE_PATH}?app=${app}`;
export const appStartPath = (app: AppId) => `${JOURNEY_PATH}?app=${app}`;

/** Retake-photo route for an active session (same capture screen; it resumes the session after). */
export const sessionCapturePath = () => CAPTURE_PATH;
/** Full-body photo (Bridal, Function-Ready): after Select Journey, or to retake it. */
export const FULL_BODY_CAPTURE_PATH = `${CAPTURE_PATH}?shot=full`;

export const sessionReportFormPath = (id: number) => `/report-form/session/${id}`;

export const sessionReportPath = (id: number, token?: string) =>
  token ? `/session-report/${id}?token=${encodeURIComponent(token)}` : `/session-report/${id}`;

export function isSessionType(value: string): value is SessionType {
  return value in SESSION_TYPES;
}
