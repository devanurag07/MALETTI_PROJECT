"use client";

import ColourHarmonyPages, { colourHarmonyData, harmonyPageCount } from "../report/ColourHarmonyPages";
import { BLUSH, EYESHADOW, LIPSTICK } from "../data/makeup";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { waitForPendingUpload } from "../pending-upload";
import { studioApi, type AnalysisTab, type CatalogItem, type Recommendation, type Results } from "../api";
import { useCatalog, useStudio } from "../context/StudioContext";
import {
  JOURNEY, journeyNext, journeyPage, SERVICE_MODULE, SERVICE_TRY, type Service,
} from "../flows";
import { styleImage } from "../theme/styleImages";
import {
  Arch, c, Card, Carousel, ColorChip, ColorDot, ErrorLine, GuidePill, H1, HeroBackdrop, Icon, ICON, LoadingStage, Muted, OutlineButton, Photo,
  PrimaryButton, Screen, SERIF, ShadeSwatch, Spinner, Tabs,
} from "../ui";
import { markingsOf, SkinMapLegend, SkinMapPhoto } from "../components/SkinMap";
import PhotoQR from "../components/PhotoQR";
import ScanOverlay from "../components/ScanOverlay";
import { colourModels, HairCustomise, MakeupPalette, forYouFirst, RecommendedGrid, useShadeDetails, SkinProducts, SkinTab, StyleCard, TechniqueCard } from "./ResultsScreen";

const SERVICE_ICON: Record<Service, string> = {
  hairstyle: ICON.serviceCut, beard: ICON.serviceBeard, armocromia: ICON.colour,
  colour: ICON.serviceColour, makeup: ICON.serviceMakeup, skin: ICON.skin,
};

/** Service progress: "Service 2 of 5 · Beard" + one segment per service (done / skipped / current / to do). */
export function JourneyBar({ service }: { service: Service }) {
  const { t, gender, look } = useStudio();
  const list = JOURNEY[gender];
  const idx = list.indexOf(service);
  return (
    <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 8, padding: "16px 34px 0 34px" }}>
      <span style={{ fontSize: 13, color: c("ink-muted") }}>
        {t("journey", "progress", { n: idx + 1, total: list.length })} · {t("journey", `${service}.name`)}
      </span>
      <div style={{ display: "flex", gap: 7 }}>
        {list.map((s, i) => {
          const st = look.journey?.[s];
          return (
            <span key={s} style={{
              display: "block", flex: "1 1 0", height: 7, transform: "skewX(var(--mm-skew))",
              background: i === idx ? c("step-current") : st === "done" ? c("step-done") : c("step-todo"),
              opacity: st === "skipped" && i !== idx ? 0.5 : 1,
            }} />
          );
        })}
      </div>
    </div>
  );
}

/** Intro page shown before each service: what it is, then Skip or Proceed. */
export function ServiceIntro({ service }: { service: Service }) {
  const router = useRouter();
  const { t, config, session, gender, look, updateLook } = useStudio();
  // Simple Service (one service on its own): same intro, but no journey bar / status; Skip goes back to the list.
  const simple = useSearchParams().get("simple") === "1";
  if (!config || !session) return <LoadingStage />;
  const status = simple ? undefined : look.journey?.[service];
  const mark = (st: "done" | "skipped") => updateLook({ journey: { ...look.journey, [service]: st } });
  const lines = t("journey", `${service}.intro`).split("\n");

  return (
    <Screen animKey={`intro-${service}`}>
      {simple ? null : <JourneyBar service={service} />}
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HeroBackdrop halo={[460, 460]} squares={[
          { left: 70, top: 40, width: 96, height: 96 },
          { right: 74, bottom: 30, width: 72, height: 72 },
        ]} />
        <div style={{ position: "relative", width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ position: "absolute", left: 22, top: 22, display: "block", width: 106, height: 106, border: `1.5px solid ${c("accent")}`, transform: "skewX(var(--mm-skew))" }} />
          <Icon d={SERVICE_ICON[service]} size={58} width={1.2} stroke="var(--mm-ink)" style={{ position: "relative" }} />
        </div>
      </div>
      <div style={{ flex: "0 0 auto", padding: "4px 34px 34px 34px", display: "flex", flexDirection: "column", gap: 14 }}>
        {status ? (
          <span style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: c("on-dark"), background: c("accent-soft"), borderRadius: 10, padding: "3px 12px" }}>
            {status === "done" ? <Icon d={ICON.check} size={12} width={2.4} /> : null}
            {t("journey", status === "done" ? "statusDone" : "statusSkipped")}
          </span>
        ) : null}
        <H1 size={40}>{t("journey", `${service}.name`)}</H1>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {lines.map((l, i) => <Muted key={i} size={16} style={{ lineHeight: 1.55 }}>{l}</Muted>)}
        </div>
        <PrimaryButton iconRight={ICON.next} onClick={() => {
          if (simple) return router.push(`${journeyPage(service)}?simple=1`);
          mark("done"); router.push(journeyPage(service));
        }}>
          {t("journey", "proceed")}
        </PrimaryButton>
        <OutlineButton onClick={() => {
          if (simple) return router.push("/service");
          if (status !== "done") mark("skipped"); router.push(journeyNext(gender, service));
        }}>
          {t("journey", "skip")}
        </OutlineButton>
      </div>
    </Screen>
  );
}

