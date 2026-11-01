"use client";

import { useRouter } from "next/navigation";
import { studioApi, type Gender } from "../api";
import { useStudio } from "../context/StudioContext";
import { FLOWS, type FlowKey } from "../flows";
import { c, Diamond, H1, H2, Icon, ICON, LoadingStage, Photo, PillButton, Screen, SERIF, Spacer } from "../ui";

/** Silhouettes for the woman / man cards (the mockup used stock faces). */
const SILHOUETTE: Record<Gender, string> = {
  woman: "M60 30c-20 0-31 15-31 36 0 17 3 34 2 48-1 8-4 14-8 18h74c-4-4-7-10-8-18-1-14 2-31 2-48 0-21-11-36-31-36z M60 44c13 0 20 11 20 25s-8 28-20 28-20-14-20-28 7-25 20-25z",
  man: "M60 36c-17 0-26 11-26 26 0 3 0 5 1 7 2-9 9-14 25-14s23 5 25 14c1-2 1-4 1-7 0-15-9-26-26-26z M60 50c12 0 19 10 19 24s-8 26-19 26-19-12-19-26 7-24 19-24z M28 132c4-16 17-24 32-24s28 8 32 24z",
};

/** Step 2 — Profile (woman/man) and path (Beauty Consultant / Simple Service). */
export default function ProfileScreen() {
  const router = useRouter();
  const { t, config, session, setSession, photo } = useStudio();
  if (!config || !session) return <LoadingStage />;

  async function setGender(g: Gender) {
    if (session) setSession(await studioApi.updateSession(session.id, { gender: g }));
  }
  async function choose(flow: FlowKey) {
    if (!session) return;
    setSession(await studioApi.updateSession(session.id, { flow, current_step: "profile" }));
    router.push(FLOWS.find((f) => f.key === flow)!.start);
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
          <span style={{ fontSize: 13, color: c("ink-muted") }}>{t("profile", "capturedSub")}</span>
        </div>
        <PillButton icon={ICON.retake} onClick={() => router.push("/")}>{t("profile", "retake")}</PillButton>
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
              <span style={{ position: "relative", display: "block", width: 116, height: 126, borderRadius: "58px 58px 14px 14px", overflow: "hidden", background: c("photo") }}>
                <svg viewBox="0 0 120 132" width="116" height="126" aria-hidden="true" style={{ position: "absolute", left: 0, top: 4 }}>
                  <path d={SILHOUETTE[g]} fill="var(--mm-line-strong)" fillRule="evenodd" opacity={on ? 0.9 : 0.6} />
                </svg>
              </span>
              <span style={{ fontSize: 18 }}>{t("profile", g)}</span>
              <Diamond size={14} color={on ? c("accent") : "transparent"} border={`1.5px solid ${on ? c("accent") : c("line-strong")}`}
                style={{ position: "absolute", top: 14, right: 16 }} />
            </button>
          );
        })}
      </div>
      <p style={{ flex: "0 0 auto", margin: "10px 34px 0 34px", fontSize: 13, lineHeight: 1.45, color: c("ink-muted") }}>{t("profile", "note")}</p>

      <Spacer />

      <div style={{ flex: "0 0 auto", padding: "0 34px 34px 34px", display: "flex", flexDirection: "column", gap: 12 }}>
        <H2 size={26}>{t("profile", "pathTitle")}</H2>
        {FLOWS.map((f) =>
          f.recommended ? (
            <button key={f.key} type="button" onClick={() => choose(f.key)} style={{
              position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 16, width: "100%",
              padding: "20px 20px 20px 24px", border: "none", borderRadius: 24, background: c("ink"), color: c("on-dark"),
              textAlign: "left", cursor: "pointer", boxShadow: c("shadow-card"),
            }}>
              <span style={{ position: "absolute", right: 58, top: -40, display: "block", width: 120, height: 120, border: "1.5px solid rgba(196,160,106,0.4)", transform: "skewX(var(--mm-skew))" }} />
              <span style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, flex: "1 1 auto" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ ...SERIF, fontSize: 26, lineHeight: 1.1 }}>{t("flows", `${f.key}.name`)}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: c("ink"), background: c("accent-soft"), borderRadius: 10, padding: "3px 10px" }}>
                    {t("profile", "recommended")}
                  </span>
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.45, color: c("on-dark-muted") }}>{t("flows", `${f.key}.desc`)}</span>
              </span>
              <Icon d={ICON.next} size={22} style={{ position: "relative" }} />
            </button>
          ) : (
            <button key={f.key} type="button" onClick={() => choose(f.key)} style={{
              display: "flex", alignItems: "center", gap: 16, width: "100%", padding: "20px 20px 20px 24px", borderRadius: 24,
              border: `1px solid ${c("line-accent")}`, background: c("surface"), color: c("ink"), textAlign: "left", cursor: "pointer",
            }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 auto" }}>
                <span style={{ ...SERIF, fontSize: 26, lineHeight: 1.1 }}>{t("flows", `${f.key}.name`)}</span>
                <span style={{ fontSize: 14, lineHeight: 1.45, color: c("ink-muted") }}>{t("flows", `${f.key}.desc`)}</span>
              </span>
              <Icon d={ICON.next} size={22} />
            </button>
          )
        )}
      </div>
    </Screen>
  );
}
