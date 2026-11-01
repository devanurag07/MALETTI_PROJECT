"use client";
import { Images, LayoutGrid, Loader2, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button, SegmentedTabs } from "@/design-system/bluevella";

/** "catalogue" is the two-tab mode; "recommended" / "custom" split the catalogue (three-tab mode). */
export type TryonTab = "catalogue" | "recommended" | "custom" | "results";

interface TryonTabsProps {
  active: TryonTab;
  onChange: (tab: TryonTab) => void;
  /** Number of processed results. */
  results: number;
  /** A try-on is processing: shown as a spinner on the Results tab. */
  busy?: boolean;
  /**
   * Three-tab mode, as in FLUX look advisor: "Recommended | Custom | Results". Counts are shown
   * after the labels (omit one while it is loading).
   */
  split?: { recommended?: number; custom?: number };
}

/**
 * Tabs at the top of a try-on step (Bluevella SegmentedTabs): "Catalogue | Results", or with `split`
 * "Recommended | Custom | Results". The catalogue tabs are where new things are picked; Results only holds
 * what is processing or already processed. Switching never re-processes.
 */
export default function TryonTabs({ active, onChange, results, busy, split }: TryonTabsProps) {
  const resultsTab = {
    id: "results" as const,
    label: "Results",
    icon: busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Images className="h-7 w-7" />,
    count: results || undefined,
  };
  return (
    <SegmentedTabs
      value={active}
      onChange={onChange}
      tabs={
        split
          ? [
              { id: "recommended", label: "Recommended", icon: <Sparkles className="h-7 w-7" />, count: split.recommended },
              { id: "custom", label: "Custom", icon: <SlidersHorizontal className="h-7 w-7" />, count: split.custom },
              resultsTab,
            ]
          : [{ id: "catalogue", label: "Catalogue", icon: <LayoutGrid className="h-7 w-7" /> }, resultsTab]
      }
    />
  );
}

/** Results tab before anything has been tried. */
export function NoResults({ noun, onBrowse, browseLabel = "Open catalogue" }: { noun: string; onBrowse: () => void; browseLabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-[2rem] border-2 border-dashed border-bv-line px-10 py-16 text-center">
      <Images className="h-14 w-14 text-bv-ink-muted/70" />
      <p className="text-3xl font-semibold">No results yet</p>
      <p className="text-2xl text-bv-ink-muted">Pick a {noun} to try it on.</p>
      <Button variant="outline" size="sm" onClick={onBrowse}>
        {browseLabel}
      </Button>
    </div>
  );
}
