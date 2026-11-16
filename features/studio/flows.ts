import type { Gender, TryKind } from "./api";

/**
 * The customer journeys, owned by the frontend (labels: locales/*.json → studio.flows.<key>).
 * The backend only records which one the customer picked (StudioSession.flow).
 */
export const FLOWS = [
  { key: "consultant", recommended: true, start: "/analysis" },
  { key: "service", recommended: false, start: "/service" },
] as const;

export type FlowKey = (typeof FLOWS)[number]["key"];

/** Try-on steps in stacking order: each step edits the image kept in the steps before it. */
export const tryOrder = (gender: Gender): TryKind[] =>
  gender === "man" ? ["cut", "beard", "colour"] : ["cut", "colour", "makeup"]; // matches JOURNEY order

/** Simple Service: what each gender can try, in this order. */
export const SERVICE_KINDS: Record<Gender, TryKind[]> = {
  woman: ["colour", "cut", "makeup"],
  man: ["colour", "cut", "beard"],
};

/**
 * Consultation journey: one service after another (no tabs). Each service has an intro page (Skip / Proceed)
 * → the service page (`/journey/<service>/go`). Labels: locales → studio.journey.<service>.*
 */
export type Service = "hairstyle" | "beard" | "armocromia" | "colour" | "makeup" | "skin";
/**
 * Beauty Consultant order, after the analysis scan and the face-analysis page (/analysis):
 * man: Haircut → Beard → Armocromia → Hair colour → Skin; woman: Haircut → Armocromia → Hair colour → Make-up → Skin.
 */
export const JOURNEY: Record<Gender, Service[]> = {
  man: ["hairstyle", "beard", "armocromia", "colour", "skin"],
  woman: ["hairstyle", "armocromia", "colour", "makeup", "skin"],
};
/** Armocromia is a step of its own, not a numbered "Service n". */
export const isNumbered = (s: Service) => s !== "armocromia";
/** The numbered services (Service 1…4) of a gender's journey. */
export const numberedServices = (gender: Gender) => JOURNEY[gender].filter(isNumbered);
/** Only these have an intro ("home") page in the consultation; the others open straight on their recommendations. */
export const HAS_INTRO: Service[] = ["armocromia", "skin"];
/** Backend analysis module each service reads its recommendations from. */
export const SERVICE_MODULE: Record<Service, string> = {
  hairstyle: "face", beard: "face", armocromia: "colour", colour: "colour", makeup: "colour", skin: "skin",
};
/** AI try-on kind behind a service (armocromia / skin have nothing to try on). */
export const SERVICE_TRY: Partial<Record<Service, TryKind>> = { hairstyle: "cut", beard: "beard", colour: "colour", makeup: "makeup" };

export const journeyIntro = (s: Service) => `/journey/${s}`;
export const journeyPage = (s: Service) => `/journey/${s}/go`;
/** Where the consultation enters a service: its intro page if it has one, else straight to the service page. */
export const journeyEntry = (s: Service) => (HAS_INTRO.includes(s) ? journeyIntro(s) : journeyPage(s));
/** Entry of the service after `s`, or the look summary (review + QR) after the last one. */
export function journeyNext(gender: Gender, s: Service): string {
  const list = JOURNEY[gender];
  const n = list[list.indexOf(s) + 1];
  return n ? journeyEntry(n) : "/look";
}
