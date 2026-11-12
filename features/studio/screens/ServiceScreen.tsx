"use client";

import { useRouter } from "next/navigation";
import { studioApi, type TryKind } from "../api";
import { useStudio } from "../context/StudioContext";
import { SERVICE_KINDS } from "../flows";
import { Arch, c, GuidePill, H1, HeroBackdrop, Icon, ICON, LoadingStage, Muted, Photo, Screen } from "../ui";

const ICONS: Record<TryKind, string> = {
  colour: ICON.serviceColour,
  cut: ICON.serviceCut,
  makeup: ICON.serviceMakeup,
  beard: ICON.serviceBeard,
};

/** Each try-on maps to its service page (Recommended + Custom), then the one-service result. */
const KIND_SERVICE: Record<TryKind, string> = { cut: "hairstyle", colour: "colour", makeup: "makeup", beard: "beard" };

/** Simple Service, step 3 — pick what to try. Options per gender: SERVICE_KINDS in ../flows. */
export default function ServiceScreen() {
  const router = useRouter();
  const { t, config, session, gender, setSession, photo } = useStudio();
  if (!config || !session) return <LoadingStage />;

  async function switchToConsultant() {
    if (!session) return;
    setSession(await studioApi.updateSession(session.id, { flow: "consultant" }));
    router.push("/analysis");
  }

  return (
    <Screen step={3}>
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
        <HeroBackdrop halo={[360, 340]} squares={[
          { left: 90, top: 20, width: 72, height: 72 },
          { right: 90, bottom: 14, width: 56, height: 56 },
        ]} />
        <Arch width={168} height={210} offset={7} style={{ boxShadow: c("shadow-arch") }}>
          <Photo src={photo} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center" }}>
            <GuidePill size={12}>{t("service", "live")}</GuidePill>
          </div>
        </Arch>
      </div>

      <div style={{ flex: "0 0 auto", padding: "4px 34px 20px 34px", display: "flex", flexDirection: "column", gap: 8 }}>
        <H1 size={30} style={{ lineHeight: 1.08 }}>{t("service", "title")}</H1>
        <Muted size={14} style={{ marginBottom: 4 }}>{t("service", "desc")}</Muted>
        {SERVICE_KINDS[gender].map((k) => (
          <button key={k} type="button" onClick={() => router.push(`/journey/${KIND_SERVICE[k]}?simple=1`)} style={{
            display: "flex", alignItems: "center", gap: 16, width: "100%", height: 62, padding: "0 20px 0 16px", borderRadius: 20,
            background: c("surface"), border: `1px solid ${c("line-card")}`, color: c("ink"), textAlign: "left", cursor: "pointer",
          }}>
            <span style={{ position: "relative", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", width: 54, height: 54 }}>
              <span style={{ position: "absolute", left: 6, top: 6, display: "block", width: 42, height: 42, background: c("icon-bg"), transform: "skewX(var(--mm-skew))" }} />
              <Icon d={ICONS[k]} size={26} width={1.5} style={{ position: "relative" }} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 auto", minWidth: 0 }}>
              <span style={{ fontSize: 19 }}>{t("service", k)}</span>
              <span style={{ fontSize: 14, color: c("ink-muted") }}>{t("service", `${k}Sub`)}</span>
            </span>
            <Icon d={ICON.next} size={22} />
          </button>
        ))}
        {/* Analyses on their own: colour harmony and skin (the analysis runs when opened). */}
        {(["armocromia", "skin"] as const).map((sv) => (
          <button key={sv} type="button" onClick={() => router.push(`/journey/${sv}?simple=1`)} style={{
            display: "flex", alignItems: "center", gap: 16, width: "100%", height: 62, padding: "0 20px 0 16px", borderRadius: 20,
            background: c("surface"), border: `1px solid ${c("line-card")}`, color: c("ink"), textAlign: "left", cursor: "pointer",
          }}>
            <span style={{ position: "relative", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", width: 54, height: 54 }}>
              <span style={{ position: "absolute", left: 6, top: 6, display: "block", width: 42, height: 42, background: c("icon-bg"), transform: "skewX(var(--mm-skew))" }} />
              <Icon d={sv === "skin" ? ICON.skin : ICON.colour} size={26} width={1.5} style={{ position: "relative" }} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 auto", minWidth: 0 }}>
              <span style={{ fontSize: 19 }}>{t("journey", `${sv}.name`)}</span>
              <span style={{ fontSize: 14, color: c("ink-muted") }}>{t("service", `${sv}Sub`)}</span>
            </span>
            <Icon d={ICON.next} size={22} />
          </button>
        ))}
        <button type="button" onClick={switchToConsultant} style={{
          height: 44, marginTop: 2, padding: 0, background: "none", border: "none", fontSize: 14, color: c("ink-muted"),
          textDecoration: "underline", textUnderlineOffset: 4, cursor: "pointer",
        }}>
          {t("service", "switch")}
        </button>
      </div>
    </Screen>
  );
}
