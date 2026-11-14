"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { AnalysisTab, CatalogItem, I18n, PublicReport, TryOn } from "../api";
import { theme } from "../theme";
import type { SkinServiceCard } from "../context/StudioContext";
import { fluxShade } from "../data/haircolor";
import { c, Diamond, SERIF } from "../ui";
import { markingsOf, SkinMapLegend, SkinMapPhoto, SKIN_METRICS } from "../components/SkinMap";
import ColourHarmonyPages, { colourHarmonyData } from "./ColourHarmonyPages";

/**
 * Consolidated session report (like beauty_platform's SessionReport): cover with before/after, then one page per
 * analysis (skin, face, colour harmony) with what was chosen, then the products. Used on the mirror (/report),
 * and by the print page that the PDF route renders. Every top-level section is a `[data-report-page]` = one PDF page.
 */
export default function StudioReport({ report: raw, variant = "screen" }: { report: PublicReport; variant?: "screen" | "print" }) {
  const tr = useTranslations("studio");
  // Only try-ons made from this session's photo (a chain starting at source_image_url): pictures made from a
  // photo that was replaced later must never show up as "After" or "tried".
  const report = useMemo(() => {
    const kept = new Set<number>();
    for (const x of [...raw.tryons].sort((a, b) => a.id - b.id)) {
      if (x.parent_id ? kept.has(x.parent_id) : x.input_url === raw.source_image_url) kept.add(x.id);
    }
    const tryons = raw.tryons.filter((x) => kept.has(x.id));
    const final = raw.look?.final_tryon;
    const look = raw.look && final && !kept.has(final.id) ? { ...raw.look, final_tryon: null, after_url: null } : raw.look;
    return { ...raw, tryons, look };
  }, [raw]);
  const tx = (v?: I18n | null) => (v ? v[report.locale] ?? v.en ?? Object.values(v)[0] ?? "" : "");
  const look = report.look;
  const tab = (m: AnalysisTab["module"]) => report.analyses.find((a) => a.module === m && a.status === "done");
  /** Latest finished try-on of one kind (cut / colour / beard / makeup) = the customer's own picture of that step. */
  const shot = (kind: TryOn["kind"]) => [...report.tryons].reverse().find((x) => x.kind === kind && x.output_url)?.output_url ?? null;
  const before = report.source_image_url || look?.before_url;
  const after = look?.after_url || look?.final_tryon?.output_url || [...report.tryons].reverse()[0]?.output_url || null;
  const pad = variant === "print" ? 64 : 0;
  /**
   * Every finished try-on of one kind (one per picture), oldest first; the one the customer went on with is
   * marked: the look's choice for that step (same option), its latest picture.
   */
  const tried = (kind: TryOn["kind"]): TriedItem[] => {
    const field = { cut: "item", colour: "shade", beard: "beard", makeup: "look" }[kind];
    const chosenItem = { cut: look?.cut, colour: look?.hair_shade, beard: look?.beard, makeup: look?.makeup_look }[kind];
    const chosenKey = chosenItem?.key;
    const seen = new Set<string>();
    const list = report.tryons.filter((x) => x.kind === kind && x.status === "done" && x.output_url && !seen.has(x.output_url) && seen.add(x.output_url));
    // FLUX_VERSION_3 colours are sent as shade_key (not a backend catalogue key).
    const keyOf = (x: TryOn) => (x.params[field] ?? (kind === "colour" ? x.params.shade_key : undefined)) as string | undefined;
    const chosenId = [...list].reverse().find((x) => chosenKey && keyOf(x) === chosenKey)?.id;
    return list.map((x) => {
      const key = keyOf(x);
      const name = !key ? (kind === "makeup" && (x.params.lip || x.params.eye || x.params.lip_key || x.params.eye_key) ? tr("look.makeup") : tr("tryon.yourPhoto"))
        : key === chosenKey && chosenItem ? tx(chosenItem.name)
        : fluxShade(key) ? tx(fluxShade(key)!.name)
        : key.replace(/_/g, " ").replace(/^./, (ch) => ch.toUpperCase());
      return { id: x.id, src: x.output_url as string, name, chosen: x.id === chosenId };
    });
  };
  const ctx: Ctx = { tr, tx, pad };

  const skin = tab("skin");
  const face = tab("face");
  const colour = tab("colour");
  const skinProducts = (look?.products ?? []).filter((p) => p.area === "skin");
  /** Salon skin services recommended on the mirror (saved with the look in params.skin_services). */
  const skinServices = (((look?.params as Record<string, unknown> | undefined)?.skin_services as SkinServiceCard[] | undefined) ?? [])
    .filter((x) => x && x.title);
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
        {/* Before / After when there is a try-on; otherwise just the customer's photo (whose report this is). */}
        {after ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Figure src={before} label={tr("report.before")} />
            <Figure src={after} label={tr("report.after")} gold />
          </div>
        ) : before ? (
          <div style={{ width: "55%", alignSelf: "center" }}>
            <Figure src={before} label={tr("report.yourPhoto")} gold />
          </div>
        ) : null}
        <Chosen ctx={ctx} items={[
          [tr("look.cut"), look?.cut],
          [tr("look.colour"), look?.hair_shade],
          [tr("look.beard"), look?.beard],
          [tr("look.makeup"), look?.makeup_look],
        ]} />
      </Page>

      {/* ---------------------------------------------------------------- tried looks
          Only the customer's own try-on results — no catalogue / model pictures anywhere in the report. */}
      {(["cut", "colour", "beard", "makeup"] as const).some((k) => tried(k).length) ? (
        <Page ctx={ctx} eyebrow={tr("report.triedEyebrow")} title={tr("report.triedTitle")} text={tr("report.triedText")}>
          <Tried ctx={ctx} title={tr("look.cut")} items={tried("cut")} />
          <Tried ctx={ctx} title={tr("look.colour")} items={tried("colour")} />
          {report.gender === "man" ? <Tried ctx={ctx} title={tr("look.beard")} items={tried("beard")} />
            : <Tried ctx={ctx} title={tr("look.makeup")} items={tried("makeup")} />}
        </Page>
      ) : null}

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

      {/* ---------------------------------------------------------------- skin map (markings) */}
      {skin && markingsOf(skin.zones).length ? (
        <Page ctx={ctx} eyebrow={tr("results.tabSkin")} title={tr("skinMap.title")} text={tr("skinMap.desc")}>
          <SkinMapPhoto src={report.source_image_url} markings={markingsOf(skin.zones)} size="100%" />
          <SkinMapLegend metrics={skin.metrics} markings={markingsOf(skin.zones)} fontSize={16}
            label={(k) => tr(`skin.metric_${k}`)} areasLabel={(n) => tr("skinMap.areas", { n })} />
        </Page>
      ) : null}

      {/* ---------------------------------------------------------------- salon skin services (with their images) */}
      {skinServices.length ? (
        <Page ctx={ctx} eyebrow={tr("results.tabSkin")} title={tr("skinServices.title")} text={tr("skinServices.hint")}>
          <Services ctx={ctx} items={skinServices} />
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
            {look?.cut && shot("cut") ? <Pick ctx={ctx} label={tr("look.cut")} item={look.cut} image={shot("cut")} /> : null}
            {look?.beard && shot("beard") ? <Pick ctx={ctx} label={tr("look.beard")} item={look.beard} image={shot("beard")} /> : null}
          </div>
        </Page>
      ) : null}

      {/* ---------------------------------------------------------------- colour harmony */}
      {colour ? (
        <Page ctx={ctx} eyebrow={tr("results.tabColour")} title={tx(colour.label?.name)} text={tx(colour.summary) || tx(colour.label?.desc)}>
          <Swatches title={tr("report.palette")} hexes={((colour.label?.attributes?.palette as string[] | undefined) ?? []).slice(0, 8)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {look?.hair_shade && shot("colour") ? (
              <Pick ctx={ctx} label={tr("look.colour")} item={look.hair_shade} sub={look.technique ? tx(look.technique.name) : undefined}
                image={shot("colour")} />
            ) : null}
            {look?.makeup_look && shot("makeup") ? <Pick ctx={ctx} label={tr("look.makeup")} item={look.makeup_look} image={shot("makeup")} /> : null}
          </div>
          <Swatches title={tr("colour.dressTitle")} hexes={(colour.recommendations.clothing_colour ?? []).map((x) => x.hex).filter(Boolean) as string[]} />
        </Page>
      ) : null}

      {harmony ? <ColourHarmonyPages data={harmony} pad={pad} /> : null}

    </div>
  );
}

