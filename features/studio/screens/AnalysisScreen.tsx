"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "../context/StudioContext";
import { JOURNEY, journeyIntro } from "../flows";
import { ensureAnalysis } from "../pending-upload";
import { LoadingStage } from "../ui";

/**
 * Old /analysis URL: there is no separate analysis screen any more. Start the analysis in the background and go to
 * the first service intro — each service page shows its own scan until its results are in.
 */
export default function AnalysisScreen() {
  const router = useRouter();
  const { session, gender } = useStudio();
  useEffect(() => {
    if (!session) return;
    ensureAnalysis(session.id).catch(() => {});
    router.replace(journeyIntro(JOURNEY[gender][0]));
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return <LoadingStage />;
}
