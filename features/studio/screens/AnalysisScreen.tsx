"use client";

import { useEffect, useState } from "react";
import { studioApi, type Results } from "../api";
import { useStudio } from "../context/StudioContext";
import { journeyPage } from "../flows";
import { ensureFaceAnalysis } from "../pending-upload";
import { useNav } from "../use-nav";
import { ActionBar, c, ErrorLine, ICON, LoadingStage, PrimaryButton, Screen } from "../ui";
import { scanMs, scanStart, ServiceScan } from "./JourneyScreen";
import { FaceInfo } from "./ResultsScreen";

/**
 * Beauty Consultant, first step: the face analysis scan (only the face call — armocromia + skin run alongside and are
 * ready by their own steps) → the Facial analysis page → Next → haircut → beard (men) recommendations. Shares the
 * hairstyle scan key, so the haircut page doesn't scan a second time.
 */
export default function AnalysisScreen() {
  const { t, config, session, look, updateLook } = useStudio();
  const { go, pending } = useNav();
  const [results, setResults] = useState<Results | null>(() => studioApi.cachedResults(session?.id) ?? null);
  const [error, setError] = useState<string | null>(null);
  // The cache may hold partial results (the pre-check / colour + skin call) without the face yet: wait for the face call.
  const [faceSettled, setFaceSettled] = useState(() =>
    !!studioApi.cachedResults(session?.id)?.tabs.some((x) => x.module === "face" && x.status === "done"));
  const scanKey = session ? `mm-hairstyle-scan:${session.id}` : "";
  const [scanning, setScanning] = useState(() => {
    try { return !sessionStorage.getItem(scanKey); } catch { return true; }
  });

  useEffect(() => {
    if (!session) return;
    ensureFaceAnalysis(session.id)
      .then(setResults)
      .catch((e: Error) => setError(e.message))
      .finally(() => setFaceSettled(true));
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scanning || !session) return;
    try { if (sessionStorage.getItem(scanKey)) { setScanning(false); return; } } catch {}
    const id = setTimeout(() => {
      try { sessionStorage.setItem(scanKey, "1"); } catch {}
      setScanning(false);
    }, Math.max(0, scanMs("hairstyle") - (Date.now() - scanStart("hairstyle"))));
    return () => clearTimeout(id);
  }, [scanning, scanKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config || !session) return <LoadingStage />;
  const face = results?.tabs.find((x) => x.module === "face" && x.status === "done");
  if (scanning || (!face && !faceSettled))
    return <ServiceScan service="hairstyle" />;

  return (
    <Screen animKey="face-analysis">
      <span style={{ flex: "0 0 auto", padding: "18px 34px 0 34px", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: c("accent") }}>
        {t("analysis", "faceTitle")}
      </span>
      {face ? <FaceInfo a={face} /> : <div style={{ flex: 1 }}><ErrorLine message={error ?? t("analysis", "failed")} /></div>}
      <ActionBar>
        <PrimaryButton iconRight={ICON.next} disabled={pending} onClick={() => {
          updateLook({ journey: { ...look.journey, hairstyle: "done" } });
          go(journeyPage("hairstyle"));
        }}>
          {t("journey", "next")}
        </PrimaryButton>
      </ActionBar>
    </Screen>
  );
}
