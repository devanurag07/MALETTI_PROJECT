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
export const JOURNEY: Record<Gender, Service[]> = {
  man: ["hairstyle", "beard", "colour", "armocromia", "skin"],
  woman: ["hairstyle", "colour", "armocromia", "makeup", "skin"],
};
/** Backend analysis module each service reads its recommendations from. */
export const SERVICE_MODULE: Record<Service, string> = {
  hairstyle: "face", beard: "face", armocromia: "colour", colour: "colour", makeup: "colour", skin: "skin",
};
/** AI try-on kind behind a service (armocromia / skin have nothing to try on). */
export const SERVICE_TRY: Partial<Record<Service, TryKind>> = { hairstyle: "cut", beard: "beard", colour: "colour", makeup: "makeup" };

export const journeyIntro = (s: Service) => `/journey/${s}`;
export const journeyPage = (s: Service) => `/journey/${s}/go`;
/** Intro of the service after `s`, or the look summary after the last one. */
export function journeyNext(gender: Gender, s: Service): string {
  const list = JOURNEY[gender];
  const n = list[list.indexOf(s) + 1];
  return n ? journeyIntro(n) : "/look";
}
