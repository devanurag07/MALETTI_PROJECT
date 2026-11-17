"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { studioApi, type I18n, type PublicReport } from "../api";
import { catalogKey, useStudio } from "../context/StudioContext";
import { isFluxShade } from "../data/haircolor";
import StudioReport from "../report/StudioReport";
import { reportPdfUrl, useReportPdf } from "./ReportScreen";
import { lookParams, savedMakeupLook } from "../save-look";
import { theme } from "../theme";
import { ActionBar, c, ErrorLine, H1, Icon, ICON, LoadingStage, PrimaryButton, Screen, Spinner } from "../ui";

/**
 * End of the consultation: saves the look, then shows the report preview. Bottom: Back · QR (scan → the report PDF on
 * the phone) · Finish your consultation (closes the session, back to the welcome screen).
 */
export default function LookScreen() {
  const router = useRouter();
  const { t, config, session, setSession, look, resetAll } = useStudio();
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [report, setReport] = useState<PublicReport | null>(null);
  const [qrBig, setQrBig] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // Save the draft look on the backend, then mint the QR share link.
  useEffect(() => {
    if (!session || !config) return;
    (async () => {
      try {
        let headline: I18n = {};
        if (session.flow === "consultant") {
          const r = await studioApi.results(session.id);
          const colour = r.tabs.find((x) => x.module === "colour")?.label?.name;
          const skin = r.tabs.find((x) => x.module === "skin")?.label?.name;
          headline = Object.fromEntries(
            config.locales.map((l) => [l, [colour?.[l], skin?.[l]?.toLowerCase()].filter(Boolean).join(", ")])
          );
        }
        // The look = what the kept try-on images show: fall back to each kept layer's params if a field is empty.
        const lp = (k: "cut" | "colour" | "makeup" | "beard", f: string) =>
          (look.layers[k]?.params?.[f] as string | undefined) ?? null;
        const cut = look.cut ?? lp("cut", "item");
        const shade = look.hair_shade ?? lp("colour", "shade") ?? lp("colour", "shade_key"); // shade_key = FLUX colour
        const s = await studioApi.saveLook(session.id, {
          // An uploaded style ("your photo") has no catalog item: the try-on image is the result.
          cut: catalogKey(cut),
          // A FLUX_VERSION_3 colour is not a backend catalogue key: saved in params.hair_colour instead.
          hair_shade: isFluxShade(shade) ? null : catalogKey(shade),
          technique: catalogKey(shade) && !isFluxShade(shade) ? look.technique ?? lp("colour", "technique") : null,
          makeup_look: savedMakeupLook(look.makeup_look ?? lp("makeup", "look_key") ?? lp("makeup", "look")),
          lip: look.lip ?? lp("makeup", "lip"),
          eye: look.eye ?? lp("makeup", "eye"),
          beard: catalogKey(look.beard ?? lp("beard", "beard")),
          // Recommended salon skin services ride along in params, so the report (and its PDF) can list them.
          params: lookParams(look, shade, look.makeup_look ?? lp("makeup", "look_key")),
          products: look.products,
          final_tryon_id: look.lastTryon?.status === "done" ? look.lastTryon.id : null,
          headline,
        });
        setSession(s);
        setSaved(true);
        // The report preview + its QR (phone: download the PDF) come from a QR share of the saved look.
        const share = await studioApi.share(session.id, { channel: "qr" });
        setShareToken(share.token);
        setReport(await studioApi.publicLook(share.token));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.client.slug, session?.id]);

  const { pdf } = useReportPdf(shareToken, report); // PDF stored in the background, ready when the phone asks
  if (!config || !session) return <LoadingStage />;
  const qrUrl = report ? reportPdfUrl(shareToken, report.locale ?? "en") : null;
  const finish = async () => {
    setFinishing(true);
    await studioApi.complete(session.id).catch(() => {});
    resetAll();
    router.replace("/");
  };

  return (
    <Screen>
      <div style={{ flex: "0 0 auto", padding: "14px 34px 0 34px" }}>
        <H1 size={32}>{t("look", "title")}</H1>
      </div>
      {/* The report preview (what the PDF on the phone shows), scrollable. */}
      <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "12px 34px 8px 34px" }}>
        {report ? <StudioReport report={report} /> : !error ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={36} color={theme.colors.accent} /></div>
        ) : null}
      </div>
      <ErrorLine message={error} />

      {/* Back · QR (scan → the report PDF on the phone; tap to enlarge) · Finish your consultation */}
      <ActionBar>
        {/* QR button → the QR dialog (scan → the report PDF on the phone). */}
        <button type="button" disabled={!qrUrl} onClick={() => setQrBig(true)} aria-label={t("report", "scan")} style={{
          flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 64, padding: "0 18px",
          boxSizing: "border-box", borderRadius: 32, cursor: qrUrl ? "pointer" : "default", fontSize: 16, color: c("ink"),
          background: c("surface-raised"), border: `1px solid ${c("line-strong")}`, opacity: qrUrl ? 1 : 0.45,
        }}>
          <Icon d={ICON.qr} size={20} width={1.6} />
          <span>{t("look", "qrButton")}</span>
        </button>
        <PrimaryButton disabled={!saved} loading={finishing} onClick={finish}>{t("look", "finish")}</PrimaryButton>
      </ActionBar>

      {qrBig && qrUrl ? (
        <div role="dialog" aria-modal="true" aria-label={t("report", "scan")} onClick={() => setQrBig(false)} style={{
          position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.72)", padding: 34,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            padding: "30px 24px 24px", borderRadius: 24, background: c("surface"), border: `1px solid ${c("line")}`, textAlign: "center",
          }}>
            <button type="button" aria-label={t("report", "close")} onClick={() => setQrBig(false)} style={{
              position: "absolute", right: 12, top: 12, width: 36, height: 36, borderRadius: 18, border: `1px solid ${c("line-strong")}`,
              background: "transparent", color: c("ink"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}>
              <Icon d={ICON.close} size={18} />
            </button>
            <H1 size={26}>{t("report", "scan")}</H1>
            <div style={{ padding: 12, borderRadius: 16, background: "#fff" }}>
              <QRCodeSVG value={qrUrl} size={240} level="M" />
            </div>
            <span style={{ fontSize: 14, color: c("ink-muted") }}>{t("report", "scanSub")}</span>
            {pdf === "preparing" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: c("ink-muted") }}>
                <Spinner size={14} /> {t("report", "pdfPreparing")}
              </span>
            ) : pdf === "ready" ? <span style={{ fontSize: 13, color: c("accent") }}>{t("report", "pdfReady")}</span> : null}
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
