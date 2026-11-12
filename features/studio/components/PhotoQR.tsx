"use client";

import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { useStudio } from "../context/StudioContext";
import { c, Icon, ICON, OutlineButton, SERIF } from "../ui";

const QR_ICON = "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 14h2v2h-2z M14 18h2v2h-2z M18 18h2v2h-2z";

/** Phone page that shows the photo with a Download button: /<locale>/p?u=<image url>&n=<file name>. */
export function photoDownloadUrl(locale: string, src: string, name: string) {
  return `${window.location.origin}/${locale}/p?u=${encodeURIComponent(src)}&n=${encodeURIComponent(name)}`;
}

/**
 * Small "QR" button for one photo (taken photo, each try-on result, skin map). Tap → large QR; scanning it on a
 * phone opens the photo with a Download button. Local data: URLs fall back to the uploaded photo.
 */
export default function PhotoQR({ src, name, style }: { src: string | null | undefined; name: string; style?: CSSProperties }) {
  const { t, locale, session } = useStudio();
  const [open, setOpen] = useState(false);
  const url = src?.startsWith("http") ? src : session?.source_image_url ?? null;
  if (!url) return null;
  const file = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "photo"}.jpg`;

  return (
    <>
      <button type="button" aria-label={t("qr", "button")} onClick={(e) => { e.stopPropagation(); setOpen(true); }} style={{
        position: "absolute", top: 10, left: 10, zIndex: 3, display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px",
        borderRadius: 17, border: "none", cursor: "pointer", fontSize: 13, background: c("glass"), color: c("ink"),
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)", ...style,
      }}>
        <Icon d={QR_ICON} size={16} width={1.6} />
        <span>{t("qr", "button")}</span>
      </button>
      {open ? createPortal(
        <div role="dialog" onClick={() => setOpen(false)} style={{
          position: "absolute", inset: 0, zIndex: 50, fontFamily: c("font-body"), display: "flex", alignItems: "center", justifyContent: "center", background: c("veil"),
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: 440, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 18, padding: "26px 26px 24px",
            borderRadius: 28, background: c("surface"), border: `1px solid ${c("line-strong")}`, color: c("ink"), textAlign: "center",
            boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ ...SERIF, fontSize: 26, lineHeight: 1.15 }}>{name}</span>
              <span style={{ fontSize: 13, color: c("ink-muted"), lineHeight: 1.4 }}>{t("qr", "scan")}</span>
            </div>
            {/* Photo and QR at the same size, side by side. */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <img src={url} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", objectPosition: "50% 25%", borderRadius: 18, display: "block", border: `1px solid ${c("line")}` }} />
              <div style={{ aspectRatio: "1 / 1", boxSizing: "border-box", padding: 12, borderRadius: 18, background: "#FFFFFF", display: "flex" }}>
                <QRCodeSVG value={photoDownloadUrl(locale, url, file)} size={256} level="M" style={{ width: "100%", height: "100%" }} />
              </div>
            </div>
            <OutlineButton icon={ICON.close} onClick={() => setOpen(false)} style={{ height: 52 }}>{t("common", "close")}</OutlineButton>
          </div>
        </div>,
        document.getElementById("mm-stage") ?? document.body,
      ) : null}
    </>
  );
}
