"use client";
import { buttonClass } from "@/design-system/bluevella";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Check, Crown, Flower2, PartyPopper, Plus, Shirt, ShoppingBag, Sun } from "lucide-react";
import { clothingCatalogueTryon, fetchClothingCategories, fetchClothingItems } from "../api/customer-session-api";
import { useCustomerSession } from "../context/CustomerSessionContext";
import { FLOW_STEP_TITLES, SESSION_TYPES, sessionCapturePath, sessionStepPath } from "../config/session-types";
import FlowScreen from "../flow/FlowScreen";
import LookCard from "../flow/LookCard";
import LookRail, { type RailItem } from "../flow/LookRail";
import TryonCompare from "../flow/TryonCompare";
import TryonTabs, { NoResults, type TryonTab } from "../flow/TryonTabs";
import { previewSrc } from "../flow/preview";
import VisualQuestion from "../flow/VisualQuestion";
import { useComparePicker } from "../flow/useComparePicker";
import { useFlowProgress } from "../flow/useFlowProgress";
import { useStepScreens } from "../flow/useStepScreens";
import { useStepCompletion } from "../hooks/useStepCompletion";
import { useStepDraft } from "../hooks/useStepDraft";
import { inputSourceLabel, useStepInputImage } from "../hooks/useStepInputImage";
import type { ClothingCategoryDto, ClothingItemDto } from "../types";

/** Occasion question (one screen, like the other steps), then the outfit catalogue, then try-on. */
type Screen = "occasion" | "outfits" | "tryon";

const ICON = "h-12 w-12";
/** Icon per seeded category slug; admin-added categories fall back to a bag. */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "bridal-wear": <Crown className={ICON} strokeWidth={1.5} />,
  "party-wear": <PartyPopper className={ICON} strokeWidth={1.5} />,
  "haldi-wear": <Sun className={ICON} strokeWidth={1.5} />,
  "mehndi-wear": <Flower2 className={ICON} strokeWidth={1.5} />,
  "casual-wear": <Shirt className={ICON} strokeWidth={1.5} />,
};

interface TriedOutfit {
  id: string;
  clothingResultId: number | null;
  itemId: number;
  name: string;
  category: string;
  outputUrl: string;
  /** What the screen shows (base64 when available); `outputUrl` is what gets saved. */
  preview: string;
}

/** Saved while the step is open (after the first try-on); previews come back from `output_url`. */
interface ClothingDraft {
  category_id: number | null;
  tried: { id: string; clothing_result_id: number | null; item_id: number; name: string; category: string; output_url: string }[];
  active_id: string | null;
  added: string[];
}

