"use client";
import { buttonClass } from "@/design-system/bluevella";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { BookOpen, Crown, Gem, PartyPopper, Sparkles } from "lucide-react";
import AnalysisProgressScreen, {
  type AnalysisProgressImage,
  filesToProgressImages,
  revokeProgressImages,
} from "@/design-system/components/common/analysis-progress-screen";
import { buildMakeupPrompt, changeMakeup } from "@/features/makeup-advisor/api/change-makeup";
import { fetchLookCombos } from "@/features/makeup-advisor/api/look-advisor-api";
import { LOOK_IMAGES, LOOK_ORDER } from "@/features/makeup-advisor/data/bridal-look-images";
import MakeupLookGuideSheet from "@/features/makeup-advisor/components/MakeupLookDetails";
import PaletteLookCard from "@/features/makeup-advisor/components/PaletteLookCard";
import MakeupShadeBuilder, { SHADE_CATEGORIES, type ShadePicks, picksToComboItems } from "@/features/makeup-advisor/components/MakeupShadeBuilder";
import bridalLooks from "@/features/makeup-advisor/data/bridal_looks.json";
import { getMakeupLookGuide } from "@/features/makeup-advisor/data/look-guides";
import type {
  BridalLookId,
  BridalLooks,
  DesiredMakeupLook,
  LookCombo,
  LookComboItem,
  OutfitColor,
} from "@/features/makeup-advisor/types";
import { CAMERA_CAPTURE_KEY } from "@/core/constants/common-constants";
import { getFileFromLocalStorage } from "@/core/utils/common";
import { recommendBridalLooks } from "../api/customer-session-api";
import { useCustomerSession } from "../context/CustomerSessionContext";
import { OCCASIONS, flowStepTitle, sessionCapturePath, sessionStepPath } from "../config/session-types";
import FlowScreen from "../flow/FlowScreen";
import LookCard from "../flow/LookCard";
import LookRail, { type RailItem } from "../flow/LookRail";
import PagedGrid from "../flow/PagedGrid";
import TryonCompare from "../flow/TryonCompare";
import TryonTabs, { NoResults, type TryonTab } from "../flow/TryonTabs";
import VisualQuestion from "../flow/VisualQuestion";
import { previewSrc } from "../flow/preview";
import { useComparePicker } from "../flow/useComparePicker";
import { useFlowProgress } from "../flow/useFlowProgress";
import { useStepScreens } from "../flow/useStepScreens";
import { useStepCompletion } from "../hooks/useStepCompletion";
import { useStepDraft } from "../hooks/useStepDraft";
import { inputSourceLabel, useStepInputImage } from "../hooks/useStepInputImage";
import type { Occasion } from "../types";

/** Two questions (one per screen, like the analysis), then looks, the full collection and try-on. */
type Screen = "occasion" | "color" | "looks" | "tryon";

interface Look {
  id: string;
  name: string;
  subtitle?: string;
  prompt: string;
  makeupType: string;
  lookId: string | null;
  comboItems?: LookComboItem[];
  /** Why the AI picked this predefined look for her (Bridal / Function Makeup Recommended). */
  reason?: string;
}

interface TriedLook extends Look {
  occasion: Occasion;
  outputUrl: string;
  /** What the screen shows (base64 when available); `outputUrl` is what gets saved. */
  preview: string;
}

/** Saved while the step is open, so a refresh or Resume returns to the same looks. Previews aren't kept (no base64). */
interface MakeupDraft {
  occasion: Occasion;
  outfit_color: OutfitColor | null;
  recommended: Look[] | null;
  recommend_error: string | null;
  tried: Omit<TriedLook, "preview">[];
  active_id: string | null;
}

const DESIRED_LOOK: Record<Occasion, DesiredMakeupLook> = { bridal: "Bridal", engagement: "Soft Glam", party: "Party" };

