"use client";
import { Chip, IconTile, Panel, buttonClass } from "@/design-system/bluevella";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { SHOW_QUESTIONS_KEY } from "@/core/constants/common-constants";
import AnalysisProgressScreen from "@/design-system/components/common/analysis-progress-screen";
import { AGE_GROUP_OPTIONS } from "@/core/utils/options";
import { changeHairstyle } from "@/features/look-advisor/api/change-hairstyle";
import { getHaircutPool } from "@/features/look-advisor/api/haircut-pool";
import { recommendHaircolor } from "@/features/look-advisor/api/recommend-haircolor";
import { recommendHairstyle } from "@/features/look-advisor/api/recommend-hairstyle";
import type { HaircolorData, HairstyleData } from "@/features/look-advisor/types";
import {
  HAIR_COLOR_CATEGORIES,
  findHairColorShade,
  getHairColorPrompt,
  getHairColorTechniques,
  type HairColorTechniqueId,
} from "@/features/look-advisor/data/haircolor-catalog";
import HaircolorPicker, { TECHNIQUE_LABEL } from "@/features/look-advisor/components/HaircolorPicker";
import { NONE_OPTION_IMAGE, composeCustomLook, hairAddOns, hairStylingById, hairStylingOptions, withStylingPrompt } from "@/features/look-advisor/data/hair-styling";
import { useCustomerSession } from "../context/CustomerSessionContext";
import { FLOW_STEP_TITLES, sessionCapturePath, sessionStepPath } from "../config/session-types";
import FlowScreen from "../flow/FlowScreen";
import LookCarousel from "../flow/LookCarousel";
import LookRail, { type RailItem } from "../flow/LookRail";
import TryonCompare from "../flow/TryonCompare";
import TryonTabs, { NoResults, type TryonTab } from "../flow/TryonTabs";
import femaleLong from "@/assets/haircuts/female-long.png";
import femaleMedium from "@/assets/haircuts/female-medium.png";
import femaleShort from "@/assets/haircuts/female-short.png";
import maleLong from "@/assets/haircuts/male-long.png";
import maleMedium from "@/assets/haircuts/male-medium.png";
import maleShort from "@/assets/haircuts/male-short.png";
import { previewSrc } from "../flow/preview";
import VisualQuestion from "../flow/VisualQuestion";
import { useComparePicker } from "../flow/useComparePicker";
import { useFlowProgress } from "../flow/useFlowProgress";
import { useStepScreens } from "../flow/useStepScreens";
import { useStepCompletion } from "../hooks/useStepCompletion";
import { inputSourceLabel, useStepInputImage } from "../hooks/useStepInputImage";
import { useStepDraft } from "../hooks/useStepDraft";

/** Question(s) one per screen (like the analysis and makeup), then the Catalogue | Results tabs ("styles" / "tryon"). */
type Screen = "preference" | "age" | "styles" | "tryon";
type Mode = "hairstyle" | "haircolor";

interface Style {
  id: string;
  name: string;
  subtitle?: string;
  prompt: string;
  /** Recommended hairstyles: FLUX "Styling options" and "Maintenance" notes (markdown). */
  stylingTips?: string;
  maintenance?: string;
  /** Recommended colours: FLUX "Technique" note (markdown). */
  technique?: string;
  /** Catalogue image: a bundled colour swatch or a haircut photo under /public. */
  image?: import("next/image").StaticImageData | string;
  swatch?: string;
}

interface TriedStyle {
  id: string;
  /** Haircut / shade name; `label` adds the styling ("Wolf Cut · Curly"). */
  name: string;
  label: string;
  /** The haircut tried, so a new styling can be applied to it. */
  styleId: string;
  stylePrompt: string;
  styling: string | null;
  outputUrl: string;
  /** What the screen shows (base64 when available); `outputUrl` is what gets saved. */
  preview: string;
}

/** Saved while the step is open. Images are rebuilt from the names, previews from `output_url`. */
interface HairDraft {
  preference: string | null;
  age_group: string | null;
  recommended:
    | {
        id: string;
        name: string;
        subtitle?: string;
        prompt: string;
        stylingTips?: string;
        maintenance?: string;
        technique?: string;
      }[]
    | null;
  tried: {
    id: string;
    name: string;
    output_url: string;
    style_id?: string;
    prompt?: string;
    styling?: string | null;
  }[];
  active_id: string | null;
}

