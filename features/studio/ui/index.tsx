"use client";

/**
 * Mockup building blocks ("Smart Mirror Maletti"). Sizes are mockup pixels (540 × 960 stage, zoomed ×2);
 * every colour/font/shadow is a theme variable — see features/studio/theme/maletti.ts.
 */
import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { theme } from "../theme";
import { useStudio } from "../context/StudioContext";

export const c = (name: string) => `var(--mm-${name})`;
export const SERIF: CSSProperties = { fontFamily: c("font-display"), fontStyle: "italic", fontWeight: 400 };

// ---------------------------------------------------------------- icons (mockup paths, 24×24)
export const ICON = {
  back: "M15 6l-6 6 6 6",
  next: "M9 6l6 6-6 6",
  camera: "M4 8h3l2-3h6l2 3h3v11H4z M12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  lock: "M5 11h14v10H5z M8 11V8a4 4 0 0 1 8 0v3",
  check: "M5 12.5l4.5 4.5L19 7.5",
  retake: "M4 12a8 8 0 0 1 14-5.3L20 9 M20 4v5h-5",
  compare: "M8 7l-5 5 5 5M16 7l5 5-5 5",
  handle: "M9 7l-5 5 5 5M15 7l5 5-5 5",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  bottle: "M9 3h6v4H9z M8 7h8l1 3v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10z M9.5 14h5",
  save: "M6 4h12v17l-6-4-6 4z",
  send: "M22 2L11 13 M22 2l-7 20-4-9-9-4z",
  pencil: "M4 20h4L19 9l-4-4L4 16z M14 6l4 4",
  slash: "M5 19L19 5",
  upload: "M12 16V4 M7 9l5-5 5 5 M5 20h14",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  close: "M6 6l12 12 M18 6L6 18",
  skin: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  face: "M12 3c4 0 7 3.6 7 9s-3 9-7 9-7-3.6-7-9 3-9 7-9z M9.5 10.5h.01 M14.5 10.5h.01 M10 15.5c1.2.8 2.8.8 4 0",
  colour: "M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 2-3 2-4a9 9 0 0 0-8-8z M8 10h.01 M12 7.5h.01 M16 10h.01",
  scalp: "M4 20c0-5 3-9 8-9s8 4 8 9 M8 11c0-4 2-7 4-7s4 3 4 7",
  serviceColour: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z M9 14a3 3 0 0 0 3 3",
  serviceCut: "M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M8.1 8.1L20 20 M8.1 15.9L20 4",
  serviceMakeup: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  serviceBeard: "M7 9c0 6 2 10 5 10s5-4 5-10 M8 9h8 M10 15c1 .8 3 .8 4 0",
} as const;

export function Icon({ d, size = 20, stroke = "currentColor", width = 1.6, style }: {
  d: string; size?: number; stroke?: string; width?: number; style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", ...style }}>
      <path d={d} />
    </svg>
  );
}

/** The brand parallelogram. */
export function Diamond({ size = 9, color = c("accent"), border, style }: {
  size?: number; color?: string; border?: string; style?: CSSProperties;
}) {
  return (
    <span style={{
      display: "block", width: size, height: size, flex: "0 0 auto", boxSizing: "border-box",
      background: color, border, transform: `skewX(${theme.shape.skew})`, ...style,
    }} />
  );
}

// ---------------------------------------------------------------- stage + chrome

/** 540 × 960 mockup canvas, zoomed to fill the 1080 × 1920 mirror. */
export function Stage({ children, animKey }: { children: ReactNode; animKey?: string }) {
  return (
    <div id="mm-stage" style={{ position: "relative", width: theme.layout.width, height: theme.layout.height, zoom: theme.layout.stageZoom } as CSSProperties}>
      <div key={animKey} style={{
        width: "100%", height: "100%", boxSizing: "border-box", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", background: c("background"), color: c("ink"),
        fontFamily: c("font-body"), animation: "mmIn 0.5s ease-out both",
      }}>
        {children}
      </div>
    </div>
  );
}

export function Header({ onBack }: { onBack?: (() => void) | false }) {
  const router = useRouter();
  const { t } = useStudio();
  const back = onBack === undefined ? () => router.back() : onBack;
  return (
    <div style={{
      flex: "0 0 auto", height: 88, boxSizing: "border-box", padding: "0 22px", background: c("header"),
      borderBottom: `1px solid ${c("header-line")}`, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
    }}>
      {back ? (
        <button type="button" onClick={back} style={{
          justifySelf: "start", display: "flex", alignItems: "center", gap: 6, height: 44, padding: "0 16px 0 10px",
          borderRadius: 22, border: `1px solid ${c("line-strong")}`, background: c("surface"),
          color: c("ink"), fontSize: 14, cursor: "pointer",
        }}>
          <Icon d={ICON.back} size={18} width={1.8} />
          <span>{t("common", "back")}</span>
        </button>
      ) : <div style={{ width: 44, height: 44 }} />}
      <img src={theme.brand.logo} alt={theme.brand.name} style={{ display: "block", height: theme.brand.logoHeight, width: "auto" }} />
      <LangToggle />
    </div>
  );
}

