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

export function GeneratingScan({ image, preview }: { image: string | null; /** the route loading screen */ preview?: boolean }) {
  const { t } = useStudio();
  const [pct, setPct] = useState(0);
  useEffect(() => {
    // Continue from the loading screen shown on the tap (try/[kind]/loading.tsx), so the bar doesn't restart.
    // The page's scan takes the clock over (one use), so a later try on the same page starts from 0.
    const start = genStart && Date.now() - genStart < GEN_MS ? genStart : Date.now();
    if (!preview) genStart = 0;
    // Ease-out towards 92%: fast at first, slower near the end, never "done" before the result arrives.
    const id = setInterval(() => setPct(Math.round(92 * (1 - Math.exp(-(Date.now() - start) / (GEN_MS / 2.5))))), 150);
    return () => clearInterval(id);
  }, []);
  const stages = [t("tryon", "genStage1"), t("tryon", "genStage2"), t("tryon", "genStage3"), t("tryon", "genStage4")];
  const stage = stages[Math.min(stages.length - 1, Math.floor((pct / 92) * stages.length))];
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

