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
  gender === "man" ? ["cut", "colour", "beard"] : ["cut", "colour", "makeup"];

/** Simple Service: what each gender can try, in this order. */
export const SERVICE_KINDS: Record<Gender, TryKind[]> = {
  woman: ["colour", "cut", "makeup"],
  man: ["colour", "cut", "beard"],
};
