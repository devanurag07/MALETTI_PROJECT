import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  children: ReactNode;
  /** Optional heading row: title on the left, `action` on the right. */
  title?: ReactNode;
  action?: ReactNode;
  /** raised = a panel inside a panel (tiles, inner lists). */
  tone?: "glass" | "raised";
  /** Aqua outline + glow, for the chosen item. */
  selected?: boolean;
  padding?: "md" | "lg" | "none";
}

/** Glass panel with an aqua hairline: the container for every group of content. */
export function Panel({ children, title, action, tone = "glass", selected, padding = "lg", className, ...rest }: PanelProps) {
  return (
    <div
      className={cn(
        "relative rounded-[1.75rem] border",
        tone === "glass" ? "bg-(image:--bv-glass) shadow-bv-glow-soft" : "bg-bv-surface-raised",
        selected ? "border-bv-accent shadow-bv-glow" : "border-bv-line",
        padding === "lg" && "p-8",
        padding === "md" && "p-6",
        className,
      )}
      {...rest}
    >
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-6">
          {title && <p className="text-3xl font-semibold text-bv-ink">{title}</p>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
