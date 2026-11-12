"use client";

import type { CSSProperties } from "react";
import { c, SERIF } from "../ui";

/** The 6 skin parameters (backend studio/pipelines.py SKIN_METRICS), in display order. 100 = best for all. */
export const SKIN_METRICS = ["redness", "wrinkles", "oiliness", "pigmentation", "dark_circles", "acne"] as const;
export const markColour = (metric: string) => c(`mark-${metric.replace(/_/g, "-")}`);

export type SkinMarking = {
  metric: string; region: string; x: number; y: number; radius: number; severity: "mild" | "moderate" | "marked";
};
export const markingsOf = (zones: Record<string, unknown> | undefined | null): SkinMarking[] =>
  Array.isArray(zones?.markings) ? (zones!.markings as SkinMarking[]) : [];

/**
 * The customer's (square) photo with a circle on every finding the skin analysis located, coloured per parameter.
 * Coordinates are fractions of the photo, so the overlay scales with any size.
 */
export function SkinMapPhoto({ src, markings, size, style }: {
  src: string | null | undefined; markings: SkinMarking[]; size: number | string; style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", width: size, aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 18, background: c("photo"), ...style }}>
      {src ? <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {markings.map((m, i) => {
          const r = Math.max(2, m.radius * 100);
          const col = markColour(m.metric);
          return (
            <g key={i}>
              <circle cx={m.x * 100} cy={m.y * 100} r={r} fill={col} fillOpacity={m.severity === "marked" ? 0.28 : m.severity === "moderate" ? 0.2 : 0.12}
                stroke={col} strokeWidth={0.6} strokeDasharray={m.severity === "mild" ? "1.6 1.2" : undefined} />
              <circle cx={m.x * 100} cy={m.y * 100} r={0.9} fill={col} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Legend: one row per parameter — colour, name, score, how many areas were marked. */
export function SkinMapLegend({ metrics, markings, label, areasLabel, fontSize = 14 }: {
  metrics: Record<string, unknown>; markings: SkinMarking[]; label: (metric: string) => string;
  areasLabel: (n: number) => string; fontSize?: number;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
      {SKIN_METRICS.filter((k) => k in metrics).map((k) => {
        const n = Math.max(0, Math.min(100, Number(metrics[k] ?? 0)));
        const count = markings.filter((m) => m.metric === k).length;
        return (
          <div key={k} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 14,
            background: c("surface"), border: `1px solid ${c("line")}`,
          }}>
            <span style={{ flex: "0 0 auto", width: 12, height: 12, borderRadius: 6, background: markColour(k) }} />
            <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label(k)}</span>
              <span style={{ fontSize: fontSize - 3, color: c("ink-muted") }}>{areasLabel(count)}</span>
            </span>
            <span style={{ ...SERIF, fontSize: fontSize + 6, lineHeight: 1 }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}