/** Clothing / Boutique: occasion (one question) → outfit catalogue → try on → add to my look. */
export default function ClothingScreen() {
  const router = useRouter();
  const { session, previousStep } = useCustomerSession();
  const { complete, skip, isSaving } = useStepCompletion("clothing");
  const progress = useFlowProgress("clothing");
  const { initial: draft, save: saveDraft } = useStepDraft<ClothingDraft>("clothing");
  // "outfits" / "tryon" are the Catalogue | Results tabs: switching replaces the screen, so back goes to the occasion.
  const { screen, go, replace, back } = useStepScreens<Screen>(
    ["occasion", "outfits", "tryon"],
    draft?.tried.length ? ["occasion", "tryon"] : "occasion",
  );
  // Bridal / Function-Ready: outfits go on the chosen full-body makeup look (else the full-length photo).
  const { image: face, source: faceSource, loading: faceLoading } = useStepInputImage("clothing");
  const gender = session?.gender || undefined;

  const [categories, setCategories] = useState<ClothingCategoryDto[] | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(draft?.category_id ?? null);
  const [items, setItems] = useState<ClothingItemDto[] | null>(null);

  const [current, setCurrent] = useState<ClothingItemDto | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tried, setTried] = useState<TriedOutfit[]>(
    () =>
      draft?.tried.map((o) => ({
        id: o.id,
        clothingResultId: o.clothing_result_id,
        itemId: o.item_id,
        name: o.name,
        category: o.category,
        outputUrl: o.output_url,
        preview: o.output_url,
      })) ?? [],
  );
  const [activeId, setActiveId] = useState<string | null>(draft?.active_id ?? null);
  const [added, setAdded] = useState<Set<string>>(() => new Set(draft?.added));

  useEffect(() => {
    fetchClothingCategories(gender)
      .then((list) => {
        const preferred = session ? SESSION_TYPES[session.session_type].clothingCategories : [];
        const rank = (c: ClothingCategoryDto) => {
          const i = preferred.indexOf(c.slug);
          return i === -1 ? preferred.length + c.order : i;
        };
        const sorted = [...list].sort((a, b) => rank(a) - rank(b));
        setCategories(sorted);
        // Keep a restored category if it's still offered.
        setCategoryId((restored) => (sorted.some((c) => c.id === restored) ? restored : (sorted[0]?.id ?? null)));
      })
      .catch((e) => {
        console.error("Failed to load clothing categories:", e);
        setCategories([]);
      });
    // session type is fixed for the screen's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  useEffect(() => {
    if (categoryId == null) return;
    setItems(null);
    fetchClothingItems(categoryId, gender)
      .then(setItems)
      .catch((e) => {
        console.error("Failed to load outfits:", e);
        setItems([]);
      });
  }, [categoryId, gender]);

  const category = categories?.find((c) => c.id === categoryId) ?? null;

  const tryOn = async (item: ClothingItemDto) => {
    if (faceLoading) return;
    if (!session || !face) {
      toast.error("Photo not found. Please retake it.");
      return;
    }
    // Already tried (e.g. picked again from the catalogue): show that result instead of processing it again.
    const done = tried.find((o) => o.itemId === item.id);
    if (done) {
      setActiveId(done.id);
      compare.exit();
      if (screen !== "tryon") replace("tryon");
      return;
    }
    setCurrent(item);
    setActiveId(null);
    compare.exit();
    if (screen !== "tryon") replace("tryon");
    setIsGenerating(true);
    try {
      const result = await clothingCatalogueTryon(session.id, item.id, face);
      const entry: TriedOutfit = {
        id: `${item.id}-${Date.now()}`,
        clothingResultId: result.clothing_result_id,
        itemId: item.id,
        name: item.name,
        category: category?.name ?? result.category.name,
        outputUrl: result.output_url,
        preview: previewSrc(result.image_base64, result.output_url) ?? result.output_url,
      };
      setTried((prev) => [...prev, entry]);
      setActiveId(entry.id);
    } catch (e) {
      console.error("Clothing try-on failed:", e);
      toast.error("Could not generate this outfit. Please try another.");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentDraft = useMemo<ClothingDraft | null>(
    () =>
      tried.length
        ? {
            category_id: categoryId,
            tried: tried.map((o) => ({
              id: o.id,
              clothing_result_id: o.clothingResultId,
              item_id: o.itemId,
              name: o.name,
              category: o.category,
              output_url: o.outputUrl,
            })),
            active_id: activeId,
            added: [...added],
          }
        : null,
    [categoryId, tried, activeId, added],
  );

  useEffect(() => {
    if (currentDraft) saveDraft(currentDraft);
  }, [currentDraft, saveDraft]);

  const toggleAdded = () => {
    if (!activeId) return;
    setAdded((prev) => {
      const next = new Set(prev);
      if (next.has(activeId)) next.delete(activeId);
      else next.add(activeId);
      return next;
    });
  };

  const save = () => {
    const outfits = tried.filter((o) => added.has(o.id));
    complete({
      outfits: outfits.map((o) => ({
        clothing_result_id: o.clothingResultId,
        item_id: o.itemId,
        name: o.name,
        category: o.category,
        output_url: o.outputUrl,
      })),
      clothing_result_ids: outfits.map((o) => o.clothingResultId).filter((id): id is number => id != null),
      output_urls: outfits.map((o) => o.outputUrl),
      // Every outfit tried, for the report's "Also tried".
      tried: tried.map((o) => ({ name: o.name, category: o.category, output_url: o.outputUrl })),
    });
  };

  const handleBack = () => {
    if (back()) return;
    const prev = previousStep("clothing");
    if (session) router.push(prev ? sessionStepPath(session.session_type, prev) : sessionCapturePath());
  };

  const triedItemIds = new Set(tried.map((o) => o.itemId));
  const activeAdded = activeId ? added.has(activeId) : false;
  const compare = useComparePicker(face, tried, activeId);

  /** Results rail: the outfit processing first, then tried outfits newest first (added ones marked). New outfits come from the catalogue. */
  const itemRail = (i: { id: number | string; name: string; image?: string | null }): RailItem => ({ id: `item:${i.id}`, label: i.name, image: i.image });
  const railItems: RailItem[] = [...tried].reverse().map((o) => ({ id: o.id, label: added.has(o.id) ? `✓ ${o.name}` : o.name, image: o.preview, tried: true }));
  const tabs = (
    <TryonTabs
      active={screen === "tryon" ? "results" : "catalogue"}
      onChange={(tab: TryonTab) => replace(tab === "results" ? "tryon" : "outfits")}
      results={tried.length}
      busy={isGenerating}
    />
  );
  const otherCategories = (categories ?? []).filter((c) => c.id !== categoryId);

  return (
    <FlowScreen
      title={FLOW_STEP_TITLES.clothing}
      progress={progress}
      onBack={handleBack}
      screenKey={screen}
      bodyClassName={screen === "occasion" ? "flex flex-col" : undefined}
      primary={
        added.size > 0
          ? { label: `Continue with ${added.size} outfit${added.size > 1 ? "s" : ""}`, onClick: save, disabled: isGenerating, loading: isSaving }
          : screen === "occasion"
            ? { label: "Show outfits", onClick: () => go("outfits"), disabled: categoryId == null }
            : undefined
      }
      secondary={{ label: "Skip outfits", onClick: () => void skip(), disabled: isSaving || isGenerating }}
    >
      {screen === "occasion" &&
        (categories === null ? (
          <div className="my-auto h-64 animate-pulse rounded-3xl bg-bv-surface-raised" />
        ) : categories.length === 0 ? (
          <div className="my-auto flex flex-col items-center gap-6 text-center">
            <ShoppingBag className="h-20 w-20 text-bv-ink-muted/70" />
            <p className="text-4xl font-semibold">No outfit collection yet</p>
            <p className="max-w-3xl text-2xl text-bv-ink-muted">This salon hasn&apos;t added outfits yet. You can skip this step.</p>
          </div>
        ) : (
          <VisualQuestion
            eyebrow="Outfits"
            question="What are you shopping for?"
            options={categories.map((c) => ({
              label: c.name,
              value: String(c.id),
              icon: c.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded category image
                <img src={c.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                CATEGORY_ICONS[c.slug] ?? <ShoppingBag className={ICON} strokeWidth={1.5} />
              ),
            }))}
            value={categoryId != null ? [String(categoryId)] : []}
            onChange={([id]) => setCategoryId(Number(id))}
          />
        ))}

      {screen === "outfits" && category && (
        <div className="flex flex-col gap-10">
          {tabs}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-4xl font-semibold">Tap an outfit to try it on</p>
              <p className="mt-2 text-2xl text-bv-ink-muted">
                {category.name}
                {items && items.length > 0 ? ` · ${items.length} outfits` : ""}
              </p>
            </div>
            <button type="button" onClick={() => go("occasion")} className={buttonClass("outline", "sm", "shrink-0")}>
              Change
            </button>
          </div>

          {items === null ? (
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-bv-surface-raised" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-6 rounded-[2rem] border-2 border-dashed border-bv-line px-10 py-16 text-center">
              <span className="text-bv-ink-muted">{CATEGORY_ICONS[category.slug] ?? <ShoppingBag className={ICON} />}</span>
              <p className="text-4xl font-semibold">No {category.name.toLowerCase()} yet</p>
              <p className="max-w-3xl text-2xl text-bv-ink-muted">Outfits for this occasion haven&apos;t been added. Try another occasion:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {otherCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={buttonClass("outline", "sm")}
                  >
                    <span className="[&_svg]:h-7 [&_svg]:w-7">{CATEGORY_ICONS[c.slug] ?? <ShoppingBag />}</span>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {items.map((item) => (
                <LookCard
                  key={item.id}
                  title={item.name}
                  image={item.image}
                  status={triedItemIds.has(item.id) ? "tried" : "idle"}
                  onClick={() => void tryOn(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {screen === "tryon" && !tried.length && !isGenerating && (
        <div className="flex flex-col gap-8">
          {tabs}
          <NoResults noun="outfit" onBrowse={() => replace("outfits")} />
        </div>
      )}

      {screen === "tryon" && (tried.length > 0 || isGenerating) && (
        <div className="flex flex-col gap-8">
          {tabs}
          {inputSourceLabel(faceSource, session) && <p className="text-2xl text-bv-ink-muted">{inputSourceLabel(faceSource, session)}</p>}
          <TryonCompare
            before={face}
            after={tried.find((o) => o.id === activeId)?.preview ?? null}
            isLoading={isGenerating}
            loadingLabel={isGenerating ? `Dressing you in ${current?.name ?? "your outfit"}…` : "Pick an outfit to try"}
            compare={{ active: compare.active, onToggle: compare.onToggle, pair: compare.pair }}
            actions={
              activeId ? (
                <button
                  type="button"
                  onClick={toggleAdded}
                  className={`flex items-center gap-3 rounded-full px-6 py-3 text-xl font-semibold ${activeAdded ? "bg-bv-accent text-bv-on-accent shadow-bv-glow" : "bg-bv-surface/80 text-bv-ink border-2 border-bv-line-strong"}`}
                >
                  {activeAdded ? <Check className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                  {activeAdded ? "Added to my look" : "Add to my look"}
                </button>
              ) : null
            }
          />
          {compare.active ? (
            <LookRail title="Pick 2 to compare" items={compare.items} activeId={null} picked={compare.picked} onSelect={compare.pick} />
          ) : (
            <LookRail
              title="Your outfits"
              items={railItems}
              activeId={isGenerating ? null : activeId}
              loading={isGenerating && current ? itemRail(current) : null}
              disabled={isGenerating}
              onSelect={setActiveId}
            />
          )}
        </div>
      )}
    </FlowScreen>
  );
}
