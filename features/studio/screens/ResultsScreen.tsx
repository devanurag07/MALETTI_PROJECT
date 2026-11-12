"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { studioApi, type AnalysisTab, type CatalogItem, type Recommendation, type Results } from "../api";
import { HAIR_MOD_OPTIONS, useCatalog, useStudio, type HairMods } from "../context/StudioContext";
import { styleImage } from "../theme/styleImages";
import { markingsOf, SkinMapPhoto, SKIN_METRICS } from "../components/SkinMap";
import {
  c, Card, ColorChip, ColorDot, Diamond, ErrorLine, H1, Icon, ICON, LoadingStage, Muted, OutlineButton, Photo,
  PillButton, PrimaryButton, Screen, SectionTitle, Segmented, SERIF, Spinner, Tabs, Carousel, ShadeSwatch,
} from "../ui";

type Tab = "skin" | "face" | "styles" | "colour";
const TAB_LABEL: Record<Tab, string> = { skin: "tabSkin", face: "tabFace", styles: "tabStyles", colour: "tabColour" };
const NEXT: Record<Tab, string> = { skin: "/results/face", face: "/results/styles", styles: "/results/colour", colour: "/look" };
/** "styles" is not a backend module: it shows the face analysis' cut / beard / colour suggestions. */
const MODULE: Record<Tab, string> = { skin: "skin", face: "face", styles: "face", colour: "colour" };

/** Step 4 — Results: skin → products, face → cuts/beard, colour harmony. */
export default function ResultsScreen({ tab }: { tab: Tab }) {
  const router = useRouter();
  const { t, config, session } = useStudio();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) studioApi.results(session.id).then(setResults).catch((e: Error) => setError(e.message));
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config || !session) return <LoadingStage />;
  const status = (m: string) => config.modules.find((x) => x.module === MODULE[m as Tab])?.status;
  const tabs = (Object.keys(TAB_LABEL) as Tab[])
    .filter((m) => status(m) && status(m) !== "off")
    .map((m) => ({ key: m, label: t("results", TAB_LABEL[m]), locked: status(m) === "coming_soon" }));
  const current = results?.tabs.find((x) => x.module === MODULE[tab]);

  return (
    <Screen step={4} animKey={tab}>
      <Tabs tabs={tabs} value={tab} onChange={(k) => router.replace(`/results/${k}`)} />
      {status(tab) === "coming_soon" ? (
        <div style={{ flex: 1 }} />
      ) : !results ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={36} /></div>
      ) : !current || current.status !== "done" ? (
        <div style={{ flex: 1 }}><ErrorLine message={current?.error ?? error ?? t("analysis", "failed")} /></div>
      ) : tab === "skin" ? (
        <SkinTab a={current} />
      ) : tab === "face" ? (
        <FaceInfo a={current} />
      ) : tab === "styles" ? (
        <FaceTab a={current} colour={results.tabs.find((x) => x.module === "colour" && x.status === "done")} />
      ) : (
        <ColourTab a={current} />
      )}
      {status(tab) !== "coming_soon" ? (
        <div style={{ flex: "0 0 auto", padding: "14px 34px 34px 34px" }}>
          <PrimaryButton iconRight={ICON.next} onClick={() => router.push(NEXT[tab])}>{t(tab, "cta")}</PrimaryButton>
        </div>
      ) : null}
    </Screen>
  );
}

// ------------------------------------------------------------------------------------------- skin

/** All skin scores are "higher is better" (100 = best): colour by band, not by metric. */
const metricFill = (n: number) => c(n >= 70 ? "metric-cool" : n >= 40 ? "metric-warm" : "metric-neutral");

export function SkinTab({ a, products: withProducts = true }: { a: AnalysisTab; products?: boolean }) {
  const { t, tx, photo } = useStudio();

  return (
    <>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 18, padding: "20px 34px 0 34px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 auto", minWidth: 0 }}>
          <H1 size={36}>{tx(a.label?.name)}</H1>
          <Muted>{tx(a.summary) || tx(a.label?.desc)}</Muted>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: c("ink-muted") }}>
            {a.zones.oily_t_zone ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Diamond size={12} color={c("accent-soft")} style={{ opacity: 0.85 }} />{t("skin", "oily")}
              </span>
            ) : null}
            {a.zones.dehydrated_cheeks ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "block", width: 12, height: 12, boxSizing: "border-box", borderRadius: 6, border: `2px dashed ${c("zone-dry")}` }} />
                {t("skin", "dry")}
              </span>
            ) : null}
          </div>
        </div>
        <SkinMapPhoto src={photo} markings={markingsOf(a.zones)} size={124}
          style={{ flex: "0 0 auto", outline: `1px solid ${c("accent")}`, outlineOffset: 4 }} />
      </div>

      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 10, padding: "18px 34px 0 34px" }}>
        <span style={{ fontSize: 12, color: c("ink-muted") }}>{t("skin", "metricScale")}</span>
        {/* Fixed order (Postgres JSONB reorders keys); labels from the frontend locales. */}
        {SKIN_METRICS.filter((k) => k in a.metrics).map((k) => {
          const v = a.metrics[k];
          const n = Math.max(0, Math.min(100, Number(v ?? 0)));
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 104, fontSize: 14 }}>{t("skin", `metric_${k}`)}</span>
              <span style={{ flex: "1 1 auto", display: "block", height: 6, borderRadius: 3, background: c("track"), overflow: "hidden" }}>
                <span style={{ display: "block", height: 6, width: `${n}%`, borderRadius: 3, background: metricFill(n) }} />
              </span>
              <span style={{ width: 34, textAlign: "right", ...SERIF, fontSize: 19, lineHeight: 1 }}>{n}</span>
            </div>
          );
        })}
      </div>

      {withProducts ? <SkinProducts a={a} /> : null}
    </>
  );
}