/** EN/IT switch. `dark` = on the black home screen. */
export function LangToggle({ dark }: { dark?: boolean }) {
  const { config, locale, setLocale } = useStudio();
  const locales = config?.locales?.length ? config.locales : ["en", "it"];
  return (
    <div style={{
      justifySelf: "end", display: "flex", gap: 2, padding: 3, borderRadius: 25,
      background: dark ? "rgba(255,255,255,0.06)" : c("surface"),
      border: dark ? "1px solid rgba(255,255,255,0.18)" : `1px solid ${c("line-strong")}`,
    }}>
      {locales.map((l) => (
        <button key={l} type="button" onClick={() => l !== locale && setLocale(l)} style={{
          width: 44, height: 38, border: "none", borderRadius: 19, fontSize: 13, fontWeight: 500, cursor: "pointer",
          background: l === locale ? (dark ? c("home-cta") : c("ink")) : "transparent",
          color: l === locale ? (dark ? c("home-cta-ink") : c("on-dark")) : (dark ? c("home-ink-muted") : c("ink")),
        }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function StepBar({ step, total = 6 }: { step: number; total?: number }) {
  const { t } = useStudio();
  return (
    <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 34px 0 34px" }}>
      <span style={{ fontSize: 13, color: c("ink-muted") }}>{t("common", "step", { n: step, total })}</span>
      <div style={{ display: "flex", gap: 7 }}>
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <span key={n} style={{
            display: "block", width: 24, height: 7, transform: `skewX(${theme.shape.stepSkew})`,
            background: n < step ? c("step-done") : n === step ? c("step-current") : c("step-todo"),
          }} />
        ))}
      </div>
    </div>
  );
}

/** Header + step bar + content column. */
export function Screen({ step, onBack, animKey, children }: {
  step?: number; onBack?: (() => void) | false; animKey?: string; children: ReactNode;
}) {
  return (
    <Stage animKey={animKey}>
      <Header onBack={onBack} />
      {step ? <StepBar step={step} /> : null}
      {children}
    </Stage>
  );
}

export const Spacer = () => <div style={{ flex: "1 1 auto", minHeight: 0 }} />;

// ---------------------------------------------------------------- typography

export function H1({ children, size = 38, style }: { children: ReactNode; size?: number; style?: CSSProperties }) {
  return <h1 style={{ margin: 0, ...SERIF, fontSize: size, lineHeight: 1.05, color: c("ink"), ...style }}>{children}</h1>;
}
export function H2({ children, size = 24, style }: { children: ReactNode; size?: number; style?: CSSProperties }) {
  return <h2 style={{ margin: 0, ...SERIF, fontSize: size, lineHeight: 1.15, color: c("ink"), ...style }}>{children}</h2>;
}
export function Muted({ children, size = 14, style }: { children: ReactNode; size?: number; style?: CSSProperties }) {
  return <p style={{ margin: 0, fontSize: size, lineHeight: 1.45, color: c("ink-muted"), ...style }}>{children}</p>;
}

/** "Suggested cuts ........ Tap to try" */
export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <H2>{title}</H2>
      {hint ? <span style={{ fontSize: 13, color: c("ink-muted") }}>{hint}</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------- buttons

export function PrimaryButton({ children, onClick, icon, iconRight, disabled, loading, style }: {
  children: ReactNode; onClick?: () => void; icon?: string; iconRight?: string;
  disabled?: boolean; loading?: boolean; style?: CSSProperties;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%", height: 64,
      margin: 0, border: "none", borderRadius: 32, background: c("ink"), color: c("on-dark"), fontSize: 17,
      fontWeight: 500, cursor: disabled || loading ? "default" : "pointer", boxShadow: c("shadow-cta"),
      opacity: disabled ? 0.45 : 1, ...style,
    }}>
      {loading ? <Spinner size={20} color={c("on-dark")} /> : icon ? <Icon d={icon} size={22} /> : null}
      <span>{children}</span>
      {iconRight && !loading ? <Icon d={iconRight} size={20} width={1.8} /> : null}
    </button>
  );
}

export function OutlineButton({ children, onClick, icon, style, disabled }: {
  children: ReactNode; onClick?: () => void; icon?: string; style?: CSSProperties; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", height: 64,
      borderRadius: 32, border: `1px solid ${c("ink")}`, background: "transparent", color: c("ink"),
      fontSize: 17, cursor: "pointer", opacity: disabled ? 0.45 : 1, ...style,
    }}>
      {icon ? <Icon d={icon} size={18} width={1.8} /> : null}
      <span>{children}</span>
    </button>
  );
}

