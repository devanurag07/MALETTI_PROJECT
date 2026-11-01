"use client";

import { cn } from "@/lib/utils";
import { BV } from "@/features/customer-session/flow/theme";
import { ActionButton } from "./action-button";

export interface StepPageFooterProps {
  /** Back / secondary button label – omit to hide */
  backLabel?: string;
  /** Next / primary button label – omit to hide */
  nextLabel?: string;
  onBack?: () => void;
  onNext?: () => void;
  /** Disable the primary button */
  nextDisabled?: boolean;
  /** Override primary button colour (default Bluevella aqua) */
  nextColor?: string;
  /** Override primary button text colour (default on-accent) */
  nextTextColor?: string;
  /** Extra classes on the footer bar */
  className?: string;
}

export function StepPageFooter({
  backLabel = "Previous",
  nextLabel = "Next",
  onBack,
  onNext,
  nextDisabled = false,
  nextColor = BV.accent,
  nextTextColor = BV.onAccent,
  className,
}: StepPageFooterProps) {
  const hasBack = onBack != null;
  const hasNext = onNext != null;

  if (!hasBack && !hasNext) return null;

  return (
    <div
      className={cn(
        "border-t border-bv-line px-4 py-4 backdrop-blur-md",
        className,
      )}
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
    >
      <div className="mx-auto flex max-w-4xl gap-4">
        {hasBack && (
          <ActionButton
            variant="secondary"
            onClick={onBack}
            textColor="#ffffff"
            fullWidth={false}
          >
            {backLabel}
          </ActionButton>
        )}
        {hasNext && (

          <ActionButton
            variant="primary"
            onClick={onNext}
            disabled={nextDisabled}
            textColor={nextTextColor}
            color={nextColor}
            fullWidth={false}
          >
            {nextLabel}
          </ActionButton>
        )}
      </div>
    </div>
  );
}
