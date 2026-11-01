"use client";
import Image, { type StaticImageData } from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chip, MediaCard } from "@/design-system/bluevella";

interface LookCardProps {
  title: string;
  subtitle?: string;
  image?: StaticImageData | string | null;
  /** Colour dots (e.g. makeup shades): centred when there is no image, above the title when there is. */
  swatches?: string[];
  /** Line illustration shown centred (contained) when there is no photo, e.g. a haircut silhouette. */
  illustration?: StaticImageData;
  selected?: boolean;
  status?: "idle" | "loading" | "tried";
  onClick: () => void;
  disabled?: boolean;
}

/** Catalogue card used by every try-on screen: a Bluevella MediaCard with the name over the photo. */
export default function LookCard({ title, subtitle, image, swatches, illustration, selected, status = "idle", onClick, disabled }: LookCardProps) {
  const dots = (size: "lg" | "sm") =>
    swatches?.length ? (
      <span className={cn("flex", size === "lg" ? "-space-x-4" : "mb-1 -space-x-2")}>
        {swatches.map((hex, i) => (
          <span
            key={`${hex}-${i}`}
            className={cn("rounded-full border-bv-surface", size === "lg" ? "size-16 border-4" : "size-9 border-[3px]")}
            style={{ backgroundColor: hex }}
          />
        ))}
      </span>
    ) : null;

  return (
    <MediaCard
      image={image}
      title={title}
      subtitle={subtitle}
      selected={selected}
      loading={status === "loading"}
      onClick={onClick}
      disabled={disabled}
      placeholder={
        illustration ? (
          <Image src={illustration} alt="" className="h-[58%] w-auto object-contain opacity-90" sizes="240px" />
        ) : (
          dots("lg") ?? <Sparkles className="size-16 text-bv-accent/60" />
        )
      }
      footer={image ? dots("sm") : null}
      corner={
        status === "tried" ? (
          <Chip tone="solid" size="sm">
            Tried
          </Chip>
        ) : undefined
      }
    />
  );
}
