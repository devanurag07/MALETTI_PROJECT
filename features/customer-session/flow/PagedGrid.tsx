"use client";
import { type ReactNode, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A catalogue as a paged grid carousel: `perPage` items (default 6, 3 × 2), page arrows and dots.
 * Used by the Bridal / Function Makeup Custom tab (all predefined looks).
 */
export default function PagedGrid<T>({
  items,
  render,
  perPage = 6,
  label = "items",
}: {
  items: T[];
  render: (item: T) => ReactNode;
  perPage?: number;
  /** Plural noun for the arrows' labels, e.g. "looks". */
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const [page, setPage] = useState(0);
  const current = Math.min(page, pages - 1);
  const arrow = "flex size-12 items-center justify-center rounded-full border-2 border-bv-line-strong text-bv-ink disabled:opacity-30";

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-3 gap-4">{items.slice(current * perPage, current * perPage + perPage).map(render)}</div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-5">
          <button type="button" aria-label={`Previous ${label}`} disabled={current === 0} onClick={() => setPage(current - 1)} className={arrow}>
            <ChevronLeft className="size-8" />
          </button>
          <div className="flex items-center gap-3">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Page ${i + 1}`}
                onClick={() => setPage(i)}
                className={cn("h-3 rounded-full transition-all", i === current ? "w-12 bg-bv-accent" : "w-3 bg-bv-line")}
              />
            ))}
          </div>
          <button type="button" aria-label={`More ${label}`} disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className={arrow}>
            <ChevronRight className="size-8" />
          </button>
        </div>
      )}
    </div>
  );
}
