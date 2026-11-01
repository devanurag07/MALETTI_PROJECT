"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedTab<T extends string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

export interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

/** Pill track with the active tab filled aqua (Key findings / Recommendations). */
export function SegmentedTabs<T extends string>({ tabs, value, onChange, className }: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" className={cn("flex gap-2 rounded-full border border-bv-line bg-bv-surface-raised p-2", className)}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-3 rounded-full px-6 py-4 text-2xl font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-ink",
              selected ? "bg-bv-accent text-bv-on-accent shadow-bv-glow" : "text-bv-ink-muted hover:text-bv-ink",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && (
              <span className={cn("text-xl font-normal", selected ? "text-bv-on-accent/75" : "text-bv-ink-muted")}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
