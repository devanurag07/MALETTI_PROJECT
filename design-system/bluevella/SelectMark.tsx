import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectMarkProps {
  selected: boolean;
  /** check = round tick (single/multi pick) · add = "+" until added. */
  kind?: "check" | "add";
  size?: "md" | "sm";
  /** Darken the backing so the mark reads on top of a photo. */
  onPhoto?: boolean;
  className?: string;
}

/** Round selection mark: aqua fill + dark tick when selected, aqua outline when not. */
export function SelectMark({ selected, kind = "check", size = "md", onPhoto, className }: SelectMarkProps) {
  const box = size === "md" ? "size-14" : "size-10";
  const glyph = size === "md" ? "size-8" : "size-6";
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        box,
        selected ? "border-bv-accent bg-bv-accent" : "border-bv-line-strong",
        !selected && onPhoto && "border-white/90 bg-black/55",
        className,
      )}
    >
      {selected ? (
        <Check className={cn(glyph, "text-bv-on-accent")} strokeWidth={3} />
      ) : kind === "add" ? (
        <Plus className={cn(glyph, "text-bv-ink")} />
      ) : null}
    </span>
  );
}
