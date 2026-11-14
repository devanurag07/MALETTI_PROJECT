/**
 * Hair colours straight from FLUX_VERSION_3 (`haircolor-shades.json`, copied as is) — the Custom colour page shows
 * only these 24 shades (6 groups × 4), not the backend catalogue. Shaped like catalog items so swatches / names work
 * unchanged. The try-on sends FLUX's own prompt (`shade_prompt`, per technique and gender), like the make-up shades.
 */
import type { CatalogItem } from "../api";
import rows from "./haircolor-shades.json";

type Row = { Category: string; Shade: string; Technique: "Global" | "Ombre" | "Balayage" | "Streaks"; Prompt: string; RGB: string };

const IT: Record<string, string> = {
  "Natural Black": "Nero naturale", "Soft Black": "Nero morbido", "Espresso Brown": "Castano espresso", "Dark Chocolate": "Cioccolato fondente",
  "Chocolate Brown": "Castano cioccolato", "Mocha Brown": "Castano moka", "Chestnut Brown": "Castano castagna", "Caramel Brown": "Castano caramello",
  "Dark Blonde": "Biondo scuro", "Honey Blonde": "Biondo miele", "Salt and Pepper": "Sale e pepe", "Ash Blonde": "Biondo cenere",
  "Light Copper": "Rame chiaro", Copper: "Rame", "Cinnamon Red": "Rosso cannella", Auburn: "Ramato",
  "Deep Red": "Rosso intenso", Burgundy: "Borgogna", "Wine Red": "Rosso vino", Plum: "Prugna",
  "Rose Pink": "Rosa", Lavender: "Lavanda", Blue: "Blu", "Emerald Green": "Verde smeraldo",
};
const IT_GROUP: Record<string, string> = {
  "Black & Deep Brown": "Nero e castano scuro", "Chocolate & Warm Brown": "Cioccolato e castano caldo", Blonde: "Biondo",
  "Copper & Auburn": "Rame e ramato", "Burgundy & Plum": "Borgogna e prugna", Fashion: "Fashion",
};

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const hex = (rgb: string) => `#${(rgb.match(/\d+/g) ?? []).map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

/** The 24 FLUX shades in FLUX order, keys `flux_<shade>`; swatches in /public/studio/styles/colours. */
export const FLUX_SHADES: CatalogItem[] = (() => {
  const byShade = new Map<string, CatalogItem & { attributes: { group: string; prompts: Record<string, string> } }>();
  (rows as Row[]).forEach((r) => {
    let item = byShade.get(r.Shade);
    if (!item) {
      const key = `flux_${slug(r.Shade)}`;
      item = {
        id: -(byShade.size + 1), kind: "hair_shade", key, gender: "all",
        name: { en: r.Shade, it: IT[r.Shade] ?? r.Shade }, sub: { en: r.Category, it: IT_GROUP[r.Category] ?? r.Category },
        hex: hex(r.RGB), image_url: `/studio/styles/colours/${key}.jpg`, attributes: { group: r.Category, prompts: {} },
      };
      byShade.set(r.Shade, item);
    }
    item.attributes.prompts[r.Technique.toLowerCase()] = r.Prompt;
  });
  return [...byShade.values()];
})();

export const isFluxShade = (key: string | null | undefined) => !!key && key.startsWith("flux_");
export const fluxShade = (key: string | null | undefined) => (key ? FLUX_SHADES.find((x) => x.key === key) : undefined);

/** Maletti technique key → FLUX prompt technique. */
const TECHNIQUE: Record<string, string> = { uniform: "global", balayage: "balayage", highlights: "streaks", ombre: "ombre" };
/** FLUX MALE_PROMPT_OVERRIDES: shades whose male prompt is not a plain her → his rewrite. */
const MALE_OVERRIDES: Record<string, Record<string, string>> = {
  flux_salt_and_pepper: {
    global: "Give his hair a salt and pepper look with a natural white and grey blend hair colour",
    streaks: "Give him highlights on a few strands with a salt and pepper hair look with a natural white and grey blend hair colour",
  },
};

/** FLUX's prompt for a shade + technique, for this gender (FLUX getHairColorPrompt). */
export function fluxShadePrompt(key: string, technique: string | null | undefined, gender: string | null | undefined): string | null {
  const shade = fluxShade(key);
  if (!shade) return null;
  const tech = TECHNIQUE[technique ?? "uniform"] ?? "global";
  const prompts = shade.attributes.prompts as Record<string, string>;
  if (gender === "man" && MALE_OVERRIDES[key]?.[tech]) return MALE_OVERRIDES[key][tech];
  const prompt = prompts[tech] ?? prompts.global;
  if (!prompt) return null;
  return gender === "man" ? prompt.replace(/\bGive her\b/g, "Give him").replace(/\bher\b/g, "his") : prompt;
}

/** What a saved look keeps of a FLUX colour (params.hair_colour): the backend only knows its own colour keys. */
export type SavedHairColour = { key: string; name: Record<string, string>; hex: string | null; image: string | null; technique?: string | null };
export const savedHairColour = (key: string | null | undefined): SavedHairColour | null => {
  const s = fluxShade(key);
  return s ? { key: s.key, name: s.name, hex: s.hex, image: s.image_url } : null;
};
/** The FLUX colour saved with a look (report / look summary), if any. */
export const hairColourOf = (params: unknown): SavedHairColour | null =>
  ((params as Record<string, unknown> | null | undefined)?.hair_colour as SavedHairColour | undefined) ?? null;

/**
 * Saved looks from the API: a FLUX colour lives in params.hair_colour (the backend has no such catalogue key) — show
 * it as the look's hair colour everywhere (look summary, report, phone page, stylist tablet). Deep, in place.
 */
export function fillFluxHairColour<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object" || seen.has(value as object)) return value;
  seen.add(value as object);
  if (Array.isArray(value)) { value.forEach((v) => fillFluxHairColour(v, seen)); return value; }
  const o = value as Record<string, unknown>;
  if ("hair_shade" in o && !o.hair_shade && "params" in o) {
    const c = hairColourOf(o.params);
    if (c) {
      o.hair_shade = { id: -1, kind: "hair_shade", key: c.key, gender: "all", name: c.name, sub: {}, hex: c.hex, image_url: c.image, attributes: {} };
    }
  }
  for (const v of Object.values(o)) fillFluxHairColour(v, seen);
  return value;
}