/** The service itself: pick an option, Try it on (AI), or continue to the next service. */
export function ServicePage({ service }: { service: Service }) {
  const router = useRouter();
  const { t, tx, config, session, gender } = useStudio();
  // Simple Service (one service on its own): no journey bar, back to the service list when done.
  const simple = useSearchParams().get("simple") === "1";
  const needsAnalysis = service === "armocromia" || service === "skin";
  const [results, setResults] = useState<Results | null>(() => studioApi.cachedResults(session?.id));
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  /** Armocromia: which of its pages is shown (Next goes through them, then on to the next service). */
  const [armoPage, setArmoPage] = useState(0);
  // Skin / colour harmony: a 5-second "analysing" animation on the photo before the results (once per session).
  const scanKey = session ? `mm-${service}-scan:${session.id}` : "";
  const [scanning, setScanning] = useState(() => {
    if (service !== "skin" && service !== "armocromia") return false;
    if (studioApi.cachedResults(session?.id)?.tabs.some((x) => x.module === SERVICE_MODULE[service] && x.status === "done")) return false;
    try { return !sessionStorage.getItem(scanKey); } catch { return true; }
  });
  useEffect(() => {
    if (!scanning || !session) return;
    try { if (sessionStorage.getItem(scanKey)) { setScanning(false); return; } } catch {}
    const id = setTimeout(() => {
      try { sessionStorage.setItem(scanKey, "1"); } catch {}
      setScanning(false);
    }, 5000);
    return () => clearTimeout(id);
  }, [scanning, scanKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session) return;
    // Armocromia / skin need the analysis: run it when this session has none yet (e.g. Simple Service).
    (async () => {
      await waitForPendingUpload();
      let r = await studioApi.results(session.id);
      if ((needsAnalysis || simple) && !r.tabs.some((x) => x.module === SERVICE_MODULE[service] && x.status === "done")) r = await studioApi.analyze(session.id);
      return r;
    })().then(setResults).catch((e: Error) => setError(e.message));
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config || !session) return <LoadingStage />;
  // The scan animation stays until the results are there (at least 5 s).
  if (scanning || ((needsAnalysis || simple) && !results && !error))
    return <ServiceScan service={service} />;
  // Skin: Next first shows the skin map (markings on the photo), then goes on.
  const result = `/service/result?s=${service}`;
  const next = service === "skin" ? `/journey/skin/map${simple ? "?simple=1" : ""}` : simple ? result : journeyNext(gender, service);
  const tab = (m: string) => results?.tabs.find((x) => x.module === m && x.status === "done");
  const a = tab(SERVICE_MODULE[service]);
  const kind = SERVICE_TRY[service];
  const param = kind === "cut" ? "item" : kind === "colour" ? "shade" : kind === "makeup" ? "look" : "beard";
  const tryIt = () => sel && kind && router.push(`/try/${kind}?${param}=${encodeURIComponent(sel)}&single=1&next=${encodeURIComponent(next)}&back=${encodeURIComponent(journeyPage(service) + (simple ? "?simple=1" : ""))}`);

  let body: ReactNode;
  if (!results && !error) body = <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={36} /></div>;
  else if (needsAnalysis && !a) body = <div style={{ flex: 1 }}><ErrorLine message={error ?? t("analysis", "failed")} /></div>;
  else if (service === "skin") body = <SkinTab a={a!} products={false} />;
  else if (service === "armocromia") body = <Armocromia a={a!} face={tab("face")} page={armoPage} />;
  else body = <Options service={service} a={a} sel={sel} setSel={setSel} />;

  const last = next === "/look" || next.startsWith("/service");
  // Armocromia: "Next page" until its last page, then the usual label.
  const armoPages = service === "armocromia" && a ? harmonyPageCount(colourHarmonyData({ colour: a, face: tab("face"), photo: null, tx })) : 1;
  const nextLabel = service === "skin" ? t("skinMap", "cta") : armoPage < armoPages - 1 ? t("journey", "nextPage") : t("journey", last ? "finish" : "next");
  return (
    <Screen animKey={`svc-${service}`}>
      {simple ? null : <JourneyBar service={service} />}
      {body}
      {/* Skin results don't fill the height: push the button to the bottom. */}
      {service === "skin" ? <div style={{ flex: "1 1 auto" }} /> : null}
      <div style={{ flex: "0 0 auto", display: "grid", gridTemplateColumns: kind ? "1fr 1fr" : "1fr", gap: 12, padding: "14px 34px 34px 34px" }}>
        {kind ? (
          <>
            <OutlineButton onClick={() => router.push(next)}>{t("journey", last ? "finish" : "next")}</OutlineButton>
            <PrimaryButton icon={ICON.sparkle} disabled={!sel} onClick={tryIt}>{t("journey", "try")}</PrimaryButton>
          </>
        ) : (
          <PrimaryButton iconRight={ICON.next} onClick={() => {
            if (armoPage < armoPages - 1) { setArmoPage((p) => p + 1); return; }
            router.push(next);
          }}>{nextLabel}</PrimaryButton>
        )}
      </div>
    </Screen>
  );
}