/** Hair length as three bars, the filled height growing from short to long. */
function LengthIcon({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="flex h-12 items-end gap-1.5">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-3 rounded-full"
          style={{
            height: 14 + i * 10,
            background: i <= level ? "#fff" : "rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </span>
  );
}

/** Haircut photos copied from FLUX (`public/customize-look/{gender}_haircuts/<name>.png`), matching the pool names. */
const HAIRCUT_PHOTOS = {
  female: [
    "A-line Bob",
    "Blunt Lob",
    "Butterfly Cut",
    "Classic Pixie",
    "Feather cut",
    "French Bob",
    "Long Layers",
    "Messy Long bob",
    "Soft Mullet",
    "Wolf Cut",
  ],
  male: [
    "Buzz Cut",
    "Caesar Cut",
    "Center Parted",
    "Crew Cut",
    "Fade Pompadour",
    "French Crop",
    "Long Wolf Cut",
    "Man Bun",
    "Mullet",
    "Quiff",
    "Side Part",
    "Side Swept",
    "Slicked Back",
    "Undercut",
  ],
} as const;

function haircutPhoto(name: string, gender: "female" | "male"): string | undefined {
  const match = HAIRCUT_PHOTOS[gender].find((n) => n.toLowerCase() === name.trim().toLowerCase());
  return match ? `/customize-look/${gender}_haircuts/${encodeURIComponent(match)}.png` : undefined;
}

/** FLUX's two reference photos per recommendable haircut (`public/recommended-looks/{gender}_haircut/<name>/<name> 1|2.webp`). */
const REFERENCE_LOOKS = {
  female: ["A-line Bob", "Blunt Lob", "Butterfly Cut", "Classic Pixie", "French Bob", "Long Layers", "Messy Long bob", "Wolf Cut"],
  male: ["Buzz Cut", "Caesar Cut", "Center Parted", "Crew Cut", "Fade Pompadour", "French Crop", "Mullet", "Quiff", "Slicked Back", "Undercut"],
} as const;

function referencePhotos(name: string, gender: "female" | "male"): string[] {
  const match = REFERENCE_LOOKS[gender].find((n) => n.toLowerCase() === name.trim().toLowerCase());
  if (!match) return [];
  const base = `/recommended-looks/${gender}_haircut/${encodeURIComponent(match)}/${encodeURIComponent(match)}`;
  return [`${base}%201.webp`, `${base}%202.webp`];
}

/** FLUX's two reference photos per recommended colour (`public/recommended-looks/`, WebP 600px). */
const REFERENCE_COLORS = {
  female: ["Ash Blonde", "Auburn", "Blue", "Burgundy", "Caramel Brown", "Chestnut Brown", "Chocolate Brown", "Cinnamon Red", "Copper", "Dark Blonde", "Dark Chocolate", "Deep Red", "Emerald Green", "Espresso brown", "Golden Blonde", "Honey Blonde", "Lavender", "Light Copper", "Mocha Brown", "Natural Black", "Plum", "Rose Pink", "Soft Black", "Wine Red"],
  male: ["Ash Blonde", "Black", "Brown", "Burgundy", "Caramel", "Cinnamon", "Copper", "Creamy Ash", "Golden", "Magenta", "Red", "Violet"],
} as const;

function colorReferencePhotos(name: string, gender: "female" | "male"): string[] {
  const match = REFERENCE_COLORS[gender].find((n) => n.toLowerCase() === name.trim().toLowerCase());
  if (!match) return [];
  const file = encodeURIComponent(match);
  const base = gender === "male" ? `/recommended-looks/male_haircolor/${file}/${file}` : `/recommended-looks/female-haircolor/${file}`;
  return [`${base}%201.webp`, `${base}%202.webp`];
}

/** Colour photo for a recommended shade, matched by name against the colour catalogue. */
function shadeImage(name: string) {
  const key = name.trim().toLowerCase();
  return HAIR_COLOR_CATEGORIES.flatMap((c) => c.shades).find((sh) => sh.name.toLowerCase() === key)?.image;
}

/** Image for a recommended colour: its first reference photo (as in the carousel), else the shade swatch. */
function recommendedColorImage(name: string, gender: "female" | "male") {
  return colorReferencePhotos(name, gender)[0] ?? shadeImage(name);
}

/** Which technique a recommended colour means, read from its Technique note ("**Balayage** highlights" → balayage). */
function techniqueFromNote(note: string | undefined, gender: string): HairColorTechniqueId {
  const t = (note ?? "").toLowerCase();
  if (gender === "male") return /highlight|streak/.test(t) ? "highlights" : "global";
  if (/balayage/.test(t)) return "balayage";
  if (/ombr/.test(t)) return "ombre";
  if (/streak|highlight/.test(t)) return "streaks";
  return "global";
}

/**
 * Try-on prompt for a recommended colour, matching its technique. A backend that sends `technique_type`
 * already picked the right prompt; an older one sends the Global prompt, so rebuild it from the colour
 * catalogue with the technique from the note.
 */
function recommendedColorPrompt(c: HaircolorData, gender: string) {
  if (c.technique_type) return c.prompt;
  const key = c.haircolor.trim().toLowerCase();
  const shade = HAIR_COLOR_CATEGORIES.flatMap((cat) => cat.shades).find((sh) => sh.name.toLowerCase() === key);
  return (shade && getHairColorPrompt(shade.id, techniqueFromNote(c.technique, gender), gender)) || c.prompt;
}

type Length = "short" | "medium" | "long";

const SILHOUETTES = {
  female: { short: femaleShort, medium: femaleMedium, long: femaleLong },
  male: { short: maleShort, medium: maleMedium, long: maleLong },
} as const;

/** Best-guess length from a haircut's name, to pick its silhouette (the pool has no images). */
function lengthOf(name: string): Length {
  const n = name.toLowerCase();
  if (/pixie|crop|buzz|crew|fade|undercut|taper|quiff|spik|short|bowl|caesar|french crop/.test(n)) return "short";
  if (/bob|lob|shoulder|medium|shag|wolf|mullet|curtain/.test(n)) return "medium";
  if (/long|layer|butterfly|wave|curl|mermaid|braid|bun|updo|ponytail|man bun/.test(n)) return "long";
  return "medium";
}

const LENGTH_LEVEL: Record<string, 1 | 2 | 3> = {
  "Short Haircut": 1,
  "Medium Haircut": 2,
  "Long Haircut": 3,
};

/** Swatch per colour family. */
const FAMILY_SWATCH: Record<string, string> = {
  natural_darks: "linear-gradient(135deg, #120c0a, #4a2f22)",
  warm_shades: "linear-gradient(135deg, #7a4a22, #d39a55)",
  red_burgundies: "linear-gradient(135deg, #4d0c1c, #a3243a)",
  cool_shades: "linear-gradient(135deg, #5f5b57, #c7c0b4)",
  fashion_colours: "conic-gradient(#e0415e, #9b5de5, #2f7be0, #4cc38a, #e0415e)",
};

/**
 * Custom look haircut picker, as FLUX's HaircutGrid: "Select a haircut (optional)", four tiles per page
 * (2 × 2) with a None tile last, and page arrows.
 */
function HaircutPicker({
  cuts,
  value,
  onChange,
}: {
  cuts: {
    id: string;
    name: string;
    image: string | StaticImageData;
    tried?: boolean;
  }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const PER_PAGE = 4;
  const options = [...cuts, { id: NONE_CUT, name: "None", image: NONE_OPTION_IMAGE, tried: false }];
  const pages = Math.ceil(options.length / PER_PAGE);
  const [page, setPage] = useState(0);
  const shown = options.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  return (
    <Panel className="flex flex-col gap-6 p-8">
      <p className="text-center text-4xl font-semibold">Select a haircut (optional)</p>
      <div className="grid grid-cols-2 gap-8">
        {shown.map((o) => {
          const selected = (value ?? NONE_CUT) === o.id;
          const isNone = o.id === NONE_CUT;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(isNone ? null : o.id)}
              className={cn(
                "relative flex flex-col items-center gap-4 rounded-2xl border-2 p-6 transition active:scale-[0.98]",
                selected ? "border-bv-accent bg-bv-accent-soft shadow-bv-glow" : "border-bv-line-strong bg-bv-surface-raised",
              )}
            >
              <span className="relative flex size-[200px] items-center justify-center overflow-hidden rounded-xl bg-bv-surface">
                {typeof o.image === "string" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- haircut photo under /public
                  <img src={o.image} alt="" className="h-full w-full object-cover object-top" />
                ) : (
                  <Image src={o.image} alt="" className={isNone ? "h-1/2 w-auto object-contain" : "h-full w-full object-contain p-4"} />
                )}
                {o.tried && (
                  <span className="absolute right-2 top-2">
                    <Chip tone="solid" size="sm">
                      Tried
                    </Chip>
                  </span>
                )}
              </span>
              <span className="text-2xl font-semibold text-bv-ink">{o.name}</span>
            </button>
          );
        })}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            aria-label="Previous haircuts"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="flex size-12 items-center justify-center rounded-full border-2 border-bv-line-strong text-bv-ink disabled:opacity-30"
          >
            <ChevronLeft className="size-8" />
          </button>
          <span className="text-xl text-bv-ink-muted">
            {page + 1} / {pages}
          </span>
          <button
            type="button"
            aria-label="More haircuts"
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
            className="flex size-12 items-center justify-center rounded-full border-2 border-bv-line-strong text-bv-ink disabled:opacity-30"
          >
            <ChevronRight className="size-8" />
          </button>
        </div>
      )}
    </Panel>
  );
}

