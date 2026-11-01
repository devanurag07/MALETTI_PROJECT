"use client";
import Image, { type StaticImageData } from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Chip, Panel } from "@/design-system/bluevella";
import RenderMarkdown from "@/design-system/components/common/render-md";
import { cn } from "@/lib/utils";

export interface CarouselLook {
  id: string;
  name: string;
  /** Why it suits the customer (markdown). */
  reason?: string;
  /** Extra notes, e.g. "Styling options" / "Maintenance" (markdown). */
  sections?: { title: string; text?: string }[];
  /** One or two reference photos shown side by side. */
  images: (string | StaticImageData)[];
  tried?: boolean;
}

interface LookCarouselProps {
  looks: CarouselLook[];
  index: number;
  onIndexChange: (index: number) => void;
}

/**
 * One recommended look at a time, as in FLUX's RecommendedLooks: reference photos side by side, arrows
 * either side, the name, why it suits, styling and maintenance notes, and dots underneath. The screen's
 * footer button tries the look on.
 */
export default function LookCarousel({ looks, index, onIndexChange }: LookCarouselProps) {
  const look = looks[index];
  if (!look) return null;
  const many = looks.length > 1;
  const go = (step: number) => onIndexChange((index + step + looks.length) % looks.length);

  return (
    <div className="flex flex-col gap-6">
      <Panel className="relative flex flex-col gap-8 px-16 py-12">
        <div className="flex justify-center gap-6">
          {look.images.map((src, i) => (
            <div key={i} className="relative aspect-[3/4] w-[300px] overflow-hidden rounded-[1.5rem] border border-bv-line bg-bv-surface-raised">
              {typeof src === "string" ? (
                // eslint-disable-next-line @next/next/no-img-element -- static reference photo under /public
                <img src={src} alt={look.name} className="h-full w-full object-cover object-top" />
              ) : (
                <Image src={src} alt={look.name} fill sizes="300px" className="object-contain p-6" />
              )}
            </div>
          ))}
        </div>

        {many && (
          <>
            <button
              type="button"
              aria-label="Previous look"
              onClick={() => go(-1)}
              className="absolute left-3 top-[30%] flex size-20 items-center justify-center rounded-full border-2 border-bv-line-strong bg-bv-ground/70 text-bv-ink hover:border-bv-accent hover:text-bv-accent"
            >
              <ChevronLeft className="size-12" />
            </button>
            <button
              type="button"
              aria-label="Next look"
              onClick={() => go(1)}
              className="absolute right-3 top-[30%] flex size-20 items-center justify-center rounded-full border-2 border-bv-line-strong bg-bv-ground/70 text-bv-ink hover:border-bv-accent hover:text-bv-accent"
            >
              <ChevronRight className="size-12" />
            </button>
          </>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-6xl font-semibold text-bv-ink">{look.name}</h2>
          {look.tried && <Chip tone="solid" size="sm">Tried</Chip>}
        </div>

        <div className="flex flex-col gap-6 text-3xl leading-relaxed text-bv-ink-muted [&_p]:m-0 [&_strong]:text-bv-ink">
          {look.reason && <RenderMarkdown text={look.reason} />}
          {look.sections
            ?.filter((s) => s.text)
            .map((s) => (
              <div key={s.title} className="flex flex-col gap-2">
                <h3 className="text-3xl font-semibold text-bv-ink">{s.title}</h3>
                <RenderMarkdown text={s.text as string} />
              </div>
            ))}
        </div>
      </Panel>

      {many && (
        <div className="flex justify-center gap-3" role="tablist" aria-label="Recommended looks">
          {looks.map((l, i) => (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={l.name}
              onClick={() => onIndexChange(i)}
              className={cn("h-3.5 rounded-full transition-all", i === index ? "w-10 bg-bv-accent" : "w-3.5 bg-bv-line-strong")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