// ------------------------------------------------------------------------------------------ helpers

type TriedItem = { id: number; src: string; name: string; chosen: boolean };

/** All pictures tried for one step; the chosen one has the gold frame and a "Chosen" tag. */
function Tried({ ctx, title, items }: { ctx: Ctx; title: string; items: TriedItem[] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ ...SERIF, fontSize: 22 }}>{title}</span>
        <span style={{ fontSize: 13, color: c("ink-muted") }}>{ctx.tr("report.triedCount", { n: items.length })}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {items.map((x) => (
          <div key={x.id} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <div style={{
              position: "relative", aspectRatio: "4 / 5", borderRadius: 14, overflow: "hidden", background: c("photo"),
              outline: x.chosen ? `2px solid ${c("accent")}` : `1px solid ${c("line")}`, outlineOffset: x.chosen ? 3 : 0,
            }}>
              <img src={x.src} alt={x.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {x.chosen ? (
                <span style={{ position: "absolute", left: 6, top: 6, fontSize: 11, fontWeight: 500, color: c("on-dark"), background: c("accent"), borderRadius: 8, padding: "2px 8px" }}>
                  {ctx.tr("report.chosen")}
                </span>
              ) : null}
            </div>
            <span style={{ fontSize: 13, textAlign: "center", color: x.chosen ? c("accent") : c("ink"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Ctx = { tr: ReturnType<typeof useTranslations>; tx: (v?: I18n | null) => string; pad: number };
type Product = CatalogItem & { reason?: I18n; product?: { brand?: string; price?: string | number; currency?: string } | null };


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

/** Recommended salon skin services: picture, name, duration · price, why. */
function Services({ ctx, items }: { ctx: Ctx; items: SkinServiceCard[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((x, i) => (
        <div key={`${x.title}-${i}`} style={{ ...card, display: "flex", gap: 14, padding: 10, alignItems: "center" }}>
          <div style={{ width: 84, height: 84, flex: "0 0 auto", borderRadius: 12, overflow: "hidden", background: c("photo") }}>
            {x.image ? <img src={x.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
          </div>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ ...SERIF, fontSize: 20, lineHeight: 1.2 }}>{x.title}</span>
            {x.duration || x.price != null ? (
              <span style={{ fontSize: 14, color: c("accent") }}>
                {[x.duration ? `${x.duration} ${ctx.tr("skinServices.min")}` : "", x.price != null ? String(x.price) : ""].filter(Boolean).join(" · ")}
              </span>
            ) : null}
            {x.reason ? <span style={{ fontSize: 14, lineHeight: 1.4, color: c("ink-muted") }}>{x.reason}</span> : null}
          </div>
        </div>
      ))}
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
                {p.product.brand}{p.product.price != null ? ` · ${p.product.price}` : ""}
              </span>
            ) : null}
            {ctx.tx(p.reason) || ctx.tx(p.sub) ? <span style={{ fontSize: 14, color: c("ink-muted") }}>{ctx.tx(p.reason) || ctx.tx(p.sub)}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
