"use client";

import { useEffect, useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import {
  stageIndexForProgress,
  useSimulatedProgress,
} from "@/core/hooks/useSimulatedProgress";
import { cn } from "@/lib/utils";

export type AnalysisProgressImage = {
  /** Blob/object URL or data URL */
  src: string;
  label?: string;
};

/** Typical wait timings for simulated progress bars */
export const PROGRESS_DURATION_MS = {
  /** Hairstyle / haircolor / makeup combo recommendations */
  recommendation: 10_000,
  /** Try-on generation (hairstyle, haircolor, beard, makeup) */
  generation: 25_000,
  /** Default skin / hair analysis */
  analysis: 20_000,
} as const;

export type AnalysisProgressVariant = "analysis" | "recommendation" | "generation";

export interface AnalysisProgressScreenProps {
  title: string;
  /** Stage messages shown by progress band */
  stages: string[];
  expectedDurationMs?: number;
  /** Primary face + optional close-ups / scalp shots */
  images?: AnalysisProgressImage[];
  /**
   * analysis — scan overlay (skin/hair)
   * generation — same scan UI; longer try-on
   * recommendation — lighter checklist UI (no scan gimmick)
   */
  variant?: AnalysisProgressVariant;
  /** Mirror progress for external chrome (e.g. result page dock) */
  onProgressChange?: (progress: number) => void;
}

/** Aqua scan line (Bluevella accent + glow), shared by the scan variants. */
const SCAN_LINE_STYLE = {
  background: "linear-gradient(90deg, transparent, var(--bv-accent), transparent)",
  boxShadow: "var(--bv-glow)",
} as const;

/** Time spent on each image (2× prior carousel interval). No looping. */
const IMAGE_DWELL_MS = 6_400;

/**
 * Map 0–cap progress once across images (forward only — last image stays).
 */
function imageIndexForProgress(
  progress: number,
  imageCount: number,
  cap = 92
): number {
  if (imageCount <= 1) return 0;
  const t = Math.min(0.999, Math.max(0, progress / cap));
  return Math.min(imageCount - 1, Math.floor(t * imageCount));
}

/**
 * Full-screen analysis wait UI: user photos with scan animation + simulated %.
 */
export default function AnalysisProgressScreen({
  title,
  stages,
  expectedDurationMs,
  images = [],
  variant = "analysis",
  onProgressChange,
}: AnalysisProgressScreenProps) {
  const isRecommendation = variant === "recommendation";

  const resolvedDuration =
    expectedDurationMs ??
    (isRecommendation
      ? PROGRESS_DURATION_MS.recommendation
      : variant === "generation"
        ? PROGRESS_DURATION_MS.generation
        : PROGRESS_DURATION_MS.analysis);

  const validImages = useMemo(
    () => images.filter((img) => Boolean(img?.src)),
    [images]
  );
  const multi = validImages.length > 1 && !isRecommendation;

  // Longer overall wait when more images so each gets a full dwell (~6.4s)
  const durationMs = useMemo(() => {
    if (isRecommendation || validImages.length <= 1) return resolvedDuration;
    return Math.max(resolvedDuration, validImages.length * IMAGE_DWELL_MS);
  }, [isRecommendation, resolvedDuration, validImages.length]);

  const progress = useSimulatedProgress(durationMs);
  const displayPct = Math.round(progress);
  const stageIdx = stageIndexForProgress(progress, stages.length);
  const stageLabel = stages[stageIdx] ?? stages[stages.length - 1] ?? "";

  useEffect(() => {
    onProgressChange?.(progress);
  }, [progress, onProgressChange]);

  // Progress-driven: advance once through the list, never wrap/loop
  const activeIndex = multi
    ? imageIndexForProgress(progress, validImages.length)
    : 0;

  // Manual pin only until progress has moved past that slot
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  useEffect(() => {
    if (pinnedIndex === null) return;
    if (activeIndex > pinnedIndex) setPinnedIndex(null);
  }, [activeIndex, pinnedIndex]);

  const displayIndex =
    pinnedIndex !== null
      ? Math.min(pinnedIndex, Math.max(0, validImages.length - 1))
      : activeIndex;

  const main = validImages[displayIndex] ?? validImages[0];

  // Look try-on: result-sized photo + stage OVER image
  if (variant === "generation") {
    return (
      <div className="w-full flex items-center justify-center overflow-hidden rounded-[2rem] bg-bv-surface">
        {/* Image is the positioning box — overlays always sit on the photo */}
        <div className="relative h-full mx-auto w-full max-w-full overflow-hidden rounded-[2rem] leading-[0]">
          {main ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={main.src}
              alt={main.label ?? "Generating look"}
              className="object-contain w-full max-h-[1080px] h-auto block mx-auto leading-normal"
            />
          ) : (
            <div className="w-full min-h-[60vh] bg-bv-surface" />
          )}

          {/* Full-image overlay layer (same box as photo) */}
          <div className="pointer-events-none absolute inset-0 z-10 leading-normal">
            <div
              className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-bv-ground/80 via-bv-ground/35 to-transparent"
              aria-hidden
            />

            {/* Scanning line — thicker + brighter */}
            <div
              className="absolute left-0 right-0 analysis-scan-line h-1.5 md:h-2"
              style={SCAN_LINE_STYLE}
              aria-hidden
            />

            {/* Stage — bottom center over image, in line with % / progress bar */}
            <div className="absolute left-0 right-0 bottom-[60px] z-20 flex justify-center px-28 md:px-32">
              <p
                key={stageIdx}
                className="max-w-full truncate text-center text-bv-ink text-xl md:text-2xl font-semibold px-6 py-2.5 rounded-full bg-(image:--bv-glass) border-2 border-bv-accent shadow-bv-glow-soft"
              >
                {stageLabel}
              </p>
            </div>

            {/* Progress as photo bottom border */}
            <div
              className="absolute inset-x-0 bottom-0 z-10 h-1.5 md:h-2 bg-bv-line overflow-hidden"
              role="progressbar"
              aria-valuenow={displayPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-bv-accent shadow-bv-glow transition-[width] duration-150 ease-out"
                style={{ width: `${displayPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isRecommendation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-(image:--bv-backdrop) px-6 md:px-12 overflow-hidden">
        <div className="w-full max-w-3xl flex flex-col items-center gap-8 md:gap-10">
          {/* Soft portrait — matching, not scanning */}
          {main && (
            <div className="relative">
              <div
                className="absolute -inset-6 rounded-full bg-bv-surface-raised blur-2xl"
                aria-hidden
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={main.src}
                alt=""
                className="relative w-36 h-36 md:w-44 md:h-44 rounded-full object-cover ring-2 ring-bv-line-strong shadow-bv-glow-soft"
              />
            </div>
          )}

          <div className="text-center space-y-3">
            <h1 className="text-bv-ink text-4xl md:text-5xl font-semibold tracking-tight">
              {title}
            </h1>
            <p
              key={stageIdx}
              className="text-bv-ink-muted text-xl md:text-2xl min-h-[2rem]"
            >
              {stageLabel}
            </p>
          </div>

          {/* Checklist stages — recommendation feel */}
          <ul className="w-full max-w-md space-y-3">
            {stages.map((stage, i) => {
              const done = i < stageIdx;
              const active = i === stageIdx;
              return (
                <li
                  key={`${stage}-${i}`}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl px-5 py-3 border transition-colors",
                    active
                      ? "border-bv-accent bg-bv-accent-soft text-bv-ink shadow-bv-glow"
                      : done
                        ? "border-bv-line bg-bv-surface-raised text-bv-ink"
                        : "border-transparent text-bv-ink-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      done
                        ? "bg-bv-accent text-bv-on-accent"
                        : active
                          ? "ring-2 ring-bv-accent text-bv-accent"
                          : "bg-bv-surface-raised text-bv-ink-muted"
                    )}
                    aria-hidden
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="text-lg md:text-xl text-left flex-1">
                    {stage}
                  </span>
                  {active && (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-bv-accent animate-pulse"
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="w-full max-w-md">
            <div className="relative mb-3">
              <Progress
                value={progress}
                className="h-3 md:h-4 w-full bg-bv-surface-raised rounded-full overflow-hidden [&>[data-slot=progress-indicator]]:bg-bv-accent [&>[data-slot=progress-indicator]]:transition-[transform] [&>[data-slot=progress-indicator]]:duration-150 [&>[data-slot=progress-indicator]]:ease-out"
              />
            </div>
            <div
              className="text-bv-ink text-3xl md:text-4xl font-semibold tabular-nums text-center"
              aria-live="polite"
              aria-atomic="true"
            >
              {displayPct}
              <span className="text-xl md:text-2xl text-bv-ink-muted">%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // analysis — photo scan UI (skin / hair)
  return (
    <div className="flex flex-col items-center justify-center h-full bg-(image:--bv-backdrop) px-6 md:px-10 overflow-hidden">
      <div className="w-full max-w-5xl flex flex-col items-center gap-6 md:gap-8">
        <h1 className="text-bv-ink text-4xl md:text-6xl font-semibold tracking-tight text-center">
          {title}
        </h1>

        <p
          key={stageIdx}
          className="text-bv-ink-muted text-2xl md:text-3xl min-h-[2rem] text-center"
        >
          {stageLabel}
        </p>

        {main ? (
          <div className="w-full flex flex-col items-center gap-5">
            <div className="relative w-full max-w-[min(36rem,48vh)] aspect-square rounded-3xl overflow-hidden bg-bv-surface ring-1 ring-bv-line shadow-bv-glow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={main.src}
                src={main.src}
                alt={main.label ?? "Analyzing"}
                className="absolute inset-0 h-full w-full object-cover object-top"
              />

              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bv-ground/25 via-transparent to-bv-ground/40"
                aria-hidden
              />

              <div
                className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
                style={{
                  backgroundImage:
                    "linear-gradient(color-mix(in srgb, var(--bv-accent) 14%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--bv-accent) 14%, transparent) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
                aria-hidden
              />

              <div
                className="pointer-events-none absolute left-0 right-0 h-[3px] z-10 analysis-scan-line"
                style={SCAN_LINE_STYLE}
                aria-hidden
              />

              <div className="pointer-events-none absolute inset-4 z-10" aria-hidden>
                <span className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-bv-accent rounded-tl-lg" />
                <span className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-bv-accent rounded-tr-lg" />
                <span className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-bv-accent rounded-bl-lg" />
                <span className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-bv-accent rounded-br-lg" />
              </div>

              <div
                className="pointer-events-none absolute inset-0 z-10 rounded-3xl ring-2 ring-bv-line-strong"
                aria-hidden
              />

              {main.label && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2 rounded-full bg-(image:--bv-glass) text-bv-ink text-xl font-medium border border-bv-line">
                  {main.label}
                  {multi && (
                    <span className="ml-2 text-bv-ink-muted text-base">
                      {displayIndex + 1}/{validImages.length}
                    </span>
                  )}
                </div>
              )}
            </div>

            {multi && (
              <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
                {validImages.map((img, idx) => {
                  const active = idx === displayIndex;
                  const done = idx < activeIndex;
                  return (
                    <button
                      key={`${img.src}-${idx}`}
                      type="button"
                      onClick={() => setPinnedIndex(idx)}
                      className={cn(
                        "relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0",
                        active
                          ? "border-bv-accent scale-105 shadow-bv-glow"
                          : done
                            ? "border-bv-line-strong opacity-90"
                            : "border-bv-line opacity-50"
                      )}
                      aria-label={img.label ?? `Image ${idx + 1}`}
                      aria-current={active ? "true" : undefined}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.src}
                        alt={img.label ?? ""}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {active && (
                        <div
                          className="pointer-events-none absolute inset-0"
                          aria-hidden
                        >
                          <div className="absolute left-0 right-0 h-[2px] bg-bv-accent analysis-scan-line-fast" />
                        </div>
                      )}
                      {done && !active && (
                        <div
                          className="pointer-events-none absolute inset-0 bg-bv-ground/35"
                          aria-hidden
                        />
                      )}
                      {img.label && (
                        <span className="absolute bottom-0 inset-x-0 bg-bv-ground/80 text-bv-ink text-xs md:text-sm py-0.5 text-center truncate px-1">
                          {img.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <div className="w-full max-w-2xl">
          <div className="relative mb-4">
            <Progress
              value={progress}
              className="h-5 md:h-7 w-full bg-bv-surface-raised rounded-full overflow-hidden [&>[data-slot=progress-indicator]]:bg-bv-accent [&>[data-slot=progress-indicator]]:transition-[transform] [&>[data-slot=progress-indicator]]:duration-150 [&>[data-slot=progress-indicator]]:ease-out"
            />
          </div>

          <div
            className="text-bv-ink text-5xl md:text-7xl font-semibold tabular-nums text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            {displayPct}
            <span className="text-3xl md:text-5xl text-bv-ink-muted">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Build display URLs from File blobs; caller must revoke on cleanup. */
export function filesToProgressImages(
  entries: { file: File | Blob | null | undefined; label?: string }[]
): AnalysisProgressImage[] {
  const out: AnalysisProgressImage[] = [];
  for (const { file, label } of entries) {
    if (!file) continue;
    out.push({
      src: URL.createObjectURL(file),
      label,
    });
  }
  return out;
}

export function revokeProgressImages(images: AnalysisProgressImage[]) {
  for (const img of images) {
    if (img.src.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(img.src);
      } catch {
        /* ignore */
      }
    }
  }
}
