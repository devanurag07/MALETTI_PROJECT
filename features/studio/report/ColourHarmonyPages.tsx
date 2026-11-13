"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { AnalysisTab, I18n } from "../api";
import { c, SERIF } from "../ui";

/**
 * The colour-harmony report pages (content from the color-harmony app's report), drawn in the studio theme:
 *   1. your colour season — photo, face shape / undertone / eye colour / hair colour, 12-season wheel
 *   2. your undertone — what it means, vein + jewellery colours, 10 wardrobe colours
 *   3. suggested colour combinations — 5 × dominant + 3 accents
 * Every page is a `[data-report-page]` (one PDF page each). Colours come from the `--mm-*` theme tokens.
 */

type Colour = { name: string; hex: string };
type Combo = { dominant: string; accents: string[] };
type Undertone = "warm" | "cool" | "neutral";

export type ColourHarmonyData = {
  seasonKey: string;
  seasonName: string;
  photo: string | null;
  faceShape: string;
  undertone: Undertone;
  undertoneLabel: string;
  eyeColour: string;
  hairColour: string;
  wardrobe: Colour[];
  combinations: Combo[];
};

/** Veins + jewellery per undertone (from the color-harmony undertone templates). */
const UNDERTONE_SWATCH: Record<Undertone, { veins: [string, string][]; metals: [string, string][] }> = {
  warm: { veins: [["green", "#6A9A2A"], ["olive", "#6B6B3A"]], metals: [["gold", "#B48A12"], ["bronze", "#A8641E"]] },
  cool: { veins: [["blue", "#3D6BC4"], ["purple", "#7B4FA8"]], metals: [["silver", "#8E9298"], ["platinum", "#A9A9A4"]] },
  neutral: { veins: [["blue", "#3D6BC4"], ["green", "#6A9A2A"]], metals: [["gold", "#B48A12"], ["silver", "#8E9298"]] },
};

/** How many pages there are (the combinations page only when there are combinations). */
export const harmonyPageCount = (d: ColourHarmonyData) => (d.combinations.length ? 3 : 2);

export function colourHarmonyData(opts: {
  colour: AnalysisTab; face?: AnalysisTab; photo: string | null; tx: (v?: I18n | null) => string;
}): ColourHarmonyData {
  const { colour, face, tx } = opts;
  const m = colour.metrics as Record<string, unknown>;
  const palette = ((colour.label?.attributes?.palette as string[] | undefined) ?? []).filter(Boolean);
  const clothes: Colour[] = (colour.recommendations.clothing_colour ?? [])
    .filter((x) => x.hex).map((x) => ({ name: tx(x.name), hex: x.hex! }));
  const ai = Array.isArray(m.wardrobe) ? (m.wardrobe as Colour[]).filter((x) => x?.hex) : [];
  const seen = new Set<string>();
  const wardrobe = [...ai, ...clothes, ...palette.map((h) => ({ name: h.toUpperCase(), hex: h }))]
    .filter((x) => !seen.has(x.hex.toLowerCase()) && seen.add(x.hex.toLowerCase())).slice(0, 10);

  let combinations = Array.isArray(m.combinations) ? (m.combinations as Combo[]).filter((x) => x?.dominant) : [];
  if (!combinations.length && wardrobe.length) {
    const hexes = wardrobe.map((x) => x.hex);
    combinations = Array.from({ length: 5 }, (_, i) => ({
      dominant: hexes[i % hexes.length], accents: [1, 2, 3].map((k) => hexes[(i + k * 2) % hexes.length]),
    }));
  }
  const u = String(m.undertone ?? colour.label?.attributes?.undertone ?? "neutral").toLowerCase();
  const undertone: Undertone = u.includes("warm") ? "warm" : u.includes("cool") ? "cool" : "neutral";
  const cap = (s: unknown) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, " ") : "–");
  return {
    seasonKey: colour.label?.key ?? "",
    seasonName: tx(colour.label?.name),
    photo: opts.photo,
    faceShape: face ? tx(face.label?.name) || "–" : "–",
    undertone,
    undertoneLabel: cap(m.undertone ?? undertone),
    eyeColour: cap(m.eye_colour),
    hairColour: cap(m.hair_colour),
    wardrobe,
    combinations: combinations.slice(0, 5),
  };
}