const OUTFIT_COLORS: OutfitColor[] = [
  "Red (Red, Burgundy, Maroon, Wine)",
  "Pink (Pink, Rose, Fuchsia)",
  "Warm (Yellow, Orange, Gold, Mustard)",
  "Green (Olive, Emerald, Teal)",
  "Blue (Sky Blue, Navy, Royal Blue)",
  "Purple (Lavender, Purple, Plum)",
  "Beige (Beige, Tan, Camel, Brown)",
  "Neutral (Black, White, Grey, Cream)",
  "Multicolored",
];

const OCCASION_ICONS: Record<Occasion, React.ReactNode> = {
  bridal: <Crown className="h-12 w-12" strokeWidth={1.5} />,
  engagement: <Gem className="h-12 w-12" strokeWidth={1.5} />,
  party: <PartyPopper className="h-12 w-12" strokeWidth={1.5} />,
};

/** Swatch per outfit colour family (shown in place of an icon). */
const COLOR_SWATCH: Record<string, string> = {
  Red: "#B3122E",
  Pink: "#E75A93",
  Warm: "linear-gradient(135deg, #F2C14E, #E07A1F)",
  Green: "#1F7A5A",
  Blue: "#2457A6",
  Purple: "#7E4FA8",
  Beige: "#C9A27E",
  Neutral: "linear-gradient(135deg, #111 50%, #f2f2f2 50%)",
  Multicolored: "conic-gradient(#E0415E, #F2C14E, #4CC38A, #2F7BE0, #9B5DE5, #E0415E)",
};

const colorName = (c: OutfitColor) => c.split(" (")[0];

function Swatch({ color }: { color: string }) {
  return <span className="block size-12 shrink-0 rounded-full border-2 border-bv-line-strong" style={{ background: color }} />;
}

const BRIDAL_LOOKS: Look[] = LOOK_ORDER.map((id) => {
  const entry = (bridalLooks as BridalLooks)[id];
  return { id, name: entry.name, subtitle: entry.shortDescription, prompt: entry.prompt, makeupType: "bridal", lookId: id };
});

/** Ready-made looks per occasion, so the screen always has something to try even if AI recommendations fail. */
const COLLECTIONS: Record<Occasion, { title: string; ids: BridalLookId[] }> = {
  bridal: { title: "Bridal collection", ids: LOOK_ORDER },
  engagement: { title: "Engagement looks", ids: ["minimal-pastel-bride", "reception-glam", "friend-of-bride", "cocktail-look", "mehendi-look"] },
  party: { title: "Party looks", ids: ["cocktail-look", "reception-glam", "friend-of-bride", "mehendi-look", "minimal-pastel-bride"] },
};

const collectionLooks = (collection: { ids: BridalLookId[] }): Look[] =>
  collection.ids.map((id) => BRIDAL_LOOKS.find((l) => l.id === id)).filter((l): l is Look => !!l);

const comboToLook = (combo: LookCombo, index: number): Look => ({
  id: `combo-${index}-${combo.name}`,
  name: combo.name,
  subtitle: combo.description,
  prompt: buildMakeupPrompt(combo.items.map((i) => i.prompt)),
  makeupType: combo.items.map((i) => i.category).join(","),
  lookId: null,
  comboItems: combo.items,
});

/**
 * Two makeup steps share this screen:
 * - `everyday` (step `makeup`): occasion (Makeup app only; journeys set it) → outfit colour → AI looks → try on. Runs on the
 *   chosen hairstyle when there is one (Bridal / Function-Ready), else the close-up.
 * - `full` (step `full_makeup`, Bridal / Function-Ready): the occasion collection on the full-body
 *   photo, no questions. Clothing then runs on the chosen result.
 */
