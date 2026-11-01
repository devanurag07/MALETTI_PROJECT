"use client";
import { BV, FLOW_ACCENT, FLOW_ACCENT_SOFT } from "./theme";

interface ProgressRingProps {
  current: number;
  total: number;
  label: string;
}

const SIZE = 88;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Compact step progress for the header: a ring filling up with "2/6" inside. */
export default function ProgressRing({ current, total, label }: ProgressRingProps) {
  const pct = total > 0 ? Math.min(1, current / total) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${total}: ${label}`}
      className="relative flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" style={{ stroke: BV.line }} strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          style={{ stroke: FLOW_ACCENT }}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center rounded-full m-[10px] text-2xl font-semibold text-bv-ink" style={{ background: FLOW_ACCENT_SOFT }}>
        {current}/{total}
      </span>
    </div>
  );
}
