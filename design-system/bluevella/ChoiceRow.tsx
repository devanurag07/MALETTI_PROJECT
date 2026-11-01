import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SelectMark } from "./SelectMark";

export interface ChoiceRowProps {
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
  /** Square mark for multi-select. */
  multi?: boolean;
  className?: string;
}

/** One answer in a question list: icon, label, round (or square) mark; dark-aqua fill when chosen. */
export function ChoiceRow({ label, hint, icon, selected, onClick, multi, className }: ChoiceRowProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-[8.5rem] w-full items-center gap-6 rounded-[1.5rem] border-2 px-7 py-6 text-left transition active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-ink",
        selected ? "border-bv-accent bg-bv-accent-soft shadow-bv-glow" : "border-bv-line-strong bg-bv-surface-raised",
        className,
      )}
    >
      {icon && <span className="flex size-16 shrink-0 items-center justify-center">{icon}</span>}
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-[1.9rem] font-medium leading-tight text-bv-ink">{label}</span>
        {hint && <span className="text-xl text-bv-ink-muted">{hint}</span>}
      </span>
      <SelectMark selected={selected} size="sm" className={multi ? "rounded-xl" : undefined} />
    </button>
  );
}