export default function MakeupScreen({ variant }: { variant: "everyday" | "full" }) {
  const router = useRouter();
  const { session, steps, updateSession, previousStep, getStep } = useCustomerSession();
  const isFull = variant === "full";
  const stepId = isFull ? "full_makeup" : "makeup";
  const everydayWithFullStep = !isFull && steps.includes("full_makeup");
  /** Predefined looks belong to the full-body step when the journey has one; this step is custom ("Made for you") only. */
  const showCollection = !everydayWithFullStep;
  const { complete, skip, isSaving } = useStepCompletion(stepId);
  const progress = useFlowProgress(stepId);
  const { initial: draft, save: saveDraft } = useStepDraft<MakeupDraft>(stepId);
  // Bridal / Function-Ready already chose the occasion on Select Journey; only the Makeup app asks it.
  const askOccasion = !session?.occasion;
  const flow: Screen[] = isFull ? ["looks", "tryon"] : [...(askOccasion ? (["occasion"] as const) : []), "color", "looks", "tryon"];
  // "looks" / "tryon" are the Catalogue | Results tabs: switching replaces the screen, so back skips past both.
  const { screen, go, replace, back } = useStepScreens<Screen>(
    flow,
    draft?.tried.length ? flow.filter((sc) => sc !== "looks") : draft?.recommended && !isFull ? flow.filter((sc) => sc !== "tryon") : flow[0],
  );
  const { image: face, source: faceSource, loading: faceLoading } = useStepInputImage(stepId);

  const [occasion, setOccasion] = useState<Occasion>(draft?.occasion ?? ((session?.occasion || "bridal") as Occasion));
  const [outfitColor, setOutfitColor] = useState<OutfitColor | null>(draft?.outfit_color ?? null);
  const [recommended, setRecommended] = useState<Look[] | null>(draft?.recommended ?? null);
  const [isRecommending, setIsRecommending] = useState(false);
  // FLUX's "Crafting your looks" animation runs on the photo the looks are made for.
  const [progressImages, setProgressImages] = useState<AnalysisProgressImage[]>([]);
  const [recommendError, setRecommendError] = useState<string | null>(draft?.recommend_error ?? null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!isRecommending || !face) return;
    const next = filesToProgressImages([{ file: face }]);
    setProgressImages(next);
    return () => {
      revokeProgressImages(next);
      setProgressImages([]);
    };
  }, [isRecommending, face]);
  /** Recommended (AI looks, then the predefined collection) | Custom (FLUX shade builder), as in FLUX look advisor. */
  const [lookTab, setLookTab] = useState<"recommended" | "custom">("recommended");
  const [picks, setPicks] = useState<ShadePicks>({});
  const [builderPage, setBuilderPage] = useState(0);

  const [current, setCurrent] = useState<Look | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tried, setTried] = useState<TriedLook[]>(() => (draft?.tried ?? []).map((t) => ({ ...t, preview: t.outputUrl })));
  const [activeTriedId, setActiveTriedId] = useState<string | null>(draft?.active_id ?? null);
  // Recommendations restored from the draft are for this occasion + colour; don't fetch them again.
  const restoredFor = useRef(draft?.recommended ? (isFull ? "full|0" : `${draft.occasion}|${draft.outfit_color}|0`) : null);

  // Bridal / Function Makeup: the AI picks from the occasion collection (`customer-session/makeup/bridal-looks/`),
  // judged on the close-up (the full-length photo's face is small), with the outfit colour from the Makeup Look step.
  useEffect(() => {
    if (!isFull || !session) return;
    const key = `full|${retry}`;
    if (restoredFor.current === key) return;
    restoredFor.current = null;
    const photo = getFileFromLocalStorage(CAMERA_CAPTURE_KEY);
    if (!photo) return;
    let cancelled = false;
    setIsRecommending(true);
    setRecommended(null);
    setRecommendError(null);
    const candidates = collectionLooks(COLLECTIONS[occasion]);
    const everydayOutfit = (getStep("makeup")?.draft as { outfit_color?: string } | undefined)?.outfit_color;
    recommendBridalLooks({
      customerSessionId: session.id,
      image: photo,
      looks: candidates.map((l) => ({ id: l.id, name: l.name, description: l.subtitle })),
      occasion,
      outfitColor: everydayOutfit ? colorName(everydayOutfit as OutfitColor) : null,
    })
      .then((picks) => {
        if (cancelled) return;
        setRecommended(picks.flatMap((p) => {
          const look = candidates.find((l) => l.id === p.id);
          return look ? [{ ...look, reason: p.reason }] : [];
        }));
      })
      .catch((e) => {
        console.error("Bridal look recommendations failed:", e);
        if (cancelled) return;
        setRecommended([]);
        const reason = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error)?.message;
        setRecommendError(reason || "Look recommendations failed");
      })
      .finally(() => !cancelled && setIsRecommending(false));
    return () => {
      cancelled = true;
    };
    // session id is stable for the screen's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFull, retry]);

  useEffect(() => {
    if (isFull || !outfitColor || !face || !session) return;
    const key = `${occasion}|${outfitColor}|${retry}`;
    if (restoredFor.current === key) return;
    restoredFor.current = null;
    let cancelled = false;
    setIsRecommending(true);
    setRecommended(null);
    setRecommendError(null);
    fetchLookCombos(face, {
      preferences: { desiredLook: DESIRED_LOOK[occasion], outfitColor },
      sessionId: String(session.salon_session_id),
      gender: "female",
    })
      .then((combos) => !cancelled && setRecommended(combos.slice(0, 4).map(comboToLook)))
      .catch((e) => {
        console.error("Look recommendations failed:", e);
        if (cancelled) return;
        setRecommended([]);
        // Backend reasons such as "Makeup is not enabled for this salon" come back in the drf envelope.
        const reason = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error)?.message;
        setRecommendError(reason || "Look recommendations failed");
      })
      .finally(() => !cancelled && setIsRecommending(false));
    return () => {
      cancelled = true;
    };
    // session id is stable for the screen's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasion, outfitColor, face, retry]);

  const changeOccasion = (next: Occasion) => {
    setOccasion(next);
    // In Bridal / Function-Ready the session occasion picks the full-body collection; leave it as chosen on Select Journey.
    if (session && session.occasion !== next && !everydayWithFullStep) {
      void updateSession({ occasion: next }).catch((e) => console.error("Failed to update occasion:", e));
    }
  };

  const tryLook = async (look: Look) => {
    if (faceLoading) return;
    if (!face || !session) {
      toast.error("Photo not found. Please retake it.");
      return;
    }
    // Already tried (e.g. picked again from the catalogue): show that result instead of processing it again.
    const done = tried.find((t) => t.name === look.name);
    if (done) {
      setActiveTriedId(done.id);
      compare.exit();
      if (screen !== "tryon") replace("tryon");
      return;
    }
    setCurrent(look);
    setActiveTriedId(null);
    compare.exit();
    if (screen !== "tryon") replace("tryon");
    setIsGenerating(true);
    try {
      const result = await changeMakeup({
        image: face,
        sessionId: String(session.salon_session_id),
        prompt: look.prompt,
        makeupName: look.name,
        makeupType: look.makeupType,
      });
      if (!result.outputUrl) throw new Error("No output image");
      const triedLook: TriedLook = {
        ...look,
        id: `${look.id}-${Date.now()}`,
        occasion,
        outputUrl: result.outputUrl,
        preview: previewSrc(result.base64, result.outputUrl) ?? result.outputUrl,
      };
      setTried((prev) => [...prev, triedLook]);
      setActiveTriedId(triedLook.id);
    } catch (e) {
      console.error("Makeup try-on failed:", e);
      toast.error("Could not apply this look. Please try another.");
    } finally {
      setIsGenerating(false);
    }
  };

  /** Custom tab: the picked shades as one look (FLUX handleMakeupSubmit). */
  const tryCustom = () => {
    const items = picksToComboItems(picks);
    if (!items.length) return;
    void tryLook({
      id: `custom:${items.map((i) => `${i.category}=${i.shadeName}`).join("|")}`,
      name: items.map((i) => i.shadeName).join(" · "),
      subtitle: "Custom look",
      prompt: buildMakeupPrompt(items.map((i) => i.prompt)),
      makeupType: items.map((i) => i.category).join(","),
      lookId: null,
      comboItems: items,
    });
  };

  const active = tried.find((t) => t.id === activeTriedId) ?? null;
  const [guideOpen, setGuideOpen] = useState(false);

  const currentDraft = useMemo<MakeupDraft | null>(
    () =>
      recommended || tried.length
        ? {
            occasion,
            outfit_color: outfitColor,
            recommended,
            recommend_error: recommendError,
            tried: tried.map(({ id, name, subtitle, prompt, makeupType, lookId, comboItems, occasion: o, outputUrl }) => ({
              id, name, subtitle, prompt, makeupType, lookId, comboItems, occasion: o, outputUrl,
            })),
            active_id: activeTriedId,
          }
        : null,
    [occasion, outfitColor, recommended, recommendError, tried, activeTriedId],
  );

  useEffect(() => {
    if (currentDraft) saveDraft(currentDraft);
  }, [currentDraft, saveDraft]);

  // Compare mode (as in FLUX): pick any two of the customer's photo and the tried looks.
  const compare = useComparePicker(face, tried, activeTriedId);
  const activeGuide = active ? getMakeupLookGuide(active.lookId, active.occasion) : null;
  const hasGuide = !!activeGuide || !!active?.comboItems?.length;

  const useLook = () => {
    if (!active) return;
    complete({
      occasion: active.occasion,
      selected_look: {
        name: active.name,
        occasion: active.occasion,
        look_id: active.lookId,
        makeup_type: active.makeupType,
        output_url: active.outputUrl,
        combo_items: active.comboItems,
      },
      looks: tried.map((t) => ({ name: t.name, occasion: t.occasion, look_id: t.lookId, output_url: t.outputUrl })),
      output_urls: [active.outputUrl],
      guide: getMakeupLookGuide(active.lookId, active.occasion),
    });
  };

  const handleBack = () => {
    if (back()) return;
    const prev = previousStep(stepId);
    if (session) router.push(prev ? sessionStepPath(session.session_type, prev) : sessionCapturePath());
  };

  const triedNames = new Set(tried.map((t) => t.name));

  const collection = COLLECTIONS[occasion];
  const looksInCollection = collectionLooks(collection);

  /** Results rail: the look processing first, then tried looks newest first (switch instantly). New looks come from the catalogue. */
  const lookItem = (l: Look): RailItem => ({
    id: `look:${l.id}`,
    label: l.name,
    image: l.lookId ? LOOK_IMAGES[l.lookId as keyof typeof LOOK_IMAGES] : null,
    swatches: l.comboItems?.map((i) => i.hex),
  });
  const railItems: RailItem[] = [...tried].reverse().map((t) => ({ id: t.id, label: t.name, image: t.preview, tried: true }));
  const tabs = (
    <TryonTabs
      active={screen === "tryon" ? "results" : lookTab}
      onChange={(tab: TryonTab) => {
        if (tab === "results") return replace("tryon");
        setLookTab(tab === "custom" ? "custom" : "recommended");
        replace("looks");
      }}
      results={tried.length}
      busy={isGenerating}
      split={{
        recommended: isRecommending ? undefined : (recommended?.length ?? 0) + (!isFull && showCollection ? looksInCollection.length : 0),
        custom: isFull ? BRIDAL_LOOKS.length : undefined,
      }}
    />
  );
  const sourceLabel = inputSourceLabel(faceSource, session);
  const skipLabel = isFull ? `Skip ${flowStepTitle(stepId, session).toLowerCase()}` : "Skip makeup";

  return (
    <FlowScreen
      title={flowStepTitle(stepId, session)}
      progress={progress}
      onBack={handleBack}
      screenKey={screen}
      bodyClassName={screen === "occasion" || screen === "color" ? "flex flex-col" : undefined}
      primary={
        screen === "tryon"
          ? { label: "Use this look", onClick: useLook, disabled: !active || isGenerating, loading: isSaving }
          : screen === "looks" && lookTab === "custom" && !isFull
            ? builderPage < SHADE_CATEGORIES.length - 1
              ? { label: "Next", onClick: () => setBuilderPage(builderPage + 1) }
              : { label: "Try this look", onClick: tryCustom, disabled: !picksToComboItems(picks).length || isGenerating }
            : screen === "occasion"
            ? { label: "Continue", onClick: () => go("color") }
            : screen === "color"
              ? { label: "Show my looks", onClick: () => go("looks"), disabled: !outfitColor }
              : undefined
      }
      secondary={
        screen === "color" && askOccasion
          ? undefined
          : screen === "looks" && lookTab === "custom" && !isFull && builderPage > 0
            ? { label: "Previous", onClick: () => setBuilderPage(builderPage - 1) }
            : { label: skipLabel, onClick: () => void skip(), disabled: isSaving || isGenerating }
      }
    >
      {screen === "occasion" && (
        <VisualQuestion
          eyebrow="Makeup · 1 of 2"
          question="Which look are you planning?"
          options={OCCASIONS.map((o) => ({ label: o.title, value: o.id, icon: OCCASION_ICONS[o.id] }))}
          value={[occasion]}
          onChange={([o]) => changeOccasion(o as Occasion)}
        />
      )}

      {screen === "color" && (
        <VisualQuestion
          eyebrow={askOccasion ? "Makeup · 2 of 2" : "Makeup"}
          question="What colour is your outfit?"
          options={OUTFIT_COLORS.map((c) => ({ label: colorName(c), value: c, icon: <Swatch color={COLOR_SWATCH[colorName(c)]} /> }))}
          value={outfitColor ? [outfitColor] : []}
          onChange={([c]) => setOutfitColor(c as OutfitColor)}
        />
      )}

      {screen === "looks" && (
        <div className="flex flex-col gap-10">
          {tabs}
          {(lookTab === "recommended" || isFull) && (
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-4xl font-semibold">Tap a look to try it on</p>
                <p className="mt-2 text-2xl text-bv-ink-muted">
                  {isFull
                    ? `${lookTab === "custom" ? "All looks" : "Picked for you"} · on your full-length photo`
                    : `${OCCASIONS.find((o) => o.id === occasion)?.title} · ${outfitColor ? colorName(outfitColor) : ""} outfit`}
                </p>
              </div>
              {!isFull && (
                <button
                  type="button"
                  onClick={() => go(flow[0])}
                  className={buttonClass("outline", "sm", "shrink-0")}
                >
                  Change
                </button>
              )}
            </div>
          )}

          {lookTab === "recommended" &&
            (isRecommending ? (
              <div className="min-h-[70vh]">
                <AnalysisProgressScreen
                  title="Crafting Your Looks"
                  variant="recommendation"
                  images={progressImages}
                  stages={["Preparing your photo…", "Reading facial features…", "Matching looks for you…", "Putting the finishing touches…"]}
                />
              </div>
            ) : recommended && recommended.length > 0 && isFull ? (
              <div className="grid grid-cols-2 gap-6">
                {recommended.map((look) => (
                  <div key={look.id} className="flex flex-col gap-3">
                    <LookCard
                      title={look.name}
                      subtitle={look.subtitle}
                      image={LOOK_IMAGES[look.id as keyof typeof LOOK_IMAGES]}
                      status={triedNames.has(look.name) ? "tried" : "idle"}
                      onClick={() => void tryLook(look)}
                    />
                    {look.reason && <p className="text-xl leading-snug text-bv-ink-muted">{look.reason}</p>}
                  </div>
                ))}
              </div>
            ) : recommended && recommended.length > 0 ? (
              <div className="flex flex-col gap-6">
                <p className="text-2xl text-bv-ink-muted">Shades chosen for your skin tone and your {outfitColor ? colorName(outfitColor).toLowerCase() : ""} outfit.</p>
                <div className="grid grid-cols-3 gap-4">
                  {recommended.map((look) => (
                    <PaletteLookCard
                      key={look.id}
                      name={look.name}
                      items={look.comboItems ?? []}
                      tried={triedNames.has(look.name)}
                      onTry={() => void tryLook(look)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 rounded-[2rem] border-2 border-dashed border-bv-line px-10 py-16 text-center">
                <Sparkles className="h-14 w-14 text-bv-ink-muted" />
                <p className="text-3xl font-semibold">Personalised looks aren&apos;t available right now</p>
                {recommendError && <p className="text-xl text-bv-ink-muted">{recommendError}</p>}
                <div className="flex gap-4">
                  <button type="button" onClick={() => setRetry((n) => n + 1)} className={buttonClass("outline", "sm")}>
                    Try again
                  </button>
                  <button type="button" onClick={() => setLookTab("custom")} className={buttonClass("primary", "sm")}>
                    {isFull ? "See all looks" : "Build your own"}
                  </button>
                </div>
              </div>
            ))}

          {/* The predefined collection sits under the AI looks (the full-length step shows only these). */}
          {lookTab === "recommended" && showCollection && !isFull && !isRecommending && (
            <section className="flex flex-col gap-6">
              <p className="text-3xl font-semibold">{collection.title}</p>
              <div className="grid grid-cols-3 gap-4">
                {looksInCollection.map((look) => (
                  <LookCard
                    key={look.id}
                    title={look.name}
                    subtitle={look.subtitle}
                    image={LOOK_IMAGES[look.id as keyof typeof LOOK_IMAGES]}
                    status={triedNames.has(look.name) ? "tried" : "idle"}
                    onClick={() => void tryLook(look)}
                  />
                ))}
              </div>
            </section>
          )}

          {lookTab === "custom" && isFull && (
            <PagedGrid
              items={BRIDAL_LOOKS}
              label="looks"
              render={(look) => (
                <LookCard
                  key={look.id}
                  title={look.name}
                  subtitle={look.subtitle}
                  image={LOOK_IMAGES[look.id as keyof typeof LOOK_IMAGES]}
                  status={triedNames.has(look.name) ? "tried" : "idle"}
                  onClick={() => void tryLook(look)}
                />
              )}
            />
          )}

          {lookTab === "custom" && !isFull && <MakeupShadeBuilder page={builderPage} onPageChange={setBuilderPage} value={picks} onChange={setPicks} />}
        </div>
      )}

      {screen === "tryon" && !tried.length && !isGenerating && (
        <div className="flex flex-col gap-8">
          {tabs}
          <NoResults noun="look" onBrowse={() => replace("looks")} />
        </div>
      )}

      {screen === "tryon" && (tried.length > 0 || isGenerating) && (
        <div className="flex flex-col gap-8">
          {tabs}
          {sourceLabel && <p className="text-2xl text-bv-ink-muted">{sourceLabel}</p>}
          <TryonCompare
            before={face}
            after={active?.preview ?? null}
            isLoading={isGenerating}
            loadingLabel={isGenerating ? `Applying ${current?.name ?? "your look"}…` : "Pick a look to try"}
            compare={{ active: compare.active, onToggle: compare.onToggle, pair: compare.pair }}
            actions={
              active && hasGuide ? (
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className={buttonClass("primary", "sm")}
                >
                  <BookOpen className="h-6 w-6" /> How to get this look
                </button>
              ) : null
            }
          />
          {compare.active ? (
            <LookRail title="Pick 2 to compare" items={compare.items} activeId={null} picked={compare.picked} onSelect={compare.pick} />
          ) : (
            <LookRail
              title="Your looks"
              items={railItems}
              activeId={isGenerating ? null : activeTriedId}
              loading={isGenerating && current ? lookItem(current) : null}
              disabled={isGenerating}
              onSelect={setActiveTriedId}
            />
          )}
          {active && (
            <MakeupLookGuideSheet
              open={guideOpen}
              onClose={() => setGuideOpen(false)}
              lookName={active.name}
              guide={activeGuide}
              comboItems={active.comboItems}
              description={active.subtitle}
            />
          )}
        </div>
      )}
    </FlowScreen>
  );
}