/** Skin product recommendations (salon line), with Add / Added. */
export function SkinProducts({ a }: { a: AnalysisTab }) {
  const { t, tx, look, updateLook } = useStudio();
  const products = a.recommendations.product ?? [];
  const toggle = (key: string) =>
    updateLook({ products: look.products.includes(key) ? look.products.filter((k) => k !== key) : [...look.products, key] });
  return (
      <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "20px 34px 0 34px" }}>
        <SectionTitle title={t("skin", "productsTitle")} hint={t("skin", "line")} />
        {!products.length ? <Muted size={13}>{t("skin", "noProducts")}</Muted> : null}
        {products.map((p) => {
          const on = look.products.includes(p.key);
          return (
            <div key={p.key} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "10px 12px 10px 10px", borderRadius: 20,
              background: c("surface"), border: `1px solid ${c("line")}`,
            }}>
              <span style={{ flex: "0 0 auto", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 50, height: 50, borderRadius: 14, overflow: "hidden", background: c("icon-bg"), color: c("icon-fg") }}>
                {p.product?.image || p.image_url ? <Photo src={p.product?.image || p.image_url} /> : <Icon d={ICON.bottle} size={22} width={1.5} />}
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: "1 1 auto", minWidth: 0 }}>
                <span style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx(p.name)}</span>
                <span style={{ fontSize: 13, color: c("ink-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {tx(p.reason) || tx(p.sub)}
                </span>
              </span>
              <PillButton active={on} onClick={() => toggle(p.key)}>{t("skin", on ? "added" : "add")}</PillButton>
            </div>
          );
        })}
      </div>
  );
}

// ------------------------------------------------------------------------------------------- face

/** Outline per face shape (84 × 104 box). */
const SHAPE_PATH: Record<string, string> = {
  oval: "M42 10 C60 10 72 30 72 52 C72 76 58 94 42 94 C26 94 12 76 12 52 C12 30 24 10 42 10 Z",
  round: "M42 14 C62 14 74 32 74 54 C74 76 60 92 42 92 C24 92 10 76 10 54 C10 32 22 14 42 14 Z",
  square: "M42 10 C62 10 72 22 72 50 C72 72 68 86 52 92 C46 95 38 95 32 92 C16 86 12 72 12 50 C12 22 22 10 42 10 Z",
  oblong: "M42 6 C58 6 68 24 68 50 C68 78 58 98 42 98 C26 98 16 78 16 50 C16 24 26 6 42 6 Z",
  heart: "M42 12 C64 10 74 26 72 44 C70 66 54 90 42 96 C30 90 14 66 12 44 C10 26 20 10 42 12 Z",
  diamond: "M42 8 C52 8 60 24 72 46 C66 72 54 94 42 96 C30 94 18 72 12 46 C24 24 32 8 42 8 Z",
  triangle: "M42 12 C54 12 62 24 64 40 C70 62 72 80 56 92 C48 96 36 96 28 92 C12 80 14 62 20 40 C22 24 30 12 42 12 Z",
};