/** `only`: show just that page (0 season, 1 undertone + wardrobe, 2 combinations) — the mirror's Armocromia steps. */
export default function ColourHarmonyPages({ data, pad, only }: { data: ColourHarmonyData; pad: number; only?: number }) {
  const show = (i: number) => only === undefined || only === i;
  const tr = useTranslations("studio.report.harmony");
  const u = UNDERTONE_SWATCH[data.undertone];
  const page = (children: ReactNode) => (
    <section data-report-page style={{
      display: "flex", flexDirection: "column", gap: 18, padding: pad || 22,
      ...(pad ? { background: c("background") } : { borderRadius: 18, background: c("surface"), border: `1px solid ${c("line")}` }),
    }}>{children}</section>
  );
  const heading = (eyebrow: string, title: string, lines?: string[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 14, borderBottom: `1px solid ${c("divider")}` }}>
      <span style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: c("accent") }}>{eyebrow}</span>
      <h2 style={{ margin: 0, ...SERIF, fontSize: 34, lineHeight: 1.1 }}>{title}</h2>
      {lines?.map((l) => <p key={l} style={{ margin: 0, fontSize: 16, lineHeight: 1.45, color: c("ink-muted") }}>{l}</p>)}
    </div>
  );

  return (
    <>
      {/* ----------------------------------------------------------- 1. season */}
      {show(0) && page(
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>{heading(tr("seasonEyebrow"), data.seasonName)}</div>
            <div style={{
              flex: "0 0 auto", width: 112, height: 112, borderRadius: 56, overflow: "hidden", background: c("photo"),
              outline: `1.5px solid ${c("accent")}`, outlineOffset: 4,
            }}>
              {data.photo ? <img src={data.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {[
              [tr("faceShape"), data.faceShape], [tr("undertone"), data.undertoneLabel],
              [tr("eyeColour"), data.eyeColour], [tr("hairColour"), data.hairColour],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: "10px 14px", borderRadius: 14, background: c("surface-raised"), border: `1px solid ${c("line")}` }}>
                <div style={{ fontSize: 14, color: c("ink-muted") }}>{label}</div>
                <div style={{ ...SERIF, fontSize: 22 }}>{value}</div>
              </div>
            ))}
          </div>
          {/* Season wheel artwork from the color-harmony report (cropped per season, current season highlighted). */}
          <div style={{ borderRadius: 16, overflow: "hidden", background: "#fff", aspectRatio: "700 / 485" }}>
            <img src={`/studio/report/seasons/${data.seasonKey}.jpg`} alt={data.seasonName}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </>
      )}

      {/* ----------------------------------------------------------- 2. undertone + wardrobe */}
      {show(1) && page(
        <>
          {heading(tr("undertoneEyebrow"), tr(`${data.undertone}.title`), [1, 2, 3].map((i) => tr(`${data.undertone}.line${i}`)))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {([[tr("veins"), u.veins], [tr("jewellery"), u.metals]] as [string, [string, string][]][]).map(([title, list]) => (
              <div key={title} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 15, color: c("ink-muted") }}>{title}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {list.map(([k, h]) => (
                    <span key={k} style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: h, color: "#fff", fontSize: 15, textAlign: "center", textShadow: "0 1px 2px rgba(0,0,0,.35)" }}>
                      {tr(`tones.${k}`)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ ...SERIF, fontSize: 22 }}>{tr("wardrobe")}</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
              {data.wardrobe.map((w) => (
                <div key={w.hex} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span style={{ aspectRatio: "2 / 1", borderRadius: 10, background: w.hex, border: `1px solid ${c("line")}` }} />
                  <span style={{ fontSize: 14, lineHeight: 1.2, textAlign: "center" }}>{w.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ----------------------------------------------------------- 3. combinations */}
      {show(2) && data.combinations.length ? page(
        <>
          {heading(tr("combosEyebrow"), tr("combos"))}
          {data.combinations.map((combo, i) => {
            const a = combo.accents.length ? combo.accents : [combo.dominant];
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", borderRadius: 14, overflow: "hidden", border: `1px solid ${c("line")}` }}>
                <Cell hex={combo.dominant} height={56} text={tr("dominant")} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {[a[0], a[1] ?? a[0], a[2] ?? a[1] ?? a[0]].map((h, k) => <Cell key={k} hex={h} height={44} text="" center />)}
                </div>
              </div>
            );
          })}
        </>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------ parts

function Cell({ hex: h, height, text, right, center }: { hex: string; height: number; text: string; right?: string; center?: boolean }) {
  return (
    <div style={{
      height, background: h, color: contrast(h), display: "flex", alignItems: "flex-end",
      justifyContent: center ? "center" : "space-between", padding: "0 12px 8px", fontSize: 14,
    }}>
      <span>{text}</span>
      {right ? <span>{right}</span> : null}
    </div>
  );
}

const hex = (h: string) => (h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`).toLowerCase();

function contrast(h: string) {
  const v = hex(h).slice(1);
  const full = v.length === 3 ? v.split("").map((x) => x + x).join("") : v;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  if ([r, g, b].some(Number.isNaN)) return "#fff";
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#1a1a1a" : "#fff";
}
