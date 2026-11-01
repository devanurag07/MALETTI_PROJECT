"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { studioApi, type AnalysisTab, type Recommendation, type Results } from "../api";
import { useStudio } from "../context/StudioContext";
import { styleImage } from "../theme/styleImages";
import {
  c, Card, ColorChip, ColorDot, Diamond, ErrorLine, H1, Icon, ICON, LoadingStage, Muted, OutlineButton, Photo,
  PillButton, PrimaryButton, Screen, SectionTitle, SERIF, Spinner, Tabs,
} from "../ui";

type Tab = "skin" | "face" | "colour" | "scalp";
const TAB_LABEL: Record<Tab, string> = { skin: "tabSkin", face: "tabFace", colour: "tabColour", scalp: "tabScalp" };
const NEXT: Record<Tab, string> = { skin: "/results/face", face: "/results/colour", colour: "/look", scalp: "/results/skin" };

/** Step 4 — Results: skin → products, face → cuts/beard, colour harmony, scalp (phase 2). */
export default function ResultsScreen({ tab }: { tab: Tab }) {
  const router = useRouter();
  const { t, config, session } = useStudio();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) studioApi.results(session.id).then(setResults).catch((e: Error) => setError(e.message));
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config || !session) return <LoadingStage />;
  const status = (m: string) => config.modules.find((x) => x.module === m)?.status;
  const tabs = (Object.keys(TAB_LABEL) as Tab[])
    .filter((m) => status(m) && status(m) !== "off")
    .map((m) => ({ key: m, label: t("results", TAB_LABEL[m]), locked: status(m) === "coming_soon" }));
  const current = results?.tabs.find((x) => x.module === tab);

  return (
    <Screen step={4} animKey={tab}>
      <Tabs tabs={tabs} value={tab} onChange={(k) => router.replace(`/results/${k}`)} />
      {tab === "scalp" || status(tab) === "coming_soon" ? (
        <ScalpTab />
      ) : !results ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={36} /></div>
      ) : !current || current.status !== "done" ? (
        <div style={{ flex: 1 }}><ErrorLine message={current?.error ?? error ?? t("analysis", "failed")} /></div>
      ) : tab === "skin" ? (
        <SkinTab a={current} />
      ) : tab === "face" ? (
        <FaceTab a={current} />
      ) : (
        <ColourTab a={current} />
      )}
      {tab !== "scalp" && status(tab) !== "coming_soon" ? (
        <div style={{ flex: "0 0 auto", padding: "14px 34px 34px 34px" }}>
          <PrimaryButton iconRight={ICON.next} onClick={() => router.push(NEXT[tab])}>{t(tab, "cta")}</PrimaryButton>
        </div>
      ) : null}
    </Screen>
  );
}

// ------------------------------------------------------------------------------------------- skin

const METRIC_FILL: Record<string, string> = { hydration: "metric-cool", sebum: "metric-warm" };

function SkinTab({ a }: { a: AnalysisTab }) {
  const { t, tx, config, look, updateLook, photo } = useStudio();
  const names = Object.fromEntries((config?.taxonomy.skin_metric ?? []).map((m) => [m.key, m.name]));
  const products = a.recommendations.product ?? [];
  const toggle = (key: string) =>
    updateLook({ products: look.products.includes(key) ? look.products.filter((k) => k !== key) : [...look.products, key] });

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
        <div style={{
          flex: "0 0 auto", position: "relative", width: 112, height: 132, borderRadius: "56px 56px 14px 14px", overflow: "hidden",
          background: c("photo"), outline: `1px solid ${c("accent")}`, outlineOffset: 4,
        }}>
          <Photo src={photo} />
          <svg viewBox="0 0 560 700" width={112} height={132} preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
            {a.zones.oily_t_zone ? (
              <path d="M194 125 L368 122 L368 158 L302 158 L303 287 L258 287 L255 161 L194 161 Z" fill="var(--mm-zone-oily)" fillOpacity="0.42" stroke="#FFF3DC" strokeWidth="2.5" strokeOpacity="0.8" strokeLinejoin="round" />
            ) : null}
            {a.zones.dehydrated_cheeks ? (
              <>
                <ellipse cx="210" cy="280" rx="34" ry="24" fill="#8FB3C4" fillOpacity="0.18" stroke="var(--mm-zone-dry)" strokeWidth="5" strokeDasharray="10 8" />
                <ellipse cx="351" cy="280" rx="34" ry="24" fill="#8FB3C4" fillOpacity="0.18" stroke="var(--mm-zone-dry)" strokeWidth="5" strokeDasharray="10 8" />
              </>
            ) : null}
          </svg>
        </div>
      </div>

      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 10, padding: "18px 34px 0 34px" }}>
        {Object.entries(a.metrics).map(([k, v]) => {
          const n = Math.max(0, Math.min(100, Number(v ?? 0)));
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 104, fontSize: 14 }}>{tx(names[k]) || k}</span>
              <span style={{ flex: "1 1 auto", display: "block", height: 6, borderRadius: 3, background: c("track"), overflow: "hidden" }}>
                <span style={{ display: "block", height: 6, width: `${n}%`, borderRadius: 3, background: c(METRIC_FILL[k] ?? "metric-neutral") }} />
              </span>
              <span style={{ width: 34, textAlign: "right", ...SERIF, fontSize: 19, lineHeight: 1 }}>{n}</span>
            </div>
          );
        })}
      </div>

      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 10, padding: "20px 34px 0 34px" }}>
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
    </>
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

