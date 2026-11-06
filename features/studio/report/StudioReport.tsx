"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { AnalysisTab, CatalogItem, I18n, PublicReport, TryOn } from "../api";
import { theme } from "../theme";
import { styleImage } from "../theme/styleImages";
import { c, Diamond, SERIF } from "../ui";
import ColourHarmonyPages, { colourHarmonyData } from "./ColourHarmonyPages";

/**
 * Consolidated session report (like beauty_platform's SessionReport): cover with before/after, then one page per
 * analysis (skin, face, colour harmony) with what was chosen, then the products. Used on the mirror (/report),
 * and by the print page that the PDF route renders. Every top-level section is a `[data-report-page]` = one PDF page.
 */
export default function StudioReport({ report, variant = "screen" }: { report: PublicReport; variant?: "screen" | "print" }) {
  const tr = useTranslations("studio");
  const tx = (v?: I18n | null) => (v ? v[report.locale] ?? v.en ?? Object.values(v)[0] ?? "" : "");
  const look = report.look;
  const tab = (m: AnalysisTab["module"]) => report.analyses.find((a) => a.module === m && a.status === "done");
  /** Latest finished try-on of one kind (cut / colour / beard / makeup) = the customer's own picture of that step. */
  const shot = (kind: TryOn["kind"]) => [...report.tryons].reverse().find((x) => x.kind === kind && x.output_url)?.output_url ?? null;
  const before = look?.before_url || report.source_image_url;
  const after = look?.after_url || look?.final_tryon?.output_url || [...report.tryons].reverse()[0]?.output_url || null;
  const pad = variant === "print" ? 64 : 0;
  const ctx: Ctx = { tr, tx, pad };

  const skin = tab("skin");
  const face = tab("face");
  const colour = tab("colour");
  const skinProducts = (look?.products ?? []).filter((p) => p.area === "skin");
  const hairProducts = (look?.products ?? []).filter((p) => p.area === "hair");
  const date = new Date(report.created_at ?? report.started_at ?? Date.now()).toLocaleDateString(report.locale, {
    day: "numeric", month: "long", year: "numeric",
  });

  // Colour-harmony report pages (from the color-harmony app): season, undertone + wardrobe, combinations, brands.
  const harmony = useMemo(
    () => (colour ? colourHarmonyData({
      colour, face, photo: report.source_image_url, tx,
    }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: variant === "print" ? 0 : 16, color: c("ink"), fontFamily: c("font-body") }}>
      {/* ---------------------------------------------------------------- cover */}
      <Page ctx={ctx}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src={report.client.logo_url || theme.brand.logo} alt={report.client.name} style={{ height: 34 }} />
          <span style={{ fontSize: 14, color: c("ink-muted") }}>{date}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: c("accent") }}>{tr("report.eyebrow")}</span>
          <h1 style={{ margin: 0, ...SERIF, fontSize: 42, lineHeight: 1.05 }}>{tr("report.title")}</h1>
          {look?.headline && tx(look.headline) ? <p style={{ margin: 0, fontSize: 16, color: c("ink-muted") }}>{tx(look.headline)}</p> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: after ? "1fr 1fr" : "1fr", gap: 12 }}>
          <Figure src={before} label={tr("report.before")} />
          {after ? <Figure src={after} label={tr("report.after")} gold /> : null}
        </div>
        <Chosen ctx={ctx} items={[
          [tr("look.cut"), look?.cut],
          [tr("look.colour"), look?.hair_shade],
          [tr("look.beard"), look?.beard],
          [tr("look.makeup"), look?.makeup_look],
        ]} />
      </Page>

      {/* ---------------------------------------------------------------- skin */}
      {skin ? (
        <Page ctx={ctx} eyebrow={tr("results.tabSkin")} title={tx(skin.label?.name)} text={tx(skin.summary) || tx(skin.label?.desc)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 14, color: c("ink-muted") }}>{tr("skin.metricScale")}</span>
            {SKIN_METRICS.filter((k) => k in skin.metrics).map((k) => {
              const n = Math.max(0, Math.min(100, Number(skin.metrics[k] ?? 0)));
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 150, fontSize: 16 }}>{tr(`skin.metric_${k}`)}</span>
                  <span style={{ flex: "1 1 auto", height: 6, borderRadius: 3, background: c("track"), overflow: "hidden" }}>
                    <span style={{ display: "block", height: 6, width: `${n}%`, borderRadius: 3, background: c(n >= 70 ? "metric-cool" : n >= 40 ? "metric-warm" : "metric-neutral") }} />
                  </span>
                  <span style={{ width: 34, textAlign: "right", ...SERIF, fontSize: 22 }}>{n}</span>
                </div>
              );
            })}
          </div>
          <Products ctx={ctx} title={tr("look.productsTitle")} items={skinProducts} />
        </Page>
      ) : null}

      {/* ---------------------------------------------------------------- face */}
      {face ? (
        <Page ctx={ctx} eyebrow={tr("results.tabFace")} title={tx(face.label?.name)} text={tx(face.summary) || tx(face.label?.desc)}>
          <Stats items={[
            [tr("face.ratio"), face.metrics.ratio != null ? Number(face.metrics.ratio).toFixed(1) : "–"],
            [tr("face.cheek"), value(tr, face.metrics.cheekbones)],
            [tr("face.jaw"), value(tr, face.metrics.jawline)],
          ]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {look?.cut ? <Pick ctx={ctx} label={tr("look.cut")} item={look.cut} image={shot("cut") || styleImage("haircut", look.cut.key, look.cut.image_url)} /> : null}
            {look?.beard ? <Pick ctx={ctx} label={tr("look.beard")} item={look.beard} image={shot("beard") || styleImage("beard_style", look.beard.key, look.beard.image_url)} /> : null}
          </div>
          <Suggested ctx={ctx} title={tr("face.cutsTitle")} items={face.recommendations.haircut ?? []} kind="haircut" />
          {report.gender === "man" ? <Suggested ctx={ctx} title={tr("face.beardTitle")} items={face.recommendations.beard_style ?? []} kind="beard_style" /> : null}
        </Page>
      ) : null}

      {/* ---------------------------------------------------------------- colour harmony */}
      {colour ? (
        <Page ctx={ctx} eyebrow={tr("results.tabColour")} title={tx(colour.label?.name)} text={tx(colour.summary) || tx(colour.label?.desc)}>
          <Swatches title={tr("report.palette")} hexes={((colour.label?.attributes?.palette as string[] | undefined) ?? []).slice(0, 8)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {look?.hair_shade ? (
              <Pick ctx={ctx} label={tr("look.colour")} item={look.hair_shade} sub={look.technique ? tx(look.technique.name) : undefined}
                image={shot("colour") || styleImage("hair_shade", look.hair_shade.key, look.hair_shade.image_url)} />
            ) : null}
            {look?.makeup_look ? <Pick ctx={ctx} label={tr("look.makeup")} item={look.makeup_look} image={shot("makeup")} /> : null}
          </div>
          <Suggested ctx={ctx} title={tr("face.colourTitle")} items={colour.recommendations.hair_shade ?? []} kind="hair_shade" wide />
          <Swatches title={tr("colour.dressTitle")} hexes={(colour.recommendations.clothing_colour ?? []).map((x) => x.hex).filter(Boolean) as string[]} />
        </Page>
      ) : null}

      {harmony ? <ColourHarmonyPages data={harmony} pad={pad} /> : null}

      {/* ---------------------------------------------------------------- hair products */}
      {hairProducts.length ? (
        <Page ctx={ctx} eyebrow={tr("report.homeCare")} title={tr("look.hairProductsTitle")}>
          <Products ctx={ctx} items={hairProducts} />
        </Page>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ helpers

type Ctx = { tr: ReturnType<typeof useTranslations>; tx: (v?: I18n | null) => string; pad: number };
type Product = CatalogItem & { reason?: I18n; product?: { brand?: string; price?: string | number; currency?: string } | null };

const SKIN_METRICS = ["hydration", "sebum", "pores", "redness", "spots"];

const value = (tr: Ctx["tr"], x: unknown) => {
  if (x == null) return "–";
  const s = tr(`face.values.${x}`);
  return s.startsWith("studio.") ? String(x) : s;
};

const card: CSSProperties = { borderRadius: 18, background: c("surface"), border: `1px solid ${c("line")}` };

function Page({ ctx, eyebrow, title, text, children }: { ctx: Ctx; eyebrow?: string; title?: string; text?: string; children: ReactNode }) {
  return (
    <section data-report-page style={{
      display: "flex", flexDirection: "column", gap: 18, padding: ctx.pad || 22,
      ...(ctx.pad ? { background: c("background") } : card),
    }}>
      {title ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 14, borderBottom: `1px solid ${c("divider")}` }}>
          {eyebrow ? <span style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: c("accent") }}>{eyebrow}</span> : null}
          <h2 style={{ margin: 0, ...SERIF, fontSize: 34, lineHeight: 1.1 }}>{title}</h2>
          {text ? <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45, color: c("ink-muted") }}>{text}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Figure({ src, label, gold }: { src: string | null | undefined; label: string; gold?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{
        aspectRatio: "4 / 5", borderRadius: "140px 140px 16px 16px", overflow: "hidden", background: c("photo"),
        outline: gold ? `1.5px solid ${c("accent")}` : undefined, outlineOffset: 4,
      }}>
        {src ? <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
      </div>
      <span style={{ textAlign: "center", fontSize: 15, color: gold ? c("accent") : c("ink-muted") }}>{label}</span>
    </div>
  );
}

function Chosen({ ctx, items }: { ctx: Ctx; items: [string, CatalogItem | null | undefined][] }) {
  const rows = items.filter(([, i]) => i);
  if (!rows.length) return null;
  return (
    <div style={{ ...card, padding: "6px 16px" }}>
      {rows.map(([label, i], n) => (
        <div key={label} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
          borderTop: n ? `1px solid ${c("divider")}` : undefined, fontSize: 17,
        }}>
          <Diamond size={10} color={i!.hex ?? c("accent")} />
          <span style={{ width: 120, fontSize: 15, color: c("ink-muted") }}>{label}</span>
          <span>{ctx.tx(i!.name)}</span>
        </div>
      ))}
    </div>
  );
}

