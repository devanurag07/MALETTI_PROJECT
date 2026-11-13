"use client";

import { BLUSH, blushByKey, EYESHADOW, eyeByKey, LIPSTICK, LOOK_FLUX, lipByKey, lookBlush } from "../data/makeup";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { studioApi, type CatalogItem, type Results, type TryKind, type TryOn } from "../api";
import { UPLOAD, useCatalog, useStudio, type HairMods, type LookDraft } from "../context/StudioContext";
import { SERVICE_MODULE, SERVICE_TRY, tryOrder, type Service } from "../flows";
import { JourneyBar, Options } from "./JourneyScreen";
import ScanOverlay from "../components/ScanOverlay";
import PhotoQR from "../components/PhotoQR";
import { styleImage } from "../theme/styleImages";
import {
  Arch, c, ShadeSwatch, ColorDot, CompareArch, ErrorLine, GuidePill, H1, HeroBackdrop, ICON, ImageOption, LoadingStage, Muted,
  Photo, PrimaryButton, Screen, Segmented, SERIF, Tabs, UploadOption,
} from "../ui";

/** Typical try-on wait (FLUX_VERSION_3 PROGRESS_DURATION_MS.generation); progress holds at 92% until the picture is in. */
const GEN_MS = 25_000;

/**
 * FLUX_VERSION_3-style generation screen: the customer's photo with the scan animation, a simulated % and stage messages.
 * Shown on the Result tab while a try-on is generating.
 */
function GeneratingScan({ image }: { image: string | null }) {
  const { t } = useStudio();
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = Date.now();
    // Ease-out towards 92%: fast at first, slower near the end, never "done" before the result arrives.
    const id = setInterval(() => setPct(Math.round(92 * (1 - Math.exp(-(Date.now() - start) / (GEN_MS / 2.5))))), 150);
    return () => clearInterval(id);
  }, []);
  const stages = [t("tryon", "genStage1"), t("tryon", "genStage2"), t("tryon", "genStage3"), t("tryon", "genStage4")];
  const stage = stages[Math.min(stages.length - 1, Math.floor((pct / 92) * stages.length))];
  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HeroBackdrop halo={[500, 520]} squares={[
          { left: 56, top: 30, width: 110, height: 110 },
          { right: 58, bottom: 26, width: 84, height: 84 },
        ]} />
        <Arch width={266} height={336} offset={7} style={{ boxShadow: c("shadow-arch") }}>
          <Photo src={image} />
          <ScanOverlay pct={pct} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center" }}>
            <GuidePill>{`${stage} ${pct}%`}</GuidePill>
          </div>
        </Arch>
      </div>
      <div style={{ flex: "0 0 auto", padding: "2px 34px 10px 34px", display: "flex", flexDirection: "column", gap: 8 }}>
        <H1>{t("tryon", "genTitle")}</H1>
        <Muted size={14}>{t("tryon", "genSub")}</Muted>
      </div>
    </div>
  );
}

const KIND_CAT: Record<TryKind, string> = { cut: "catCut", colour: "catColour", makeup: "catMakeup", beard: "catBeard" };
type Sel = { item: string | null; shade: string | null; technique: string | null; look: string | null; lip: string | null; eye: string | null; blush: string | null; beard: string | null };

/** Download an image before showing it, so the old picture is never left on screen while the new one loads. */
/** Result URL → in-memory blob URL, so a result shows the instant it's picked (no second download / decode). */
const READY = new Map<string, string>();
const ready = (url: string | null | undefined) => (url ? READY.get(url) ?? url : url ?? null);

function preload(url: string | null | undefined): Promise<void> {
  if (!url || READY.has(url)) return Promise.resolve();
  const decode = (src: string) => new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = () => (img.decode ? img.decode().then(done, done) : done());
    img.onerror = done;
    img.src = src;
  });
  const work = fetch(url, { mode: "cors" })
    .then((r) => (r.ok ? r.blob() : Promise.reject()))
    .then((b) => { const local = URL.createObjectURL(b); READY.set(url, local); return decode(local); })
    .catch(() => decode(url)); // no CORS: fall back to the browser cache
  return Promise.race([work, new Promise<void>((r) => setTimeout(r, 15000))]); // never block forever
}

