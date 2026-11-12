"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { studioApi, type Results } from "../api";
import { useTranslations } from "next-intl";
import { stageIndexForProgress, useSimulatedProgress } from "@/core/hooks/useSimulatedProgress";
import { useStudio } from "../context/StudioContext";
import { JOURNEY, journeyIntro } from "../flows";
import { waitForPendingUpload } from "../pending-upload";
import { Arch, c, ErrorLine, GuidePill, H1, HeroBackdrop, ICON, LoadingStage, Photo, PrimaryButton, Screen } from "../ui";
import ScanOverlay from "../components/ScanOverlay";

/** Step 3 — AI analysis: every active module runs in parallel on the backend. */
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
          {!done ? <ScanOverlay pct={pct} /> : null}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center" }}>
            <GuidePill>{done ? t("flows", `${session.flow || "consultant"}.name`) : `${stages[stageIdx]} ${pct}%`}</GuidePill>
          </div>
        </Arch>
      </div>

      <div style={{ flex: "0 0 auto", padding: "2px 34px 34px 34px", display: "flex", flexDirection: "column", gap: 14 }}>
        <H1>{t("analysis", done ? "title" : "running")}</H1>
        <PrimaryButton iconRight={ICON.next} disabled={!done} onClick={() => router.push(journeyIntro(JOURNEY[gender][0]))} style={{ marginTop: 4 }}>
          {t("analysis", "cta")}
        </PrimaryButton>
      </div>
      <ErrorLine message={error} />
    </Screen>
  );
}
