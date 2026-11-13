"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { studioApi, type Results } from "../api";
import { useTranslations } from "next-intl";
import { stageIndexForProgress, useSimulatedProgress } from "@/core/hooks/useSimulatedProgress";
import { useStudio } from "../context/StudioContext";
import { JOURNEY, journeyIntro } from "../flows";
import { waitForPendingUpload } from "../pending-upload";
import { Arch, c, ErrorLine, GuidePill, HeroBackdrop, LoadingStage, Photo, Screen } from "../ui";
import ScanOverlay from "../components/ScanOverlay";

/** Step 3 — AI analysis: only the scanning screen; moves on to the first service by itself once the results are in. */
export default function AnalysisScreen() {
  const router = useRouter();
  const { t, config, session, setSession, photo, gender } = useStudio();
  const tg = useTranslations();
  // FLUX_VERSION_3 analysis animation: simulated % (caps at 92 until the API answers) + stage messages.
  const progress = useSimulatedProgress(20_000);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    // Re-run when there is nothing to show yet (new session, or an earlier run that produced no results).
    const run = async (id: string) => {
      await waitForPendingUpload(); // photo may still be uploading from the Capture screen
      if (session.status !== "active") {
        const r = await studioApi.results(id);
        if (r.tabs.some((x) => x.status === "done")) return r;
      }
      return studioApi.analyze(id);
    };
    run(session.id)
      .then((r) => {
        setResults(r);
        setSession(r.session);
        router.replace(journeyIntro(JOURNEY[(r.session.gender as keyof typeof JOURNEY) || gender][0]));
      })
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  if (!config || !session) return <LoadingStage />;
  const done = !!results;
  const stages = ["uploading", "detecting", "analyzing", "finalizing"].map((k) => tg(`skinAnalysis.progress.${k}`));
  const stageIdx = stageIndexForProgress(progress, stages.length);
  const pct = Math.round(progress);

  return (
    <Screen step={3}>
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HeroBackdrop halo={[500, 520]} squares={[
          { left: 56, top: 30, width: 110, height: 110 },
          { right: 58, bottom: 26, width: 84, height: 84 },
        ]} />
        <Arch width={266} height={336} offset={7} style={{ boxShadow: c("shadow-arch") }}>
          <Photo src={photo} />
          <ScanOverlay pct={done ? 100 : pct} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center" }}>
            <GuidePill>{`${stages[done ? stages.length - 1 : stageIdx]} ${done ? 100 : pct}%`}</GuidePill>
          </div>
        </Arch>
      </div>

      <ErrorLine message={error} />
    </Screen>
  );
}
