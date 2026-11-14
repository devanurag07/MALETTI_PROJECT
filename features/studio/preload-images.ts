/**
 * Warm the browser cache with the option pictures (hair colours, haircuts, beards) while the customer is still on the
 * welcome / camera / profile screens. Without this the Custom colour grid and the style pages opened with blank tiles:
 * 24+ images requested at once from the server on first view, only showing after a reload (from cache).
 * Runs once per page load, a few at a time, in idle time.
 */
import { FLUX_SHADES } from "./data/haircolor";
import { STYLE_IMAGES } from "./theme/styleImages";
import type { Results, StudioConfig } from "./api";

const done = new Set<string>();

export function preloadOptionImages(config: StudioConfig | null) {
  preloadUrls([
    ...FLUX_SHADES.map((x) => x.image_url),
    ...Object.values(STYLE_IMAGES).flatMap((m) => Object.values(m)),
    ...Object.values(config?.catalog ?? {}).flat().map((x) => x.image_url),
  ]);
}

/**
 * As soon as the (background) analysis is back: the pictures of what it recommends — the hair-colour model photos
 * (front + back, the largest local images) and each recommended option's picture — so the service pages open filled.
 * Goes ahead of the general preload.
 */
export function preloadResultImages(r: Results) {
  const g = r.session?.gender === "man" ? "man" : "woman";
  const urls: (string | null | undefined)[] = [];
  for (const tab of r.tabs) {
    for (const [kind, recs] of Object.entries(tab.recommendations ?? {})) {
      for (const x of recs) {
        if (kind === "hair_shade") urls.push(`/studio/recommended/colour/${g}/${x.key}-front.jpg`, `/studio/recommended/colour/${g}/${x.key}-back.jpg`);
        urls.push(x.image_url, STYLE_IMAGES[kind]?.[x.key]);
      }
    }
  }
  preloadUrls(urls, true);
}

const queue: string[] = [];
let lanes = 0;
const LANES = 6; // the browser's per-host connection limit

function preloadUrls(list: (string | null | undefined)[], first = false) {
  if (typeof window === "undefined") return;
  const fresh = [...new Set(list.filter((u): u is string => !!u && !done.has(u)))];
  fresh.forEach((u) => done.add(u));
  if (first) queue.unshift(...fresh); else queue.push(...fresh);
  while (lanes < LANES && queue.length) { lanes++; next(); }
}

function next() {
  const u = queue.shift();
  if (!u) { lanes--; return; }
  const img = new Image();
  img.decoding = "async";
  img.onload = img.onerror = () => next();
  img.src = u;
}
