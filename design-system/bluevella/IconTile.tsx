import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface IconTileProps {
  icon: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  selected?: boolean;
  /** Top-right slot (e.g. a <SelectMark />). */
  corner?: ReactNode;
  onClick?: () => void;
  className?: string;
}

/** Square tile with an aqua line icon over its label, as in the welcome screen's module grid. */
export function IconTile({ icon, label, hint, selected, corner, onClick, className }: IconTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-[1.5rem] border-2 p-7 text-center transition active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-ink",
        selected ? "border-bv-accent bg-bv-accent-soft shadow-bv-glow" : "border-bv-line-strong bg-bv-surface-raised",
        className,
      )}
    >
      {corner && <span className="absolute right-4 top-4">{corner}</span>}
      <span className="flex size-20 items-center justify-center text-bv-accent [&_svg]:size-16 [&_svg]:stroke-[1.5]">{icon}</span>
      <span className="text-3xl font-semibold leading-tight text-bv-ink">{label}</span>
      {hint && <span className="text-xl leading-snug text-bv-ink-muted">{hint}</span>}
    </button>
  );
}