/** Selectable options for a try-on service (recommended first, then the catalogue). */
export function Options({ service, a, sel, setSel, tab: tabProp, bare }: {
  service: Service; a?: AnalysisTab; sel: string | null; setSel: (k: string) => void;
  /** Controlled tab + no title/tabs of its own (used inside the try-on screen's Recommended | Custom | Result tabs). */
  tab?: "recommended" | "custom"; bare?: boolean;
}) {
  const { t, tx, look, photo, updateLook } = useStudio();
  const cuts = useCatalog("haircut");
  const beards = useCatalog("beard_style").filter((b) => b.key !== "none");
  const shades = useCatalog("hair_shade");
  const looks = useCatalog("makeup_look");
  const techniques = useCatalog("hair_technique");
  const technique = look.technique ?? techniques[0]?.key ?? null;
  const thumb = look.lastTryon?.output_url || photo;

  const recOf = (k: string) => a?.recommendations[k] ?? [];
  const list: Record<string, { items: CatalogItem[]; rec: Recommendation[]; current: string | null }> = {
    hairstyle: { items: cuts, rec: recOf("haircut"), current: look.cut },
    beard: { items: beards, rec: recOf("beard_style"), current: look.beard },
    colour: { items: shades, rec: recOf("hair_shade"), current: look.hair_shade },
    makeup: { items: looks, rec: recOf("makeup_look"), current: look.makeup_look ?? (look.lip || look.eye || look.blush ? "custom" : null) },
  };
  const { items, rec, current } = list[service];
  const recKeys = new Set(rec.map((x) => x.key));
  const best = rec.find((x) => x.is_best)?.key ?? rec[0]?.key;
  const ordered = forYouFirst(items, recKeys);

  // Preselect: the customer's saved choice, else the best recommendation.
  useEffect(() => {
    if (sel === null) { const k = current ?? best ?? null; if (k) setSel(k); }
  }, [current, best]); // eslint-disable-line react-hooks/exhaustive-deps

  const badge = (key: string) => (key === best ? t("face", "best") : recKeys.has(key) ? t("face", "forYou") : undefined);
  const imageKind = service === "hairstyle" ? "haircut" : service === "beard" ? "beard_style" : "hair_shade";

  const shadeDetails = useShadeDetails();
  const { gender } = useStudio();
  const [tabState, setTab] = useState<"recommended" | "custom">(rec.length ? "recommended" : "custom");
  /** Custom make-up: which FLUX category is shown (0 lipstick, 1 blush, 2 eyeshadow). */
  const [makeupCat, setMakeupCat] = useState(0);
  const tab = tabProp ?? tabState;
  let content: ReactNode;
  if (tab === "recommended") {
    // Haircuts / beards / hair colours / make-up looks: all recommendations on one page.
    content = (
      <RecommendedGrid key={service} items={rec} active={sel} onChange={setSel}
        models={service === "colour" ? (x) => colourModels(gender, x.key) : undefined}
        visual={service === "makeup" ? (x) => <MakeupPalette look={x} compact /> : undefined}
        focus={service === "beard" ? "50% 60%" : "50% 8%"}
        image={(x) => service === "makeup" ? styleImage("makeup_look", x.key, x.image_url) || null : styleImage(imageKind, x.key, x.image_url) || thumb} />
    );
  } else if (service === "colour") {
    content = (
      <>
        <Carousel key="colour" perPage={12} columns={4} items={ordered.map((x) => (
          <ShadeSwatch key={x.key} image={styleImage("hair_shade", x.key, x.image_url) || thumb} name={tx(x.name)} mark={recKeys.has(x.key)}
            active={sel === x.key} onClick={() => setSel(x.key)} />
        ))} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, color: c("ink-muted") }}>{t("tryon", "technique")}</span>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${techniques.length || 1}, minmax(0, 1fr))`, gap: 10 }}>
            {techniques.map((x) => (
              <TechniqueCard key={x.key} techniqueKey={x.key} label={tx(x.name)} active={technique === x.key} onClick={() => updateLook({ technique: x.key })} />
            ))}
          </div>
        </div>
      </>
    );
  } else if (service === "makeup") {
    // Custom make-up = the FLUX_VERSION_3 catalogue (makeup_prompts.json): Lipstick | Blush | Eyeshadow, shades in their
    // groups (Everyday, Pinks & Reds, …) with the Matte / Shimmer tag, 4 swatches per row. Tap again to unselect.
    const CATS = [
      { field: "lip" as const, label: t("tryon", "lips"), list: LIPSTICK },
      { field: "blush" as const, label: t("tryon", "blush"), list: BLUSH },
      { field: "eye" as const, label: t("tryon", "eyes"), list: EYESHADOW },
    ];
    const cat = CATS[makeupCat];
    const pickShade = (field: "lip" | "eye" | "blush", key: string) => {
      const next = { lip: look.lip, eye: look.eye, blush: look.blush, [field]: look[field] === key ? null : key };
      updateLook({ ...next, makeup_look: null });
      setSel(next.lip || next.eye || next.blush ? "custom" : "");
    };
    const groups = cat.list.reduce<{ name: string; shades: CatalogItem[] }[]>((acc, x) => {
      const g = String(x.attributes.group ?? "");
      const last = acc[acc.length - 1];
      if (last?.name === g) last.shades.push(x); else acc.push({ name: g, shades: [x] });
      return acc;
    }, []);
    const tag = (g: string) => (/shimmer/i.test(g) ? "Shimmer" : /matte/i.test(g) ? "Matte" : null);
    const picked = CATS.map((x) => [x.label, x.list.find((b) => b.key === look[x.field])] as const).filter(([, b]) => b);
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {CATS.map((x, i) => {
            const on = makeupCat === i;
            const chosen = x.list.find((b) => b.key === look[x.field]);
            return (
              <button key={x.field} type="button" onClick={() => setMakeupCat(i)} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 42, borderRadius: 21, cursor: "pointer", fontSize: 14,
                background: on ? c("ink") : c("surface"), color: on ? c("on-dark") : c("ink"), border: `1px solid ${on ? c("ink") : c("line-strong")}`,
              }}>
                {chosen ? <span style={{ display: "block", width: 14, height: 14, borderRadius: 7, background: chosen.hex ?? undefined, border: `1px solid ${c("line-strong")}` }} /> : null}
                {x.label}
              </button>
            );
          })}
        </div>
        {groups.map((g) => (
          <div key={g.name} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ ...SERIF, fontSize: 17, whiteSpace: "nowrap" }}>{g.name}</span>
              <span style={{ flex: "1 1 auto", height: 1, background: c("line") }} />
              {tag(g.name) ? <span style={{ fontSize: 12, color: c("ink-muted") }}>{tag(g.name)}</span> : null}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              {g.shades.map((b) => {
                const on = look[cat.field] === b.key;
                return (
                  <button key={b.key} type="button" onClick={() => pickShade(cat.field, b.key)} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 0, background: "none", border: "none", cursor: "pointer", color: c("ink"),
                  }}>
                    <span style={{
                      position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", aspectRatio: "8 / 3",
                      borderRadius: 12, background: b.hex ?? undefined, border: `2px solid ${on ? c("accent") : "transparent"}`,
                      boxShadow: on ? `0 0 0 2px ${c("background")} inset` : undefined,
                    }}>
                      {on ? <Icon d={ICON.check} size={18} width={3} stroke="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }} /> : null}
                    </span>
                    <span style={{ fontSize: 12, lineHeight: 1.2, textAlign: "center", fontWeight: on ? 600 : 400 }}>{tx(b.name)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {picked.length ? (
          <span style={{ fontSize: 13, color: c("ink-muted"), textAlign: "center" }}>
            {picked.map(([l, b]) => `${l}: ${tx(b!.name)}`).join("  ·  ")}
          </span>
        ) : null}
      </div>
    );
  } else {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 3×3 page + customise options fit one screen (no scrolling). */}
      <div style={{ width: service === "hairstyle" ? "62%" : "72%", margin: "0 auto" }}>
        <Carousel key={service} perPage={9} columns={3} items={ordered.map((x) => (
          <StyleCard key={x.key} compact image={styleImage(imageKind, x.key, x.image_url) || thumb} focus={service === "beard" ? "50% 60%" : "50% 8%"}
            name={tx(x.name)} active={sel === x.key} onClick={() => setSel(x.key)} />
        ))} />
      </div>
      {service === "hairstyle" ? <HairCustomise compact /> : null}
      </div>
    );
  }

  if (bare) return (
    <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "12px 34px 6px 34px" }}>
      {tab === "recommended" && !rec.length ? <Muted size={14}>{t("journey", "pickHint")}</Muted> : null}
      <div style={{ margin: "auto 0", display: "flex", flexDirection: "column", gap: 10 }}>{content}</div>
    </div>
  );
  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "12px 34px 6px 34px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ ...SERIF, fontSize: 24, lineHeight: 1.1 }}>{t("journey", `${service}.name`)}</span>
        <Muted size={14}>
          {service === "hairstyle" && a?.label?.name ? `${tx(a.label.name)} · ` : ""}{t("journey", "pickHint")}
        </Muted>
      </div>
      <Tabs tabs={[{ key: "recommended", label: t("face", "tabRecommended") }, { key: "custom", label: t("face", "tabCatalogue") }]}
        value={tab} onChange={(k) => setTab(k as "recommended" | "custom")} />
      <div style={{ margin: "auto 0", display: "flex", flexDirection: "column", gap: 10 }}>{content}</div>
    </div>
  );
}

/** Armocromia: the colour season, its palette and clothing colour suggestions. */
/** Armocromia results: the report's pages, one at a time (season → undertone + wardrobe → combinations); Next steps through. */
function Armocromia({ a, face, page }: { a: AnalysisTab; face?: AnalysisTab; page: number }) {
  const { tx, photo } = useStudio();
  const data = useMemo(() => colourHarmonyData({ colour: a, face, photo, tx }), [a, face, photo]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div key={page} style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, padding: "22px 34px 8px 34px" }}>
      <ColourHarmonyPages data={data} pad={0} only={page} />
    </div>
  );
}


/** After Skin analysis → Next: one page with every finding marked on the photo (also in the report). */
export function SkinMapPage() {
  const router = useRouter();
  const simple = useSearchParams().get("simple") === "1";
  const { t, tx, config, session, gender, photo } = useStudio();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (session) studioApi.results(session.id).then(setResults).catch((e: Error) => setError(e.message));
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!config || !session) return <LoadingStage />;
  const skin = results?.tabs.find((x) => x.module === "skin" && x.status === "done");
  const markings = markingsOf(skin?.zones);
  const next = `/journey/skin/products${simple ? "?simple=1" : ""}`;

  return (
    <Screen animKey="skin-map">
      {simple ? null : <JourneyBar service="skin" />}
      {!results && !error ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={36} /></div>
      ) : !skin ? (
        <div style={{ flex: 1 }}><ErrorLine message={error ?? t("analysis", "failed")} /></div>
      ) : (
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, padding: "18px 34px 8px 34px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <H1 size={34}>{t("skinMap", "title")}</H1>
            <Muted size={14}>{tx(skin.label?.name)} · {markings.length ? t("skinMap", "desc") : t("skinMap", "none")}</Muted>
          </div>
          <div style={{ position: "relative", alignSelf: "center" }}>
            <SkinMapPhoto src={photo} markings={markings} size={400} style={{ outline: `1.5px solid ${c("accent")}`, outlineOffset: 5 }} />
            <PhotoQR src={photo} name={t("skinMap", "title")} />
          </div>
          <SkinMapLegend metrics={skin.metrics} markings={markings} label={(k) => t("skin", `metric_${k}`)} areasLabel={(n) => t("skinMap", "areas", { n })} />
        </div>
      )}
      <div style={{ flex: "0 0 auto", padding: "14px 34px 34px 34px" }}>
        <PrimaryButton iconRight={ICON.next} onClick={() => router.push(next)}>{t("skin", "productsCta")}</PrimaryButton>
      </div>
    </Screen>
  );
}


/** After the skin map: the recommended skin products, then on to the next service. */
export function SkinProductsPage() {
  const router = useRouter();
  const simple = useSearchParams().get("simple") === "1";
  const { t, config, session, gender } = useStudio();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (session) studioApi.results(session.id).then(setResults).catch((e: Error) => setError(e.message));
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!config || !session) return <LoadingStage />;
  const skin = results?.tabs.find((x) => x.module === "skin" && x.status === "done");
  const next = simple ? "/service/result?s=skin" : journeyNext(gender, "skin");
  return (
    <Screen animKey="skin-products">
      {simple ? null : <JourneyBar service="skin" />}
      {!results && !error ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={36} /></div>
      ) : !skin ? (
        <div style={{ flex: 1 }}><ErrorLine message={error ?? t("analysis", "failed")} /></div>
      ) : (
        <SkinProducts a={skin} />
      )}
      <div style={{ flex: "0 0 auto", padding: "14px 34px 34px 34px" }}>
        <PrimaryButton iconRight={ICON.next} onClick={() => router.push(next)}>{t("journey", next === "/look" || next.startsWith("/service") ? "finish" : "next")}</PrimaryButton>
      </div>
    </Screen>
  );
}

/**
 * 5-second processing screen for Armocromia / Skin: the same scan UI as the Analysis screen (photo in the arch,
 * scan line, brackets, "<stage> NN%" pill), counting to 100 % in 5 s.
 */
const SCAN_MS = 5000;
function ServiceScan({ service }: { service: Service }) {
  const { t, photo } = useStudio();
  const simple = useSearchParams().get("simple") === "1";
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setPct(Math.min(100, Math.round(((Date.now() - start) / SCAN_MS) * 100))), 100);
    return () => clearInterval(id);
  }, []);
  // Labels: skin → skin.*, hairstyle / beard → face.* (face analysis), colour services → colour.*.
  const ns = service === "skin" ? "skin" : service === "hairstyle" || service === "beard" ? "faceScan" : "colour";
  const stages = [t(ns, "scanStage1"), t(ns, "scanStage2"), t(ns, "scanStage3")];
  const stage = stages[Math.min(stages.length - 1, Math.floor((pct / 100) * stages.length))];
  return (
    <Screen animKey={`${service}-scan`}>
      {simple ? null : <JourneyBar service={service} />}
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HeroBackdrop halo={[500, 520]} squares={[
          { left: 56, top: 30, width: 110, height: 110 },
          { right: 58, bottom: 26, width: 84, height: 84 },
        ]} />
        <Arch width={266} height={336} offset={7} style={{ boxShadow: c("shadow-arch") }}>
          <Photo src={photo} />
          <ScanOverlay pct={pct} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center" }}>
            <GuidePill>{`${stage} ${pct}%`}</GuidePill>
          </div>
        </Arch>
      </div>
      <div style={{ flex: "0 0 auto", padding: "2px 34px 34px 34px", display: "flex", flexDirection: "column", gap: 8 }}>
        <H1>{t(ns, "scanning")}</H1>
        <Muted size={14}>{t(ns, "scanningSub")}</Muted>
      </div>
    </Screen>
  );
}
