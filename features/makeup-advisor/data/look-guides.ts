import lookGuides from "./look_guides.json";
import type { MakeupLookGuide, MakeupLookGuides } from "../types";

const guides = lookGuides as MakeupLookGuides;

/** Guide for a bridal look id, falling back to the occasion's generic guide. */
export function getMakeupLookGuide(lookId: string | null | undefined, occasion: string): MakeupLookGuide | null {
  return (lookId && guides[lookId]) || guides[occasion] || null;
}
