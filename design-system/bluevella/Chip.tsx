import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ChipProps {
  children: ReactNode;
  icon?: ReactNode;
  /** solid = aqua (the main tag) · outline = aqua outline · photo = dark glass for use on images. */
  tone?: "solid" | "outline" | "photo";
  size?: "md" | "sm";
  className?: string;
}

/** Small pill label: tags on cards, focus areas, filters. */
export function Chip({ children, icon, tone = "outline", size = "md", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-semibold leading-none [&_svg]:size-[1.1em]",
        size === "md" ? "px-5 py-2.5 text-xl" : "px-4 py-2 text-lg",
        tone === "solid" && "bg-bv-accent text-bv-on-accent",
        tone === "outline" && "border-2 border-bv-line-strong text-bv-ink",
        tone === "photo" && "border border-white/30 bg-black/65 text-bv-ink backdrop-blur-sm",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
