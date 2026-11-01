import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TipRowProps {
  icon: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/** Guidance row: aqua line icon in a ringed circle, a short instruction and an optional hint. */
export function TipRow({ icon, title, hint, className }: TipRowProps) {
  return (
    <div className={cn("flex items-center gap-5 rounded-[1.5rem] border border-bv-line bg-bv-surface-raised px-6 py-5", className)}>
      <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-bv-line-strong text-bv-accent [&_svg]:size-8 [&_svg]:stroke-[1.75]">
        {icon}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-2xl font-medium leading-tight text-bv-ink">{title}</span>
        {hint && <span className="text-xl leading-snug text-bv-ink-muted">{hint}</span>}
      </span>
    </div>
  );
}
