import type { StaticImageData } from "next/image";
import ashBlondeImg from "@/assets/color-imgs/Ash Blonde.png";
import auburnImg from "@/assets/color-imgs/Auburn.png";
import blueImg from "@/assets/color-imgs/Blue.png";
import burgundyImg from "@/assets/color-imgs/Burgundy.png";
import caramelBrownImg from "@/assets/color-imgs/Caramel Brown.png";
import chestnutBrownImg from "@/assets/color-imgs/Chestnut Brown.png";
import chocolateBrownImg from "@/assets/color-imgs/Chocolate Brown.png";
import cinnamonRedImg from "@/assets/color-imgs/Cinnamon Red.png";
import copperImg from "@/assets/color-imgs/Copper.png";
import darkBlondeImg from "@/assets/color-imgs/Dark Blonde.png";
import darkChocolateImg from "@/assets/color-imgs/Dark Chocolate.png";
import deepRedImg from "@/assets/color-imgs/Deep Red.png";
import emeraldGreenImg from "@/assets/color-imgs/Emerald Green.png";
import espressoBrownImg from "@/assets/color-imgs/Espresso Brown.png";
import goldenBlondeImg from "@/assets/color-imgs/Golden Blonde.png";
import honeyBlondeImg from "@/assets/color-imgs/Honey Blonde.png";
import lavenderImg from "@/assets/color-imgs/Lavender.png";
import lightCopperImg from "@/assets/color-imgs/Light Copper.png";
import mochaBrownImg from "@/assets/color-imgs/Mocha Brown.png";
import naturalBlackImg from "@/assets/color-imgs/Natural Black.png";
import plumImg from "@/assets/color-imgs/Plum.png";
import rosePinkImg from "@/assets/color-imgs/Rose Pink.png";
import softBlackImg from "@/assets/color-imgs/Soft Black.png";
import wineRedImg from "@/assets/color-imgs/Wine Red.png";
import rows from "./haircolor-shades.json";

export type HairColorTechniqueId =
  | "global"
  | "ombre"
  | "balayage"
  | "streaks"
  | "highlights";

export type HairColorShade = {
  id: string;
  name: string;
  nameKey: string;
  image: StaticImageData;
  rgb: string;
  prompts: {
    global: string;
    ombre: string;
    balayage: string;
    streaks: string;
  };
};

export type HairColorCategory = {
  id: string;
  name: string;
  nameKey: string;
  shades: HairColorShade[];
};

type ShadeRow = {
  Category: string;
  Shade: string;
  Technique: "Global" | "Ombre" | "Balayage" | "Streaks";
  Prompt: string;
  RGB: string;
};

const SHADE_IMAGES: Record<string, StaticImageData> = {
  "Ash Blonde": ashBlondeImg,
  Auburn: auburnImg,
  Blue: blueImg,
  Burgundy: burgundyImg,
  "Caramel Brown": caramelBrownImg,
  "Chestnut Brown": chestnutBrownImg,
  "Chocolate Brown": chocolateBrownImg,
  "Cinnamon Red": cinnamonRedImg,
  Copper: copperImg,
  "Dark Blonde": darkBlondeImg,
  "Dark Chocolate": darkChocolateImg,
  "Deep Red": deepRedImg,
  "Emerald Green": emeraldGreenImg,
  "Espresso Brown": espressoBrownImg,
  "Golden Blonde": goldenBlondeImg,
  "Honey Blonde": honeyBlondeImg,
  Lavender: lavenderImg,
  "Light Copper": lightCopperImg,
  "Mocha Brown": mochaBrownImg,
  "Natural Black": naturalBlackImg,
  Plum: plumImg,
  "Rose Pink": rosePinkImg,
  "Soft Black": softBlackImg,
  "Wine Red": wineRedImg,
};

const TECHNIQUE_KEY = {
  Global: "global",
  Ombre: "ombre",
  Balayage: "balayage",
  Streaks: "streaks",
} as const;

const toCamelKey = (value: string) => {
  const parts = value.replace(/&/g, " ").split(/\s+/).filter(Boolean);
  return (
    parts[0].charAt(0).toLowerCase() +
    parts[0].slice(1) +
    parts.slice(1).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")
  );
};

const toKebabId = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const buildCategories = (entries: ShadeRow[]): HairColorCategory[] => {
  const categories: HairColorCategory[] = [];
  const categoryIndex = new Map<string, HairColorCategory>();
  const shadeIndex = new Map<string, HairColorShade>();

  for (const row of entries) {
    let category = categoryIndex.get(row.Category);
    if (!category) {
      category = {
        id: toKebabId(row.Category),
        name: row.Category,
        nameKey: toCamelKey(row.Category),
        shades: [],
      };
      categoryIndex.set(row.Category, category);
      categories.push(category);
    }

    const shadeKey = `${row.Category}::${row.Shade}`;
    let shade = shadeIndex.get(shadeKey);
    if (!shade) {
      const image = SHADE_IMAGES[row.Shade];
      if (!image) {
        throw new Error(`Missing hair color swatch for ${row.Shade}`);
      }
      shade = {
        id: toKebabId(row.Shade),
        name: row.Shade,
        nameKey: toCamelKey(row.Shade),
        image,
        rgb: row.RGB,
        prompts: {
          global: "",
          ombre: "",
          balayage: "",
          streaks: "",
        },
      };
      shadeIndex.set(shadeKey, shade);
      category.shades.push(shade);
    }

    shade.prompts[TECHNIQUE_KEY[row.Technique]] = row.Prompt;
  }

  return categories;
};

export const HAIR_COLOR_CATEGORIES = buildCategories(rows as ShadeRow[]);

export const FEMALE_COLOR_TECHNIQUES: HairColorTechniqueId[] = [
  "global",
  "ombre",
  "balayage",
  "streaks",
];

export const MALE_COLOR_TECHNIQUES: HairColorTechniqueId[] = [
  "global",
  "highlights",
];

export const getHairColorTechniques = (gender: string): HairColorTechniqueId[] =>
  gender === "male" ? MALE_COLOR_TECHNIQUES : FEMALE_COLOR_TECHNIQUES;

export const findHairColorShade = (shadeId: string) =>
  HAIR_COLOR_CATEGORIES.flatMap((category) => category.shades).find(
    (shade) => shade.id === shadeId
  );

export const getHairColorPrompt = (
  shadeId: string,
  technique: HairColorTechniqueId,
  gender: string
): string | null => {
  const shade = findHairColorShade(shadeId);
  if (!shade) return null;

  const promptKey = technique === "highlights" ? "streaks" : technique;
  const prompt = shade.prompts[promptKey];
  if (!prompt) return null;

  if (gender === "male") {
    return prompt.replace(/\bGive her\b/g, "Give him").replace(/\bher\b/g, "his");
  }

  return prompt;
};