/** Recommended first (in recommendation order), then the rest of the catalog; unique keys. */
function ranked(recommended: CatalogItem[] | undefined, all: CatalogItem[], limit: number) {
  const seen = new Set<string>();
  return [...(recommended ?? []), ...all].filter((i) => !seen.has(i.key) && seen.add(i.key)).slice(0, limit);
}

/** Step 5 — Try and customise. Each pick generates an AI try-on stacked on the previous layer. */
export default function TryScreen({ kind: initialKind }: { kind: TryKind }) {
  // Tabs switch in place (no route change → no page reload); the URL is kept in sync for Back/refresh.
  const [kind, setKind] = useState<TryKind>(initialKind);
  const search = useSearchParams();
  const router = useRouter();
  const { t, tx, config, session, gender, look, updateLook, photo } = useStudio();
  const next = search.get("next") ?? "/look";
  // Step-by-step mode (Simple Service): Save goes cut → colour → beard/make-up → next. Edit links return directly.
  const chain = search.get("chain") === "1";
  // Journey mode: one service only (no kind switcher); Save goes on to the next service.
  const single = search.get("single") === "1";
  // Where "Other looks" goes: the service's option page (journey) / the styles page (results), else back.
  const back = search.get("back");

  const cutsAll = useCatalog("haircut");
  const shadesAll = useCatalog("hair_shade");
  const techniques = useCatalog("hair_technique");
  const lipsAll = LIPSTICK; // FLUX_VERSION_3 makeup_prompts.json, not the catalogue
  const blushAll = BLUSH; // FLUX_VERSION_3 makeup_prompts.json, not the catalogue
  const eyesAll = EYESHADOW;
  const looksAll = useCatalog("makeup_look");
  const beardsAll = useCatalog("beard_style");

  // Recommendations from the consultation (colour harmony + face), when there was one.
  const [results, setResults] = useState<Results | null>(() => studioApi.cachedResults(session?.id));
  /** Try-ons of this session from the backend (session id kept in local storage): the source of the history row. */
  const [serverTryons, setServerTryons] = useState<TryOn[]>([]);
  const refreshTryons = () => { if (session) studioApi.tryons(session.id).then(setServerTryons).catch(() => {}); };
  useEffect(refreshTryons, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Recommendations feed the Recommended tab and the option order (consultation or this service's own analysis).
    if (session) studioApi.results(session.id).then(setResults).catch(() => {});
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const rec = (module: string, k: string) => results?.tabs.find((x) => x.module === module)?.recommendations[k];

  const recLooks = rec("colour", "makeup_look");
  const beards = ranked(rec("face", "beard_style"), beardsAll, 3); // face analysis order (best first)
  const lipKeys = (recLooks ?? []).map((l) => String(l.attributes.lip));
  const eyeKeys = (recLooks ?? []).map((l) => String(l.attributes.eye));
  const lips = ranked(lipsAll.filter((l) => lipKeys.includes(l.key)), lipsAll, 4);
  const eyes = ranked(eyesAll.filter((e) => eyeKeys.includes(e.key)), eyesAll, 4);

  const [sel, setSel] = useState<Sel>({ item: null, shade: null, technique: null, look: null, lip: null, eye: null, blush: null, beard: null });
  const [level, setLevel] = useState(100);
  /** Which step (cut / colour / …) is generating; other tabs stay usable and show their own state. */
  const [busyKind, setBusyKind] = useState<TryKind | null>(null);
  const busy = busyKind === kind;
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef<string | null>(null);
  // Customer's own style picture for this screen (kept so the intensity slider can regenerate with it).
  const [ref, setRef] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => () => { if (ref) URL.revokeObjectURL(ref.url); }, [ref]);
  useEffect(() => setRef(null), [kind]);

  // Selection: URL preset (from results) → saved look → defaults.
  const preset = useMemo(() => {
    const presetLook = looksAll.find((l) => l.key === search.get("look"));
    return {
      item: search.get("item") ?? look.cut,
      shade: search.get("shade") ?? look.hair_shade,
      technique: look.technique ?? techniques[0]?.key ?? null,
      look: presetLook?.key ?? look.makeup_look,
      // A look brings its own lips / eyes; custom shades are FLUX_VERSION_3 keys (makeup_prompts.json).
      lip: presetLook ? null : look.lip,
      eye: presetLook ? null : look.eye,
      blush: look.blush ?? null,
      beard: search.get("beard") ?? look.beard,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, config, search]);
  useEffect(() => {
    setSel(preset);
    setLevel(look.params[`${kind}_level`] ?? (kind === "makeup" ? 85 : 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const usesUpload = (s: Sel) =>
    kind === "cut" ? s.item === UPLOAD : kind === "colour" ? s.shade === UPLOAD : kind === "makeup" ? s.look === UPLOAD : s.beard === UPLOAD;

  function paramsFor(s: Sel, lvl: number, mods: HairMods = look.hairMods ?? {}): Record<string, unknown> | null {
    if (usesUpload(s)) return kind === "beard" ? { density: lvl } : kind === "cut" ? {} : { intensity: lvl };
    if (kind === "cut") {
      // Haircut + customisation (bangs / fade / styling); customisation alone keeps the current cut.
      const extra = Object.fromEntries(Object.entries(mods).filter(([, v]) => !!v));
      return s.item || Object.keys(extra).length ? { ...(s.item ? { item: s.item } : {}), ...extra } : null;
    }
    if (kind === "colour") return s.shade ? { shade: s.shade, technique: s.technique, intensity: lvl } : null;
    if (kind === "makeup") {
      // FLUX_VERSION_3 shades (makeup_prompts.json): their own prompts go to the backend. No blush picked: a look brings its own.
      const bKey = s.blush ?? (s.look ? lookBlush(looksAll.find((x) => x.key === s.look) ?? { key: s.look })?.key ?? null : null);
      const blush = bKey ? { blush_key: bKey, blush_prompt: String(blushByKey(bKey)?.attributes.prompt ?? "") } : {};
      // A recommended look = its FLUX shades (LOOK_FLUX), sent as FLUX prompts like a custom mix; `look_key` names it.
      const fluxLook = s.look ? LOOK_FLUX[s.look] : undefined;
      if (s.look && !fluxLook) return { look: s.look, ...blush, intensity: lvl };
      const lipKey = fluxLook?.lip ?? s.lip;
      const eyeKey = fluxLook?.eye ?? s.eye;
      const lip = lipKey ? { lip_key: lipKey, lip_prompt: String(lipByKey(lipKey)?.attributes.prompt ?? "") } : {};
      const eye = eyeKey ? { eye_key: eyeKey, eye_prompt: String(eyeByKey(eyeKey)?.attributes.prompt ?? "") } : {};
      const named = s.look ? { look_key: s.look } : {};
      return lipKey || eyeKey || bKey ? { ...named, ...lip, ...eye, ...blush, intensity: lvl } : null;
    }
    return s.beard ? { beard: s.beard, density: lvl } : null;
  }

  /**
   * Steps stack in order (cut → colour → make-up/beard). This step edits the image kept in the steps before it
   * — going back to an earlier step finds its own results again, independent of what was done after it.
   */
  const order = tryOrder(gender);
  const baseTryon = order.slice(0, Math.max(0, order.indexOf(kind))).map((k) => look.layers[k]).filter(Boolean).at(-1) ?? null;
  /** Cache key: same option + same settings + same image underneath = same picture. */
  const resultKey = (p: Record<string, unknown>, file?: File | null) =>
    `${kind}|${JSON.stringify(p)}|${file ? `${file.name}:${file.size}` : ""}|${baseTryon?.id ?? 0}`;

  /** Keep `tr` (or the original: null) for this step; later steps made on a different image no longer apply. */
  function setLayer(tr: TryOn | null) {
    updateLook((prev) => {
    const layers = { ...prev.layers, [kind]: tr };
    const cleared: Partial<LookDraft> = {};
    let top: TryOn | null = null;
    for (const k of order) {
      const layer = layers[k];
      if (!layer) continue;
      if ((layer.parent_id ?? null) !== (top?.id ?? null)) {
        layers[k] = null; // built on an image the customer no longer keeps (still cached for if they go back)
        Object.assign(cleared, k === "cut" ? { cut: null } : k === "colour" ? { hair_shade: null, technique: null }
          : k === "makeup" ? { makeup_look: null, lip: null, eye: null, blush: null } : { beard: null });
        continue;
      }
      top = layer;
    }
    return { ...cleared, layers, lastTryon: top, history: order.map((k) => layers[k]).filter(Boolean) as TryOn[] };
    }); // from the latest look: a result saved while this one generated is kept
  }
  /** Which option a selection is (for the option card's processing / processed state). */
  const optionOf = (s: Sel) => (usesUpload(s) ? UPLOAD : kind === "cut" ? s.item : kind === "colour" ? s.shade
    : kind === "makeup" ? `${s.look ?? `${s.lip}+${s.eye}`}${s.blush ? `+${s.blush}` : ""}` : s.beard);
  const [processingRaw, setProcessing] = useState<string | null>(null);
  /** FLUX_VERSION_3 tabs: pick another option (Recommended / Custom) → Try → back on Result, generating. */
  const [view, setView] = useState<"recommended" | "custom" | "result">("result");
  const [optSel, setOptSel] = useState<string | null>(null);
  const processing = busy ? processingRaw : null;

  /** Processed result for an option at the current settings, if any (shown on its card). */
  function resultFor(option: string | null): TryOn | null {
    if (!option) return null;
    const s: Sel = { ...sel, ...(kind === "cut" ? { item: option } : kind === "colour" ? { shade: option }
      : kind === "makeup" ? { look: option } : { beard: option }) };
    const p = paramsFor(s, level);
    const r = p ? look.results[resultKey(p, option === UPLOAD ? ref?.file : null)] : undefined;
    return r?.status === "done" ? r : null;
  }

  /** Replace this kind's layer if it is on top, else stack on the newest layer. "None" just removes it. */
  async function apply(s: Sel, lvl = level, file: File | null = ref?.file ?? null, mods?: HairMods) {
    if (!session) return;
    const reference = usesUpload(s) ? file : null;
    if (usesUpload(s) && !reference) return;
    const p = paramsFor(s, lvl, mods);
    if (!p) {
      setLayer(null); // Original / None: keep the image from the previous steps
      return;
    }
    const key = resultKey(p, reference);
    const cached = look.results[key];
    if (cached?.status === "done") {
      // Already processed: show it again, no new AI call (usually already in the browser cache).
      await preload(cached.output_url);
      setLayer(cached);
      setError(null);
      return;
    }
    setBusyKind(kind);
    setProcessing(optionOf(s));
    setError(null);
    try {
      const tr = await studioApi.tryOn(session.id, { kind, params: p, parent_id: baseTryon?.id ?? null, reference });
      if (tr.status === "done") {
        await preload(tr.output_url); // keep "Generating…" until the new picture is ready to show
        // Merge into the latest results (not the ones from when Try was tapped): earlier tries stay in the history.
        updateLook((prev) => ({ results: { ...prev.results, [key]: tr } }));
        setServerTryons((list) => [tr, ...list.filter((x) => x.id !== tr.id)]);
        refreshTryons();
        setLayer(tr);
      } else {
        // A failed attempt never becomes the image the next step builds on: keep what was there.
        setError(tr.error ?? t("tryon", "failed"));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKind((k) => (k === kind ? null : k));
      setProcessing(null);
    }
  }

  /** Keep this tab's choice in the look straight away, so other tabs and the title reflect it. */
  function commit(s: Sel, lvl = level) {
    const patch: Partial<LookDraft> = { params: { ...look.params, [`${kind}_level`]: lvl } };
    if (kind === "cut") patch.cut = s.item;
    if (kind === "colour") Object.assign(patch, { hair_shade: s.shade, technique: s.shade ? s.technique : null });
    if (kind === "makeup") Object.assign(patch, { makeup_look: s.look, lip: s.lip, eye: s.eye, blush: s.blush });
    if (kind === "beard") patch.beard = s.beard;
    updateLook(patch);
  }

  function pick(patch: Partial<Sel>) {
    const s = { ...sel, ...patch, ...(("lip" in patch || "eye" in patch) ? { look: null } : {}) };
    setSel(s);
    commit(s);
    void apply(s);
  }

  /** "Original": back to the photo from the earlier steps — no AI call, even if bangs / fade / styling are set. */
  function original() {
    const s = { ...sel, item: null };
    setSel(s);
    commit(s);
    setLayer(null);
  }

  /** Try the option picked on Recommended / Custom: back to the Result tab, which shows the generation screen. */
  function tryOption() {
    if (!optSel) return;
    setView("result");
    if (kind === "cut") pick({ item: optSel });
    else if (kind === "colour") pick({ shade: optSel, technique: look.technique ?? sel.technique });
    else if (kind === "makeup") pick(optSel === "custom" ? { look: null, lip: look.lip, eye: look.eye, blush: look.blush } : { look: optSel });
    else pick({ beard: optSel });
  }

  function switchTab(k: TryKind) {
    if (k === kind) return;
    setKind(k);
    setView("result");
    setOptSel(null);
    const path = window.location.pathname.replace(/\/try\/[a-z]+/, `/try/${k}`);
    window.history.replaceState(null, "", `${path}?next=${encodeURIComponent(next)}${chain ? "&chain=1" : ""}`);
  }

  /** "Upload a photo": the AI applies the style from the customer's picture. */
  function onUpload(file: File) {
    setRef({ file, url: URL.createObjectURL(file) });
    const field = kind === "cut" ? "item" : kind === "colour" ? "shade" : kind === "makeup" ? "look" : "beard";
    const s = { ...sel, [field]: UPLOAD, ...(kind === "makeup" ? { lip: null, eye: null } : {}) };
    setSel(s);
    commit(s);
    void apply(s, level, file);
  }

  // Arriving from a result card (e.g. ?shade=mahogany): generate it straight away, like the mockup.
  useEffect(() => {
    if (!session || !config) return;
    const fromUrl = search.get("item") || search.get("shade") || search.get("look") || search.get("beard");
    const top = look.layers[kind];
    if (!fromUrl || autoRan.current === `${kind}:${fromUrl}` || (top && JSON.stringify(top.params).includes(fromUrl))) return;
    autoRan.current = `${kind}:${fromUrl}`;
    commit(preset); // record the choice too, not only the image (else the look says "No change")
    void apply(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, session?.id, config]);

  if (!config || !session) return <LoadingStage />;

  const kinds = order;
  const journeyService = (Object.keys(SERVICE_TRY) as Service[]).find((sv) => SERVICE_TRY[sv] === kind);
  /** What this step starts from: the image kept in the earlier steps (e.g. the chosen haircut), else the photo. */
  const startImage = baseTryon?.output_url ?? photo;
  const name = (list: CatalogItem[], key: string | null) =>
    key === UPLOAD ? t("tryon", "yourPhoto") : tx(list.find((i) => i.key === key)?.name);

  // Header: "Lob with curtain bangs" / "Chocolate brown (uniform), terracotta lips, bronze eyes"
  const L: LookDraft = { ...look, ...(kind === "cut" ? { cut: sel.item } : {}), ...(kind === "colour" ? { hair_shade: sel.shade, technique: sel.technique } : {}),
    ...(kind === "makeup" ? { lip: sel.lip, eye: sel.eye, blush: sel.blush } : {}), ...(kind === "beard" ? { beard: sel.beard } : {}) };
  // Title = this step's choice (a haircut on Haircut, the shade on Colour, …); subtitle = the step + details.
  const blushName = L.blush ? `${name(blushAll, L.blush).toLowerCase()} ${t("tryon", "blushWord")}` : "";
  const makeupName0 = L.makeup_look === UPLOAD ? t("tryon", "yourPhoto")
    : sel.look ? name(looksAll, sel.look)
    : [L.lip ? `${name(lipsAll, L.lip)} ${t("tryon", "lipsWord")}` : "", L.eye ? `${name(eyesAll, L.eye).toLowerCase()} ${t("tryon", "eyesWord")}` : ""].filter(Boolean).join(", ");
  const makeupName = [makeupName0, blushName].filter(Boolean).join(", ");
  const line1 = kind === "cut" ? (L.cut ? name(cutsAll, L.cut) : t("tryon", "yourHair"))
    : kind === "colour" ? (L.hair_shade ? name(shadesAll, L.hair_shade) : t("tryon", "natural"))
    : kind === "makeup" ? (makeupName || t("tryon", "none"))
    : (L.beard ? name(beards, L.beard) : t("tryon", "none"));
  const line2 = [t("tryon", KIND_CAT[kind]),
    kind === "colour" && L.hair_shade && L.hair_shade !== UPLOAD && L.technique ? name(techniques, L.technique) : "",
    ...(kind === "cut" ? Object.entries(look.hairMods ?? {}).filter(([, v]) => !!v).map(([g, v]) => t("hair", `${g}_${v}`)) : []),
  ].filter(Boolean).join(" · ");

  /**
   * Save keeps the selected image for this step — Original (no change) or a processed result — and moves on:
   * cut → colour → make-up / beard, each built on the image kept in the previous step; the last step goes on.
   */
  function save() {
    commit(sel);
    const following = kinds[kinds.indexOf(kind) + 1];
    if (following && chain) switchTab(following);
    else router.push(next);
  }


  const label = (s: string) => <span style={{ fontSize: 13, color: c("ink-muted") }}>{s}</span>;
  /** Option order: processing → processed → not tried yet (Original stays first, Upload last). */
  const stage = (key: string) => (processing === key ? 0 : resultFor(key) ? 1 : 2);
  const ordered = <T extends { key: string }>(list: T[]) => [...list].sort((a, b) => stage(a.key) - stage(b.key));
  /** A processed option shows the customer's result instead of the placeholder picture. */
  const shown = (key: string, placeholder: string | null) => resultFor(key)?.output_url ?? placeholder;
  const dots = (list: CatalogItem[], value: string | null, onPick: (k: string | null) => void, withUpload = false) => (
    <div style={{ display: "flex", gap: 10, alignItems: "center", overflowX: "auto", scrollbarWidth: "none", minWidth: 0, paddingBottom: 2 }}>
      <ColorDot hex={null} label={t("tryon", "none")} active={value === null} onClick={() => onPick(null)} />
      {ordered(list).map((s) => (
        <ColorDot key={s.key} hex={s.hex} image={shown(s.key, styleImage(s.kind, s.key, s.image_url))} label={tx(s.name)}
          active={value === s.key} busy={processing === s.key} onClick={() => onPick(s.key)} />
      ))}
      {withUpload ? <UploadOption compact label={t("tryon", "upload")} preview={shown(UPLOAD, ref?.url ?? null)} active={usesUpload(sel)} onFile={onUpload} /> : null}
    </div>
  );

  /**
   * Every result tried at this step on the current image (any shade / technique / intensity / lips+eyes mix), from the
   * backend for this session — newest last, so trying something new never hides earlier results.
   */
  const history = serverTryons
    .filter((tr) => tr.kind === kind && tr.status === "done" && !!tr.output_url && (tr.parent_id ?? null) === (baseTryon?.id ?? null))
    .reverse() // oldest first, newest last
    .filter((tr, i, all) => all.findIndex((x) => x.output_url === tr.output_url) === i)
    .map((tr) => ({ key: String(tr.id), tr, params: (tr.params ?? {}) as Record<string, unknown> }));
  const historyName = (p: Record<string, unknown>) => {
    if (kind === "cut") return p.item ? name(cutsAll, p.item as string) : t("tryon", "yourHair");
    if (kind === "beard") return name(beardsAll, (p.beard as string) ?? null);
    if (kind === "colour") return name(shadesAll, (p.shade as string) ?? null);
    if (p.look || p.look_key) return name(looksAll, (p.look ?? p.look_key) as string);
    const n = [lipByKey(p.lip_key as string)?.name, eyeByKey(p.eye_key as string)?.name, blushByKey(p.blush_key as string)?.name]
      .filter(Boolean).map((x) => tx(x));
    return n.join(" · ") || t("tryon", "yourPhoto");
  };
  /** Show an earlier result again (no AI call) and restore its selection. */
  function showHistory(h: (typeof history)[number]) {
    const p = h.params;
    const s: Sel = kind === "cut" ? { ...sel, item: (p.item as string) ?? null }
      : kind === "beard" ? { ...sel, beard: (p.beard as string) ?? null }
      : kind === "colour"
      ? { ...sel, shade: (p.shade as string) ?? null, technique: (p.technique as string) ?? sel.technique }
      : (p.look || p.look_key) ? { ...sel, look: (p.look ?? p.look_key) as string, lip: null, eye: null, blush: (p.blush_key as string) ?? null }
      : { ...sel, look: null, lip: (p.lip_key as string) ?? null, eye: (p.eye_key as string) ?? null, blush: (p.blush_key as string) ?? null };
    setSel(s);
    commit(s);
    setLayer(h.tr);
    setError(null);
  }
  const historyRow = (noneActive: boolean, onNone: () => void) => optionRow(t("tryon", "queueTitle"),
    <ImageOption compact height={62} image={photo} focus="50% 20%" label={t("tryon", "original")} sub={status(null, noneActive)}
      active={noneActive} onClick={onNone} />,
    [
      ...history.map((h) => {
        const active = look.layers[kind]?.id === h.tr.id;
        return (
          <ImageOption compact height={62} key={h.key} image={ready(h.tr.output_url)} focus="50% 30%" label={historyName(h.params)}
            sub={active ? t("tryon", "statusShowing") : t("tryon", "statusTried")} active={active} done onClick={() => showHistory(h)} />
        );
      }),
      ...(processing ? [<ImageOption compact height={62} key="processing" image={photo} focus="50% 30%" label={t("tryon", "statusGenerating")}
        sub={t("tryon", "statusGenerating")} active={false} busy onClick={() => {}} />] : []),
    ]);

  /** Styles processing or already processed (the original / "None" card is always shown first). */
  const tried = (list: CatalogItem[]) => ordered(list.filter((x) => processing === x.key || !!resultFor(x.key)));
  /** Status under a queue card: generating / showing (selected) / tried. */
  const status = (key: string | null, active: boolean) =>
    key && processing === key ? t("tryon", "statusGenerating") : active ? t("tryon", "statusShowing")
      : key === null ? t("tryon", "statusPhoto") : t("tryon", "statusTried");
  /** The queue under the result: original + every look tried so far, small cards, 5 per row. */
  const optionRow = (_title: string, first: React.ReactNode, rest: React.ReactNode[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ ...SERIF, fontSize: 16 }}>{t("tryon", "queueTitle")} <span style={{ fontSize: 12, color: c("ink-muted") }}>· {rest.length}</span></span>
        <span style={{ fontSize: 11, color: c("ink-muted") }}>{t("tryon", "queueHint")}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
        {first}
        {rest}
      </div>
    </div>
  );


  return (
    // Journey (one service): the journey's own progress ("Service 3 of 5 · Hair colour"), not the step bar.
    <Screen step={single ? undefined : 5}>
      {single && journeyService && !back?.includes("simple=1") ? <JourneyBar service={journeyService} /> : null}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "14px 34px 0 34px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span style={{ ...SERIF, fontSize: 24, lineHeight: 1.12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{line1}</span>
          <span style={{ fontSize: 13, color: c("ink-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{line2}</span>
        </div>
        
      </div>

      {journeyService ? (
        <Tabs tabs={[
          { key: "recommended", label: t("face", "tabRecommended") },
          { key: "custom", label: t("face", "tabCatalogue") },
          { key: "result", label: t("tryon", "tabResult") },
        ]} value={view} onChange={(k) => {
          if (k !== "result") setOptSel(optionOf(sel) && optionOf(sel) !== UPLOAD ? optionOf(sel) : null);
          setView(k as typeof view);
        }} />
      ) : null}

      {view !== "result" && journeyService ? (
        <>
          <Options bare tab={view} service={journeyService} sel={optSel} setSel={setOptSel}
            a={results?.tabs.find((x) => x.module === SERVICE_MODULE[journeyService] && x.status === "done")} />
          <div style={{ flex: "0 0 auto", padding: "12px 34px 32px 34px" }}>
            <PrimaryButton icon={ICON.sparkle} disabled={!optSel || !!busyKind} onClick={tryOption}>{t("tryon", "tryThis")}</PrimaryButton>
          </div>
        </>
      ) : busy ? (
        <GeneratingScan image={startImage} />
      ) : (<>
      <CompareArch before={ready(startImage)} after={ready(look.layers[kind]?.output_url)} />

      {single ? null : <div style={{ margin: "18px 34px 0 34px" }}>
        <Segmented
          options={kinds.map((k) => ({ key: k, label: t("tryon", KIND_CAT[k]) }))}
          value={kind}
          onChange={(k) => switchTab(k as TryKind)}
        />
      </div>}

      {/* While a picture is generating only the photo is shown: no option grid / catalogue underneath. */}
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 12, padding: "14px 34px 0 34px",
        visibility: busy ? "hidden" : "visible" }}>
        {/* Only the original + styles already processed (or processing) — new styles are picked on the Styles tab. */}
        {kind === "cut" && historyRow(!look.layers.cut, original)}

        {/* Bangs / fade / styling are picked on the Custom tab (with the haircut), not on the Result. */}

        {kind === "colour" && historyRow(!look.layers.colour, () => pick({ shade: null }))}

        {/* Same as hairstyle / colour: Original + every make-up tried so far (new ones are picked on Recommended / Custom). */}
        {kind === "makeup" && historyRow(!look.layers.makeup, () => pick({ look: null, lip: null, eye: null, blush: null }))}

        {kind === "beard" && historyRow(!look.layers.beard, () => pick({ beard: null }))}
      </div>
      <ErrorLine message={error} />

      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "stretch", gap: 12, padding: "12px 34px 32px 34px" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <PrimaryButton icon={ICON.save} onClick={save} disabled={busy}>{t("tryon", "save")}</PrimaryButton>
        </div>
        {/* QR: download the picture shown (this step's result, else the image it starts from). */}
        <PhotoQR src={look.layers[kind]?.output_url ?? startImage} name={look.layers[kind] ? `${t("tryon", KIND_CAT[kind])} - ${line1}` : t("qr", "original")}
          style={{ position: "relative", top: "auto", left: "auto", height: "auto", minHeight: 56, padding: "0 22px", borderRadius: 999, fontSize: 15,
            background: "transparent", border: `1px solid ${c("line-strong")}`, boxShadow: "none" }} />
      </div>
      </>)}

    </Screen>
  );
}