function FaceTab({ a }: { a: AnalysisTab }) {
  const router = useRouter();
  const { t, tx, gender, look, photo } = useStudio();
  const v = (x: unknown) => (x == null ? "–" : t("face", `values.${x}`).replace(/^values\./, ""));
  const cuts = (a.recommendations.haircut ?? []).slice(0, 2);
  const beards = (a.recommendations.beard_style ?? []).slice(0, 3);
  const isMan = gender === "man";
  const saved = [
    cuts.find((x) => x.key === look.cut) ?? null,
    isMan ? beards.find((x) => x.key === look.beard) ?? null : null,
  ].filter(Boolean) as Recommendation[];
  const thumb = look.lastTryon?.output_url || photo;

  return (
    <>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 18, padding: "16px 34px 0 34px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 auto", minWidth: 0 }}>
          <H1 size={36}>{tx(a.label?.name)}</H1>
          <Muted>{tx(a.summary) || tx(a.label?.desc)}</Muted>
        </div>
        <svg width="64" height="80" viewBox="0 0 84 104" fill="none" aria-hidden="true" style={{ flex: "0 0 auto" }}>
          <path d={SHAPE_PATH[a.label?.key ?? ""] ?? SHAPE_PATH.oval} stroke="var(--mm-ink)" strokeWidth="1.6" />
          <path d="M6 52 H78" stroke="var(--mm-accent)" strokeWidth="1.3" strokeDasharray="3 4" />
          <path d="M42 4 V100" stroke="var(--mm-accent)" strokeWidth="1.3" strokeDasharray="3 4" />
          <path d="M40 0 L48 0 L44 7 L36 7 Z" fill="var(--mm-accent)" />
          <path d="M40 97 L48 97 L44 104 L36 104 Z" fill="var(--mm-accent)" />
        </svg>
      </div>

      <div style={{
        flex: "0 0 auto", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", margin: "12px 34px 0 34px",
        borderTop: `1px solid ${c("divider")}`, borderBottom: `1px solid ${c("divider")}`,
      }}>
        {[
          [t("face", "ratio"), a.metrics.ratio != null ? Number(a.metrics.ratio).toFixed(1) : "–"],
          [t("face", "cheek"), v(a.metrics.cheekbones)],
          [t("face", "jaw"), v(a.metrics.jawline)],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 0" }}>
            <span style={{ fontSize: 12, color: c("ink-muted") }}>{label}</span>
            <span style={{ ...SERIF, fontSize: 20, lineHeight: 1.15 }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {saved.length ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 34px 0 34px", fontSize: 13 }}>
            <Diamond size={10} />
            <span>{t("face", "saved")}: {saved.map((x) => tx(x.name)).join(", ")}</span>
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 34px 0 34px" }}>
          <SectionTitle title={t("face", "cutsTitle")} hint={t("face", "tap")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 230px)", gap: 12 }}>
            {cuts.map((cut) => (
              <button key={cut.key} type="button" onClick={() => router.push(`/try/cut?item=${cut.key}&next=/results/colour`)} style={{
                display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6, minWidth: 0, padding: "8px 8px 12px 8px",
                borderRadius: 22, background: c("surface"), border: `2px solid ${look.cut === cut.key ? c("accent") : c("line")}`,
                color: c("ink"), textAlign: "left", cursor: "pointer",
              }}>
                <span style={{ position: "relative", display: "block", width: 210, height: isMan ? 120 : 246, borderRadius: "80px 80px 12px 12px", overflow: "hidden", background: c("photo") }}>
                  <Photo src={styleImage("haircut", cut.key, cut.image_url) || thumb} style={{ objectPosition: "50% 8%" }} />
                  {cut.is_best ? (
                    <span style={{ position: "absolute", left: 10, bottom: 10, fontSize: 11, fontWeight: 500, color: c("ink"), background: c("accent-soft"), borderRadius: 9, padding: "3px 9px" }}>
                      {t("face", "best")}
                    </span>
                  ) : null}
                </span>
                <span style={{ padding: "2px 4px 0 4px", fontSize: 15, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx(cut.name)}</span>
                <span style={{ padding: "0 4px", fontSize: 12, color: c("ink-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx(cut.sub)}</span>
              </button>
            ))}
          </div>
        </div>
        {isMan && beards.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 34px 0 34px" }}>
            <SectionTitle title={t("face", "beardTitle")} hint={t("face", "tap")} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 149px)", gap: 12 }}>
              {beards.map((b) => (
                <button key={b.key} type="button" onClick={() => router.push(`/try/beard?beard=${b.key}&next=/results/colour`)} style={{
                  display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6, minWidth: 0, padding: "8px 8px 12px 8px",
                  borderRadius: 22, background: c("surface"), border: `2px solid ${look.beard === b.key ? c("accent") : c("line")}`,
                  color: c("ink"), textAlign: "left", cursor: "pointer",
                }}>
                  <span style={{ position: "relative", display: "block", width: 129, height: 100, borderRadius: 14, overflow: "hidden", background: c("photo") }}>
                    <Photo src={styleImage("beard_style", b.key, b.image_url) || thumb} style={{ objectPosition: "50% 60%" }} />
                  </span>
                  <span style={{ padding: "2px 4px 0 4px", fontSize: 14, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx(b.name)}</span>
                  <span style={{ padding: "0 4px", fontSize: 12, color: c("ink-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx(b.sub)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
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
              onClick={() => shade && router.push(`/try/colour?shade=${shade}&next=/results/colour`)}>
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
                <button key={m.key} type="button" onClick={() => router.push(`/try/makeup?look=${m.key}&next=/results/colour`)} style={{
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

// -------------------------------------------------------------------------------------------- scalp

function ScalpTab() {
  const router = useRouter();
  const { t, tx, config } = useStudio();
  const metrics = (config?.modules.find((m) => m.module === "scalp")?.config?.metrics as string[] | undefined) ?? [];
  const names = Object.fromEntries((config?.taxonomy.scalp_metric ?? []).map((m) => [m.key, m.name]));
  return (
    <>
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "0 40px", textAlign: "center" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 420, height: 420, margin: "-210px 0 0 -210px", borderRadius: "50%", background: `radial-gradient(closest-side, ${c("halo")}, rgba(255,251,245,0))` }} />
        <div style={{ position: "relative", width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ position: "absolute", left: 10, top: 10, display: "block", width: 72, height: 72, border: `1.5px solid ${c("accent")}`, transform: "skewX(var(--mm-skew))" }} />
          <Icon d={ICON.lock} size={32} width={1.4} stroke="var(--mm-ink)" style={{ position: "relative" }} />
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 500, background: c("phase-chip"), borderRadius: 10, padding: "3px 12px" }}>{t("scalp", "phase")}</span>
          <H1>{t("scalp", "title")}</H1>
          <Muted size={15} style={{ maxWidth: 390, lineHeight: 1.55 }}>{t("scalp", "desc")}</Muted>
        </div>
      </div>
      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", margin: "0 34px", padding: "6px 18px", borderRadius: 22, background: c("surface"), border: `1px solid ${c("line")}` }}>
        {metrics.map((m) => (
          <div key={m} style={{ display: "flex", alignItems: "center", gap: 14, height: 50, borderBottom: `1px solid ${c("divider-soft")}`, color: c("ink-muted") }}>
            <Diamond size={8} color={c("line-strong")} />
            <span style={{ flex: "1 1 auto", fontSize: 15 }}>{tx(names[m]) || m}</span>
            <span style={{ fontSize: 13, color: c("ink-faint") }}>{t("scalp", "index")}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 10px 0", fontSize: 13 }}>
          <Icon d={ICON.next} size={16} width={1.8} stroke="var(--mm-accent)" />
          <span>{t("scalp", "outcome")}</span>
        </div>
      </div>
      <div style={{ flex: "0 0 auto", padding: "22px 34px 34px 34px" }}>
        <OutlineButton icon={ICON.back} onClick={() => router.push("/results/skin")}>{t("scalp", "cta")}</OutlineButton>
      </div>
    </>
  );
}
