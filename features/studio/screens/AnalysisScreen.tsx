"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { studioApi, type Results } from "../api";
import { useStudio } from "../context/StudioContext";
import { Arch, c, ErrorLine, GuidePill, H1, HeroBackdrop, Icon, ICON, LoadingStage, Photo, PrimaryButton, Screen, Spinner } from "../ui";

// Face mesh from the mockup (560 × 700 space).
const GEO: Record<"woman" | "man", Record<string, [number, number]>> = {
  woman: { fh: [280, 120.5], bl: [215.1, 170.5], br: [345, 167.7], el: [224, 208], er: [336, 208], cl: [181.7, 245.7], cr: [380, 247.6], n: [281.3, 265], ml: [231.2, 322.7], mr: [330.8, 321], jl: [183.1, 333.3], jr: [377.8, 338.1], c: [281.8, 396.4] },
  man: { fh: [279.7, 125.6], bl: [211.4, 177.2], br: [347.9, 175.3], el: [224, 208], er: [336, 208], cl: [177, 245.8], cr: [387.8, 244.7], n: [283.2, 270.5], ml: [229.1, 326.9], mr: [332.6, 325.7], jl: [181.8, 342], jr: [382.8, 343.5], c: [280.5, 414.8] },
};
const PAIRS = [["fh","bl"],["fh","br"],["bl","br"],["bl","el"],["br","er"],["el","er"],["el","n"],["er","n"],["cl","el"],["cr","er"],["cl","n"],["cr","n"],["cl","jl"],["cr","jr"],["jl","ml"],["jr","mr"],["ml","n"],["mr","n"],["ml","mr"],["ml","c"],["mr","c"],["jl","c"],["jr","c"]];
const MODULE_ICON: Record<string, string> = { skin: ICON.skin, face: ICON.face, colour: ICON.colour, scalp: ICON.scalp };

/** Step 3 — AI analysis: every active module runs in parallel on the backend. */
export default function AnalysisScreen() {
  const router = useRouter();
  const { t, config, session, setSession, gender, photo } = useStudio();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    // Re-run when there is nothing to show yet (new session, or an earlier run that produced no results).
    const run = async (id: string) => {
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
  const P = GEO[gender];
  const mesh = PAIRS.map(([a, b]) => `M${P[a][0]} ${P[a][1]} L${P[b][0]} ${P[b][1]}`).join(" ");
  const done = !!results;

  return (
    <Screen step={3}>
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HeroBackdrop halo={[500, 520]} squares={[
          { left: 56, top: 30, width: 110, height: 110 },
          { right: 58, bottom: 26, width: 84, height: 84 },
        ]} />
        <Arch width={266} height={336} offset={7} style={{ boxShadow: "0 24px 48px rgba(107,84,68,0.2)" }}>
          <Photo src={photo} />
          <svg viewBox="0 0 560 700" width={270} height={338} aria-hidden="true" preserveAspectRatio="none" style={{ position: "absolute", left: -2, top: -1 }}>
            <path d={mesh} fill="none" stroke="var(--mm-dashed)" strokeWidth="2.4" strokeOpacity="0.85" strokeLinecap="round" />
            <path d={mesh} fill="none" stroke="var(--mm-accent)" strokeWidth="1.2" strokeOpacity="0.9" strokeLinecap="round" />
            {Object.values(P).map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill="var(--mm-accent)" stroke="var(--mm-dashed)" strokeWidth="3" />
            ))}
          </svg>
          {!done ? (
            <div style={{
              position: "absolute", left: 14, right: 14, top: "6%", height: 2,
              background: "linear-gradient(90deg, rgba(196,160,106,0), rgba(255,240,214,1), rgba(196,160,106,0))",
              boxShadow: "0 0 16px 3px rgba(255,236,204,0.75)", animation: "mmScan 3.4s ease-in-out infinite alternate",
            }} />
          ) : null}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center" }}>
            <GuidePill>{t("flows", `${session.flow || "consultant"}.name`)}</GuidePill>
          </div>
        </Arch>
      </div>

      <div style={{ flex: "0 0 auto", padding: "2px 34px 34px 34px", display: "flex", flexDirection: "column", gap: 14 }}>
        <H1>{t("analysis", done ? "title" : "running")}</H1>
        <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${c("divider")}` }}>
          {config.modules.filter((m) => m.status !== "off").map((m) => {
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
        <PrimaryButton iconRight={ICON.next} disabled={!done} onClick={() => router.push("/results/skin")} style={{ marginTop: 4 }}>
          {t("analysis", "cta")}
        </PrimaryButton>
      </div>
      <ErrorLine message={error} />
    </Screen>
  );
}