/** Face tab: only the face analysis — shape, description and the three measurements, large. */
function FaceInfo({ a }: { a: AnalysisTab }) {
  const { t, tx, photo, look } = useStudio();
  const v = (x: unknown) => (x == null ? "–" : t("face", `values.${x}`).replace(/^values\./, ""));
  const metrics = [
    [t("face", "ratio"), a.metrics.ratio != null ? Number(a.metrics.ratio).toFixed(1) : "–"],
    [t("face", "cheek"), v(a.metrics.cheekbones)],
    [t("face", "jaw"), v(a.metrics.jawline)],
  ];
  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 22, padding: "22px 34px 8px 34px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <H1 size={40}>{tx(a.label?.name)}</H1>
          <Muted size={15}>{tx(a.summary) || tx(a.label?.desc)}</Muted>
        </div>
        <svg width="84" height="104" viewBox="0 0 84 104" fill="none" aria-hidden="true" style={{ flex: "0 0 auto" }}>
          <path d={SHAPE_PATH[a.label?.key ?? ""] ?? SHAPE_PATH.oval} stroke="var(--mm-ink)" strokeWidth="1.6" />
          <path d="M6 52 H78" stroke="var(--mm-accent)" strokeWidth="1.3" strokeDasharray="3 4" />
          <path d="M42 4 V100" stroke="var(--mm-accent)" strokeWidth="1.3" strokeDasharray="3 4" />
          <path d="M40 0 L48 0 L44 7 L36 7 Z" fill="var(--mm-accent)" />
          <path d="M40 97 L48 97 L44 104 L36 104 Z" fill="var(--mm-accent)" />
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{
          position: "relative", width: 260, height: 320, borderRadius: "130px 130px 18px 18px", overflow: "hidden",
          background: c("photo"), outline: `1.5px solid ${c("accent")}`, outlineOffset: 6,
        }}>
          <Photo src={look.lastTryon?.output_url || photo} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: `1px solid ${c("divider")}`, borderBottom: `1px solid ${c("divider")}` }}>
        {metrics.map(([label, value]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 0" }}>
            <span style={{ fontSize: 13, color: c("ink-muted") }}>{label}</span>
            <span style={{ ...SERIF, fontSize: 26, lineHeight: 1.1 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type FaceSub = "recommended" | "catalogue";

function FaceTab({ a, colour }: { a: AnalysisTab; colour?: AnalysisTab }) {
  const router = useRouter();
  const { t, tx, gender, look, photo, updateLook } = useStudio();
  const techniques = useCatalog("hair_technique");
  const technique = look.technique ?? techniques[0]?.key ?? null;
  const isMan = gender === "man";
  const cuts = (a.recommendations.haircut ?? []).slice(0, 2);
  const catalogue = useCatalog("haircut");
  const [cutTab, setCutTab] = useState<FaceSub>("recommended");
  const recKeys = new Set((a.recommendations.haircut ?? []).map((x) => x.key));
  const beards = (a.recommendations.beard_style ?? []).slice(0, 3);
  const beardCatalogue = useCatalog("beard_style").filter((b) => b.key !== "none");
  const recBeardKeys = new Set(beards.map((x) => x.key));
  const shades = (colour?.recommendations.hair_shade ?? []).slice(0, 4);
  const shadeCatalogue = useCatalog("hair_shade");
  const recShadeKeys = new Set((colour?.recommendations.hair_shade ?? []).map((x) => x.key));
  const [catKind, setCatKind] = useState<"cut" | "beard" | "colour" | "makeup">("cut");
  const makeupRecs = colour?.recommendations.makeup_look ?? [];
  const makeupCatalogue = useCatalog("makeup_look");
  const recMakeupKeys = new Set(makeupRecs.map((x) => x.key));
  const tryMakeup = (key: string) => router.push(`/try/makeup?look=${key}&next=/results/styles`);
  /** Service switcher, shared by both tabs: Haircut / Hair colour / Make-up (women) / Beard (men). */
  const kindOptions = [
    { key: "cut", label: t("face", "catHaircut") },
    { key: "colour", label: t("face", "catColour") },
    ...(isMan ? [{ key: "beard", label: t("face", "beardTitle") }] : [{ key: "makeup", label: t("face", "catMakeup") }]),
  ];
  const shadeDetails = useShadeDetails();
  const recList: Record<typeof catKind, { visual?: (x: Recommendation) => ReactNode; models?: (x: CatalogItem) => readonly [string, string]; details?: (x: Recommendation) => { label: string; value: ReactNode }[]; items: Recommendation[]; image: (x: CatalogItem) => string | null; focus: string; onTry: (k: string) => void; active: string | null }> = {
    cut: { items: a.recommendations.haircut ?? [], image: (x) => cutImage(x), focus: "50% 8%", onTry: (k) => tryCut(k), active: look.cut },
    colour: { items: colour?.recommendations.hair_shade ?? [], image: (x) => shadeImage(x), focus: "50% 50%", onTry: (k) => tryShade(k), active: look.hair_shade,
      models: (x) => colourModels(gender, x.key), details: (x) => shadeDetails(x) },
    beard: { items: beards, image: (x) => beardImage(x), focus: "50% 60%", onTry: (k) => tryBeard(k), active: look.beard },
    makeup: { items: makeupRecs, image: (x) => styleImage("makeup_look", x.key, x.image_url) || null, focus: "50% 40%", onTry: (k) => tryMakeup(k), active: look.makeup_look, visual: (x) => <MakeupPalette look={x} /> },
  };
  const faceTabs = [
    { key: "recommended", label: t("face", "tabRecommended") },
    { key: "catalogue", label: t("face", "tabCatalogue") },
  ];
  /** The customer's own processed picture for a style (latest done try-on), else null → the model photo is shown. */
  const processed = (kind: "cut" | "beard" | "colour", key: string) => {
    const field = kind === "cut" ? "item" : kind === "beard" ? "beard" : "shade";
    const hits = Object.entries(look.results).filter(([k, r]) => {
      if (r.status !== "done" || !k.startsWith(`${kind}|`)) return false;
      try { return JSON.parse(k.split("|")[1])[field] === key; } catch { return false; }
    });
    return hits.length ? hits[hits.length - 1][1].output_url ?? null : null;
  };
  // Tiles always show the model picture; a style the customer already tried just gets a "Tried" mark.
  const cutImage = (x: CatalogItem) => styleImage("haircut", x.key, x.image_url) || thumb;
  const beardImage = (x: CatalogItem) => styleImage("beard_style", x.key, x.image_url) || thumb;
  const shadeImage = (x: CatalogItem) => styleImage("hair_shade", x.key, x.image_url) || thumb;
  const tried = (kind: "cut" | "beard" | "colour", key: string) => (processed(kind, key) ? t("face", "tried") : undefined);
  const tryShade = (key: string) => router.push(`/try/colour?shade=${key}&next=/results/styles`);
  const grid = (children: ReactNode) => (
    // Cards at 83% width, centred.
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, width: "83.3%", margin: "0 auto" }}>{children}</div>
  );
  // One card per style, used by BOTH tabs (Recommended + Custom): same size, same badges, same marks.
  const bestCut = (a.recommendations.haircut ?? []).find((x) => x.is_best)?.key ?? cuts[0]?.key;
  const badge = (key: string, best: string | undefined, rec: Set<string>) =>
    key === best ? t("face", "best") : rec.has(key) ? t("face", "forYou") : undefined;
  const cutTile = (x: CatalogItem) => (
    <StyleCard key={x.key} compact image={cutImage(x)} tried={tried("cut", x.key)} focus="50% 8%" name={tx(x.name)} badge={badge(x.key, bestCut, recKeys)}
      active={look.cut === x.key} onClick={() => tryCut(x.key)} />
  );
  const beardTile = (x: CatalogItem) => (
    <StyleCard key={x.key} compact image={beardImage(x)} tried={tried("beard", x.key)} focus="50% 60%" name={tx(x.name)} badge={badge(x.key, beards[0]?.key, recBeardKeys)}
      active={look.beard === x.key} onClick={() => tryBeard(x.key)} />
  );
  const shadeTile = (x: CatalogItem) => (
    <ShadeSwatch key={x.key} image={shadeImage(x)} tried={tried("colour", x.key)} name={tx(x.name)} mark={recShadeKeys.has(x.key)}
      active={look.hair_shade === x.key} onClick={() => tryShade(x.key)} />
  );
  /** Hair colours: FLUX_VERSION_3 style — 4 per row, wide 2:1 swatch, name centred below. */
  const shadeGrid = (children: ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>{children}</div>
  );
  const tryCut = (key: string) => router.push(`/try/cut?item=${key}&next=/results/styles`);
  const tryBeard = (key: string) => router.push(`/try/beard?beard=${key}&next=/results/styles`);
  const thumb = look.lastTryon?.output_url || photo;
  const row = (title: string, tiles: ReactNode, hint?: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ ...SERIF, fontSize: 19, lineHeight: 1.1 }}>{title}</span>
        {hint ? <span style={{ fontSize: 12, color: c("ink-muted") }}>{hint}</span> : null}
      </div>
      {tiles}
    </div>
  );

  return (
    <>
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Tabs tabs={faceTabs} value={cutTab} onChange={(k) => setCutTab(k as FaceSub)} />
        <div style={{ flex: "0 0 auto", padding: "12px 34px 0 34px" }}>
          <Segmented options={kindOptions} value={catKind} onChange={(k) => setCatKind(k as typeof catKind)} />
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "12px 34px 8px 34px", display: "flex", flexDirection: "column" }}>
          {/* margin: auto 0 centres the content vertically when it is shorter than the space (and scrolls when not). */}
          <div style={{ margin: "auto 0", display: "flex", flexDirection: "column" }}>
          {cutTab === "recommended" ? (
            <RecommendedCard key={catKind} {...recList[catKind]} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {catKind === "makeup" && !isMan ? (
                <div style={{ width: "83.3%", margin: "0 auto" }}><Carousel key="makeup" perPage={9} columns={3} items={forYouFirst(makeupCatalogue, recMakeupKeys).map((x) => (
                  <StyleCard key={x.key} image={styleImage("makeup_look", x.key, x.image_url) || thumb} focus="50% 40%" name={tx(x.name)}
                    badge={recMakeupKeys.has(x.key) ? t("face", "forYou") : undefined} active={look.makeup_look === x.key} onClick={() => tryMakeup(x.key)} />
                ))} /></div>
              ) : catKind === "beard" && isMan ? (
                <div style={{ width: "83.3%", margin: "0 auto" }}><Carousel key="beard" perPage={9} columns={3} items={forYouFirst(beardCatalogue, recBeardKeys).map(beardTile)} /></div>
              ) : catKind === "colour" ? (
                <>
                  <Carousel key="colour" perPage={12} columns={4} items={forYouFirst(shadeCatalogue, recShadeKeys).map(shadeTile)} />
                  {/* Technique for the colour try-on (the try-on screen uses the one picked here). */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 13, color: c("ink-muted") }}>{t("tryon", "technique")}</span>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${techniques.length || 1}, minmax(0, 1fr))`, gap: 10 }}>
                      {techniques.map((x) => (
                        <TechniqueCard key={x.key} techniqueKey={x.key} label={tx(x.name)} active={technique === x.key}
                          onClick={() => updateLook({ technique: x.key })} />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: "62%", margin: "0 auto" }}><Carousel key="cut" perPage={9} columns={3} items={forYouFirst(catalogue, recKeys).map(cutTile)} /></div>
                  <span style={{ ...SERIF, fontSize: 16 }}>{t("hair", "customise")}</span>
                  <HairCustomise compact />
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
}

/** FLUX_VERSION_3-style recommendation: one big card at a time, arrows + dots, name, why it suits, try button. */
/** FLUX_VERSION_3 model photos (front + back) for a recommended hair colour. */
export const colourModels = (gender: string | null, key: string) => {
  const g = gender === "man" ? "man" : "woman";
  return [`/studio/recommended/colour/${g}/${key}-front.jpg`, `/studio/recommended/colour/${g}/${key}-back.jpg`] as const;
};

export function RecommendedCard({ items, image, focus, onTry, onChange, active, models, details, visual }: {
  items: Recommendation[]; image: (x: CatalogItem) => string | null; focus: string; active: string | null;
  /** Two model photos (front, back) shown side by side instead of the single picture. */
  models?: (x: CatalogItem) => readonly [string, string];
  /** Custom picture (e.g. a make-up palette) used when there is no photo. */
  visual?: (x: Recommendation) => ReactNode;
  /** Extra detail rows (label → value) under the name. */
  details?: (x: Recommendation) => { label: string; value: ReactNode }[];
  /** Shows a "Try this look" button. */
  onTry?: (k: string) => void;
  /** Called with the shown card's key (the shown card is the selection). */
  onChange?: (k: string) => void;
}) {
  const { t, tx } = useStudio();
  const [i, setI] = useState(() => Math.max(0, items.findIndex((x) => x.key === active)));
  useEffect(() => { if (onChange && items[i]) onChange(items[i].key); }, [i, items.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [startX, setStartX] = useState<number | null>(null);
  if (!items.length) return <Muted size={14}>{t("face", "noRecommendations")}</Muted>;
  const n = items.length;
  const go = (d: number) => setI((p) => (p + d + n) % n);
  const x = items[i % n];
  const arrow = (d: number, icon: string) => (
    <button type="button" aria-label={d < 0 ? "Previous" : "Next"} onClick={() => go(d)} disabled={n < 2} style={{
      flex: "0 0 auto", width: 40, height: 40, borderRadius: 20, border: `1px solid ${c("line-strong")}`, background: "transparent",
      color: c("ink"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, opacity: n < 2 ? 0.3 : 1,
    }}><Icon d={icon} size={20} /></button>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        onPointerDown={(e) => setStartX(e.clientX)}
        onPointerUp={(e) => { if (startX != null && Math.abs(e.clientX - startX) > 40) go(e.clientX < startX ? 1 : -1); setStartX(null); }}
        style={{
          display: "flex", flexDirection: "column", gap: 12, padding: 12, borderRadius: 22, touchAction: "pan-y",
          background: c("surface"), border: `2px solid ${active === x.key ? c("accent") : c("line")}`,
        }}>
        {models ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {models(x).map((src, k) => (
              <span key={src} style={{ position: "relative", display: "block", aspectRatio: "3 / 4", overflow: "hidden", borderRadius: 16, background: x.hex ?? c("photo") }}>
                <Photo src={src} style={{ objectPosition: "50% 30%" }} />
                <span style={{ position: "absolute", right: 8, top: 8, fontSize: 11, color: c("ink"), background: c("veil"), borderRadius: 8, padding: "3px 9px" }}>
                  {t("face", k === 0 ? "front" : "back")}
                </span>
                {k === 0 ? (
                  <span style={{ position: "absolute", left: 8, bottom: 8, fontSize: 11, fontWeight: 500, color: c("on-dark"), background: c("accent-soft"), borderRadius: 8, padding: "3px 9px" }}>
                    {x.is_best || i === 0 ? t("face", "best") : t("face", "forYou")}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        ) : (
        <span style={{ position: "relative", display: "block", width: "62%", margin: "0 auto", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 16, background: x.hex ?? c("photo") }}>
          {!image(x) && visual ? visual(x) : <Photo src={image(x)} style={{ objectPosition: focus }} />}
          <span style={{ position: "absolute", left: 8, bottom: 8, fontSize: 11, fontWeight: 500, color: c("on-dark"), background: c("accent-soft"), borderRadius: 8, padding: "3px 9px" }}>
            {x.is_best || i === 0 ? t("face", "best") : t("face", "forYou")}
          </span>
        </span>
        )}
        <span style={{ ...SERIF, fontSize: 26, lineHeight: 1.1, textAlign: "center" }}>{tx(x.name)}</span>
        {tx(x.reason) || tx(x.sub) ? (
          <span style={{ fontSize: 13, lineHeight: 1.45, color: c("ink-muted"), textAlign: "center", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
            {tx(x.reason) || tx(x.sub)}
          </span>
        ) : null}
        {details ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 4px 0", borderTop: `1px solid ${c("line")}` }}>
            {details(x).map((d) => (
              <div key={d.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                <span style={{ color: c("ink-muted") }}>{d.label}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "right" }}>{d.value}</span>
              </div>
            ))}
          </div>
        ) : null}
        {onTry ? <OutlineButton onClick={() => onTry(x.key)}>{t("face", "tryThis")}</OutlineButton> : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {arrow(-1, ICON.back)}
        <div style={{ display: "flex", gap: 6 }}>
          {items.map((it, k) => (
            <button key={it.key} type="button" aria-label={`${k + 1} / ${n}`} onClick={() => setI(k)} style={{
              width: k === i ? 18 : 7, height: 7, borderRadius: 4, border: "none", padding: 0, cursor: "pointer",
              background: k === i ? c("accent") : c("line-strong"), transition: "width .2s",
            }} />
          ))}
        </div>
        {arrow(1, ICON.next)}
      </div>
    </div>
  );
}

/** Detail rows for a recommended hair colour: shade swatch, suggested technique, upkeep. */
export function useShadeDetails() {
  const { t, tx, look } = useStudio();
  const techniques = useCatalog("hair_technique");
  return (x: Recommendation) => {
    const tech = techniques.find((k) => k.key === (x.attributes.technique as string | undefined) || k.key === look.technique) ?? techniques[0];
    const rows: { label: string; value: ReactNode }[] = [
      { label: t("face", "shade"), value: <><span style={{ display: "block", width: 16, height: 16, borderRadius: 8, background: x.hex ?? c("photo"), border: `1px solid ${c("line-strong")}` }} />{tx(x.name)}</> },
    ];
    if (tech) rows.push({ label: t("tryon", "technique"), value: tx(tech.name) });
    const upkeep = x.attributes.maintenance as string | undefined;
    if (upkeep) rows.push({ label: t("face", "maintenance"), value: upkeep });
    return rows;
  };
}

/** Make-up look without a photo: a gold lipstick in the lip shade and an open eyeshadow compact in the eye shade. */
export function MakeupPalette({ look }: { look: CatalogItem }) {
  const { t, tx } = useStudio();
  const lips = useCatalog("lip_shade");
  const eyes = useCatalog("eye_shade");
  const lip = lips.find((l) => l.key === look.attributes.lip);
  const eye = eyes.find((e) => e.key === look.attributes.eye);
  const lipHex = lip?.hex ?? (look.attributes.lip_hex as string | undefined) ?? c("accent");
  const eyeHex = eye?.hex ?? (look.attributes.eye_hex as string | undefined) ?? c("accent-soft");
  const id = `mk-${look.key}`;
  const chip = (hex: string, label: string, name: string) => (
    <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <span style={{ flex: "0 0 auto", display: "block", width: 14, height: 14, borderRadius: 7, background: hex, border: `1px solid ${c("line-strong")}` }} />
      <span style={{ fontSize: 11, color: c("ink-muted"), whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
    </span>
  );
  return (
    <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center",
      background: `radial-gradient(circle at 50% 40%, ${c("surface-raised")}, ${c("surface")} 75%)` }}>
      <svg viewBox="0 0 220 160" style={{ flex: "1 1 auto", minHeight: 0, width: "100%", display: "block", padding: "14px 8px 0", boxSizing: "border-box" }} aria-hidden>
        <defs>
          <linearGradient id={`${id}-gold`} x1="0" x2="1">
            <stop offset="0" stopColor="#8C6A44" /><stop offset=".45" stopColor="#E2C08F" /><stop offset="1" stopColor="#8C6A44" />
          </linearGradient>
          <linearGradient id={`${id}-case`} x1="0" x2="1">
            <stop offset="0" stopColor="#0c0a09" /><stop offset=".5" stopColor="#2a2420" /><stop offset="1" stopColor="#0c0a09" />
          </linearGradient>
          <linearGradient id={`${id}-lip`} x1="0" x2="1">
            <stop offset="0" stopColor={lipHex} stopOpacity={0.75} /><stop offset=".4" stopColor={lipHex} /><stop offset="1" stopColor={lipHex} stopOpacity={0.7} />
          </linearGradient>
          <radialGradient id={`${id}-pan`} cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} /><stop offset=".25" stopColor={eyeHex} /><stop offset="1" stopColor={eyeHex} />
          </radialGradient>
        </defs>
        {/* Lipstick */}
        <ellipse cx="70" cy="142" rx="34" ry="5" fill="#000" opacity={0.5} />
        <path d="M56 46 L56 34 C56 26 84 18 84 30 L84 46 Z" fill={`url(#${id}-lip)`} />
        <rect x="53" y="46" width="34" height="14" rx="2" fill={`url(#${id}-gold)`} />
        <rect x="50" y="60" width="40" height="80" rx="4" fill={`url(#${id}-case)`} />
        <rect x="50" y="96" width="40" height="3" fill={`url(#${id}-gold)`} />
        {/* Open eyeshadow compact */}
        <ellipse cx="155" cy="142" rx="44" ry="6" fill="#000" opacity={0.5} />
        <ellipse cx="155" cy="112" rx="46" ry="26" fill={`url(#${id}-case)`} />
        <ellipse cx="155" cy="108" rx="46" ry="26" fill={`url(#${id}-gold)`} />
        <ellipse cx="155" cy="108" rx="38" ry="20" fill={`url(#${id}-pan)`} />
        <ellipse cx="155" cy="56" rx="46" ry="26" fill={`url(#${id}-case)`} />
        <ellipse cx="155" cy="56" rx="40" ry="21" fill="none" stroke={`url(#${id}-gold)`} strokeWidth={1.5} />
      </svg>
      <span style={{ flex: "0 0 auto", display: "flex", gap: 14, padding: "6px 12px 34px", maxWidth: "100%", boxSizing: "border-box" }}>
        {chip(lipHex, t("tryon", "lips"), tx(lip?.name))}
        {chip(eyeHex, t("tryon", "eyes"), tx(eye?.name))}
      </span>
    </span>
  );
}

/**
 * Hairstyle customisation (FLUX_VERSION_3 custom look): bangs (women) / fade (men) + styling, on top of the haircut.
 * Saved in look.hairMods; the haircut try-on sends them. `onChange` lets the try-on screen re-apply at once.
 */
export function HairCustomise({ onChange, compact }: { onChange?: (mods: HairMods) => void; compact?: boolean }) {
  const { t, gender, look, updateLook } = useStudio();
  const mods = look.hairMods ?? {};
  const groups = (gender === "man" ? ["fade", "styling"] : ["bangs", "styling"]) as ("bangs" | "fade" | "styling")[];
  const set = (group: keyof HairMods, value: string | null) => {
    const next = { ...mods, [group]: value };
    updateLook({ hairMods: next });
    onChange?.(next);
  };
  /** Icons from FLUX_VERSION_3 (white line art) in /public/studio/hair-mods; no icon → text-only chip. */
  const ICONED = new Set(["none", "fade_taper", "fade_medium", "fade_skin", "bangs_curtain", "bangs_fringe", "bangs_side_swept",
    "styling_blow_dry", "styling_straight", "styling_curly"]);
  const chip = (active: boolean, label: string, onClick: () => void, icon?: string) => {
    const src = icon && ICONED.has(icon) ? `/studio/hair-mods/${icon}.png` : null;
    const h = compact ? 34 : 40;
    return (
      <button key={label} type="button" onClick={onClick} style={{
        flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6, height: h, padding: src ? "0 12px 0 4px" : "0 14px",
        borderRadius: h / 2, fontSize: compact ? 12 : 13, cursor: "pointer", whiteSpace: "nowrap",
        background: active ? c("ink") : c("surface"), color: active ? c("on-dark") : c("ink"),
        border: `1px solid ${active ? c("ink") : c("line-strong")}`,
      }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" style={{ width: h - 8, height: h - 8, objectFit: "contain", filter: active ? "invert(1)" : undefined }} />
        ) : null}
        {label}
      </button>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 10 }}>
      {compact ? null : <span style={{ ...SERIF, fontSize: 19 }}>{t("hair", "customise")}</span>}
      {groups.map((g) => (
        <div key={g} style={{ display: "flex", flexDirection: compact ? "row" : "column", alignItems: compact ? "center" : "stretch", gap: compact ? 10 : 6 }}>
          <span style={{ fontSize: 12, color: c("ink-muted"), flex: "0 0 auto", minWidth: compact ? 52 : undefined }}>{t("hair", g)}</span>
          <div style={{ display: "flex", flexWrap: compact ? "nowrap" : "wrap", overflowX: compact ? "auto" : undefined, scrollbarWidth: "none", minWidth: 0, gap: 6 }}>
            {chip(!mods[g], t("tryon", "none"), () => set(g, null), "none")}
            {HAIR_MOD_OPTIONS[g].map((v) => chip(mods[g] === v, t("hair", `${g}_${v}`), () => set(g, v), `${g}_${v}`))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Recommended items first, then the rest (catalogue order). */
export function forYouFirst<T extends { key: string }>(list: T[], rec: Set<string>): T[] {
  return [...list.filter((x) => rec.has(x.key)), ...list.filter((x) => !rec.has(x.key))];
}

/** A tappable style tile: picture on top, name below (up to 2 lines, never cut mid-word). All tiles share one size. */
export function StyleCard({ image, focus, name, badge, tried, active, onClick, compact }: {
  image: string | null; focus: string; name: string; badge?: string; tried?: string;
  active: boolean; onClick: () => void; compact?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "stretch", gap: compact ? 3 : 5, minWidth: 0, padding: compact ? 3 : 5, paddingBottom: compact ? 4 : 7,
      borderRadius: compact ? 12 : 16, background: active ? c("surface-raised") : c("surface"),
      border: `2px solid ${active ? c("accent") : c("line")}`, color: c("ink"), textAlign: "left", cursor: "pointer",
    }}>
      <span style={{
        // Square frame: the 400×400 style photos show complete, nothing cropped.
        position: "relative", display: "block", width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: c("photo"),
        borderRadius: compact ? 9 : 11,
      }}>
        <Photo src={image} style={{ objectPosition: focus }} />
        {tried ? (
          <span style={{ position: "absolute", right: 6, top: 6, display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 500, color: c("on-dark"), background: c("ink"), borderRadius: 8, padding: "2px 7px" }}>
            <Icon d={ICON.check} size={10} width={2.4} />{tried}
          </span>
        ) : null}
        {badge ? (
          <span style={{ position: "absolute", left: 6, bottom: 6, fontSize: 10, fontWeight: 500, color: c("on-dark"), background: c("accent-soft"), borderRadius: 8, padding: "2px 7px" }}>
            {badge}
          </span>
        ) : null}
      </span>
      <span style={{
        padding: "0 3px", fontSize: compact ? 11 : 12, lineHeight: 1.25, minHeight: compact ? 14 : 30, overflow: "hidden",
        display: "-webkit-box", WebkitLineClamp: compact ? 1 : 2, WebkitBoxOrient: "vertical",
      }}>{name}</span>
    </button>
  );
}

// ----------------------------------------------------------------------------------- colour harmony

function ColourTab({ a }: { a: AnalysisTab }) {
  const router = useRouter();
  const { t, tx, gender, look } = useStudio();
  const palette = ((a.label?.attributes?.palette as string[] | undefined) ?? []).slice(0, 5);
  const shades = a.recommendations.hair_shade ?? [];
  const looks = a.recommendations.makeup_look ?? [];
  const clothes = a.recommendations.clothing_colour ?? [];
  const [shade, setShade] = useState<string | null>(look.hair_shade ?? shades[0]?.key ?? null);
  const savedShade = shades.find((s) => s.key === look.hair_shade);
  const savedLook = looks.find((l) => l.key === look.makeup_look);

  return (
    <>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 18, padding: "18px 34px 0 34px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 auto", minWidth: 0 }}>
          <H1 size={36}>{tx(a.label?.name)}</H1>
          <Muted>{tx(a.label?.desc) || tx(a.summary)}</Muted>
        </div>
        <div style={{ flex: "0 0 auto", position: "relative", width: 136, height: 88 }}>
          {palette.map((hex, i) => (
            <span key={`${hex}-${i}`} style={{
              position: "absolute", left: 8 + i * 16, top: i * 8, display: "block", width: 52, height: 52, boxSizing: "border-box",
              background: hex, border: `2px solid ${c("background")}`, transform: "skewX(var(--mm-skew))", boxShadow: c("shadow-swatch"),
            }} />
          ))}
        </div>
      </div>

      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 12, padding: "18px 34px 0 34px" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 18 }}>{t("colour", "hairTitle")}</span>
              <span style={{ fontSize: 13, color: c("ink-muted") }}>
                {savedShade ? `${t("colour", "saved")}: ${tx(savedShade.name)}` : t("colour", "hairSub")}
              </span>
            </div>
            <PillButton icon={ICON.sparkle} disabled={!shade} style={{ border: `1px solid ${c("ink")}`, padding: "0 18px" }}
              onClick={() => shade && router.push(`/try/colour?shade=${shade}&next=/results/styles`)}>
              {t("colour", "try")}
            </PillButton>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {shades.map((s) => (
              <ColorDot key={s.key} hex={s.hex} image={styleImage("hair_shade", s.key, s.image_url)} size={48} label={tx(s.name)} active={shade === s.key} gapColor={c("surface")} onClick={() => setShade(s.key)} />
            ))}
          </div>
        </Card>

        {gender === "woman" && looks.length ? (
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 18 }}>{t("colour", "makeupTitle")}</span>
              <span style={{ fontSize: 13, color: c("ink-muted") }}>
                {savedLook ? `${t("colour", "saved")}: ${tx(savedLook.name)}`
                  : look.lip || look.eye ? `${t("colour", "saved")}: ${t("colour", "custom")}` : t("colour", "makeupSub")}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {looks.map((m) => (
                <button key={m.key} type="button" onClick={() => router.push(`/try/makeup?look=${m.key}&next=/results/styles`)} style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, minWidth: 0, padding: 12, borderRadius: 16,
                  background: c("surface-raised"), border: `2px solid ${look.makeup_look === m.key ? c("accent") : c("line")}`,
                  color: c("ink"), textAlign: "left", cursor: "pointer",
                }}>
                  <span style={{ display: "flex", gap: 6 }}>
                    <span style={{ display: "block", width: 22, height: 22, borderRadius: 11, background: String(m.attributes.lip_hex ?? "") }} />
                    <span style={{ display: "block", width: 22, height: 22, borderRadius: 11, background: String(m.attributes.eye_hex ?? "") }} />
                  </span>
                  <span style={{ fontSize: 14, lineHeight: 1.2 }}>{tx(m.name)}</span>
                  <span style={{ fontSize: 12, lineHeight: 1.3, color: c("ink-muted") }}>{tx(m.sub)}</span>
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 18 }}>{t("colour", "dressTitle")}</span>
            <span style={{ fontSize: 13, color: c("ink-muted") }}>{t("colour", "dressSub")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {clothes.map((d) => <ColorChip key={d.key} hex={d.hex} label={tx(d.name)} />)}
          </div>
        </Card>
      </div>
    </>
  );
}

export function TechniqueCard({ label, active, onClick }: { techniqueKey: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={{
      height: 52, borderRadius: 16, cursor: "pointer", fontSize: 16, fontWeight: 500, fontFamily: "inherit",
      border: `2px solid ${active ? c("ink") : c("line-strong")}`,
      background: active ? c("ink") : "transparent", color: active ? c("on-dark") : c("ink"),
    }}>
      {label}
    </button>
  );
}
