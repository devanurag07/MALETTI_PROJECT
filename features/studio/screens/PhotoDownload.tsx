"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { theme } from "../theme";
import { c } from "../ui";

/** Phone page behind a photo QR: the picture + Download (falls back to opening the image to long-press save). */
export default function PhotoDownload() {
  const tr = useTranslations("studio.qr");
  const search = useSearchParams();
  const raw = search.get("u") ?? "";
  const src = /^https:\/\//.test(raw) ? raw : null; // only remote https images
  const name = (search.get("n") ?? "photo.jpg").replace(/[^\w.-]/g, "") || "photo.jpg";
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!src) return;
    setBusy(true);
    try {
      const blob = await (await fetch(src, { mode: "cors" })).blob();
      const file = new File([blob], name, { type: blob.type || "image/jpeg" });
      // Phones: the share sheet offers "Save image"; desktop: a normal download.
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") window.open(src, "_blank"); // CORS blocked: open it, long-press to save
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
      padding: "28px 16px", background: c("background"), color: c("ink"), fontFamily: c("font-body"),
    }}>
      <img src={theme.brand.logo} alt={theme.brand.name} style={{ height: 40 }} />
      {src ? (
        <>
          <img src={src} alt="" style={{ width: "100%", maxWidth: 480, aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 18, display: "block" }} />
          <button type="button" onClick={download} disabled={busy} style={{
            width: "100%", maxWidth: 480, height: 56, border: "none", borderRadius: 28, background: c("ink"), color: c("on-dark"),
            fontSize: 17, fontWeight: 500, cursor: "pointer", opacity: busy ? 0.6 : 1,
          }}>{tr("download")}</button>
          <span style={{ fontSize: 13, color: c("ink-muted"), textAlign: "center", maxWidth: 420 }}>{tr("hint")}</span>
        </>
      ) : (
        <span style={{ color: c("ink-muted") }}>{tr("missing")}</span>
      )}
    </div>
  );
}
