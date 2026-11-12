"use client";

import { c } from "../ui";

/**
 * Scan animation from FLUX_VERSION_3 over a photo in an Arch: grid, sweeping line, corner brackets and a progress bar.
 * Used by the Analysis screen and the 5-second Armocromia / Skin processing screen.
 */
export default function ScanOverlay({ pct }: { pct: number }) {
  return (

            <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 45%, rgba(0,0,0,0.45))" }} />
              <div style={{
                position: "absolute", inset: 0, opacity: 0.3, mixBlendMode: "overlay",
                backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }} />
              <div className="analysis-scan-line" style={{
                position: "absolute", left: 0, right: 0, height: 2,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
                boxShadow: "0 0 12px 2px rgba(255,255,255,0.55)",
              }} />
              {([["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]] as const).map(([v, h]) => (
                <span key={v + h} style={{
                  position: "absolute", [v]: v === "top" ? 58 : 52, [h]: 18, width: 20, height: 20,
                  [`border${v === "top" ? "Top" : "Bottom"}`]: "2px solid rgba(255,255,255,0.9)",
                  [`border${h === "left" ? "Left" : "Right"}`]: "2px solid rgba(255,255,255,0.9)",
                }} />
              ))}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "rgba(255,255,255,0.3)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: c("accent"), boxShadow: "0 0 6px rgba(255,255,255,0.85)", transition: "width 150ms ease-out" }} />
              </div>
            </div>
  );
}
