/**
 * Blush shades straight from FLUX_VERSION_3 (`makeup_prompts.json` → "blush", copied as is) — not the backend catalogue.
 * Shaped like catalog items so the try-on screen's colour dots / names work unchanged; `attributes.prompt` is the
 * FLUX try-on prompt, sent with the make-up try-on as `blush_prompt`.
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

export const BLUSH: CatalogItem[] = Object.entries(prompts.blush as Record<string, { name: string; rgb: number[]; prompt: string }[]>)
  .flatMap(([group, shades]) => shades.map((s) => ({ group, ...s })))
  .map((s, i) => ({
    id: -(i + 1), kind: "blush_shade", key: s.name.toLowerCase().replace(/\s+/g, "_"), gender: "woman" as const,
    name: { en: s.name, it: IT[s.name] ?? s.name }, sub: { en: s.group, it: s.group },
    hex: hex(s.rgb), image_url: null, attributes: { group: s.group, prompt: s.prompt },
  }));

export const blushByKey = (key: string | null | undefined) => (key ? BLUSH.find((b) => b.key === key) : undefined);
