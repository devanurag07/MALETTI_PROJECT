"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { studioApi, type Results } from "../api";
import { useTranslations } from "next-intl";
import { stageIndexForProgress, useSimulatedProgress } from "@/core/hooks/useSimulatedProgress";
import { useStudio } from "../context/StudioContext";
import { JOURNEY, journeyIntro } from "../flows";
import { waitForPendingUpload } from "../pending-upload";
import { Arch, c, ErrorLine, GuidePill, H1, HeroBackdrop, Icon, ICON, LoadingStage, Photo, PrimaryButton, Screen, Spinner } from "../ui";

const MODULE_ICON: Record<string, string> = { skin: ICON.skin, face: ICON.face, colour: ICON.colour };

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
          {/* Scan animation from FLUX_VERSION_3 (grid, sweeping line, corner brackets, progress).
              Removed once the analysis is done, so only the photo stays. */}
          {!done ? (
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
          ) : null}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center" }}>
            <GuidePill>{done ? t("flows", `${session.flow || "consultant"}.name`) : `${stages[stageIdx]} ${pct}%`}</GuidePill>
          </div>
        </Arch>
      </div>

      <div style={{ flex: "0 0 auto", padding: "2px 34px 34px 34px", display: "flex", flexDirection: "column", gap: 14 }}>
        <H1>{t("analysis", done ? "title" : "running")}</H1>
        <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${c("divider")}` }}>
          {config.modules.filter((m) => m.status !== "off" && m.module !== "scalp").map((m) => {
            const soon = m.status === "coming_soon";
            const st = results?.tabs.find((x) => x.module === m.module)?.status;
            const failed = st === "failed";
            return (
              <div key={m.module} style={{
                display: "flex", alignItems: "center", gap: 14, height: 52, borderBottom: `1px solid ${c("divider")}`,
                color: soon ? c("ink-faint") : c("ink"),
              }}>
                <span style={{
                  flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 16,
                  background: soon ? c("locked-bg") : c("icon-bg"), color: soon ? c("ink-faint") : c("icon-fg"),
                }}>
                  <Icon d={MODULE_ICON[m.module] ?? ICON.sparkle} size={18} />
                </span>
                <span style={{ flex: "1 1 auto", fontSize: 16 }}>{t("analysis", m.module)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: soon ? c("ink-faint") : c("ink-muted") }}>
                  {soon ? <Icon d={ICON.lock} size={15} width={1.8} />
                    : !results ? <Spinner size={14} />
                    : failed ? null : <Icon d={ICON.check} size={15} width={1.8} />}
                  <span>{soon ? t("analysis", "soon") : !results ? t("analysis", "progress") : failed ? t("analysis", "failed") : t("analysis", "done")}</span>
                </span>
              </div>
            );
          })}
        </div>
        <PrimaryButton iconRight={ICON.next} disabled={!done} onClick={() => router.push(journeyIntro(JOURNEY[gender][0]))} style={{ marginTop: 4 }}>
          {t("analysis", "cta")}
        </PrimaryButton>
      </div>
      <ErrorLine message={error} />
    </Screen>
  );
}
