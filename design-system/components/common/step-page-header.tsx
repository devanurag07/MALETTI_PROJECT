"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StepPageHeaderProps {
  /** Called when the back button is tapped */
  onBack?: () => void;
  /** Centered title text */
  title?: string;
  /** Optional smaller line under the title */
  subtitle?: string;
  /** Optional slot rendered on the right side of the header */
  rightSlot?: ReactNode;
  /** Show a bottom border (default true) */
  borderBottom?: boolean;
  /** Extra classes */
  className?: string;
}

export function StepPageHeader({
  onBack,
  title,
  subtitle,
  rightSlot,
  borderBottom = true,
  className,
}: StepPageHeaderProps) {
  return (
    <header
      className={cn(
        "relative flex gap-12 items-center justify-center px-12 py-12",
        borderBottom && "border-b border-bv-line",
        className,
      )}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="absolute left-10 top-1/2 flex size-20 -translate-y-1/2 items-center justify-center rounded-full border-2 border-bv-line-strong text-bv-ink hover:border-bv-accent hover:text-bv-accent"
        >
          <ArrowLeft className="size-10" strokeWidth={2} />
        </button>
      )}

      {title && (
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-semibold text-bv-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-2xl text-bv-ink-muted">{subtitle}</p>}
        </div>
      )}

      {rightSlot && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          {rightSlot}
        </div>
      )}
    </header>
  );
}
