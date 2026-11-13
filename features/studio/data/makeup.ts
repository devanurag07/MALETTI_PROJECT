/**
 * Make-up shades straight from FLUX_VERSION_3 (`makeup_prompts.json`, copied as is) — lipstick, eyeshadow and blush,
 * not the backend catalogue. Shaped like catalog items so colour dots / names work unchanged; `attributes.prompt` is
 * the FLUX try-on prompt, sent with the make-up try-on as `lip_prompt` / `eye_prompt` / `blush_prompt`.
 */
import type { CatalogItem } from "../api";
import prompts from "./makeup_prompts.json";

const IT: Record<string, string> = {
  "Nude Beige": "Beige nude", "Soft Peach": "Pesca tenue", "Nude Pink": "Rosa nude", "Dusty Rose": "Rosa antico",
  "Baby Pink": "Rosa confetto", "Rose Pink": "Rosa", "Soft Rose": "Rosa tenue", Mauve: "Malva", "Warm Rose": "Rosa caldo",
  "Watermelon Pink": "Rosa anguria", "Hot Pink": "Rosa acceso", "Raspberry Pink": "Rosa lampone", Peach: "Pesca",
  "Peach Pink": "Rosa pesca", Apricot: "Albicocca", Salmon: "Salmone", Coral: "Corallo", Terracotta: "Terracotta",
  "Burnt Orange": "Arancio bruciato", Cinnamon: "Cannella", Berry: "Frutti di bosco", Plum: "Prugna", Brick: "Mattone",
  "Deep Berry": "Bacca scura",
};

const hex = (rgb: number[]) => `#${rgb.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

type Shade = { name: string; rgb: number[]; prompt: string };
const build = (category: "lipstick" | "eyeshadow" | "blush", kind: string, it: Record<string, string>): CatalogItem[] =>
  Object.entries(prompts[category] as Record<string, Shade[]>)
    .flatMap(([group, shades]) => shades.map((s) => ({ group, ...s })))
    .map((s, i) => ({
      id: -(i + 1), kind, key: s.name.toLowerCase().replace(/\s+/g, "_"), gender: "woman" as const,
      name: { en: s.name, it: it[s.name] ?? s.name }, sub: { en: s.group, it: s.group },
      hex: hex(s.rgb), image_url: null, attributes: { group: s.group, prompt: s.prompt },
    }));

const IT_LIP: Record<string, string> = {
  "Nude Beige": "Beige nude", "Pink Nude": "Nude rosato", "Peach Nude": "Nude pesca", "Caramel Nude": "Nude caramello",
  "Brown Nude": "Nude marrone", "Mauve Nude": "Nude malva", "Dusty Rose": "Rosa antico", Rosewood: "Legno di rosa",
  "Soft Pink": "Rosa tenue", Rose: "Rosa", Coral: "Corallo", Raspberry: "Lampone", Fuchsia: "Fucsia",
  "Classic Red": "Rosso classico", "Cherry Red": "Rosso ciliegia", Berry: "Frutti di bosco", Terracotta: "Terracotta",
  "Brick Red": "Rosso mattone", "Deep Burgundy": "Bordeaux intenso", Plum: "Prugna", "Chocolate Brown": "Cioccolato",
  "Dark Purple": "Viola scuro", Wine: "Vino", Black: "Nero",
};
const IT_EYE: Record<string, string> = {
  Nude: "Nude", Beige: "Beige", Taupe: "Taupe", Caramel: "Caramello", "Warm Brown": "Marrone caldo", Mocha: "Moka",
  Cocoa: "Cacao", Black: "Nero", Blush: "Rosa cipria", Rose: "Rosa", Mauve: "Malva", Plum: "Prugna", Champagne: "Champagne",
  Gold: "Oro", Bronze: "Bronzo", Copper: "Rame", "Rose Gold": "Oro rosa", Silver: "Argento", Emerald: "Smeraldo",
  Navy: "Blu notte", Burgundy: "Bordeaux", Olive: "Oliva", Purple: "Viola", "Pink Shimmer": "Rosa perlato",
};

export const LIPSTICK = build("lipstick", "lip_shade", IT_LIP);
export const EYESHADOW = build("eyeshadow", "eye_shade", IT_EYE);
export const BLUSH = build("blush", "blush_shade", IT);
export const lipByKey = (key: string | null | undefined) => (key ? LIPSTICK.find((b) => b.key === key) : undefined);
export const eyeByKey = (key: string | null | undefined) => (key ? EYESHADOW.find((b) => b.key === key) : undefined);
export const blushByKey = (key: string | null | undefined) => (key ? BLUSH.find((b) => b.key === key) : undefined);

/** Blush that goes with each make-up look (look key → blush key above). Mirrors LOOK_BLUSH in the backend seed. */
export const LOOK_BLUSH: Record<string, string> = {
  warm_nude: "nude_beige", terracotta: "terracotta", brick_gold: "cinnamon", peach_glow: "soft_peach",
  fresh_coral: "coral", soft_apricot: "apricot", bright_coral: "salmon", poppy_red: "peach_pink",
  soft_rose: "soft_rose", pink_lilac: "baby_pink", cool_nude: "nude_pink", raspberry: "raspberry_pink",
  mauve_slate: "mauve", rosewood: "dusty_rose", classic_red: "warm_rose", berry: "berry",
  burgundy_charcoal: "deep_berry", fuchsia: "hot_pink",
};

/** A look's own blush: from the catalogue if the backend has it, else the table above. */
export const lookBlush = (look: { key: string; attributes?: Record<string, unknown> } | null | undefined) =>
  look ? blushByKey((look.attributes?.blush as string | undefined) ?? LOOK_BLUSH[look.key]) : undefined;

/**
 * Recommended make-up looks, made of FLUX_VERSION_3 shades: the backend still picks which looks suit the colour
 * season (makeup_look recommendations); what each look *is* comes from makeup_prompts.json via this table.
 */
export const LOOK_FLUX: Record<string, { lip: string; eye: string }> = {
  warm_nude: { lip: "caramel_nude", eye: "taupe" }, terracotta: { lip: "terracotta", eye: "bronze" },
  brick_gold: { lip: "brick_red", eye: "gold" }, peach_glow: { lip: "peach_nude", eye: "champagne" },
  fresh_coral: { lip: "coral", eye: "warm_brown" }, soft_apricot: { lip: "peach_nude", eye: "caramel" },
  bright_coral: { lip: "coral", eye: "bronze" }, poppy_red: { lip: "cherry_red", eye: "cocoa" },
  soft_rose: { lip: "rose", eye: "mauve" }, pink_lilac: { lip: "pink_nude", eye: "purple" },
  cool_nude: { lip: "mauve_nude", eye: "beige" }, raspberry: { lip: "raspberry", eye: "mauve" },
  mauve_slate: { lip: "mauve_nude", eye: "silver" }, rosewood: { lip: "rosewood", eye: "taupe" },
  classic_red: { lip: "classic_red", eye: "black" }, berry: { lip: "berry", eye: "plum" },
  burgundy_charcoal: { lip: "deep_burgundy", eye: "black" }, fuchsia: { lip: "fuchsia", eye: "silver" },
};

/** A recommended look's FLUX shades (lipstick, eyeshadow, blush), or null for a look not in the table. */
export function lookShades(look: { key: string; attributes?: Record<string, unknown> } | null | undefined) {
  const m = look ? LOOK_FLUX[look.key] : undefined;
  if (!look || !m) return null;
  return { lip: lipByKey(m.lip), eye: eyeByKey(m.eye), blush: lookBlush(look) };
}
