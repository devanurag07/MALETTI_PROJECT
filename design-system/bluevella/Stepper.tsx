import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperProps {
  /** Step labels in order. */
  steps: string[];
  /** 0-based index of the current step. */
  current: number;
  className?: string;
}

/**
 * Dot stepper: done steps are dark-aqua with a tick, the current one aqua with a halo, upcoming ones
 * outlined; joined by a line that fills as the journey progresses. Labels show under each dot when
 * there's room (≤ 6 steps), otherwise only under the current one.
 */
export function Stepper({ steps, current, className }: StepperProps) {
  const showAll = steps.length <= 6;
  return (
    <ol className={cn("flex items-start", className)} aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={`${label}-${i}`} className="relative flex flex-1 flex-col items-center gap-3">
            {i > 0 && (
              <span
                aria-hidden
                className={cn("absolute right-1/2 top-[1.1rem] h-[3px] w-full -translate-y-1/2", i <= current ? "bg-bv-accent" : "bg-bv-line")}
              />
            )}
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "relative z-10 flex size-9 items-center justify-center rounded-full border-2 text-base font-semibold",
                done && "border-bv-accent bg-bv-accent-soft text-bv-accent",
                active && "border-bv-accent bg-bv-accent text-bv-on-accent shadow-bv-glow",
                !done && !active && "border-bv-line-strong bg-bv-ground text-bv-ink-muted",
              )}
            >
              {done ? <Check className="size-5" strokeWidth={3} /> : i + 1}
            </span>
            {(showAll || active) && (
              <span
                className={cn(
                  "max-w-[11rem] text-center text-lg leading-tight",
                  active ? "font-semibold text-bv-ink" : "text-bv-ink-muted",
                  !showAll && "whitespace-nowrap",
                )}
              >
                {label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
