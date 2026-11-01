"use client";
import { Panel } from "@/design-system/bluevella";
import { useEffect, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { ArrowRight, CheckCircle2, Scissors, Smile } from "lucide-react";
import acneIcon from "@/assets/skin-icons/acne.png";
import darkCirclesIcon from "@/assets/skin-icons/dark circles.png";
import oilinessIcon from "@/assets/skin-icons/oiliness.png";
import pigmentationIcon from "@/assets/skin-icons/pigmentation.png";
import poresIcon from "@/assets/skin-icons/pores.png";
import rednessIcon from "@/assets/skin-icons/redness.png";
import skinTextureIcon from "@/assets/skin-icons/skin-texture.png";
import wrinklesIcon from "@/assets/skin-icons/wrinkles.png";
import dandruffIcon from "@/assets/skin-icons2/dandruff.png";
import hairDensityIcon from "@/assets/skin-icons2/hair-density.png";
import hairTextureIcon from "@/assets/skin-icons2/hair-texture.png";
import hairThinningIcon from "@/assets/skin-icons2/hair-thinning.png";
import scalpOilinessIcon from "@/assets/skin-icons2/oiliness.png";
import scalpRednessIcon from "@/assets/skin-icons2/scalp-redness.png";
import scalpTextureIcon from "@/assets/skin-icons2/scalp-texture.png";
import shaftThicknessIcon from "@/assets/skin-icons2/shaft-thickness.png";
import type { HairOutcome, SkinOutcome } from "../hooks/useAnalysis";

type Area = "skin" | "hair";

interface Pair {
  key: string;
  score: number;
  problem: string;
  solution: string;
  icon: StaticImageData;
}

/** Short customer-facing labels per metric (keys are normalised API metric names). */
const COPY: Record<Area, Record<string, { problem: string; solution: string; icon: StaticImageData }>> = {
  skin: {
    acne: { problem: "Breakouts", solution: "Clarifying facial", icon: acneIcon },
    oiliness: { problem: "Oily T-zone", solution: "Oil-balancing facial", icon: oilinessIcon },
    redness: { problem: "Redness", solution: "Calming facial", icon: rednessIcon },
    wrinkles: { problem: "Fine lines", solution: "Anti-ageing facial", icon: wrinklesIcon },
    pigmentation: { problem: "Uneven tone", solution: "Brightening treatment", icon: pigmentationIcon },
    dark_circles: { problem: "Dark circles", solution: "Under-eye treatment", icon: darkCirclesIcon },
    pores: { problem: "Visible pores", solution: "Pore-refining facial", icon: poresIcon },
    skin_texture: { problem: "Uneven texture", solution: "Smoothing peel", icon: skinTextureIcon },
  },
  hair: {
    hair_density: { problem: "Low fullness", solution: "Growth scalp treatment", icon: hairDensityIcon },
    hair_thinning: { problem: "Thinning", solution: "Hair-fall control course", icon: hairThinningIcon },
    shaft_thickness: { problem: "Weak strands", solution: "Protein treatment", icon: shaftThicknessIcon },
    hair_texture: { problem: "Dry ends", solution: "Deep-conditioning spa", icon: hairTextureIcon },
    oiliness: { problem: "Oily scalp", solution: "Scalp detox", icon: scalpOilinessIcon },
    scalp_redness: { problem: "Irritated scalp", solution: "Soothing scalp treatment", icon: scalpRednessIcon },
    scalp_texture: { problem: "Flaky scalp", solution: "Scalp exfoliation", icon: scalpTextureIcon },
    dandruff: { problem: "Dandruff", solution: "Anti-dandruff treatment", icon: dandruffIcon },
  },
};

/** Scores are 0–100, higher is healthier; below this a metric counts as a concern. */
const CONCERN_BELOW = 75;
const AREA_TITLE: Record<Area, string> = { hair: "Hair & scalp", skin: "Skin" };

/** Red below 55, amber below 75, green when healthy. */
const scoreColor = (score: number) => (score < 55 ? "#F07167" : score < CONCERN_BELOW ? "#F2C14E" : "#4CC38A");

const normalise = (name: string) => name.toLowerCase().trim().replace(/[-\s]+/g, "_");

function pairsFor(area: Area, metrics: { name: string; score: number }[]): Pair[] {
  return metrics
    .map((m) => ({ m, copy: COPY[area][normalise(m.name)] }))
    .filter(({ copy }) => copy)
    .sort((a, b) => a.m.score - b.m.score)
    .map(({ m, copy }) => ({ key: `${area}:${normalise(m.name)}`, score: Math.round(m.score), ...copy }));
}

/** Results for the analysis step: every metric per area with its score paired with what fixes it, lowest score first. */
export default function AnalysisResults({
  skin,
  hair,
  face,
}: {
  skin: SkinOutcome | null;
  hair: HairOutcome | null;
  face: File | null;
}) {
  const [faceUrl, setFaceUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!face) return;
    const url = URL.createObjectURL(face);
    setFaceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [face]);

  const byArea: Record<Area, Pair[]> = {
    hair: pairsFor("hair", hair?.attributes.map((a) => ({ name: a.attribute, score: a.score })) ?? []),
    skin: pairsFor("skin", skin?.results ?? []),
  };
  const concernsIn = (a: Area) => byArea[a].filter((p) => p.score < CONCERN_BELOW);
  // Present areas only; the one with the lowest score leads. Rows inside are already lowest first.
  const areas = (["hair", "skin"] as const)
    .filter((a) => (a === "hair" ? hair : skin))
    .sort((a, b) => (byArea[a][0]?.score ?? 100) - (byArea[b][0]?.score ?? 100));
  const anyConcern = areas.some((a) => concernsIn(a).length > 0);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-center gap-8">
        {faceUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL
          <img src={faceUrl} alt="Your photo" className="h-36 w-28 shrink-0 rounded-2xl border-2 border-bv-accent object-cover object-[50%_25%] shadow-bv-glow" />
        )}
        <p className="text-5xl font-semibold leading-tight">{anyConcern ? "Here's what we found" : "You're in good shape"}</p>
      </div>

      {anyConcern && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-5 px-2 text-xl font-semibold uppercase tracking-[0.15em]">
          <span className="text-[#F07167]">Problem</span>
          <span className="w-10" />
          <span className="text-[#4CC38A]">Solution</span>
        </div>
      )}

      {areas.map((area) => {
        const AreaIcon = area === "skin" ? Smile : Scissors;
        const rows = byArea[area];
        return (
          <Panel
            key={area}
            className="flex flex-col gap-4"
            title={
              <span className="flex items-center gap-3">
                <AreaIcon className="size-8 text-bv-accent" strokeWidth={1.75} />
                {AREA_TITLE[area]}
              </span>
            }
          >
            {rows.length === 0 ? (
              <div className="flex items-center gap-4 rounded-[1.5rem] bg-bv-surface-raised px-7 py-6 text-[1.9rem]">
                <CheckCircle2 className="h-9 w-9 text-[#4CC38A]" />
                Looking healthy
              </div>
            ) : (
              rows.map((p) => (
                <div key={p.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-5 rounded-[1.5rem] border border-bv-line bg-bv-surface-raised px-6 py-5">
                  <span className="flex items-center gap-5">
                    <Image src={p.icon} alt="" className="h-12 w-12 shrink-0 object-contain" />
                    <span className="flex flex-col gap-1">
                      <span className="text-[1.9rem] font-semibold leading-tight">{p.problem}</span>
                      <span className="text-2xl text-bv-ink-muted">
                        <span className="text-[1.75rem] font-bold" style={{ color: scoreColor(p.score) }}>
                          {p.score}
                        </span>
                        /100
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-10 w-10 text-bv-line-strong" />
                  <span className="rounded-2xl bg-bv-accent-soft px-5 py-4 text-[1.75rem] font-medium leading-tight text-bv-ink">
                    {p.solution}
                  </span>
                </div>
              ))
            )}
          </Panel>
        );
      })}
    </div>
  );
}
