"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { studioApi, type PublicReport } from "../api";
import { useStudio } from "../context/StudioContext";
import StudioReport from "../report/StudioReport";
import { theme } from "../theme";
import { c, ErrorLine, H1, Icon, LoadingStage, OutlineButton, PrimaryButton, Screen, Spinner } from "../ui";

/** End of the journey: the full report on the mirror + a QR code to download it as a PDF (like beauty_platform). */
export default function ReportScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const { t, session, resetAll } = useStudio();
  const [token, setToken] = useState<string | null>(search.get("token"));
  const [report, setReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let tk = token;
        if (!tk && session) {
          tk = (await studioApi.share(session.id, { channel: "qr" })).token;
          setToken(tk);
        }
        if (tk) setReport(await studioApi.publicLook(tk));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  // Render + store the PDF in the background as soon as the report exists (no waiting on the phone later).
  const locale = report?.locale ?? "en";
  useEffect(() => {
    if (!token || !report || report.pdf_url) return;
    const started = `mm-pdf:${token}`;
    try { if (sessionStorage.getItem(started)) return; sessionStorage.setItem(started, "1"); } catch {}
    fetch(`/api/studio-report/${encodeURIComponent(token)}/pdf?locale=${locale}&store=1`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); })
      .catch(() => { try { sessionStorage.removeItem(started); } catch {} }); // retried next time the report opens
  }, [token, report, locale]);

  if (!session && !token) return <LoadingStage />;
  // QR → phone page: name form + direct download of the stored PDF.
  const pdfUrl = token && typeof window !== "undefined"
    ? `${window.location.origin}/${locale}/l/${encodeURIComponent(token)}?download=1`
    : null;

  return (
    <Screen>
      <div style={{ flex: "0 0 auto", padding: "14px 34px 0 34px" }}>
        <H1 size={30}>{t("report", "screenTitle")}</H1>
      </div>
      <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "14px 34px 8px 34px" }}>
        {report ? <StudioReport report={report} /> : !error ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={36} color={theme.colors.accent} /></div>
        ) : null}
      </div>
      <ErrorLine message={error} />
      <div style={{ flex: "0 0 auto", padding: "12px 34px 30px 34px", display: "flex", flexDirection: "column", gap: 10 }}>
        <OutlineButton disabled={!pdfUrl} onClick={() => setQrOpen(true)}>{t("report", "showQr")}</OutlineButton>
        <PrimaryButton onClick={async () => {
          if (session) await studioApi.complete(session.id).catch(() => {});
          resetAll();
          router.replace("/");
        }}>{t("look", "newSession")}</PrimaryButton>
      </div>
      {qrOpen && pdfUrl ? (
        // QR dialog over the screen: scan to download the PDF report.
        <div role="dialog" aria-modal="true" aria-label={t("report", "scan")} onClick={() => setQrOpen(false)} style={{
          position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.72)", padding: 34,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            padding: "30px 24px 24px", borderRadius: 24, background: c("surface"), border: `1px solid ${c("line")}`, textAlign: "center",
          }}>
            <button type="button" aria-label={t("report", "close")} onClick={() => setQrOpen(false)} style={{
              position: "absolute", right: 12, top: 12, width: 36, height: 36, borderRadius: 18, border: `1px solid ${c("line-strong")}`,
              background: "transparent", color: c("ink"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}>
              <Icon d="M6 6l12 12M18 6L6 18" size={18} />
            </button>
            <H1 size={26}>{t("report", "scan")}</H1>
            <div style={{ padding: 12, borderRadius: 16, background: "#fff" }}>
              <QRCodeSVG value={pdfUrl} size={240} level="M" />
            </div>
            <span style={{ fontSize: 14, color: c("ink-muted") }}>{t("report", "scanSub")}</span>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
