"use client";
import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SelectMark } from "./SelectMark";

export interface MediaRowProps {
  image: string | StaticImageData;
  /** CSS object-position for the photo (default "50% 20%"). */
  focus?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Under the subtitle, e.g. the journey's step chips. */
  footer?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Full-width choice card: text on the left, photo on the right fading into the panel, round mark at the
 * top right. For short lists of big choices stacked in rows (the journey picker).
 */
export function MediaRow({ image, focus = "50% 20%", title, subtitle, footer, selected, onClick, className }: MediaRowProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative flex min-h-[17rem] w-full overflow-hidden rounded-[1.75rem] border-2 text-left transition active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-ink",
        selected ? "border-bv-accent bg-bv-accent-soft shadow-bv-glow" : "border-bv-line bg-bv-surface",
        className,
      )}
    >
      {typeof image === "string" ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote image URL
        <img src={image} alt="" className="absolute right-0 top-0 h-full w-[55%] object-cover" style={{ objectPosition: focus }} />
      ) : (
        <Image src={image} alt="" sizes="600px" className="absolute right-0 top-0 h-full w-[55%] object-cover" style={{ objectPosition: focus }} />
      )}
      {/* Fade the photo into the card colour so the text side stays solid. */}
      <span
        className={cn(
          "absolute inset-0",
          selected
            ? "bg-[linear-gradient(90deg,#0e3a49_42%,rgba(14,58,73,0.8)_58%,transparent_85%)]"
            : "bg-[linear-gradient(90deg,#071219_42%,rgba(7,18,25,0.8)_58%,transparent_85%)]",
        )}
      />
      <span className="relative flex w-[62%] flex-col justify-center gap-4 p-10">
        <span className="text-5xl font-semibold leading-tight text-bv-ink">{title}</span>
        {subtitle && <span className="text-2xl text-bv-ink-muted">{subtitle}</span>}
        {footer && <span className="mt-2">{footer}</span>}
      </span>
      <span className="absolute right-6 top-6">
        <SelectMark selected={!!selected} onPhoto />
      </span>
    </button>
  );
}