const NONE_CUT = "none";
/** Results rail id for the customer's own photo. */
const ORIGINAL_ID = "original";

/**
 * One option row of the Custom look builder (styling, bangs, fades): "None" plus image tiles, pick one.
 * Sized as FLUX's HairstyleSelector: 160px-wide tiles, 40px icons (fades 60px).
 */
function OptionRow({
  title,
  options,
  value,
  onChange,
  iconClass = "h-10",
}: {
  title: string;
  options: { id: string; name: string; image: StaticImageData }[];
  value: string | null;
  onChange: (id: string | null) => void;
  iconClass?: string;
}) {
  return (
    <section className="flex flex-col gap-6">
      <p className="text-center text-4xl font-semibold">{title}</p>
      <div className="flex flex-wrap justify-center gap-6">
        {[{ id: null, name: "None", image: NONE_OPTION_IMAGE }, ...options].map((o) => (
          <IconTile
            key={o.id ?? "none"}
            icon={<Image src={o.image} alt="" className={cn("w-auto object-contain", iconClass)} />}
            label={o.name}
            selected={value === o.id}
            onClick={() => onChange(o.id)}
            className="min-w-[160px] gap-3 p-4 [&>span:first-child]:size-auto [&>span:last-child]:text-xl [&>span:last-child]:font-medium"
          />
        ))}
      </div>
    </section>
  );
}

