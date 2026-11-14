"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { studioApi, type PublicReport } from "../api";
import { useStudio } from "../context/StudioContext";
import StudioReport from "../report/StudioReport";
import { theme } from "../theme";
import { ActionBar, c, ErrorLine, H1, Icon, LoadingStage, PrimaryButton, Screen, Spinner, TextLink } from "../ui";

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
  // Its state shows in the QR dialog; a failure can be retried from there.
  const locale = report?.locale ?? "en";
  const [pdf, setPdf] = useState<"idle" | "preparing" | "ready" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  useEffect(() => {
    if (!token || !report) return;
    if (report.pdf_url) { setPdf("ready"); return; }
    const started = `mm-pdf:${token}`;
    try {
      const v = sessionStorage.getItem(started);
      if (v === "done") { setPdf("ready"); return; }
      // Another render started less than 3 min ago (e.g. this screen remounted): don't start a second one.
      // Older markers are stale (the page was reloaded mid-render) and are ignored.
      if (v && attempt === 0 && Date.now() - Number(v) < 180_000) {
        setPdf("preparing");
        // Watch for that render's result (the share gets its pdf_url once stored).
        const id = setInterval(() => {
          studioApi.publicLook(token).then((r) => { if (r.pdf_url) { clearInterval(id); setPdf("ready"); } }).catch(() => {});
          if (Date.now() - Number(v) > 180_000) { clearInterval(id); setPdf("failed"); setPdfError("Timed out"); }
        }, 5000);
        return () => clearInterval(id);
      }
      sessionStorage.setItem(started, String(Date.now()));
    } catch {}
    let alive = true;
    setPdf("preparing");
    // Time limit: show "could not be prepared" + Try again instead of "Preparing…" forever.
    fetch(`/api/studio-report/${encodeURIComponent(token)}/pdf?locale=${locale}&store=1`, { signal: AbortSignal.timeout(180_000) })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? String(r.status));
        try { sessionStorage.setItem(started, "done"); } catch {}
        if (alive) setPdf("ready");
      })
      .catch((e) => {
        console.error("[report] PDF store failed:", e);
        try { sessionStorage.removeItem(started); } catch {}
        if (alive) { setPdf("failed"); setPdfError(e instanceof Error ? e.message : String(e)); }
      });
    return () => { alive = false; };
  }, [token, report, locale, attempt]);

  if (!session && !token) return <LoadingStage />;
  // QR → phone page: name form + direct download of the stored PDF. The phone must be able to open this address:
  // NEXT_PUBLIC_SITE_URL (the mirror's public address) wins over the address the mirror itself is opened on.
  const origin = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "") : "";
  const onLocalhost = /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(origin);
  const pdfUrl = token && origin ? `${origin}/${locale}/l/${encodeURIComponent(token)}?download=1` : null;

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
      {!report && !error ? null : <ActionBar link={{ label: t("report", "showQr"), onClick: () => setQrOpen(true), disabled: !pdfUrl }}>
        <PrimaryButton onClick={async () => {
          if (session) await studioApi.complete(session.id).catch(() => {});
          resetAll();
          router.replace("/");
        }}>{t("look", "newSession")}</PrimaryButton>
      </ActionBar>}
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
            {/* PDF status: it is rendered in the background; the phone waits for it if it is not ready yet. */}
            {pdf === "preparing" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: c("ink-muted") }}>
                <Spinner size={14} /> {t("report", "pdfPreparing")}
              </span>
            ) : pdf === "ready" ? (
              <span style={{ fontSize: 13, color: c("accent") }}>{t("report", "pdfReady")}</span>
            ) : pdf === "failed" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: c("ink-muted") }}>
                {t("report", "pdfFailed")}
                <TextLink onClick={() => setAttempt((n) => n + 1)}>{t("report", "retry")}</TextLink>
              </span>
            ) : null}
            {/* Why it failed (from the PDF route), small — for staff / support. */}
            {pdf === "failed" && pdfError ? (
              <span style={{ fontSize: 11, lineHeight: 1.35, color: c("ink-faint"), wordBreak: "break-word", maxWidth: "100%" }}>{pdfError.slice(0, 240)}</span>
            ) : null}
            {onLocalhost ? <span style={{ fontSize: 12, lineHeight: 1.4, color: c("metric-warm") }}>{t("report", "localhostWarning")}</span> : null}
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
