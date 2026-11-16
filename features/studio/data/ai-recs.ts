/**
 * Hair colours + make-up the AI picked itself (Maletti armocromia prompt). The backend keeps them in the colour
 * analysis' metrics (`hair_recs`: FLUX colour + technique + reason, `makeup_recs`: lipstick / blush / eyeshadow FLUX
 * keys + look name + reason), not as catalogue rows. Here they become the tab's hair_shade / makeup_look
 * recommendations, so every screen (journey, try-on, results, report) shows them like any recommendation.
 */
import type { CatalogItem, Recommendation } from "../api";
import { fluxShade } from "./haircolor";
import { mixKey, mixLook, registerMixLook } from "./makeup";

type I18n = Record<string, string>;
type HairRec = { shade: string; technique?: string | null; reason?: I18n };
type MakeupRec = { name?: I18n; lip: string; eye: string; blush: string; reason?: I18n };

const rec = (item: CatalogItem, i: number, reason: I18n | undefined, attributes: Record<string, unknown> = {}): Recommendation => ({
  ...item, attributes: { ...item.attributes, ...attributes }, rank: i, is_best: i === 0, reason: reason ?? {},
});

function fill(tab: Record<string, unknown>) {
  const metrics = (tab.metrics ?? {}) as Record<string, unknown>;
  const recs = ((tab.recommendations ??= {}) as Record<string, Recommendation[]>);
  const hair = Array.isArray(metrics.hair_recs) ? (metrics.hair_recs as HairRec[]) : [];
  if (hair.length) {
    recs.hair_shade = hair.flatMap((h, i) => {
      const shade = fluxShade(h.shade);
      return shade ? [rec(shade, i, h.reason, { technique: h.technique ?? null })] : [];
    });
  }
  const looks = Array.isArray(metrics.makeup_recs) ? (metrics.makeup_recs as MakeupRec[]) : [];
  if (looks.length) {
    recs.makeup_look = looks.flatMap((m, i) => {
      const base = mixLook(mixKey(m.lip, m.eye, m.blush));
      if (!base) return [];
      // The AI's look name; its one-line reason is the short text under it.
      const item: CatalogItem = { ...base, name: m.name && Object.keys(m.name).length ? m.name : base.name, sub: m.reason ?? {} };
      registerMixLook(item);
      return [rec(item, i, m.reason)];
    });
  }
}

/** Fill the AI picks into every colour analysis in an API payload (results, public report) — deep, in place. */
export function applyAiRecs<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object" || seen.has(value as object)) return value;
  seen.add(value as object);
  if (Array.isArray(value)) { value.forEach((v) => applyAiRecs(v, seen)); return value; }
  const o = value as Record<string, unknown>;
  if (o.module === "colour" && o.metrics && typeof o.metrics === "object") fill(o);
  for (const v of Object.values(o)) applyAiRecs(v, seen);
  return value;
}
