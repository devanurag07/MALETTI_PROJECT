"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Full-height page shell used by every step in the scalp-analysis flow.
 *
 * Provides:
 *  - consistent flex-col layout with header / scrollable body / sticky footer
 *  - the app font (Jost, from the root layout)
 *  - safe-area bottom padding on the footer
 *  - the Bluevella navy backdrop by default (overridable via `bg`)
 */
export interface StepPageLayoutProps {
  /** Header slot – typically a <StepPageHeader /> */
  header?: ReactNode;
  /** Scrollable body content */
  children: ReactNode;
  /** Footer slot – typically a <StepPageFooter /> */
  footer?: ReactNode;
  /** Override the background (default: the Bluevella backdrop, `--bv-backdrop`) */
  bg?: string;
  /** Extra classes on the outermost wrapper */
  className?: string;
}

export function StepPageLayout({
  header,
  children,
  footer,
  bg = "var(--bv-backdrop)",
  className,
}: StepPageLayoutProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 h-full flex-col text-bv-ink",
        className,
      )}
      style={{ background: bg }}
    >
      {header && <div className="shrink-0">{header}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {children}
      </div>

      {footer && (
        <div
          className="shrink-0"
          style={{
            paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
