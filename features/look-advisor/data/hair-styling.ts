import type { StaticImageData } from "next/image";
import blowDryImg from "@/assets/customize-look/Blowdry.png";
import curlyImg from "@/assets/customize-look/Curly.png";
import straighteningImg from "@/assets/customize-look/Straightening.png";
import curtainImg from "@/assets/Female Bangs/Curtain.png";
import fringesImg from "@/assets/Female Bangs/Fringes.png";
import sideSweptImg from "@/assets/Female Bangs/Side swept.png";
import taperFadeImg from "@/assets/fade-icons/Taper Fade.png";
import mediumFadeImg from "@/assets/fade-icons/Medium Fade.png";
import skinFadeImg from "@/assets/fade-icons/Skin Fade.png";
import noneImg from "@/assets/fade-icons/None.png";

/** "None" tile image used by every option row in the Custom look builder. */
export const NONE_OPTION_IMAGE = noneImg;

/** Styling finish added on top of a haircut, as in FLUX's "Styling Options" (`HairstyleSelector`). */
export type HairStylingId = "blow-dry" | "straightening" | "curly";

export interface HairStylingOption {
  id: HairStylingId;
  name: string;
  image: StaticImageData;
  prompt: string;
}

const OPTIONS: Record<"female" | "male", HairStylingOption[]> = {
  female: [
    { id: "blow-dry", name: "Blow-dry", image: blowDryImg, prompt: "Blow-dry her hair so it looks voluminous and bouncy." },
    { id: "straightening", name: "Straightening", image: straighteningImg, prompt: "Give her keratin straight hair." },
    { id: "curly", name: "Curly", image: curlyImg, prompt: "Give her hair curls." },
  ],
  male: [
    { id: "blow-dry", name: "Blow-dry", image: blowDryImg, prompt: "Blow-dry his hair so it looks voluminous and bouncy." },
    { id: "curly", name: "Curly", image: curlyImg, prompt: "Give his hair curls." },
  ],
};

export function hairStylingOptions(gender: string): HairStylingOption[] {
  return OPTIONS[gender === "male" ? "male" : "female"];
}

export function hairStylingById(id: string | null | undefined, gender: string): HairStylingOption | undefined {
  return id ? hairStylingOptions(gender).find((o) => o.id === id) : undefined;
}

/** Haircut prompt followed by the styling one, each as its own sentence. */
export function withStylingPrompt(prompt: string, styling?: HairStylingOption): string {
  if (!styling) return prompt;
  const base = prompt.trim();
  return `${/[.!?]$/.test(base) ? base : `${base}.`} ${styling.prompt}`;
}

/** Second option row in the Custom look builder: bangs for women, fades for men (FLUX `HairstyleSelector`). */
export interface HairAddOnOption {
  id: string;
  name: string;
  image: StaticImageData;
  prompt: string;
}

const ADD_ONS: Record<"female" | "male", { title: string; options: HairAddOnOption[] }> = {
  female: {
    title: "Add bangs",
    options: [
      { id: "curtain", name: "Curtain", image: curtainImg, prompt: "Give her long curtain bangs." },
      { id: "fringes", name: "Fringes", image: fringesImg, prompt: "Give her fringes covering the forehead." },
      { id: "side-swept", name: "Side swept", image: sideSweptImg, prompt: "Give her side swept bangs." },
    ],
  },
  male: {
    title: "Fade options",
    options: [
      { id: "taper-fade", name: "Taper fade", image: taperFadeImg, prompt: "Give his hair a taper fade." },
      { id: "medium-fade", name: "Medium fade", image: mediumFadeImg, prompt: "Give his hair a medium fade." },
      { id: "skin-fade", name: "Skin fade", image: skinFadeImg, prompt: "Give his hair a skin fade." },
    ],
  },
};

export function hairAddOns(gender: string) {
  return ADD_ONS[gender === "male" ? "male" : "female"];
}

/**
 * Custom look (FLUX order): haircut, styling, then fade / bangs, each its own sentence. The label names the
 * haircut and the extras ("Wolf Cut · Curly · Curtain"); null when nothing is chosen.
 */
export function composeCustomLook(
  gender: string,
  haircut: { name: string; prompt: string } | null,
  stylingId: string | null,
  addOnId: string | null,
): { name: string; prompt: string } | null {
  const styling = hairStylingById(stylingId, gender);
  const addOn = addOnId ? hairAddOns(gender).options.find((o) => o.id === addOnId) : undefined;
  const parts = [haircut?.prompt, styling?.prompt, addOn?.prompt]
    .filter((p): p is string => !!p?.trim())
    .map((p) => (/[.!?]$/.test(p.trim()) ? p.trim() : `${p.trim()}.`));
  if (!parts.length) return null;
  return { name: [haircut?.name, styling?.name, addOn?.name].filter(Boolean).join(" · "), prompt: parts.join(" ") };
}
