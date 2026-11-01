"use client";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/design-system/bluevella";
import { StepPageHeader } from "@/design-system/components/common/step-page-header";
import { StepPageLayout } from "@/design-system/components/common/step-page-layout";
import ProgressRing from "./ProgressRing";

export interface FlowAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface FlowScreenProps {
  title: string;
  onBack?: () => void;
  /** From useFlowProgress: shown as the progress ring at the right of the header. */
  progress?: { current: number; total: number; label: string; steps?: string[] };
  /** Single primary CTA in the sticky footer. */
  primary?: FlowAction;
  /** Optional text action beside the CTA (Skip, See more…). */
  secondary?: FlowAction;
  /** Extra header controls left of the progress ring (Studio: EN/IT toggle). */
  headerExtra?: React.ReactNode;
  /** Changes on every sub-screen so the body re-runs its enter animation. */
  screenKey?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

/**
 * Shell for every customer-session screen (Bluevella): header (back, title, progress ring, home),
 * scrollable body, sticky footer with one aqua primary action.
 */
export default function FlowScreen({
  title,
  onBack,
  progress,
  primary,
  secondary,
  headerExtra,
  screenKey,
  bodyClassName,
  children,
}: FlowScreenProps) {
  const router = useRouter();

  const footer =
    primary || secondary ? (
      <div className="flex items-center gap-8 border-t border-bv-line bg-bv-ground/90 px-12 pt-6 backdrop-blur-md">
        {secondary && (
          <Button variant="ghost" onClick={secondary.onClick} disabled={secondary.disabled} className="shrink-0">
            {secondary.label}
          </Button>
        )}
        {primary && (
          <Button
            onClick={primary.onClick}
            disabled={primary.disabled}
            loading={primary.loading}
            arrow={!primary.loading}
            className="ml-auto min-w-[460px]"
          >
            {primary.label}
          </Button>
        )}
      </div>
    ) : undefined;

  return (
    <StepPageLayout
      header={
        <>
          <StepPageHeader
            onBack={onBack}
            title={title}
            rightSlot={
              <div className="flex items-center gap-4">
                {headerExtra}
                {progress && <ProgressRing {...progress} />}
                <button
                  type="button"
                  aria-label="Home"
                  onClick={() => router.push("/")}
                  className="flex size-20 items-center justify-center rounded-full border-2 border-bv-line-strong text-bv-ink hover:border-bv-accent hover:text-bv-accent"
                >
                  <Home className="size-10" strokeWidth={2} />
                </button>
              </div>
            }
          />
        </>
      }
      footer={footer}
    >
      <div
        key={screenKey}
        className={cn("min-h-full px-12 py-10 animate-in fade-in slide-in-from-right-4 duration-200", bodyClassName)}
      >
        {children}
      </div>
    </StepPageLayout>
  );
}