/** Small rounded button: "Retake", "Try", "Add". */
export function PillButton({ children, onClick, icon, active, style, disabled }: {
  children: ReactNode; onClick?: () => void; icon?: string; active?: boolean; style?: CSSProperties; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} disabled={disabled} style={{
      flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 16px", borderRadius: 22,
      border: `1px solid ${active ? c("ink") : c("line-strong")}`, background: active ? c("ink") : "transparent",
      color: active ? c("on-dark") : c("ink"), fontSize: 14, cursor: "pointer", opacity: disabled ? 0.45 : 1, ...style,
    }}>
      {icon ? <Icon d={icon} size={16} /> : null}
      <span>{children}</span>
    </button>
  );
}

/** Equal-width choice pills (technique, beard style). */
export function ChoicePills({ options, value, onChange }: {
  options: { key: string; label: string }[]; value: string | null; onChange: (key: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key} type="button" aria-pressed={on} onClick={() => onChange(o.key)} style={{
            flex: "1 1 0", height: 42, borderRadius: 21, fontSize: 14, cursor: "pointer", minWidth: 0,
            border: `1px solid ${on ? c("ink") : c("line-strong")}`, color: on ? c("on-dark") : c("ink"),
            background: on ? c("ink") : "transparent", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 6px",
          }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Cut / Colour / Make-up segmented control. */
export function Segmented({ options, value, onChange }: {
  options: { key: string; label: string }[]; value: string; onChange: (key: string) => void;
}) {
  return (
    <div style={{ flex: "0 0 auto", display: "flex", gap: 4, padding: 4, borderRadius: 26, background: c("segment") }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key} type="button" aria-pressed={on} onClick={() => onChange(o.key)} style={{
            flex: "1 1 0", height: 44, border: "none", borderRadius: 22, fontSize: 15, cursor: "pointer",
            background: on ? c("ink") : "transparent", color: on ? c("on-dark") : c("ink"),
            boxShadow: on ? c("shadow-swatch") : "none",
          }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Results tabs: Skin · Face · Colour harmony · 🔒 Scalp, with the skewed gold underline. */
export function Tabs({ tabs, value, onChange }: {
  tabs: { key: string; label: string; locked?: boolean }[]; value: string; onChange: (key: string) => void;
}) {
  return (
    <div style={{ flex: "0 0 auto", display: "flex", gap: 26, margin: "12px 34px 0 34px", borderBottom: `1px solid ${c("divider")}` }}>
      {tabs.map((tb) => {
        const on = tb.key === value;
        return (
          <button key={tb.key} type="button" onClick={() => !on && onChange(tb.key)} style={{
            position: "relative", display: "flex", alignItems: "center", gap: 6, height: 44, padding: 0,
            background: "none", border: "none", fontSize: 16, cursor: "pointer",
            color: on ? c("ink") : tb.locked ? c("ink-faint") : c("ink-muted"),
          }}>
            {tb.locked ? <Icon d={ICON.lock} size={14} /> : null}
            <span>{tb.label}</span>
            <span style={{
              position: "absolute", left: 0, right: 0, bottom: -1, display: "block", height: 3,
              transform: `skewX(${theme.shape.stepSkew})`, background: on ? c("accent") : "transparent",
            }} />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- surfaces

export function Card({ children, style, onClick, selected }: {
  children: ReactNode; style?: CSSProperties; onClick?: () => void; selected?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} style={{
      display: "flex", flexDirection: "column", gap: 12, padding: "16px 18px", borderRadius: 22, textAlign: "left",
      background: c("surface"), border: selected ? `2px solid ${c("accent")}` : `1px solid ${c("line")}`, color: c("ink"),
      cursor: onClick ? "pointer" : undefined, ...style,
    }}>
      {children}
    </Tag>
  );
}

/** Small pill floating on photos: ◆ Centre your face in the oval */
export function GuidePill({ children, size = 13 }: { children: ReactNode; size?: number }) {
  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 8, padding: size >= 13 ? "8px 16px" : "6px 13px", borderRadius: 18,
      background: c("glass"), fontSize: size, color: c("ink"), whiteSpace: "nowrap",
    }}>
      <Diamond size={size >= 13 ? 9 : 8} />
      <span>{children}</span>
    </span>
  );
}

/** Soft glow + two outlined parallelograms behind the hero arch. */
export function HeroBackdrop({ halo = [560, 600], squares }: {
  halo?: [number, number];
  squares: [CSSProperties, CSSProperties];
}) {
  return (
    <>
      <div style={{
        position: "absolute", left: "50%", top: "50%", width: halo[0], height: halo[1],
        margin: `${-halo[1] / 2}px 0 0 ${-halo[0] / 2}px`, borderRadius: "50%",
        background: `radial-gradient(closest-side, ${c("halo")}, transparent)`, animation: "mmHalo 6s ease-in-out infinite",
      }} />
      {squares.map((s, i) => (
        <div key={i} style={{ position: "absolute", border: `1.5px solid ${c("accent-line")}`, transform: `skewX(${theme.shape.skew})`, ...s }} />
      ))}
    </>
  );
}

/** Arch-topped photo frame with the gold outline. */
export function Arch({ width, height, children, offset = 8, shadow = true, style }: {
  width: number; height: number; children?: ReactNode; offset?: number; shadow?: boolean; style?: CSSProperties;
}) {
  return (
    <div style={{
      position: "relative", width, height, borderRadius: `${width / 2}px ${width / 2}px 24px 24px`, overflow: "hidden",
      background: c("photo"), outline: `1.5px solid ${c("accent")}`, outlineOffset: offset,
      boxShadow: shadow ? c("shadow-arch") : undefined, ...style,
    }}>
      {children}
    </div>
  );
}

/** Same file straight from UploadThing, for when our CDN is still pulling a just-uploaded image. */
export function originUrl(url: string): string | null {
  const m = /^https:\/\/[^/]+\/f\/([^/?#]+)/.exec(url);
  return m && !url.startsWith("https://utfs.io/") ? `https://utfs.io/f/${m[1]}` : null;
}

/** On a failed load, retry once from UploadThing directly. */
export function retryFromOrigin(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  const next = !img.dataset.retried && originUrl(img.src);
  if (next) {
    img.dataset.retried = "1";
    img.src = next;
  }
}

/** Photo that fills its parent (object-fit cover). */
export function Photo({ src, style }: { src?: string | null; style?: CSSProperties }) {
  if (!src) return null;
  return <img src={src} alt="" onError={retryFromOrigin} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }} />;
}

// ---------------------------------------------------------------- colour

/** Round colour button; `hex: null` renders the "none" swatch with a slash; `image` shows a hair swatch photo. */
export function ColorDot({ hex, image, active, onClick, size = 44, label, gapColor = c("background"), busy }: {
  hex: string | null; image?: string | null; active?: boolean; onClick?: () => void; size?: number; label?: string; gapColor?: string;
  busy?: boolean;
}) {
  return (
    <button type="button" aria-label={label} aria-pressed={active} title={label} onClick={onClick} style={{
      width: size, height: size, padding: 0, margin: 0, borderRadius: size / 2, cursor: "pointer", flex: "0 0 auto",
      background: image ? `center / cover no-repeat url("${image}"), ${hex ?? c("photo")}` : hex ?? c("surface-raised"),
      border: `3px solid ${active ? c("accent") : c("line-strong")}`,
      boxShadow: `inset 0 0 0 ${active ? 2 : 0}px ${gapColor}`, color: c("ink-muted"),
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {busy ? <Spinner size={18} color={c("ink")} /> : hex || image ? null : <Icon d={ICON.slash} size={18} />}
    </button>
  );
}

/** Option with a preview picture (haircut, beard): photo on top, label underneath. */
/** "None" option picture: a crossed circle instead of a photo. */
export const NoneIcon = ({ size = 34 }: { size?: number }) => (
  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: c("ink-muted") }}>
    <Icon d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M5.6 5.6l12.8 12.8" size={size} width={1.4} />
  </span>
);

export function ImageOption({ image, label, sub, active, onClick, height = 92, focus, busy, done, none }: {
  image?: string | null; label: string; sub?: string; active?: boolean; onClick: () => void; height?: number;
  /** Show the "None" icon instead of a picture. */
  none?: boolean;
  /** processing: spinner over the picture · done: the picture is the customer's processed result */
  busy?: boolean; done?: boolean;
  /** object-position: which part of the picture stays visible when it is cropped (e.g. "50% 8%" = top for haircuts). */
  focus?: string;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, minWidth: 0, padding: 5, borderRadius: 16,
      textAlign: "left", cursor: "pointer", border: `2px solid ${active ? c("accent") : c("line")}`,
      background: active ? c("surface-raised") : c("surface"), color: c("ink"),
    }}>
      <span style={{ position: "relative", display: "block", height, borderRadius: 11, overflow: "hidden", background: c("photo") }}>
        {none ? <NoneIcon /> : <Photo src={image} style={focus && !done ? { objectPosition: focus } : undefined} />}
        {busy ? (
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: c("veil") }}>
            <Spinner size={24} />
          </span>
        ) : null}
        {done ? <Diamond size={9} style={{ position: "absolute", right: 6, top: 6, boxShadow: `0 0 0 1.5px ${c("background")}` }} /> : null}
      </span>
      <span style={{ padding: "0 3px", fontSize: 13, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {sub ? <span style={{ padding: "0 3px 2px", fontSize: 11, color: c("ink-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span> : null}
    </button>
  );
}

/**
 * "Upload a photo" option: the customer picks a picture of the style they want; the AI applies it.
 * `compact` renders a round button the size of a colour dot.
 */
export function UploadOption({ label, preview, active, onFile, compact, height = 92 }: {
  label: string; preview?: string | null; active?: boolean; onFile: (file: File) => void; compact?: boolean; height?: number;
}) {
  const input = (
    <input type="file" accept="image/*" style={{ display: "none" }}
      onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
  );
  if (compact) {
    return (
      <label title={label} aria-label={label} style={{
        width: 44, height: 44, borderRadius: 22, flex: "0 0 auto", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        background: preview ? `center / cover no-repeat url("${preview}")` : "transparent", color: c("ink-muted"),
        border: active ? `3px solid ${c("accent")}` : `1.5px dashed ${c("line-strong")}`,
      }}>
        {preview ? null : <Icon d={ICON.upload} size={18} />}
        {input}
      </label>
    );
  }
  return (
    <label style={{
      display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, minWidth: 0, padding: 5, borderRadius: 16, cursor: "pointer",
      border: active ? `2px solid ${c("accent")}` : `1.5px dashed ${c("line-strong")}`, background: active ? c("surface-raised") : "transparent", color: c("ink"),
    }}>
      <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height, borderRadius: 11, overflow: "hidden", background: c("surface"), color: c("ink-muted") }}>
        {preview ? <Photo src={preview} /> : <Icon d={ICON.upload} size={26} />}
      </span>
      <span style={{ padding: "0 3px 2px", fontSize: 13, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {input}
    </label>
  );
}

/** Tile that opens a full catalogue (same size as an ImageOption): grid icon, label, count. */
export function CatalogueTile({ label, sub, onClick, height = 92 }: { label: string; sub?: string; onClick: () => void; height?: number }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, minWidth: 0, padding: 5, borderRadius: 16,
      textAlign: "left", cursor: "pointer", border: `2px solid ${c("ink")}`, background: c("ink"), color: c("on-dark"),
    }}>
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center", height, borderRadius: 11, color: c("accent"),
        background: `radial-gradient(90% 70% at 50% 0%, ${c("home-glow")}, transparent 75%), ${c("home-background")}`,
      }}>
        <Icon d={ICON.grid} size={28} width={1.4} />
      </span>
      <span style={{ padding: "0 3px", fontSize: 13, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {sub ? <span style={{ padding: "0 3px 2px", fontSize: 11, color: c("on-dark-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span> : null}
    </button>
  );
}

export type CatalogueEntry = {
  key: string; image: string | null; label: string; sub?: string;
  /** e.g. "For you" on recommended items */
  badge?: string; active?: boolean; busy?: boolean; done?: boolean;
};

/**
 * Full-screen catalogue on black (the welcome screen's look): optional "recommended" section first, then
 * everything. Covers the whole stage; picking an item calls `onPick` (the screen closes it).
 */
export function CatalogueSheet({ title, hint, sections, onPick, onClose, closeLabel, focus = "50% 8%" }: {
  title: string; hint?: string; closeLabel: string; focus?: string;
  sections: { title: string; items: CatalogueEntry[] }[];
  onPick: (key: string) => void; onClose: () => void;
}) {
  return (
    <div role="dialog" aria-label={title} style={{
      position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", color: c("home-ink"),
      background: [
        `radial-gradient(120% 40% at 30% 0%, ${c("home-glow")}, transparent 70%)`,
        `radial-gradient(90% 30% at 100% 100%, ${c("home-glow")}, transparent 70%)`,
        c("home-background"),
      ].join(", "),
      animation: "mmIn 0.35s ease-out both",
    }}>
      {[{ left: 150, top: 60, width: 260, height: 220 }, { right: -50, bottom: 120, width: 180, height: 150 }].map((s, i) => (
        <div key={i} aria-hidden style={{ position: "absolute", border: `14px solid ${c("home-line")}`, transform: `skewX(${theme.shape.skew})`, pointerEvents: "none", ...s }} />
      ))}

      <div style={{ position: "relative", flex: "0 0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "30px 34px 18px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ ...SERIF, fontWeight: 700, fontSize: 34, lineHeight: 1.1 }}>{title}</span>
          {hint ? <span style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: c("home-ink-muted") }}>{hint}</span> : null}
        </div>
        <button type="button" onClick={onClose} aria-label={closeLabel} style={{
          flex: "0 0 auto", width: 46, height: 46, borderRadius: 23, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${c("home-card-line")}`, background: c("home-card"), color: c("home-ink"),
        }}>
          <Icon d={ICON.close} size={20} />
        </button>
      </div>

      <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "0 34px 34px", display: "flex", flexDirection: "column", gap: 22 }}>
        {sections.filter((s) => s.items.length).map((s) => (
          <div key={s.title} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Diamond size={8} />
              <span style={{ fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: c("home-ink-muted") }}>{s.title}</span>
              <span style={{ flex: "1 1 auto", height: 1, background: c("home-card-line") }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              {s.items.map((it) => (
                <button key={it.key} type="button" aria-pressed={it.active} onClick={() => onPick(it.key)} style={{
                  display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6, minWidth: 0, padding: 6, borderRadius: 16,
                  textAlign: "left", cursor: "pointer", color: c("home-ink"),
                  border: `2px solid ${it.active ? c("accent") : c("home-card-line")}`, background: c("home-card"),
                }}>
                  <span style={{ position: "relative", display: "block", height: 150, borderRadius: 11, overflow: "hidden", background: c("ink") }}>
                    <Photo src={it.image} style={!it.done ? { objectPosition: focus } : undefined} />
                    {it.badge ? (
                      <span style={{
                        position: "absolute", left: 6, top: 6, padding: "3px 9px", borderRadius: 10, fontSize: 10, fontWeight: 500,
                        background: c("accent"), color: c("home-cta-ink"),
                      }}>{it.badge}</span>
                    ) : null}
                    {it.busy ? (
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
                        <Spinner size={26} />
                      </span>
                    ) : null}
                    {it.done ? <Diamond size={9} style={{ position: "absolute", right: 7, top: 7, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.6)" }} /> : null}
                  </span>
                  <span style={{ padding: "0 3px", fontSize: 14, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>
                  {it.sub ? <span style={{ padding: "0 3px 2px", fontSize: 11, color: c("home-ink-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.sub}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Parallelogram colour chip with caption (clothing palette). */
export function ColorChip({ hex, label }: { hex: string | null; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 74 }}>
      <span style={{
        display: "block", width: 40, height: 40, background: hex ?? c("photo"), transform: `skewX(${theme.shape.skew})`,
        boxShadow: hex?.toUpperCase() === "#FFFFFF" ? `inset 0 0 0 1px ${c("line-strong")}` : undefined,
      }} />
      <span style={{ fontSize: 11, lineHeight: 1.2, color: c("ink-muted"), textAlign: "center" }}>{label}</span>
    </div>
  );
}

/** Mockup slider: dark fill + dark thumb. */
export function Slider({ label, value, onChange, onCommit, min = 0, max = 100 }: {
  label: string; value: number; onChange: (v: number) => void; onCommit?: (v: number) => void; min?: number; max?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: c("ink-muted") }}>
      <span>{label}</span>
      <input
        type="range" className="mm-range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        style={{ width: "100%", height: 36, margin: 0, cursor: "pointer", "--mm-fill": `${pct}%` } as CSSProperties}
      />
    </label>
  );
}

// ---------------------------------------------------------------- compare

/**
 * Before/after viewer. theme.shape.compare = "square" → the FLUX_VERSION_3 style (square, whole photo,
 * library handle); "arch" → the mockup's rounded arch with the round handle.
 */
export function CompareArch(props: {
  before?: string | null; after?: string | null; height?: number; ry?: number; busy?: boolean; busyLabel?: string;
  /** Extra element on the photo (e.g. the QR download button, top-left). */
  overlay?: ReactNode;
}) {
  return theme.shape.compare === "square" ? <CompareSquare {...props} /> : <CompareRounded {...props} />;
}

/** Square frame: the captured photo and every try-on result are 1:1, so before and after line up exactly. */
function CompareSquare({ before, after, height = 380, busy, busyLabel, overlay }: {
  before?: string | null; after?: string | null; height?: number; busy?: boolean; busyLabel?: string; overlay?: ReactNode;
}) {
  const { t } = useStudio();
  // Compare toggle (as in FLUX_VERSION_3): off = the result alone, on = before/after slider.
  const [comparing, setComparing] = useState(false);
  const img = (src: string | null | undefined, alt: string) => (
    <ReactCompareSliderImage src={src ?? ""} alt={alt} onError={retryFromOrigin} style={{ objectFit: "cover", backgroundColor: c("compare-background") }} />
  );
  const single = (src: string) => (
    <img src={src} alt="" onError={retryFromOrigin} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
  );
  const canCompare = !!(after && before && !busy);
  return (
    <div style={{ flex: "0 0 auto", position: "relative", width: height, height, margin: "14px auto 0 auto", background: c("compare-background"), overflow: "hidden" }}>
      {/* Start image → (processing: start image + overlay) → result; Compare toggles the before/after slider. */}
      {canCompare && !comparing ? (
        single(after!)
      ) : canCompare ? (
        <>
          <ReactCompareSlider style={{ width: "100%", height: "100%" }} itemOne={img(before, t("common", "before"))} itemTwo={img(after, t("common", "after"))} />
          <span style={{ position: "absolute", left: 10, bottom: 10, padding: "5px 12px", borderRadius: 14, background: c("glass"), fontSize: 12, color: c("ink"), pointerEvents: "none" }}>
            {t("common", "before")}
          </span>
          <span style={{ position: "absolute", right: 10, bottom: 10, padding: "5px 12px", borderRadius: 14, background: c("ink"), fontSize: 12, color: c("on-dark"), pointerEvents: "none" }}>
            {t("common", "after")}
          </span>
        </>
      ) : before ? (
        single(before)
      ) : null}
      {busy ? null : overlay}
      {canCompare ? (
        <button type="button" aria-pressed={comparing} onClick={() => setComparing((v) => !v)} style={{
          position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px",
          borderRadius: 17, border: "none", cursor: "pointer", fontSize: 13,
          background: comparing ? c("ink") : c("glass"), color: comparing ? c("on-dark") : c("ink"),
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}>
          <Icon d={comparing ? "M6 6l12 12 M18 6L6 18" : ICON.compare} size={16} width={1.8} />
          <span>{comparing ? t("common", "close") : t("common", "compareToggle")}</span>
        </button>
      ) : null}
      {busy ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "rgba(0,0,0,0.45)" }}>
          <Spinner size={34} color={c("ink")} />
          {busyLabel ? <GuidePill>{busyLabel}</GuidePill> : null}
        </div>
      ) : null}
    </div>
  );
}

function CompareRounded({ before, after, height = 330, ry = 150, busy, busyLabel, overlay }: {
  before?: string | null; after?: string | null; height?: number; ry?: number; busy?: boolean; busyLabel?: string; overlay?: ReactNode;
}) {
  const { t } = useStudio();
  const [split, setSplit] = useState(50);
  const right = after ?? before;
  if (!after || busy) {
    return (
      <div style={{
        flex: "0 0 auto", position: "relative", height, margin: "14px 34px 0 34px",
        borderRadius: `200px 200px 22px 22px / ${ry}px ${ry}px 22px 22px`, overflow: "hidden", background: c("photo"),
        outline: `1.5px solid ${c("accent")}`, outlineOffset: 6,
      }}>
        <Photo src={before} />
        {busy ? null : overlay}
        {busy ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: c("veil") }}>
            <Spinner size={34} />
            {busyLabel ? <GuidePill>{busyLabel}</GuidePill> : null}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div style={{
      flex: "0 0 auto", position: "relative", height, margin: "14px 34px 0 34px",
      borderRadius: `200px 200px 22px 22px / ${ry}px ${ry}px 22px 22px`, overflow: "hidden", background: c("photo"),
      outline: `1.5px solid ${c("accent")}`, outlineOffset: 6, boxShadow: c("shadow-arch"),
    }}>
      <Photo src={before} />
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${split}%)` }}>
        <Photo src={right} />
      </div>
      <span style={{ position: "absolute", left: 18, bottom: 14, padding: "5px 12px", borderRadius: 14, background: c("glass"), fontSize: 12, color: c("ink") }}>
        {t("common", "before")}
      </span>
      <span style={{ position: "absolute", right: 18, bottom: 14, padding: "5px 12px", borderRadius: 14, background: c("ink"), fontSize: 12, color: c("on-dark") }}>
        {t("common", "after")}
      </span>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${split}%`, width: 2, marginLeft: -1, background: c("surface-raised"), boxShadow: "0 0 0 1px rgba(193,154,107,0.4)" }} />
      <div style={{
        position: "absolute", top: "50%", left: `${split}%`, width: 46, height: 46, margin: "-23px 0 0 -23px", borderRadius: 23,
        background: c("ink"), color: c("on-dark"), display: "flex", alignItems: "center", justifyContent: "center", boxShadow: c("shadow-handle"),
      }}>
        <Icon d={ICON.handle} size={20} width={2} />
      </div>
      {overlay}
      <input type="range" min={4} max={96} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label={t("common", "compare")}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "ew-resize" }} />
      {busy ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: c("veil") }}>
          <Spinner size={34} />
          {busyLabel ? <GuidePill>{busyLabel}</GuidePill> : null}
        </div>
      ) : null}
    </div>
  );
}

/** "◁▷ Drag to compare" hint */
export function CompareHint() {
  const { t } = useStudio();
  return (
    <span style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: c("ink-muted") }}>
      <Icon d={ICON.compare} size={16} />
      <span>{t("common", "compare")}</span>
    </span>
  );
}

// ---------------------------------------------------------------- feedback

export function Spinner({ size = 28, color = c("accent") }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%", flex: "0 0 auto",
      border: `${Math.max(2, size / 10)}px solid rgba(193,154,107,0.2)`, borderTopColor: color, animation: "mmSpin 0.9s linear infinite",
    }} />
  );
}

export function LoadingStage() {
  return (
    <Stage>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={40} />
      </div>
    </Stage>
  );
}

export function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p style={{ margin: "10px 34px 0 34px", padding: "10px 14px", borderRadius: 14, fontSize: 13, color: c("error-ink"), background: c("error-bg"), border: `1px solid ${c("error-line")}` }}>
      {message}
    </p>
  );
}

// ---------------------------------------------------------------- style pickers (Styles tab + try-on)

/**
 * Paged carousel like FLUX_VERSION_3's custom look: a framed page of cards,
 * ‹ › arrows + page dots underneath, and swipe left/right.
 */
export function Carousel({ items, perPage, columns }: { items: ReactNode[]; perPage: number; columns: number }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const go = (d: number) => setPage((p) => (p + d + pages) % pages);
  const [startX, setStartX] = useState<number | null>(null);
  const arrow = (d: number, icon: string, label: string) => (
    <button type="button" aria-label={label} onClick={() => go(d)} disabled={pages < 2} style={{
      width: 40, height: 40, borderRadius: 20, border: `1px solid ${c("line-strong")}`, background: "transparent",
      color: c("ink"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
      opacity: pages < 2 ? 0.3 : 1,
    }}>
      <Icon d={icon} size={20} />
    </button>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        onPointerDown={(e) => setStartX(e.clientX)}
        onPointerUp={(e) => { if (startX != null && Math.abs(e.clientX - startX) > 40) go(e.clientX < startX ? 1 : -1); setStartX(null); }}
        style={{
          display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, alignContent: "start", gap: 10,
          touchAction: "pan-y",
        }}>
        {items.slice(page * perPage, page * perPage + perPage)}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {arrow(-1, ICON.back, "Previous")}
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" aria-label={`${i + 1} / ${pages}`} onClick={() => setPage(i)} style={{
              width: i === page ? 18 : 7, height: 7, borderRadius: 4, border: "none", padding: 0, cursor: "pointer",
              background: i === page ? c("accent") : c("line-strong"), transition: "width .2s",
            }} />
          ))}
        </div>
        {arrow(1, ICON.next, "Next")}
      </div>
    </div>
  );
}

/** Small hair-colour swatch (FLUX_VERSION_3 custom look): 2:1 picture, gold ring when picked, dot = recommended. */
export function ShadeSwatch({ image, name, mark, tried, busy, active, onClick, none }: {
  image: string | null; name: string; mark?: boolean; tried?: string; busy?: boolean; active: boolean; onClick: () => void; none?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 0, padding: 0,
      background: "none", border: "none", color: c("ink"), cursor: "pointer",
    }}>
      <span style={{
        position: "relative", display: "block", width: "100%", aspectRatio: "2 / 1", borderRadius: 10, overflow: "hidden",
        background: c("photo"), border: `2px solid ${active ? c("accent") : "transparent"}`,
      }}>
        {none ? <NoneIcon size={22} /> : <Photo src={image} />}
        {busy ? (
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: c("veil") }}>
            <Spinner size={18} />
          </span>
        ) : null}
        {tried ? (
          <span title={tried} style={{ position: "absolute", left: 4, top: 4, width: 14, height: 14, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: c("on-dark"), background: c("ink") }}>
            <Icon d={ICON.check} size={10} width={2.6} />
          </span>
        ) : null}
        {mark ? <Diamond size={8} style={{ position: "absolute", right: 5, top: 5, boxShadow: `0 0 0 1.5px ${c("background")}` }} /> : null}
      </span>
      <span style={{
        width: "100%", fontSize: 11, lineHeight: 1.2, textAlign: "center", color: active ? c("ink") : c("ink-muted"),
        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{name}</span>
    </button>
  );
}
