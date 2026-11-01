"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { studioApi, type CatalogItem, type Results, type TryKind, type TryOn } from "../api";
import { UPLOAD, useCatalog, useStudio, type LookDraft } from "../context/StudioContext";
import { tryOrder } from "../flows";
import { styleImage } from "../theme/styleImages";
import {
  c, ChoicePills, ColorDot, CompareArch, ErrorLine, ICON, ImageOption, LoadingStage, PrimaryButton, Screen,
  Segmented, SERIF, Slider, UploadOption,
} from "../ui";

const KIND_CAT: Record<TryKind, string> = { cut: "catCut", colour: "catColour", makeup: "catMakeup", beard: "catBeard" };
type Sel = { item: string | null; shade: string | null; technique: string | null; look: string | null; lip: string | null; eye: string | null; beard: string | null };

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

  const cutsAll = useCatalog("haircut");
  const shadesAll = useCatalog("hair_shade");
  const techniques = useCatalog("hair_technique");
  const lipsAll = useCatalog("lip_shade");
  const eyesAll = useCatalog("eye_shade");
  const looksAll = useCatalog("makeup_look");
  const beardsAll = useCatalog("beard_style");

  // Recommendations from the consultation (colour harmony + face), when there was one.
  const [results, setResults] = useState<Results | null>(null);
  useEffect(() => {
    if (session && session.flow === "consultant" && session.status !== "active")
      studioApi.results(session.id).then(setResults).catch(() => {});
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const rec = (module: string, k: string) => results?.tabs.find((x) => x.module === module)?.recommendations[k];

  const recLooks = rec("colour", "makeup_look");
  const cuts = ranked(rec("face", "haircut"), cutsAll, 2);
  const beards = ranked(rec("face", "beard_style"), beardsAll, 3); // face analysis order (best first)
  const shades = ranked(rec("colour", "hair_shade"), shadesAll, 5);
  const lipKeys = (recLooks ?? []).map((l) => String(l.attributes.lip));
  const eyeKeys = (recLooks ?? []).map((l) => String(l.attributes.eye));
  const lips = ranked(lipsAll.filter((l) => lipKeys.includes(l.key)), lipsAll, 4);
  const eyes = ranked(eyesAll.filter((e) => eyeKeys.includes(e.key)), eyesAll, 4);

  const [sel, setSel] = useState<Sel>({ item: null, shade: null, technique: null, look: null, lip: null, eye: null, beard: null });
  const [level, setLevel] = useState(100);
  const [busy, setBusy] = useState(false);
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
      lip: (presetLook?.attributes.lip as string | undefined) ?? look.lip,
      eye: (presetLook?.attributes.eye as string | undefined) ?? look.eye,
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

  function paramsFor(s: Sel, lvl: number): Record<string, unknown> | null {
    if (usesUpload(s)) return kind === "beard" ? { density: lvl } : kind === "cut" ? {} : { intensity: lvl };
    if (kind === "cut") return s.item ? { item: s.item } : null;
    if (kind === "colour") return s.shade ? { shade: s.shade, technique: s.technique, intensity: lvl } : null;
    if (kind === "makeup") {
      if (s.look) return { look: s.look, intensity: lvl };
      return s.lip || s.eye ? { lip: s.lip, eye: s.eye, intensity: lvl } : null;
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
    const layers = { ...look.layers, [kind]: tr };
    const cleared: Partial<LookDraft> = {};
    let top: TryOn | null = null;
    for (const k of order) {
      const layer = layers[k];
      if (!layer) continue;
      if ((layer.parent_id ?? null) !== (top?.id ?? null)) {
        layers[k] = null; // built on an image the customer no longer keeps (still cached for if they go back)
        Object.assign(cleared, k === "cut" ? { cut: null } : k === "colour" ? { hair_shade: null, technique: null }
          : k === "makeup" ? { makeup_look: null, lip: null, eye: null } : { beard: null });
        continue;
      }
      top = layer;
    }
    updateLook({ ...cleared, layers, lastTryon: top, history: order.map((k) => layers[k]).filter(Boolean) as TryOn[] });
  }
  /** Which option a selection is (for the option card's processing / processed state). */
  const optionOf = (s: Sel) => (usesUpload(s) ? UPLOAD : kind === "cut" ? s.item : kind === "colour" ? s.shade
    : kind === "makeup" ? s.look ?? `${s.lip}+${s.eye}` : s.beard);
  const [processing, setProcessing] = useState<string | null>(null);

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
  async function apply(s: Sel, lvl = level, file: File | null = ref?.file ?? null) {
    if (!session) return;
    const reference = usesUpload(s) ? file : null;
    if (usesUpload(s) && !reference) return;
    const p = paramsFor(s, lvl);
    if (!p) {
      setLayer(null); // Original / None: keep the image from the previous steps
      return;
    }
    const key = resultKey(p, reference);
    const cached = look.results[key];
    if (cached?.status === "done") {
      // Already processed: show it again, no new AI call.
      setLayer(cached);
      setError(null);
      return;
    }
    setBusy(true);
    setProcessing(optionOf(s));
    setError(null);
    try {
      const tr = await studioApi.tryOn(session.id, { kind, params: p, parent_id: baseTryon?.id ?? null, reference });
      if (tr.status === "done") {
        updateLook({ results: { ...look.results, [key]: tr } });
        setLayer(tr);
      } else {
        // A failed attempt never becomes the image the next step builds on: keep what was there.
        setError(tr.error ?? t("tryon", "failed"));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProcessing(null);
    }
  }

  /** Keep this tab's choice in the look straight away, so other tabs and the title reflect it. */
  function commit(s: Sel, lvl = level) {
    const patch: Partial<LookDraft> = { params: { ...look.params, [`${kind}_level`]: lvl } };
    if (kind === "cut") patch.cut = s.item;
    if (kind === "colour") Object.assign(patch, { hair_shade: s.shade, technique: s.shade ? s.technique : null });
    if (kind === "makeup") Object.assign(patch, { makeup_look: s.look, lip: s.lip, eye: s.eye });
    if (kind === "beard") patch.beard = s.beard;
    updateLook(patch);
  }

  function pick(patch: Partial<Sel>) {
    const s = { ...sel, ...patch, ...(("lip" in patch || "eye" in patch) ? { look: null } : {}) };
    setSel(s);
    commit(s);
    void apply(s);
  }

  function switchTab(k: TryKind) {
    if (k === kind) return;
    setKind(k);
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
    void apply(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, session?.id, config]);

  if (!config || !session) return <LoadingStage />;

  const kinds = order;
  /** What this step starts from: the image kept in the earlier steps (e.g. the chosen haircut), else the photo. */
  const startImage = baseTryon?.output_url ?? photo;
  const name = (list: CatalogItem[], key: string | null) =>
    key === UPLOAD ? t("tryon", "yourPhoto") : tx(list.find((i) => i.key === key)?.name);

  // Header: "Lob with curtain bangs" / "Chocolate brown (uniform), terracotta lips, bronze eyes"
  const L: LookDraft = { ...look, ...(kind === "cut" ? { cut: sel.item } : {}), ...(kind === "colour" ? { hair_shade: sel.shade, technique: sel.technique } : {}),
    ...(kind === "makeup" ? { lip: sel.lip, eye: sel.eye } : {}), ...(kind === "beard" ? { beard: sel.beard } : {}) };
  const line1 = L.cut ? name(cutsAll, L.cut) : t("tryon", "yourHair");
  const parts = [L.hair_shade === UPLOAD ? `${t("tryon", "colour")}: ${t("tryon", "yourPhoto").toLowerCase()}`
    : L.hair_shade ? `${name(shadesAll, L.hair_shade)} (${name(techniques, L.technique).toLowerCase()})` : t("tryon", "natural")];
  if (gender === "woman" && (L.lip || L.eye)) {
    if (L.lip) parts.push(`${name(lipsAll, L.lip).toLowerCase()} ${t("tryon", "lipsWord")}`);
    if (L.eye) parts.push(`${name(eyesAll, L.eye).toLowerCase()} ${t("tryon", "eyesWord")}`);
  }
  if (gender === "man" && L.beard) parts.push(name(beards, L.beard).toLowerCase());
  const line2 = parts.join(", ").replace(/^./, (x) => x.toUpperCase());

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
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <ColorDot hex={null} label={t("tryon", "none")} active={value === null} onClick={() => onPick(null)} />
      {ordered(list).map((s) => (
        <ColorDot key={s.key} hex={s.hex} image={shown(s.key, styleImage(s.kind, s.key, s.image_url))} label={tx(s.name)}
          active={value === s.key} busy={processing === s.key} onClick={() => onPick(s.key)} />
      ))}
      {withUpload ? <UploadOption compact label={t("tryon", "upload")} preview={shown(UPLOAD, ref?.url ?? null)} active={usesUpload(sel)} onFile={onUpload} /> : null}
    </div>
  );

  return (
    <Screen step={5}>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "14px 34px 0 34px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span style={{ ...SERIF, fontSize: 24, lineHeight: 1.12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{line1}</span>
          <span style={{ fontSize: 13, color: c("ink-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{line2}</span>
        </div>
        
      </div>

      <CompareArch before={startImage} after={look.layers[kind]?.output_url ?? null} busy={busy} busyLabel={t("tryon", "generating")} />

      <div style={{ margin: "18px 34px 0 34px" }}>
        <Segmented
          options={kinds.map((k) => ({ key: k, label: t("tryon", KIND_CAT[k]) }))}
          value={kind}
          onChange={(k) => switchTab(k as TryKind)}
        />
      </div>

      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 12, padding: "14px 34px 0 34px" }}>
        {kind === "cut" && (
          <>
            {label(t("tryon", "cutLabel"))}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
              <ImageOption image={photo} focus="50% 20%" label={t("tryon", "original")} sub={t("tryon", "originalSub")}
                active={sel.item === null} onClick={() => pick({ item: null })} />
              {ordered(cuts).map((x) => (
                <ImageOption key={x.key} image={shown(x.key, styleImage("haircut", x.key, x.image_url))} focus="50% 8%" label={tx(x.name)} sub={tx(x.sub)}
                  active={sel.item === x.key} busy={processing === x.key} done={!!resultFor(x.key)} onClick={() => pick({ item: x.key })} />
              ))}
            </div>
          </>
        )}

        {kind === "colour" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {label(t("tryon", results ? "shades" : "shadesAll"))}
              {dots(shades, sel.shade, (k) => pick({ shade: k }), true)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {label(t("tryon", "technique"))}
              <ChoicePills options={techniques.map((x) => ({ key: x.key, label: tx(x.name) }))} value={sel.technique}
                onChange={(k) => (sel.shade ? pick({ technique: k }) : setSel({ ...sel, technique: k }))} />
            </div>
            <Slider label={t("tryon", "intensity")} value={level} onChange={setLevel} onCommit={(v) => { commit(sel, v); if (sel.shade) void apply(sel, v); }} />
          </>
        )}

        {kind === "makeup" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {label(t("tryon", "lips"))}
              {dots(lips, sel.lip, (k) => pick({ lip: k }), true)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {label(t("tryon", "eyes"))}
              {dots(eyes, sel.eye, (k) => pick({ eye: k }))}
            </div>
            <Slider label={t("tryon", "intensity")} value={level} onChange={setLevel} onCommit={(v) => { commit(sel, v); if (sel.lip || sel.eye || sel.look) void apply(sel, v); }} />
          </>
        )}

        {kind === "beard" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {label(t("tryon", "beardLabel"))}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
                <ImageOption image={startImage} focus="50% 45%" label={t("tryon", "none")} height={72}
                  active={sel.beard === null} onClick={() => pick({ beard: null })} />
                {ordered(beards).map((b) => (
                  <ImageOption key={b.key} image={shown(b.key, styleImage("beard_style", b.key, b.image_url))} height={72} focus="50% 65%"
                    busy={processing === b.key} done={!!resultFor(b.key)}
                    label={tx(b.attributes.short_i18n as Record<string, string>) || tx(b.name)}
                    active={sel.beard === b.key} onClick={() => pick({ beard: b.key })} />
                ))}
              </div>
            </div>
            <Slider label={t("tryon", "density")} value={level} onChange={setLevel} onCommit={(v) => { commit(sel, v); if (sel.beard) void apply(sel, v); }} />
          </>
        )}
      </div>
      <ErrorLine message={error} />

      <div style={{ flex: "0 0 auto", padding: "12px 34px 32px 34px" }}>
        <PrimaryButton icon={ICON.save} onClick={save} disabled={busy}>{t("tryon", "save")}</PrimaryButton>
      </div>
    </Screen>
  );
}
