"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { studioApi } from "../api";
import { theme } from "../theme";
import { c, Diamond, SERIF } from "../ui";

type PublicLook = Awaited<ReturnType<typeof studioApi.publicLook>>;

/** Phone page behind the QR code / e-mail link. No kiosk login; same theme file as the mirror. */
export default function PublicLookScreen({ token }: { token: string }) {
  const tr = useTranslations("studio");
  const [data, setData] = useState<PublicLook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [split, setSplit] = useState(50);

  useEffect(() => {
    studioApi.publicLook(token).then(setData).catch((e: Error) => setError(e.message));
  }, [token]);

  const shell = (body: ReactNode) => (
    <div style={{ minHeight: "100dvh", background: c("background"), color: c("ink"), fontFamily: c("font-body") }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", background: c("header"), borderBottom: `1px solid ${c("header-line")}` }}>
        <img src={theme.brand.logo} alt={theme.brand.name} style={{ height: 38 }} />
      </div>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 40px", display: "flex", flexDirection: "column", gap: 14 }}>{body}</div>
    </div>
  );

  if (error) return shell(<p style={{ textAlign: "center", color: c("ink-muted") }}>{error}</p>);
  if (!data) return shell(<p style={{ textAlign: "center", color: c("ink-muted") }}>…</p>);

  const tx = (v?: Record<string, string> | null) => (v ? v[data.locale] ?? v.en ?? "" : "");
  const look = data.look;
  const items = look ? [look.cut, look.hair_shade, look.technique, look.makeup_look, look.lip, look.eye, look.beard].filter(Boolean) : [];
  const after = look?.after_url;
  const products = (look?.products ?? []).filter((p) => p.area !== "hair"); // no hair products for Maletti

  return shell(
    <>
      <DownloadForm token={token} locale={data.locale} initialPdf={data.pdf_url ?? null} />
      <h1 style={{ margin: 0, ...SERIF, fontSize: 34, lineHeight: 1.05 }}>{tr("look.title")}</h1>
      {look?.headline ? <p style={{ margin: 0, fontSize: 15, color: c("ink-muted") }}>{tx(look.headline)}</p> : null}
      {data.source_image_url ? (
        <div style={{
          position: "relative", aspectRatio: "4 / 5", borderRadius: "200px 200px 22px 22px / 150px 150px 22px 22px", overflow: "hidden",
          background: c("photo"), outline: `1.5px solid ${c("accent")}`, outlineOffset: 5, margin: "8px 6px",
        }}>
          <img src={data.source_image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          {after ? (
            <>
              <img src={after} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", clipPath: `inset(0 0 0 ${split}%)` }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${split}%`, width: 2, marginLeft: -1, background: c("surface-raised") }} />
              <input type="range" min={4} max={96} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label={tr("common.compare")}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0 }} />
            </>
          ) : null}
        </div>
      ) : null}
      {items.map((i) => (
        <div key={i!.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, background: c("surface"), border: `1px solid ${c("line")}`, fontSize: 15 }}>
          <Diamond size={12} color={i!.hex ?? c("accent")} />
          <span>{tx(i!.name)}</span>
        </div>
      ))}
      {products.length ? (
        <div style={{ padding: "12px 14px", borderRadius: 16, background: c("surface"), border: `1px solid ${c("line")}` }}>
          <div style={{ fontSize: 12, color: c("ink-muted"), marginBottom: 6 }}>{tr("look.productsTitle")}</div>
          {products.map((p) => (
            <div key={p.key} style={{ padding: "4px 0", fontSize: 15 }}>
              {tx(p.name)}
              {p.product ? <span style={{ color: c("ink-muted"), fontSize: 13 }}> · {p.product.brand} · {p.product.price}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}


/**
 * Name + Download. The kiosk renders the PDF in the background, so it is normally ready: the download starts at once.
 * If it is still being made, wait for it (poll); as a last resort render it now.
 */
function DownloadForm({ token, locale, initialPdf }: { token: string; locale: string; initialPdf: string | null }) {
  const tr = useTranslations("studio");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "waiting" | "error">("idle");

  async function download(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setState("waiting");
    let pdf = initialPdf;
    try {
      pdf = (await studioApi.publicLead(token, name.trim())).pdf_url ?? pdf;
      // The mirror renders the PDF in the background: wait for it (up to ~90 s) before rendering one here.
      for (let i = 0; !pdf && i < 45; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        pdf = (await studioApi.publicLook(token)).pdf_url ?? null;
      }
    } catch { /* fall through to the on-demand render */ }
    const stored = !!pdf;
    const href = pdf ?? `/api/studio-report/${encodeURIComponent(token)}/pdf?locale=${locale}`;
    let res: Response;
    try {
      res = await fetch(href, { mode: "cors" });
    } catch {
      // Stored PDF on the CDN without CORS: open it in this tab (a new window after an await is blocked as a pop-up).
      if (stored) { window.location.href = href; setState("idle"); return; }
      setState("error");
      return;
    }
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/pdf|octet-stream/i.test(type)) {
      console.error("[report] download failed:", res.status, await res.text().catch(() => ""));
      setState("error"); // never send the customer to a raw error page
      return;
    }
    const blob = await res.blob();
    // Save it as a real file (a cross-origin link would just open the PDF, or not download at all on some phones).
    const file = new File([blob], "beauty-report.pdf", { type: "application/pdf" });
    if (/iPhone|iPad|Android/i.test(navigator.userAgent) && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => openBlob(blob)); // share sheet → "Save to Files"
    } else {
      openBlob(blob);
    }
    setState("idle");
  }

  function openBlob(blob: Blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "beauty-report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }

  return (
    <form onSubmit={download} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 18, background: c("surface"), border: `1px solid ${c("line")}` }}>
      <span style={{ ...SERIF, fontSize: 22 }}>{tr("report.downloadTitle")}</span>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("report.namePlaceholder")} autoComplete="name" maxLength={120}
        style={{ height: 48, padding: "0 14px", borderRadius: 14, border: `1px solid ${c("line-strong")}`, background: c("background"), color: c("ink"), fontSize: 16 }} />
      <button type="submit" disabled={!name.trim() || state === "waiting"} style={{
        height: 50, borderRadius: 25, border: "none", fontSize: 16, fontWeight: 500, cursor: "pointer",
        background: c("ink"), color: c("on-dark"), opacity: !name.trim() || state === "waiting" ? 0.5 : 1,
      }}>
        {state === "waiting" ? tr("report.preparing") : state === "error" ? tr("report.retry") : tr("report.download")}
      </button>
      {state === "error" ? <span style={{ fontSize: 14, color: c("ink-muted"), textAlign: "center" }}>{tr("report.downloadFailed")}</span> : null}
    </form>
  );
}
