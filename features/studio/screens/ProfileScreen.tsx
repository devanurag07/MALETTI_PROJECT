"use client";

import { useRouter } from "next/navigation";
import { studioApi, type Gender } from "../api";
import { useStudio } from "../context/StudioContext";
import { FLOWS, type FlowKey } from "../flows";
import { ensureAnalysis } from "../pending-upload";
import { c, Diamond, H1, H2, Icon, ICON, LoadingStage, Photo, PillButton, Screen, SERIF, Spacer } from "../ui";
import { useNav, usePrefetch } from "../use-nav";

/** Woman / man icons from the main software (FLUX_VERSION_3 look advisor): black on light, white when selected. */
const GENDER_ICON: Record<Gender, { black: string; white: string }> = {
  woman: { black: "/studio/gender/Female_Black.png", white: "/studio/gender/Female_White.png" },
  man: { black: "/studio/gender/Male_Black.png", white: "/studio/gender/Male_White.png" },
};

/** Step 2 — Profile (woman/man) and path (Beauty Consultant / Simple Service). */
export default function ProfileScreen() {
  const router = useRouter();
  const { go } = useNav();
  usePrefetch(...FLOWS.map((f) => f.start));
  const { t, config, session, setSession, photo } = useStudio();
  if (!config || !session) return <LoadingStage />;

  async function setGender(g: Gender) {
    if (session) setSession(await studioApi.updateSession(session.id, { gender: g }));
  }
  async function choose(flow: FlowKey) {
    if (!session) return;
    setSession(await studioApi.updateSession(session.id, { flow, current_step: "profile" }));
    // Consultation: no separate analysis screen — it runs in the background, each service shows its own scan.
    if (flow === "consultant") ensureAnalysis(session.id).catch(() => {});
    go(FLOWS.find((f) => f.key === flow)!.start);
  }

  return (
    <Screen step={2}>
      <div style={{
        flex: "0 0 auto", margin: "18px 34px 0 34px", display: "flex", alignItems: "center", gap: 16,
        padding: "12px 12px 12px 14px", borderRadius: 22, background: c("surface"), border: `1px solid ${c("line-card")}`,
      }}>
        <div style={{ flex: "0 0 auto", position: "relative", width: 54, height: 64, borderRadius: "27px 27px 10px 10px", overflow: "hidden", background: c("photo") }}>
          <Photo src={photo} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: "1 1 auto", minWidth: 0 }}>
          <span style={{ fontSize: 16 }}>{t("profile", "captured")}</span>
        </div>
        <PillButton icon={ICON.retake} onClick={() => router.push("/capture")}>{t("profile", "retake")}</PillButton>
      </div>

      <H1 style={{ flex: "0 0 auto", margin: "24px 34px 0 34px" }}>{t("profile", "title")}</H1>

      <div style={{ flex: "0 0 auto", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, margin: "14px 34px 0 34px" }}>
        {(["woman", "man"] as Gender[]).map((g) => {
          const on = session.gender === g;
          return (
            <button key={g} type="button" aria-pressed={on} onClick={() => setGender(g)} style={{
              position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              padding: "16px 12px 14px 12px", borderRadius: 24, cursor: "pointer", color: c("ink"),
              border: `2px solid ${on ? c("accent") : c("line")}`, background: on ? c("surface-raised") : c("surface"),
            }}>
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 116, height: 116, borderRadius: 24,
                background: on ? c("accent") : c("ink"), transition: "background 200ms",
              }}>
                <img src={on ? GENDER_ICON[g].white : GENDER_ICON[g].black} alt="" aria-hidden="true" style={{ width: 56, height: 56, objectFit: "contain" }} />
              </span>
              <span style={{ fontSize: 18 }}>{t("profile", g)}</span>
              <Diamond size={14} color={on ? c("accent") : "transparent"} border={`1.5px solid ${on ? c("accent") : c("line-strong")}`}
                style={{ position: "absolute", top: 14, right: 16 }} />
            </button>
          );
        })}
      </div>

      <Spacer />

      <div style={{ flex: "0 0 auto", padding: "0 34px 34px 34px", display: "flex", flexDirection: "column", gap: 12 }}>
        <H2 size={26}>{t("profile", "pathTitle")}</H2>
        {FLOWS.map((f) =>
          f.recommended ? (
            <button key={f.key} type="button" onClick={() => choose(f.key)} style={{
              position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 16, width: "100%",
              padding: "20px 20px 20px 24px", border: "none", borderRadius: 24, background: c("path-consultant"), color: c("path-consultant-ink"),
              textAlign: "left", cursor: "pointer", boxShadow: c("shadow-card"),
            }}>
              <span style={{ position: "absolute", right: 58, top: -40, display: "block", width: 120, height: 120, border: "1.5px solid rgba(193,154,107,0.4)", transform: "skewX(var(--mm-skew))" }} />
              <span style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, flex: "1 1 auto" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ ...SERIF, fontSize: 26, lineHeight: 1.1 }}>{t("flows", `${f.key}.name`)}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: c("on-dark"), background: c("accent-soft"), borderRadius: 10, padding: "3px 10px" }}>
                    {t("profile", "recommended")}
                  </span>
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.45, color: c("path-consultant-ink-muted") }}>{t("flows", `${f.key}.desc`)}</span>
              </span>
              <Icon d={ICON.next} size={22} style={{ position: "relative" }} />
            </button>
          ) : (
            <button key={f.key} type="button" onClick={() => choose(f.key)} style={{
              display: "flex", alignItems: "center", gap: 16, width: "100%", padding: "20px 20px 20px 24px", borderRadius: 24,
              border: "none", background: c("path-simple"), color: c("path-simple-ink"), textAlign: "left", cursor: "pointer",
            }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 auto" }}>
                <span style={{ ...SERIF, fontSize: 26, lineHeight: 1.1 }}>{t("flows", `${f.key}.name`)}</span>
                <span style={{ fontSize: 14, lineHeight: 1.45, color: c("path-simple-ink-muted") }}>{t("flows", `${f.key}.desc`)}</span>
              </span>
              <Icon d={ICON.next} size={22} />
            </button>
          )
        )}
      </div>
    </Screen>
  );
}
