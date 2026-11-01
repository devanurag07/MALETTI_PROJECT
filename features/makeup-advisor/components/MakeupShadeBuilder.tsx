"use client";
import type { ComponentType } from "react";
import { Check } from "lucide-react";
import { GiEyelashes, GiLipstick, GiPowder } from "react-icons/gi";
import { cn } from "@/lib/utils";
import makeupPrompts from "../data/makeup_prompts.json";
import type { LookComboItem, MakeupPrompts, ShadeCategory } from "../types";

const prompts = makeupPrompts as MakeupPrompts;

/** Pages of FLUX's CustomLookMakeup, one effect each. */
export const SHADE_CATEGORIES: ShadeCategory[] = ["lipstick", "blush", "eyeshadow"];

const CATEGORY_LABEL: Record<ShadeCategory, string> = { lipstick: "Lipstick", blush: "Blush", eyeshadow: "Eyeshadow" };
const CATEGORY_ICON: Record<ShadeCategory, ComponentType<{ className?: string }>> = {
  lipstick: GiLipstick,
  blush: GiPowder,
  eyeshadow: GiEyelashes,
};

/** Chosen shade id (`<subcategory>::<name>`) per effect; at most one each. */
export type ShadePicks = Partial<Record<ShadeCategory, string>>;

interface Shade {
  id: string;
  name: string;
  prompt: string;
  hex: string;
}

const toHex = (rgb: number[]) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/** Shade groups per effect, as in the JSON ("Everyday", "Matte Reds", …), with FLUX's finish tag. */
const GROUPS = Object.fromEntries(
  SHADE_CATEGORIES.map((category) => [
    category,
    Object.entries(prompts[category] ?? {}).map(([sub, shades]) => ({
      name: sub,
      tag: /shimmer/i.test(sub) ? "Shimmer" : /matte/i.test(sub) ? "Matte" : null,
      shades: shades.map<Shade>((s) => ({ id: `${sub}::${s.name}`, name: s.name, prompt: s.prompt, hex: toHex(s.rgb) })),
    })),
  ]),
) as Record<ShadeCategory, { name: string; tag: string | null; shades: Shade[] }[]>;

/** The picked shades as combo items (category order), for the prompt, the label and the swatches. */
export function picksToComboItems(picks: ShadePicks): LookComboItem[] {
  return SHADE_CATEGORIES.flatMap((category) => {
    const shade = GROUPS[category].flatMap((g) => g.shades).find((s) => s.id === picks[category]);
    return shade ? [{ category, shadeName: shade.name, prompt: shade.prompt, hex: shade.hex }] : [];
  });
}

/**
 * Custom makeup builder, as FLUX's CustomLookMakeup: one effect per page (Lipstick, Blush, Eyeshadow) with
 * its shade groups; tap a shade to pick it, tap again to clear. The screen's footer pages through the effects
 * (Previous / Next) and, on the last one, tries the picks together.
 */
export default function MakeupShadeBuilder({
  page,
  onPageChange,
  value,
  onChange,
}: {
  page: number;
  onPageChange: (page: number) => void;
  value: ShadePicks;
  onChange: (picks: ShadePicks) => void;
}) {
  const category = SHADE_CATEGORIES[page] ?? SHADE_CATEGORIES[0];
  const Icon = CATEGORY_ICON[category];
  const picked = picksToComboItems(value);

  const pick = (id: string) => {
    const next = { ...value };
    if (next[category] === id) delete next[category];
    else next[category] = id;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page dots, as in FLUX (Previous / Next / Try this look live in the screen footer). */}
      <div className="flex justify-center gap-3">
        {SHADE_CATEGORIES.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={CATEGORY_LABEL[c]}
            onClick={() => onPageChange(i)}
            className={cn("h-3 rounded-full transition-all", i === page ? "w-12 bg-bv-accent" : value[c] ? "w-3 bg-bv-line-strong" : "w-3 bg-bv-line")}
          />
        ))}
      </div>

      <div className="flex items-center gap-5">
        <span className="h-0.5 flex-1 bg-bv-line" />
        <Icon className="size-12 text-bv-accent" />
        <p className="text-4xl font-semibold">Select a shade for {CATEGORY_LABEL[category]}</p>
        <span className="h-0.5 flex-1 bg-bv-line" />
      </div>

      {GROUPS[category].map((group) => (
        <section key={group.name} className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-semibold">{group.name}</span>
            <span className="h-px flex-1 bg-bv-line" />
            {group.tag && <span className="text-lg text-bv-ink-muted">{group.tag}</span>}
          </div>
          <div className="grid grid-cols-4 gap-6">
            {group.shades.map((shade) => {
              const selected = value[category] === shade.id;
              return (
                <button key={shade.id} type="button" aria-pressed={selected} onClick={() => pick(shade.id)} className="flex flex-col items-center gap-3">
                  <span
                    className={cn(
                      "flex aspect-[8/3] w-full items-center justify-center rounded-2xl border-2 transition",
                      selected ? "border-bv-accent shadow-bv-glow" : "border-transparent",
                    )}
                    // Swatches show the product's own colour (design-system exception).
                    style={{ backgroundColor: shade.hex }}
                  >
                    {selected && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-bv-accent">
                        <Check className="size-6 text-bv-on-accent" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className={cn("text-center text-xl leading-tight", selected ? "font-semibold text-bv-ink" : "font-medium text-bv-ink")}>{shade.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {picked.length > 0 && (
        <p className="text-center text-2xl text-bv-ink-muted">{picked.map((p) => `${CATEGORY_LABEL[p.category]}: ${p.shadeName}`).join("  ·  ")}</p>
      )}
    </div>
  );
}
