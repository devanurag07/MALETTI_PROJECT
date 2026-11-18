"use client";

import { useEffect, useState } from "react";
import { useStudio } from "../context/StudioContext";
import { Arch, c, GuidePill, H1, HeroBackdrop, Muted, Photo } from "../ui";
import ScanOverlay from "./ScanOverlay";

/** Typical try-on wait (FLUX_VERSION_3 PROGRESS_DURATION_MS.generation); progress holds at 92% until the picture is in. */
const GEN_MS = 25_000;

/**
 * FLUX_VERSION_3-style generation screen: the customer's photo with the scan animation, a simulated % and stage messages.
 * Shown on the Result tab while a try-on is generating.
 */
/** When the current generation's animation began (shared by the route loading screen and the page). */
let genStart = 0;
/** Loading screen for /try: start the animation clock now. */
export const markGenStart = () => { genStart = Date.now(); };

/** Simulated try-on progress (ease-out to 92%) + the stage message, on the shared clock. */
function useGenProgress(preview?: boolean, startedAt?: number) {
  const { t } = useStudio();
  const [pct, setPct] = useState(0);
  useEffect(() => {
    // Continue from the loading screen shown on the tap (try/[kind]/loading.tsx), so the bar doesn't restart.
    // The page's scan takes the clock over (one use), so a later try on the same page starts from 0.
    // A generation's own start time (e.g. the Result tab's): coming back from another picture continues the bar.
    const start = startedAt ?? (genStart && Date.now() - genStart < GEN_MS ? genStart : Date.now());
    if (!preview && !startedAt) genStart = 0;
    // Ease-out towards 92%: fast at first, slower near the end, never "done" before the result arrives.
    const id = setInterval(() => setPct(Math.round(92 * (1 - Math.exp(-(Date.now() - start) / (GEN_MS / 2.5))))), 150);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const stages = [t("tryon", "genStage1"), t("tryon", "genStage2"), t("tryon", "genStage3"), t("tryon", "genStage4")];
  const stage = stages[Math.min(stages.length - 1, Math.floor((pct / 92) * stages.length))];
  return { pct, stage };
}

/**
 * FLUX_VERSION_3 result-page generation (AnalysisProgressScreen variant "generation"), drawn over the photo in the
 * Result frame (CompareArch `scan`): dark bottom fade, bright sweeping line, the stage pill over the image and the
 * progress as the photo's bottom border.
 */
export function GenerationOverlay({ startedAt }: { /** When this generation began (kept across re-mounts). */ startedAt?: number }) {
  const { pct, stage } = useGenProgress(false, startedAt);
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", background: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.35) 50%, transparent)" }} />
      <div className="analysis-scan-line" style={{
        position: "absolute", left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 15%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.35) 85%, transparent 100%)",
        boxShadow: "0 0 9px 3px rgba(255,255,255,0.55), 0 0 20px 5px rgba(255,255,255,0.25)",
      }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, display: "flex", justifyContent: "center", padding: "0 40px" }}>
        <span key={stage} style={{
          maxWidth: "100%", display: "flex", gap: 6, whiteSpace: "nowrap", padding: "7px 16px",
          borderRadius: 18, background: c("glass"), border: `1px solid ${c("accent")}`, color: c("ink"), fontSize: 13, fontWeight: 500,
        }}>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{stage}</span>
          {/* The % never gets cut by the ellipsis. */}
          <span style={{ flex: "0 0 auto", color: c("accent"), fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
        </span>
      </div>
      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: c("accent"), boxShadow: "0 0 6px rgba(255,255,255,0.85)", transition: "width 150ms ease-out" }} />
      </div>
    </div>
  );
}

export function GeneratingScan({ image, preview }: { image: string | null; /** the route loading screen */ preview?: boolean }) {
  const { t } = useStudio();
  const { pct, stage } = useGenProgress(preview);
  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HeroBackdrop halo={[500, 520]} squares={[
          { left: 56, top: 30, width: 110, height: 110 },
          { right: 58, bottom: 26, width: 84, height: 84 },
        ]} />
        <Arch width={266} height={336} offset={7} style={{ boxShadow: c("shadow-arch") }}>
          <Photo src={image} />
          <ScanOverlay pct={pct} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center" }}>
            <GuidePill>{`${stage} ${pct}%`}</GuidePill>
          </div>
        </Arch>
      </div>
      <div style={{ flex: "0 0 auto", padding: "2px 34px 10px 34px", display: "flex", flexDirection: "column", gap: 8 }}>
        <H1>{t("tryon", "genTitle")}</H1>
        <Muted size={14}>{t("tryon", "genSub")}</Muted>
      </div>
    </div>
  );
}

