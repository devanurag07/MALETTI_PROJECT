export type ShadeCategory = "lipstick" | "blush" | "eyeshadow";

export type MakeupCategory = ShadeCategory;

export type MakeupShadeEntry = {
  name: string;
  prompt: string;
  rgb: number[];
};

export type MakeupPrompts = Record<
  ShadeCategory,
  Record<string, MakeupShadeEntry[]>
>;

/** One effect + shade chosen on Custom Look before Proceed */
export type MakeupSelection = {
  category: MakeupCategory;
  shadeName: string;
  prompt: string;
};

export type BridalLookId =
  | "malayalam-bride"
  | "christian-bride"
  | "tamil-bride"
  | "iyengar-bride"
  | "telugu-bride"
  | "kannada-bride"
  | "maharashtrian-bride"
  | "reception-glam"
  | "friend-of-bride"
  | "punjabi-bride"
  | "rajasthani-bride"
  | "bengali-bride"
  | "north-indian-bride"
  | "minimal-pastel-bride"
  | "cocktail-look"
  | "mehendi-look";

export type BridalLookEntry = {
  name: string;
  shortDescription: string;
  prompt: string;
  rgb: number[];
};

export type BridalLooks = Record<BridalLookId, BridalLookEntry>;

/** One bridal look chosen before Proceed */
export type BridalLookSelection = {
  id: BridalLookId;
  name: string;
  prompt: string;
};

/** A single product inside a Look Advisor combo (from backend analysis) */
export type LookComboItem = {
  category: ShadeCategory;
  shadeName: string;
  prompt: string;
  hex: string;
};

/** A complete, coordinated look suggested by the Look Advisor */
export type LookCombo = {
  name: string;
  description: string;
  items: LookComboItem[];
};

export type DesiredMakeupLook =
  | "Natural"
  | "Soft Glam"
  | "Full Glam"
  | "Office"
  | "Party"
  | "Bridal";

export type OutfitColor =
  | "Neutral (Black, White, Grey, Cream)"
  | "Beige (Beige, Tan, Camel, Brown)"
  | "Red (Red, Burgundy, Maroon, Wine)"
  | "Pink (Pink, Rose, Fuchsia)"
  | "Purple (Lavender, Purple, Plum)"
  | "Blue (Sky Blue, Navy, Royal Blue)"
  | "Green (Olive, Emerald, Teal)"
  | "Warm (Yellow, Orange, Gold, Mustard)"
  | "Multicolored";

export type LookAdvisorPreferences = {
  desiredLook: DesiredMakeupLook;
  outfitColor: OutfitColor;
};

/** Shades, products and step-by-step tips shown with a makeup look recommendation. */
export type MakeupLookGuide = {
  /** A short paragraph describing the look, shown at the top of "How to get this look". */
  about?: string;
  shades: { base: string; eyes: string; lips: string; cheeks: string };
  products: string[];
  tips: string[];
};

/** Keyed by BridalLookId, or by occasion ("engagement" | "party") for generic guides. */
export type MakeupLookGuides = Record<string, MakeupLookGuide>;
