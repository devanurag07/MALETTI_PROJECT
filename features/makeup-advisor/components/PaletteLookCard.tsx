"use client";
import { Check } from "lucide-react";
import type { LookComboItem } from "../types";

interface PaletteLookCardProps {
  name: string;
  items: LookComboItem[];
  tried?: boolean;
  onTry: () => void;
}

/**
 * Simple portrait card for an AI-recommended look that has no picture yet: a soft wash of the look's own
 * shades, the three swatches and the name. No customer photo, so nothing suggests a result before the try-on.
 */
export default function PaletteLookCard({ name, items, tried, onTry }: PaletteLookCardProps) {
  const hexes = items.map((i) => i.hex);
  const wash = hexes.length ? `linear-gradient(165deg, ${hexes.map((h) => `${h}66`).join(", ")}), #141414` : "#141414";

  return (
    <button
      type="button"
      onClick={onTry}
      className="relative flex aspect-[3/4] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-white/10 transition-transform active:scale-[0.97]"
      style={{ background: wash }}
    >
      <div className="flex -space-x-5 pb-16">
        {hexes.map((hex, i) => (
          <span key={`${hex}-${i}`} className="h-20 w-20 rounded-full border-4 border-[#141414] shadow-lg" style={{ backgroundColor: hex }} />
        ))}
      </div>
      <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-12 text-left text-2xl font-semibold leading-tight">
        {name}
      </p>
      {tried && (
        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[#0D3B32] px-3 py-1.5 text-lg font-semibold">
          <Check className="h-5 w-5" /> Tried
        </span>
      )}
    </button>
  );
}
