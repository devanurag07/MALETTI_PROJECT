"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import StudioUnavailable from "../components/StudioUnavailable";
import { locales as appLocales, defaultLocale as appDefaultLocale } from "@/i18n";
import { StudioApiError, studioApi, type Gender, type I18n, type Session, type StudioConfig, type TryOn } from "../api";

/** Client-side draft of the look, built up across results + try-on screens (the mockup's `nav.look`). */
export type LookDraft = {
  cut: string | null;
  hair_shade: string | null;
  technique: string | null;
  makeup_look: string | null;
  lip: string | null;
  eye: string | null;
  /** Blush shade (catalog blush_shade); goes on top of a make-up look or the lip / eye picks. */
  blush: string | null;
  beard: string | null;
  products: string[];
  params: Record<string, number>;
  /** Newest try-on; the next one stacks on top of it. */
  lastTryon: TryOn | null;
  /** Stack of try-on layers (cut → colour → make-up/beard); lastTryon is the top. */
  history: TryOn[];
  /** Finished try-ons by option+base ("cut|{"item":"lob"}|12"): picking the same option again never re-processes. */
  results: Record<string, TryOn>;
  /** The image kept at each step (null/absent = original, no change); later steps build on earlier ones. */
  layers: Partial<Record<"cut" | "colour" | "makeup" | "beard", TryOn | null>>;
  /** Consultation journey progress per service (see flows.ts JOURNEY). */
  journey: Record<string, "done" | "skipped">;
  /** Hairstyle customisation added to the haircut try-on (backend studio/services/tryon.py HAIR_MODIFIERS). */
  hairMods: HairMods;
};

export type HairMods = { bangs?: string | null; fade?: string | null; styling?: string | null };
/** Options per group; bangs for women, fade for men, styling for everyone. */
export const HAIR_MOD_OPTIONS = {
  bangs: ["curtain", "fringe", "side_swept"],
  fade: ["taper", "medium", "skin"],
  styling: ["blow_dry", "straight", "curly", "waves"],
} as const;

/** Look-draft value meaning "the customer's own uploaded style picture" (no catalog item). */
export const UPLOAD = "upload:own";
/** For the API: an uploaded style has no catalog key. */
export const catalogKey = (v: string | null) => (v === UPLOAD ? null : v);

export const EMPTY_LOOK: LookDraft = {
  cut: null,
  hair_shade: null,
  technique: null,
  makeup_look: null,
  lip: null,
  eye: null,
  blush: null,
  beard: null,
  products: [],
  params: {},
  hairMods: {},
  lastTryon: null,
  history: [],
  results: {},
  layers: {},
  journey: {},
};

type Ctx = {
  config: StudioConfig | null;
  configError: StudioApiError | null;
  locale: string;
  setLocale: (l: string) => void;
  /** UI label from locales/<locale>.json → studio.<ns>.<key>: t("capture", "cta") */
  t: (ns: string, key: string, vars?: Record<string, string | number>) => string;
  /** Current-locale value of an i18n JSON field */
  tx: (value: I18n | null | undefined) => string;
  session: Session | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
  gender: Gender;
  look: LookDraft;
  updateLook: (patch: Partial<LookDraft>) => void;
  resetAll: () => void;
  /** The customer's photo: the copy captured on this mirror (instant), else the uploaded URL. */
  photo: string | null;
  setLocalPhoto: (dataUrl: string | null) => void;
};

const StudioContext = createContext<Ctx | null>(null);
/** Kept in localStorage (like beauty_platform's session data) until a new session or a new photo clears it. */
const STORE_KEY = "studio_state";
const store = {
  get: () => { try { return localStorage.getItem(STORE_KEY) ?? sessionStorage.getItem(STORE_KEY); } catch { return null; } },
  set: (v: string) => localStorage.setItem(STORE_KEY, v),
};

function stripLocale(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] && appLocales.includes(parts[0])) parts.shift();
  return "/" + parts.join("/");
}

/** Mounted inside MirrorFrame, so the salon is already logged in. */
export function StudioProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const locale = useLocale();
  const messages = useTranslations("studio");
  const [config, setConfig] = useState<StudioConfig | null>(null);
  const [configError, setConfigError] = useState<StudioApiError | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [look, setLook] = useState<LookDraft>(EMPTY_LOOK);
  // Photo as captured on this mirror (data URL): shown right away, no wait for the CDN.
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  // Persist only after restoring, or the first render would overwrite the saved session with null.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(store.get() || "null");
      if (saved) {
        setSessionState(saved.session ?? null);
        setLook({ ...EMPTY_LOOK, ...(saved.look ?? {}) });
        setLocalPhoto(saved.localPhoto ?? null);
      }
    } catch {}
    setRestored(true);
  }, []);

  const loadConfig = useCallback(() => {
    setConfigError(null);
    studioApi
      .config()
      // The design comes from the frontend theme file (features/studio/theme), not from the backend.
      .then(setConfig)
      .catch((e: unknown) =>
        setConfigError(e instanceof StudioApiError ? e : new StudioApiError(String(e), null))
      );
  }, []);

  useEffect(loadConfig, [loadConfig]);

  useEffect(() => {
    if (!restored) return;
    try {
      store.set(JSON.stringify({ session, look, localPhoto }));
    } catch {
      // Storage full (large photo): keep the session and the try-on progress, drop the local photo copy.
      try { store.set(JSON.stringify({ session, look })); } catch {}
    }
  }, [restored, session, look, localPhoto]);

  const setLocale = useCallback(
    (l: string) => {
      document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000`;
      if (session) studioApi.updateSession(session.id, { locale: l }).then(setSessionState).catch(() => {});
      const rest = stripLocale(pathname);
      router.replace(l === appDefaultLocale ? rest : `/${l}${rest === "/" ? "" : rest}`);
    },
    [session, pathname, router]
  );

  const t = useCallback(
    (ns: string, key: string, vars?: Record<string, string | number>) =>
      messages.has(`${ns}.${key}`) ? messages(`${ns}.${key}`, vars) : key,
    [messages]
  );

  const tx = useCallback(
    (v: I18n | null | undefined) =>
      v ? v[locale] ?? v[config?.default_locale ?? "en"] ?? v.en ?? Object.values(v)[0] ?? "" : "",
    [config, locale]
  );

  const value = useMemo<Ctx>(
    () => ({
      config,
      configError,
      locale,
      setLocale,
      t,
      tx,
      session,
      setSession: setSessionState,
      gender: session?.gender ?? "woman",
      look,
      updateLook: (patch) => setLook((prev) => ({ ...prev, ...patch })),
      resetAll: () => {
        setSessionState(null);
        setLook(EMPTY_LOOK);
        setLocalPhoto(null);
      },
      photo: localPhoto ?? session?.source_image_url ?? null,
      setLocalPhoto,
    }),
    [config, configError, locale, setLocale, t, tx, session, look, localPhoto]
  );

  // Without a config (Studio not enabled for this salon, server unreachable) no screen can work.
  if (configError && !config) return <StudioUnavailable error={configError} locale={locale} onRetry={loadConfig} />;

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside StudioProvider");
  return ctx;
}

/** Catalog items of a kind, filtered to the session gender. */
export function useCatalog(kind: string) {
  const { config, gender } = useStudio();
  return (config?.catalog?.[kind] ?? []).filter((i) => i.gender === "all" || i.gender === gender);
}
