"use client";
import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel } from "@/design-system/bluevella";
import { cn } from "@/lib/utils";
import { HAIR_COLOR_CATEGORIES, getHairColorTechniques, type HairColorTechniqueId } from "../data/haircolor-catalog";

/** FLUX's technique names (customLookHaircolor.techniques). */
export const TECHNIQUE_LABEL: Record<HairColorTechniqueId, string> = {
  global: "Global",
  ombre: "Ombre",
  balayage: "Balayage",
  streaks: "Streaks",
  highlights: "Highlights",
};

const CATEGORIES_PER_PAGE = 3;

/**
 * Hair colour Custom tab, as FLUX's CustomLookHaircolor: "Select a colour shade" (three colour families per page in
 * a panel, four shade photos per row, page arrows that wrap), then "Select a colour technique". The screen's footer
 * tries the pair once both are picked.
 */
export default function HaircolorPicker({
  gender,
  shade,
  technique,
  onShadeChange,
  onTechniqueChange,
}: {
  gender: string;
  shade: string | null;
  technique: HairColorTechniqueId | null;
  onShadeChange: (shadeId: string) => void;
  onTechniqueChange: (technique: HairColorTechniqueId) => void;
}) {
  const pages = Math.ceil(HAIR_COLOR_CATEGORIES.length / CATEGORIES_PER_PAGE);
  // Open on the page holding the picked shade (e.g. back from Results).
  const [page, setPage] = useState(() => {
    const i = HAIR_COLOR_CATEGORIES.findIndex((c) => c.shades.some((s) => s.id === shade));
    return i < 0 ? 0 : Math.floor(i / CATEGORIES_PER_PAGE);
  });
  const visible = HAIR_COLOR_CATEGORIES.slice(page * CATEGORIES_PER_PAGE, page * CATEGORIES_PER_PAGE + CATEGORIES_PER_PAGE);
  const arrow = "flex size-14 items-center justify-center rounded-full border-2 border-bv-line-strong text-bv-ink";

  const heading = (text: string) => (
    <div className="flex items-center gap-5">
      <span className="h-0.5 flex-1 bg-bv-line" />
      <p className="text-4xl font-semibold">{text}</p>
      <span className="h-0.5 flex-1 bg-bv-line" />
    </div>
  );

  return (
    <div className="flex flex-col gap-10">
      {heading("Select a colour shade")}
      <Panel className="flex flex-col gap-8 p-8">
        {visible.map((category) => (
          <section key={category.id} className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-semibold">{category.name}</span>
              <span className="h-px flex-1 bg-bv-line" />
            </div>
            <div className="grid grid-cols-4 gap-5">
              {category.shades.map((s) => {
                const selected = shade === s.id;
                return (
                  <button key={s.id} type="button" aria-pressed={selected} onClick={() => onShadeChange(s.id)} className="flex flex-col items-center gap-3">
                    <span
                      className={cn(
                        "block aspect-[2/1] w-full overflow-hidden rounded-2xl border-4 transition",
                        selected ? "border-bv-accent shadow-bv-glow" : "border-transparent",
                      )}
                    >
                      <Image src={s.image} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className={cn("text-center text-2xl leading-tight", selected ? "font-semibold text-bv-ink" : "font-medium text-bv-ink")}>
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Previous colour categories" onClick={() => setPage((page - 1 + pages) % pages)} className={arrow}>
              <ChevronLeft className="size-8" />
            </button>
            <span className="text-xl text-bv-ink-muted">
              {page + 1} / {pages}
            </span>
            <button type="button" aria-label="More colour categories" onClick={() => setPage((page + 1) % pages)} className={arrow}>
              <ChevronRight className="size-8" />
            </button>
          </div>
        )}
      </Panel>

      {heading("Select a colour technique")}
      <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-6">
        {getHairColorTechniques(gender).map((id) => {
          const selected = technique === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onTechniqueChange(id)}
              className={cn(
                "rounded-3xl border-2 px-8 py-7 text-3xl font-semibold transition active:scale-[0.98]",
                selected ? "border-bv-accent bg-bv-accent-soft text-bv-ink shadow-bv-glow" : "border-bv-line-strong bg-bv-surface-raised text-bv-ink",
              )}
            >
              {TECHNIQUE_LABEL[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
