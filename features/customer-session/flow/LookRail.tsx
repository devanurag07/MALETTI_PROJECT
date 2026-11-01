"use client";
import { Chip } from "@/design-system/bluevella";
import { useEffect, useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { LayoutGrid, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BV, FLOW_ACCENT, FLOW_ACCENT_SOFT, ON_ACCENT } from "./theme";

export interface RailItem {
  id: string;
  label: string;
  /** Catalogue image, a try-on preview (data URI / URL), or none (swatches). */
  image?: StaticImageData | string | null;
  swatches?: string[];
  tried?: boolean;
  /** AI pick: shows a small "For you" tag. */
  recommended?: boolean;
}

interface LookRailProps {
  title: string;
  items: RailItem[];
  activeId: string | null;
  /** The look being generated: always shown first, with a spinner, so a new result appears at the start. */
  loading?: RailItem | null;
  disabled?: boolean;
  /** Compare picking: ids in pick order, shown as numbered badges instead of the tried tick. */
  picked?: string[];
  onSelect: (id: string) => void;
  /** Trailing card that opens the full catalogue, e.g. { label: "See all 16 looks", onClick }. */
  more?: { label: string; onClick: () => void };
}

/**
 * Horizontal row of looks under a try-on: the one loading first, then tried ones
 * (newest first, ticked), then others that apply on tap.
 */
export default function LookRail({ title, items, activeId, loading, disabled, picked, onSelect, more }: LookRailProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const loadingId = loading?.id ?? null;
  const shown = loading ? [loading, ...items.filter((i) => i.id !== loading.id)] : items;
  const firstId = shown[0]?.id;

  // A new try-on (loading, or its result) lands at index 0: bring the row back to the start.
  useEffect(() => {
    rowRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [loadingId, firstId]);

  if (shown.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <p className="text-2xl font-semibold text-bv-ink">{title}</p>
      <div ref={rowRef} className="-mx-12 flex gap-4 overflow-x-auto px-12 pb-2">
        {shown.map((item) => {
          const pickNo = picked ? picked.indexOf(item.id) + 1 : 0;
          const active = picked ? pickNo > 0 : item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.id)}
              className="flex w-[150px] shrink-0 flex-col gap-2 text-left disabled:opacity-60"
            >
              <span
                className={cn("relative block aspect-[3/4] w-full overflow-hidden rounded-2xl border-[3px] bg-bv-surface-raised", active ? "border-bv-accent" : "border-transparent")}
              >
                {item.image ? (
                  typeof item.image === "string" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- try-on preview
                    <img src={item.image} alt="" className="h-full w-full object-cover object-top" />
                  ) : (
                    <Image src={item.image} alt="" fill sizes="150px" className="object-cover object-top" />
                  )
                ) : (
                  <span className="flex h-full items-center justify-center -space-x-3" style={{ background: `linear-gradient(160deg, ${FLOW_ACCENT_SOFT}, ${BV.surface})` }}>
                    {item.swatches?.map((hex, i) => (
                      <span key={`${hex}-${i}`} className="h-10 w-10 rounded-full border-[3px] border-bv-surface" style={{ backgroundColor: hex }} />
                    ))}
                  </span>
                )}
                {picked && (
                  <span
                    className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border-2 text-lg font-bold"
                    style={pickNo ? { background: FLOW_ACCENT, borderColor: FLOW_ACCENT, color: ON_ACCENT } : { borderColor: "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.4)" }}
                  >
                    {pickNo || ""}
                  </span>
                )}
                {!picked && !item.tried && item.recommended && (
                  <Chip tone="photo" size="sm" icon={<Sparkles className="text-bv-accent" />} className="absolute left-2 top-2 px-2.5 py-1 text-sm">
                    For you
                  </Chip>
                )}
                {loadingId === item.id && (
                  <span className="absolute inset-0 flex items-center justify-center bg-bv-ground/60">
                    <Loader2 className="h-10 w-10 animate-spin text-bv-accent" />
                  </span>
                )}
              </span>
              <span className={cn("line-clamp-1 text-lg", active ? "font-semibold text-bv-ink" : "text-bv-ink-muted")}>{item.label}</span>
            </button>
          );
        })}
        {more && !picked && (
          <button type="button" disabled={disabled} onClick={more.onClick} className="flex w-[150px] shrink-0 flex-col gap-2 text-left disabled:opacity-60">
            <span className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-bv-line bg-white/[0.04] px-3 text-center">
              <LayoutGrid className="h-10 w-10 text-bv-ink-muted" />
              <span className="text-lg font-semibold leading-tight">{more.label}</span>
            </span>
            <span className="text-lg text-transparent">.</span>
          </button>
        )}
      </div>
    </section>
  );
}
