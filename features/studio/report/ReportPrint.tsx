"use client";

import { useEffect, useRef, useState } from "react";
import { studioApi, type PublicReport } from "../api";
import { c } from "../ui";
import StudioReport from "./StudioReport";

/** PDF page width in CSS px (the kiosk width at ×2 zoom of the 540 px design). */
const PAGE_WIDTH = 540;
const ZOOM = 2;
/** Chrome's PDF page-size ceiling is 200in; taller sections fall back to normal breaks. */
const MAX_PAGE_HEIGHT = 19000;

declare global {
  interface Window {
    /** Set once every page is measured; the PDF route waits for it. */
    __reportReady?: boolean;
  }
}

async function imagesSettled(root: HTMLElement) {
  await document.fonts.ready;
  // Colour-harmony canvases draw asynchronously; wait until each one is painted (max 45 s).
  const until = Date.now() + 45_000;
  while (root.querySelector("canvas[data-report-canvas]:not([data-ready])") && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 100));
  }
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map((img) =>
      img.complete ? null : new Promise((resolve) => {
        img.addEventListener("load", resolve);
        img.addEventListener("error", resolve);
      })
    )
  );
}

/** One named @page per `[data-report-page]`, sized to its content: each section is one PDF page, never split. */
function paginate(root: HTMLElement): string {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-report-page]"))
    .map((el, i) => {
      const h = Math.min(MAX_PAGE_HEIGHT, Math.ceil(el.getBoundingClientRect().height) + 2);
      el.style.setProperty("page", `report-${i}`);
      return `@page report-${i} { size: ${PAGE_WIDTH * ZOOM}px ${h}px; margin: 0; }`;
    })
    .join("\n");
}

export default function ReportPrint({ token }: { token: string }) {
  const [report, setReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState(false);
  const [pageCss, setPageCss] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    studioApi.publicLook(token).then(setReport).catch(() => setError(true));
  }, [token]);

  useEffect(() => {
    const el = root.current;
    if (!report || !el) return;
    let cancelled = false;
    void imagesSettled(el).then(() => {
      if (cancelled) return;
      setPageCss(paginate(el));
      requestAnimationFrame(() => (window.__reportReady = true));
    });
    return () => { cancelled = true; };
  }, [report]);

  if (error) {
    if (typeof window !== "undefined") window.__reportReady = true;
    return <p style={{ padding: 40 }}>Report not found or the link has expired.</p>;
  }
  if (!report) return null;
  return (
    <div ref={root} style={{ width: PAGE_WIDTH, zoom: ZOOM, background: c("background") }}>
      <style>{`@page { margin: 0; } html, body { margin: 0; background: var(--mm-background); } ${pageCss}`}</style>
      <StudioReport report={report} variant="print" />
    </div>
  );
}