/** Occasion Hairstyle / Hair Colour: one question → recommended styles → try on & compare → use this style. */
export default function HairTryonScreen({ mode }: { mode: Mode }) {
  const t = useTranslations();
  const router = useRouter();
  const { session, previousStep } = useCustomerSession();
  const { complete, skip, isSaving } = useStepCompletion(mode);
  const progress = useFlowProgress(mode);
  // Hair colour runs on the haircut chosen in the step before (Bridal / Function-Ready, Makeover), else the close-up.
  const { image: face, source: faceSource, loading: faceLoading } = useStepInputImage(mode);
  /** The customer's photo as the first Results thumbnail ("Original", as in FLUX). */
  // Created and revoked in one effect: a memoised URL would stay revoked after StrictMode's re-run.
  const [faceUrl, setFaceUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!face) return setFaceUrl(null);
    const url = URL.createObjectURL(face);
    setFaceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [face]);
  const gender = session?.gender || "female";
  const isColor = mode === "haircolor";
  const askAge = useMemo(() => localStorage.getItem(SHOW_QUESTIONS_KEY) === "true", []);
  const styleImage = (name: string) => (isColor ? shadeImage(name) : haircutPhoto(name, gender === "male" ? "male" : "female"));
  /** Recommended looks show their reference photo (also on the Results rail while processing). */
  const recommendedImage = (name: string) =>
    isColor ? recommendedColorImage(name, gender === "male" ? "male" : "female") : styleImage(name);

  const { initial: draft, save: saveDraft } = useStepDraft<HairDraft>(mode);
  const questionScreens: Screen[] = askAge ? ["preference", "age"] : ["preference"];
  const { screen, go, replace, back } = useStepScreens<Screen>(
    ["preference", "age", "styles", "tryon"],
    draft?.tried.length ? [...questionScreens, "tryon"] : draft?.recommended ? [...questionScreens, "styles"] : "preference",
  );

  const [preference, setPreference] = useState<string | null>(draft?.preference ?? null);
  const [ageGroup, setAgeGroup] = useState<string | null>(draft?.age_group ?? null);
  const [recommended, setRecommended] = useState<Style[] | null>(
    () => draft?.recommended?.map((st) => ({ ...st, image: recommendedImage(st.name) })) ?? null,
  );
  const [isRecommending, setIsRecommending] = useState(false);
  const [catalogue, setCatalogue] = useState<Style[] | null>(null);
  const [styleTab, setStyleTab] = useState<"recommended" | "collection">(
    draft?.recommended && !draft.recommended.length ? "collection" : "recommended",
  );

  /** Custom tab (hairstyle): FLUX look builder — haircut + styling + bangs / fade, tried together. */
  const [customCut, setCustomCut] = useState<Style | null>(null);
  /** Recommended tab (hairstyle): which look the carousel shows. */
  const [recIndex, setRecIndex] = useState(0);
  const [customStyling, setCustomStyling] = useState<string | null>(null);
  const [customAddOn, setCustomAddOn] = useState<string | null>(null);
  /** Hair colour Custom tab (FLUX CustomLookHaircolor): a shade and a technique, tried together. */
  const [customShade, setCustomShade] = useState<string | null>(null);
  const [customTechnique, setCustomTechnique] = useState<HairColorTechniqueId | null>(null);
  const customLook = composeCustomLook(gender, customCut, customStyling, customAddOn);
  const stylingLabel = (name: string, id: string | null) => [name, hairStylingById(id, gender)?.name].filter(Boolean).join(" · ");

  const [current, setCurrent] = useState<{
    style: Style;
    styling: string | null;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tried, setTried] = useState<TriedStyle[]>(
    () =>
      draft?.tried.map((st) => ({
        id: st.id,
        name: st.name,
        label: stylingLabel(st.name, st.styling ?? null),
        styleId: st.style_id ?? st.id,
        stylePrompt: st.prompt ?? "",
        styling: st.styling ?? null,
        outputUrl: st.output_url,
        preview: st.output_url,
      })) ?? [],
  );
  const [activeId, setActiveId] = useState<string | null>(draft?.active_id ?? null);
  // Recommendations restored from the draft match these answers; don't fetch them again.
  const restoredFor = useRef(draft?.recommended ? `${draft.preference}|${draft.age_group}` : null);

  const preferenceQuestion = isColor
    ? {
        question: "Which colour family do you like?",
        options: [
          {
            label: t("lookAdvisor.questions.colorFamily.naturalDarks"),
            value: "natural_darks",
          },
          {
            label: t("lookAdvisor.questions.colorFamily.warmShades"),
            value: "warm_shades",
          },
          {
            label: t("lookAdvisor.questions.colorFamily.redBurgundies"),
            value: "red_burgundies",
          },
          {
            label: t("lookAdvisor.questions.colorFamily.coolShades"),
            value: "cool_shades",
          },
          {
            label: t("lookAdvisor.questions.colorFamily.fashionColours"),
            value: "fashion_colours",
          },
        ],
      }
    : {
        question: "How long is your hair right now?",
        options: [
          {
            label: t("lookAdvisor.questions.hairLength.short"),
            value: "Short Haircut",
          },
          {
            label: t("lookAdvisor.questions.hairLength.medium"),
            value: "Medium Haircut",
          },
          {
            label: t("lookAdvisor.questions.hairLength.long"),
            value: "Long Haircut",
          },
        ],
      };

  const ready = !!preference && (!askAge || !!ageGroup);

  const preferenceLabel = preferenceQuestion.options.find((o) => o.value === preference)?.label;
  const preferenceSummary = preferenceLabel ? (isColor ? preferenceLabel : `${preferenceLabel} hair`) : null;

  const toStyles = () => {
    go("styles");
    void loadCatalogue();
  };
  /** After the last question: next question or the catalogue. */
  const afterPreference = () => (askAge ? go("age") : toStyles());

  useEffect(() => {
    if (!ready || !preference) return;
    const key = `${preference}|${ageGroup}`;
    if (restoredFor.current === key) return;
    restoredFor.current = null;
    let cancelled = false;
    setIsRecommending(true);
    setRecommended(null);
    const request = isColor
      ? recommendHaircolor(gender, preference, ageGroup ?? undefined).then((res) =>
          ((res?.data?.haircolors as HaircolorData[]) ?? []).map((c, i) => ({
            id: `rec-${i}`,
            name: c.haircolor,
            subtitle: c.reason,
            prompt: recommendedColorPrompt(c, gender),
            technique: c.technique,
            maintenance: c.maintenance,
            image: recommendedImage(c.haircolor),
          })),
        )
      : recommendHairstyle(gender, preference, ageGroup ?? undefined).then((res) =>
          ((res?.data?.hairstyles as HairstyleData[]) ?? []).map((h, i) => ({
            id: `rec-${i}`,
            name: h.hairstyle,
            subtitle: h.reason,
            prompt: h.prompt,
            stylingTips: h.styling_options,
            maintenance: h.maintenance,
            image: recommendedImage(h.hairstyle),
          })),
        );
    request
      .then((styles) => !cancelled && setRecommended(styles.slice(0, 4)))
      .catch((e) => {
        console.error(`${mode} recommendations failed:`, e);
        if (cancelled) return;
        setRecommended([]);
        setStyleTab("collection");
      })
      .finally(() => !cancelled && setIsRecommending(false));
    return () => {
      cancelled = true;
    };
    // recommendedImage only depends on isColor and gender
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, preference, ageGroup, isColor, gender, mode]);

  const loadCatalogue = async () => {
    if (catalogue) return;
    if (isColor) {
      // Global colour for each shade keeps the catalogue to one tap per shade.
      const technique = getHairColorTechniques(gender)[0];
      setCatalogue(
        HAIR_COLOR_CATEGORIES.flatMap((category) =>
          category.shades.map((shade) => ({
            id: shade.id,
            name: shade.name,
            subtitle: category.name,
            prompt: getHairColorPrompt(shade.id, technique, gender) ?? "",
            image: shade.image,
          })),
        ).filter((s) => s.prompt),
      );
    } else {
      try {
        const pool = await getHaircutPool(gender);
        setCatalogue(
          pool.map((p, i) => ({ id: `pool-${i}`, name: p.name, prompt: p.prompt, image: styleImage(p.name) })),
        );
      } catch (e) {
        console.error("Haircut pool failed:", e);
        setCatalogue([]);
      }
    }
  };

  // Restored onto the catalogue or try-on: it needs the collection too.
  useEffect(() => {
    if (draft?.recommended || draft?.tried.length) void loadCatalogue();
    // once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryStyle = async (style: Style, withStyling: string | null = null) => {
    if (faceLoading) return;
    if (!face || !session) {
      toast.error("Photo not found. Please retake it.");
      return;
    }
    // Already tried (e.g. picked again from the catalogue): show that result instead of processing it again.
    const done = tried.find((st) => st.name === style.name && st.styling === withStyling);
    if (done) {
      setActiveId(done.id);
      compare.exit();
      if (screen !== "tryon") replace("tryon");
      return;
    }
    setCurrent({ style, styling: withStyling });
    setActiveId(null);
    compare.exit();
    if (screen !== "tryon") replace("tryon");
    setIsGenerating(true);
    try {
      const result = await changeHairstyle({
        image: face,
        sessionId: String(session.salon_session_id),
        prompt: withStylingPrompt(style.prompt, hairStylingById(withStyling, gender)),
        name: stylingLabel(style.name, withStyling),
        haircolor: isColor,
        gender,
      });
      if (!result.outputUrl) throw new Error("No output image");
      const entry: TriedStyle = {
        id: `${style.id}-${Date.now()}`,
        name: style.name,
        label: stylingLabel(style.name, withStyling),
        styleId: style.id,
        stylePrompt: style.prompt,
        styling: withStyling,
        outputUrl: result.outputUrl,
        preview: previewSrc(result.base64, result.outputUrl) ?? result.outputUrl,
      };
      setTried((prev) => [...prev, entry]);
      setActiveId(entry.id);
    } catch (e) {
      console.error(`${mode} try-on failed:`, e);
      toast.error("Could not apply this style. Please try another.");
    } finally {
      setIsGenerating(false);
    }
  };

  const silhouetteFor = (name: string) => SILHOUETTES[gender === "male" ? "male" : "female"][lengthOf(name)];
  const imageOf = (st: Style) => st.image ?? styleImage(st.name);
  const genderKey = gender === "male" ? "male" : "female";
  const active = tried.find((s) => s.id === activeId) ?? null;

  /** Custom tab: try the haircut + styling + bangs / fade chosen in the builder as one look. */
  const tryCustom = () => {
    if (isColor) {
      const shade = customShade ? findHairColorShade(customShade) : undefined;
      const prompt = shade && customTechnique ? getHairColorPrompt(shade.id, customTechnique, gender) : null;
      if (shade && customTechnique && prompt)
        void tryStyle({ id: `custom:${shade.id}:${customTechnique}`, name: `${shade.name} · ${TECHNIQUE_LABEL[customTechnique]}`, prompt });
      return;
    }
    if (customLook)
      void tryStyle({
        id: `custom:${customLook.name}`,
        name: customLook.name,
        prompt: customLook.prompt,
      });
  };
  const triedNames = new Set(tried.map((s) => s.name));
  const compare = useComparePicker(
    face,
    tried.map((st) => ({ ...st, name: st.label })),
    activeId,
  );

  const currentDraft = useMemo<HairDraft | null>(
    () =>
      recommended || tried.length
        ? {
            preference,
            age_group: ageGroup,
            recommended:
              recommended?.map(({ id, name, subtitle, prompt, stylingTips, maintenance, technique }) => ({
                id,
                name,
                subtitle,
                prompt,
                stylingTips,
                technique,
                maintenance,
              })) ?? null,
            tried: tried.map((st) => ({
              id: st.id,
              name: st.name,
              output_url: st.outputUrl,
              style_id: st.styleId,
              prompt: st.stylePrompt,
              styling: st.styling,
            })),
            active_id: activeId,
          }
        : null,
    [preference, ageGroup, recommended, tried, activeId],
  );

  useEffect(() => {
    if (currentDraft) saveDraft(currentDraft);
  }, [currentDraft, saveDraft]);

  /** Results rail: the style processing first, then tried ones newest first (switch instantly). New styles come from the catalogue. */
  const styleItem = (st: Style, withStyling: string | null = null): RailItem => ({
    id: `style:${st.id}`,
    label: stylingLabel(st.name, withStyling),
    image: st.image ?? (isColor ? null : silhouetteFor(st.name)),
  });
  const railItems: RailItem[] = [
    ...(faceUrl ? [{ id: ORIGINAL_ID, label: "Original", image: faceUrl }] : []),
    ...[...tried].reverse().map((st) => ({
      id: st.id,
      label: st.label,
      image: st.preview,
      tried: true,
    })),
  ];
  /**
   * Recommended | Custom | Results (as in FLUX look advisor). They are peers: switching replaces the
   * screen, so back still goes to the questions. Custom is the full collection.
   */
  const tabs = (
    <TryonTabs
      active={screen === "tryon" ? "results" : styleTab === "collection" ? "custom" : "recommended"}
      onChange={(tab: TryonTab) => {
        if (tab === "results") return replace("tryon");
        setStyleTab(tab === "custom" ? "collection" : "recommended");
        replace("styles");
      }}
      results={tried.length}
      busy={isGenerating}
      split={{
        recommended: isRecommending ? undefined : (recommended?.length ?? 0),
        custom: catalogue?.length,
      }}
    />
  );

  const useStyle = () => {
    if (!active) return;
    complete({
      occasion: session?.occasion ?? "",
      preference,
      selected_style: { name: active.label, output_url: active.outputUrl },
      styling: active.styling,
      styles: tried.map((s) => ({ name: s.label, output_url: s.outputUrl })),
      output_urls: [active.outputUrl],
    });
  };

  const handleBack = () => {
    if (back()) return;
    const prev = previousStep(mode);
    if (session) router.push(prev ? sessionStepPath(session.session_type, prev) : sessionCapturePath());
  };

  return (
    <FlowScreen
      title={FLOW_STEP_TITLES[mode]}
      progress={progress}
      onBack={handleBack}
      screenKey={screen}
      bodyClassName={screen === "preference" || screen === "age" ? "flex flex-col" : undefined}
      primary={
        screen === "tryon"
          ? {
              label: isColor ? "Use this colour" : "Use this style",
              onClick: useStyle,
              disabled: !active || isGenerating,
              loading: isSaving,
            }
          : screen === "styles" && styleTab === "collection"
            ? {
                label: "Try this look",
                onClick: tryCustom,
                disabled: (isColor ? !customShade || !customTechnique : !customLook) || isGenerating,
              }
            : screen === "styles" && styleTab === "recommended" && recommended?.length
              ? {
                  label: "Try this look",
                  onClick: () => void tryStyle(recommended[Math.min(recIndex, recommended.length - 1)]),
                  disabled: isGenerating,
                }
              : screen === "preference"
                ? {
                    label: "Continue",
                    onClick: afterPreference,
                    disabled: !preference,
                  }
                : screen === "age"
                  ? {
                      label: isColor ? "Show my colours" : "Show my styles",
                      onClick: toStyles,
                      disabled: !ageGroup,
                    }
                  : undefined
      }
      secondary={
        screen === "age" ? undefined : { label: isColor ? "Skip hair colour" : "Skip hairstyle", onClick: () => void skip(), disabled: isSaving || isGenerating }
      }
    >
      {screen === "preference" && (
        <VisualQuestion
          eyebrow={`${isColor ? "Hair colour" : "Hairstyle"} · 1 of ${askAge ? 2 : 1}`}
          question={preferenceQuestion.question}
          options={preferenceQuestion.options.map((o) => ({
            ...o,
            icon: isColor ? (
              <span className="block size-12 shrink-0 rounded-full border-2 border-bv-line-strong" style={{ background: FAMILY_SWATCH[o.value] }} />
            ) : (
              <LengthIcon level={LENGTH_LEVEL[o.value] ?? 2} />
            ),
          }))}
          value={preference ? [preference] : []}
          onChange={([v]) => setPreference(v)}
        />
      )}

      {screen === "age" && (
        <VisualQuestion
          eyebrow={`${isColor ? "Hair colour" : "Hairstyle"} · 2 of 2`}
          question="Which age group are you in?"
          options={AGE_GROUP_OPTIONS.map((o) => ({
            label: o.label,
            value: o.value,
          }))}
          value={ageGroup ? [ageGroup] : []}
          onChange={([v]) => setAgeGroup(v)}
        />
      )}

      {screen === "styles" && (
        <div className="flex flex-col gap-10">
          {tabs}
          {/* FLUX's colour Custom tab has no header: the shade picker sits right under the tabs. */}
          {!(isColor && styleTab === "collection") && (
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-4xl font-semibold">
                  {styleTab === "collection" ? "Build your look" : isColor ? "Colours picked for you" : "Styles picked for you"}
                </p>
                <p className="mt-2 text-2xl capitalize text-bv-ink-muted">
                  {[!isColor && session?.occasion ? `For your ${session.occasion}` : null, preferenceSummary].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button type="button" onClick={() => go("preference")} className={buttonClass("outline", "sm", "shrink-0")}>
                Change
              </button>
            </div>
          )}

          {styleTab === "recommended" &&
            (isRecommending ? (
              <div className="min-h-[70vh]">
                <AnalysisProgressScreen
                  title={isColor ? "Finding Your Colours" : "Crafting Your Looks"}
                  variant="recommendation"
                  images={faceUrl ? [{ src: faceUrl }] : []}
                  stages={[
                    "Preparing your photo…",
                    "Reading facial features…",
                    isColor ? "Matching colours for you…" : "Matching looks for you…",
                    "Putting the finishing touches…",
                  ]}
                />
              </div>
            ) : recommended && recommended.length > 0 ? (
              <div className="flex flex-col gap-6">
                <p className="text-2xl text-bv-ink-muted">
                  Picked for your face shape
                  {preferenceSummary ? ` and ${preferenceSummary.toLowerCase()}` : ""}.
                </p>
                <LookCarousel
                  index={Math.min(recIndex, recommended.length - 1)}
                  onIndexChange={setRecIndex}
                  looks={recommended.map((st) => {
                    const refs = isColor ? colorReferencePhotos(st.name, genderKey) : referencePhotos(st.name, genderKey);
                    const own = imageOf(st);
                    return {
                      id: st.id,
                      name: st.name,
                      reason: st.subtitle,
                      sections: isColor
                        ? [
                            { title: "Technique", text: st.technique },
                            { title: "Maintenance", text: st.maintenance },
                          ]
                        : [
                            { title: "Styling options", text: st.stylingTips },
                            { title: "Maintenance", text: st.maintenance },
                          ],
                      images: refs.length ? refs : [own ?? silhouetteFor(st.name)],
                      tried: triedNames.has(st.name),
                    };
                  })}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 rounded-[2rem] border-2 border-dashed border-bv-line px-10 py-16 text-center">
                <Sparkles className="h-14 w-14 text-bv-ink-muted/70" />
                <p className="text-3xl font-semibold">Personalised {isColor ? "colours" : "styles"} aren&apos;t available right now</p>
                <button type="button" onClick={() => setStyleTab("collection")} className={buttonClass("primary", "sm")}>
                  Browse custom {isColor ? "colours" : "styles"}
                </button>
              </div>
            ))}

          {styleTab === "collection" &&
            (catalogue === null ? (
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-bv-surface-raised" />
                ))}
              </div>
            ) : isColor ? (
              <HaircolorPicker
                gender={gender}
                shade={customShade}
                technique={customTechnique}
                onShadeChange={setCustomShade}
                onTechniqueChange={setCustomTechnique}
              />
            ) : (
              <div className="flex flex-col gap-10">
                <HaircutPicker
                  cuts={catalogue.map((st) => ({
                    id: st.id,
                    name: st.name,
                    image: imageOf(st) ?? silhouetteFor(st.name),
                    tried: triedNames.has(st.name),
                  }))}
                  value={customCut?.id ?? null}
                  onChange={(id) => setCustomCut(catalogue.find((st) => st.id === id) ?? null)}
                />
                <OptionRow title="Styling options" options={hairStylingOptions(gender)} value={customStyling} onChange={setCustomStyling} />
                <OptionRow
                  title={hairAddOns(gender).title}
                  options={hairAddOns(gender).options}
                  value={customAddOn}
                  onChange={setCustomAddOn}
                  iconClass={gender === "male" ? "h-[60px]" : "h-10"}
                />
              </div>
            ))}
        </div>
      )}

      {screen === "tryon" && !tried.length && !isGenerating && (
        <div className="flex flex-col gap-8">
          {tabs}
          <NoResults noun={isColor ? "colour" : "style"} browseLabel="See recommended" onBrowse={() => replace("styles")} />
        </div>
      )}

      {screen === "tryon" && (tried.length > 0 || isGenerating) && (
        <div className="flex flex-col gap-8">
          {tabs}
          {inputSourceLabel(faceSource, session) && <p className="text-2xl text-bv-ink-muted">{inputSourceLabel(faceSource, session)}</p>}
          {isGenerating ? (
            // FLUX's try-on scan on the customer's photo while the look is made.
            <div className="min-h-[60vh]">
              <AnalysisProgressScreen
                title={current ? stylingLabel(current.style.name, current.styling) : ""}
                variant="generation"
                images={faceUrl ? [{ src: faceUrl }] : []}
                stages={[
                  "Preparing your photo…",
                  "Detecting your hair…",
                  isColor ? "Applying the colour…" : "Styling your new look…",
                  "Putting the finishing touches…",
                ]}
              />
            </div>
          ) : (
            <TryonCompare
              before={face}
              after={activeId === ORIGINAL_ID ? faceUrl : (active?.preview ?? null)}
              isLoading={isGenerating}
              loadingLabel={isGenerating ? `Styling ${current ? stylingLabel(current.style.name, current.styling) : ""}…` : "Pick a style to try"}
              compare={{
                active: compare.active,
                onToggle: compare.onToggle,
                pair: compare.pair,
              }}
            />
          )}
          {compare.active ? (
            <LookRail title="Pick 2 to compare" items={compare.items} activeId={null} picked={compare.picked} onSelect={compare.pick} />
          ) : (
            <LookRail
              title={isColor ? "Your colours" : "Your styles"}
              items={railItems}
              activeId={isGenerating ? null : activeId}
              loading={isGenerating && current ? styleItem(current.style, current.styling) : null}
              disabled={isGenerating}
              onSelect={setActiveId}
            />
          )}
        </div>
      )}
    </FlowScreen>
  );
}