function Stats({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 10 }}>
      {items.map(([label, v]) => (
        <div key={label} style={{ ...card, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 14, color: c("ink-muted") }}>{label}</span>
          <span style={{ ...SERIF, fontSize: 24 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function Pick({ ctx, label, item, image, sub }: { ctx: Ctx; label: string; item: CatalogItem; image: string | null; sub?: string }) {
  return (
    <div style={{ ...card, padding: 8, display: "flex", flexDirection: "column", gap: 8, border: `1.5px solid ${c("accent")}` }}>
      <div style={{ aspectRatio: "1 / 1", borderRadius: 12, overflow: "hidden", background: c("photo") }}>
        {image ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%", display: "block" }} /> : null}
      </div>
      <div style={{ padding: "0 6px 4px", display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase", color: c("accent") }}>{ctx.tr("report.chosen")} · {label}</span>
        <span style={{ fontSize: 18 }}>{ctx.tx(item.name)}</span>
        {sub || ctx.tx(item.sub) ? <span style={{ fontSize: 14, color: c("ink-muted") }}>{sub || ctx.tx(item.sub)}</span> : null}
      </div>
    </div>
  );
}

function Suggested({ ctx, title, items, kind, wide }: { ctx: Ctx; title: string; items: CatalogItem[]; kind: string; wide?: boolean }) {
  const list = items.slice(0, 3);
  if (!list.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ ...SERIF, fontSize: 22 }}>{title}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {list.map((i) => {
          const img = styleImage(kind, i.key, i.image_url);
          return (
            <div key={i.key} style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
              <div style={{ aspectRatio: wide ? "2 / 1" : "4 / 5", borderRadius: 10, overflow: "hidden", background: i.hex || c("photo") }}>
                {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 15%", display: "block" }} /> : null}
              </div>
              <span style={{ fontSize: 14, lineHeight: 1.25, textAlign: "center", color: c("ink-muted") }}>{ctx.tx(i.name)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Swatches({ title, hexes }: { title: string; hexes: string[] }) {
  if (!hexes.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 14, color: c("ink-muted") }}>{title}</span>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {hexes.map((h, i) => (
          <span key={`${h}-${i}`} style={{ width: 38, height: 38, borderRadius: 19, background: h, border: `1px solid ${c("line")}` }} />
        ))}
      </div>
    </div>
  );
}

function Products({ ctx, title, items }: { ctx: Ctx; title?: string; items: Product[] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {title ? <span style={{ ...SERIF, fontSize: 22 }}>{title}</span> : null}
      {items.map((p) => (
        <div key={p.key} style={{ ...card, display: "flex", gap: 12, padding: 10, alignItems: "center" }}>
          <div style={{ width: 56, height: 56, flex: "0 0 auto", borderRadius: 10, overflow: "hidden", background: c("photo") }}>
            {p.image_url ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
          </div>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 17 }}>{ctx.tx(p.name)}</span>
            {p.product?.brand ? (
              <span style={{ fontSize: 14, color: c("ink-muted") }}>
                {p.product.brand}{p.product.price != null ? ` · ${p.product.price} ${p.product.currency ?? ""}` : ""}
              </span>
            ) : null}
            {ctx.tx(p.reason) || ctx.tx(p.sub) ? <span style={{ fontSize: 14, color: c("ink-muted") }}>{ctx.tx(p.reason) || ctx.tx(p.sub)}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
