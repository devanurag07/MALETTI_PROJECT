/**
 * Warm the browser cache with the option pictures (hair colours, haircuts, beards) while the customer is still on the
 * welcome / camera / profile screens. Without this the Custom colour grid and the style pages opened with blank tiles:
 * 24+ images requested at once from the server on first view, only showing after a reload (from cache).
 * Runs once per page load, a few at a time, in idle time.
 */
import { FLUX_SHADES } from "./data/haircolor";
import { STYLE_IMAGES } from "./theme/styleImages";
import type { StudioConfig } from "./api";

const done = new Set<string>();

export function preloadOptionImages(config: StudioConfig | null) {
  if (typeof window === "undefined") return;
  const urls = [
    ...FLUX_SHADES.map((x) => x.image_url),
    ...Object.values(STYLE_IMAGES).flatMap((m) => Object.values(m)),
    ...Object.values(config?.catalog ?? {}).flat().map((x) => x.image_url),
  ].filter((u): u is string => !!u && !done.has(u));
  const queue = [...new Set(urls)];
  queue.forEach((u) => done.add(u));
  if (!queue.length) return;

  const idle = (fn: () => void) =>
    "requestIdleCallback" in window ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200);
  const next = () => {
    const u = queue.shift();
    if (!u) return;
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => idle(next);
    img.src = u;
  };
  // 6 parallel lanes (the browser's per-host limit).
  idle(() => { for (let i = 0; i < 6; i++) next(); });
}
