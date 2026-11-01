"use client";
import Image, { type StaticImageData } from "next/image";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MediaCardProps {
  /** Photo (remote URL or static import). Without one, `placeholder` fills the card. */
  image?: string | StaticImageData | null;
  imageAlt?: string;
  /** CSS object-position for the photo, e.g. "50% 20%". */
  focus?: string;
  placeholder?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small pill at the top left (e.g. "For you", "Recommended"). */
  tag?: ReactNode;
  /** Top-right slot, usually a <SelectMark />. */
  corner?: ReactNode;
  /** Extra content under the subtitle (chips, price). */
  footer?: ReactNode;
  selected?: boolean;
  loading?: boolean;
  /** Tailwind aspect class (default portrait 3:4). */
  aspect?: string;
  align?: "left" | "center";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Photo card: image under a dark fade, title (and subtitle) on the photo, aqua outline + glow when
 * selected. Used for journeys, looks, hairstyles, outfits and app tiles.
 */
export function MediaCard({
  image,
  imageAlt = "",
  focus,
  placeholder,
  title,
  subtitle,
  tag,
  corner,
  footer,
  selected,
  loading,
  aspect = "aspect-[3/4]",
  align = "left",
  onClick,
  disabled,
  className,
}: MediaCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "group relative w-full overflow-hidden rounded-[1.75rem] border-2 bg-bv-surface-raised text-left transition active:scale-[0.98] disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-ink",
        selected ? "border-bv-accent shadow-bv-glow" : "border-bv-line",
        aspect,
        className,
      )}
    >
      {image ? (
        typeof image === "string" ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote catalogue / try-on URLs
          <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: focus ?? "50% 20%" }} />
        ) : (
          <Image src={image} alt={imageAlt} fill sizes="400px" className="object-cover" style={{ objectPosition: focus ?? "50% 20%" }} />
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-(image:--bv-media-placeholder) pb-20">
          {placeholder}
        </div>
      )}

      <span className="absolute inset-0 bg-(image:--bv-media-scrim)" />

      {tag && <span className="absolute left-4 top-4">{tag}</span>}
      {corner && <span className="absolute right-4 top-4">{corner}</span>}

      <span className={cn("absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-6", align === "center" && "items-center text-center")}>
        <span className="text-3xl font-semibold leading-tight text-bv-ink">{title}</span>
        {subtitle && <span className="line-clamp-2 text-xl leading-snug text-bv-ink-muted">{subtitle}</span>}
        {footer}
      </span>

      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Loader2 className="size-14 animate-spin text-bv-accent" />
        </span>
      )}
    </button>
  );
}
