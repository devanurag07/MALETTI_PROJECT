"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Clock, Loader2, RotateCw, Sparkles, Stethoscope } from "lucide-react";
import { Chip, Panel, SelectMark, buttonClass } from "@/design-system/bluevella";
import { cn } from "@/lib/utils";
import { RECOMMEND_HAIR_PRODUCTS_URL, RECOMMEND_SKIN_PRODUCTS_URL } from "@/core/constants/url-constants";
import axiosClient from "@/core/network/axios-client";
import { isProductPricingEnabled } from "@/core/utils/salon-storage";
import type { RecommendedProduct, RecommendedService } from "@/features/products/types";
import type { SkinCategory } from "@/features/skin-analysis/types/skin-category";
import { recommendTreatment } from "../api/customer-session-api";
import { useCustomerSession } from "../context/CustomerSessionContext";
import { flowStepTitle, sessionStepPath } from "../config/session-types";
import FlowScreen from "../flow/FlowScreen";
import { useFlowProgress } from "../flow/useFlowProgress";
import type { HairAttribute } from "../hooks/useAnalysis";
import { useStepCompletion } from "../hooks/useStepCompletion";
import { useStepDraft } from "../hooks/useStepDraft";
import { SERVICE_ROLE_LABEL, serviceCards, type ServiceCard as Card } from "../treatment-services";
import type { TreatmentArea, TreatmentRecommendation, TreatmentService } from "../types";

const CURRENCY: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", KWD: "KD" };
const AREA_LABEL: Record<TreatmentArea, string> = { skin: "Skin", hair: "Hair" };

async function recommendProducts(url: string, body: object): Promise<{ items: RecommendedProduct[]; summary: string }> {
  try {
    const res = await axiosClient.post(url, body);
    return { items: res.data?.data?.recommended_products ?? [], summary: res.data?.data?.recommendation_summary ?? "" };
  } catch (e) {
    console.error(`Recommendation request failed (${url}):`, e);
    return { items: [], summary: "" };
  }
}

async function recommendFor(area: TreatmentArea, analysis: { name: string; score: number }[]) {
  try {
    return await recommendTreatment(area, analysis);
  } catch (e) {
    console.error(`Treatment recommendation failed (${area}):`, e);
    return null;
  }
}

/** Snapshot saved in SessionStep.data.services (what the report shows). */
const toSnapshot = (s: TreatmentService): RecommendedService => ({
  title: s.title,
  description: s.description,
  image: s.image,
  price: s.price,
  currency: s.currency,
});

function ServiceCard({
  card,
  weeks,
  selected,
  showPricing,
  onToggle,
}: {
  card: Card;
  weeks?: number;
  selected: boolean;
  showPricing: boolean;
  onToggle: () => void;
}) {
  const { service: s, role } = card;
  const helps = s.helps ?? [];
  const benefit = s.benefit || s.description;
  const meta = [s.duration, showPricing && s.price > 0 ? `${CURRENCY[s.currency] ?? ""}${s.price}` : ""].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[1.75rem] border-2 bg-bv-surface-raised text-left transition active:scale-[0.98]",
        selected ? "border-bv-accent shadow-bv-glow" : "border-bv-line",
      )}
    >
      <div className="relative h-44 w-full">
        {s.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- salon service image URL
          <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#0e3a49,#0c1c25_70%)]">
            <Sparkles className="size-14 text-bv-accent" strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute left-4 top-4">
          <Chip tone={role === "recommended" ? "solid" : "photo"} size="sm">
            {SERVICE_ROLE_LABEL[role]}
            {role === "follow_up" && weeks ? ` · ${weeks} wks` : ""}
          </Chip>
        </span>
        <span className="absolute right-4 top-4">
          <SelectMark selected={selected} kind="add" onPhoto />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="text-2xl font-semibold leading-tight text-bv-ink">{s.title}</p>
        {helps.length > 0 && <p className="text-xl font-medium text-bv-accent">For {helps.join(" & ")}</p>}
        {benefit && <p className="line-clamp-2 text-xl leading-snug text-bv-ink-muted">{benefit}</p>}
        {meta.length > 0 && (
          <p className="mt-auto flex items-center gap-2 pt-2 text-xl text-bv-ink">
            {s.duration && <Clock className="size-5 text-bv-accent" />}
            {meta.join(" · ")}
          </p>
        )}
      </div>
    </button>
  );
}

/** One short line under the focus areas; the full reason is kept for the report. */
function statusLine(rec: TreatmentRecommendation, hasCards: boolean): string | null {
  if (rec.status === "all_green") return rec.reason;
  if (rec.status === "assessment_first" || rec.status === "consultation") {
    return hasCards
      ? "Your beauty professional will do a quick check first, then may suggest:"
      : "Your beauty professional will do a quick check first and guide you.";
  }
  return null;
}

function FollowUp({ rec }: { rec: TreatmentRecommendation }) {
  if (!rec.follow_up) return null;
  return (
    <p className="flex items-center gap-4 text-xl text-bv-ink">
      <CalendarClock className="size-7 shrink-0 text-bv-accent" />
      Review your results in about {rec.follow_up.weeks} weeks.
    </p>
  );
}

// 2: services carry `helps` / `benefit`, and options are listed.
// 3: every result that is not all-green names at least 3 services.
const DRAFT_VERSION = 3;

/** Recommendations and selections saved while the plan is open. `basis` is the analysis they came from. */
interface TreatmentDraft {
  /** Bumped when the recommendation shape changes, so older drafts are rebuilt. */
  version?: number;
  basis: string;
  recommendations: TreatmentRecommendation[];
  products: RecommendedProduct[];
  recommendation_summary: string;
  chosen_services: string[];
  chosen_products: string[];
}

/**
 * "Your plan": per analysis area, the salon treatment chosen from the two lowest scores
 * (or an all-clear / assessment message), plus products, one tap to include/exclude.
 * With `area` (Bridal / Function-Ready) it's the hair or skin plan, built from that analysis only.
 */
export default function TreatmentScreen({ area: only }: { area?: TreatmentArea } = {}) {
  const router = useRouter();
  const { session, getStep, previousStep } = useCustomerSession();
  const stepId = only ? (`${only}_plan` as const) : "treatment";
  const includeSkin = only !== "hair";
  const includeHair = only !== "skin";
  const { complete, skip, isSaving } = useStepCompletion(stepId);
  const progress = useFlowProgress(stepId);
  const showPricing = isProductPricingEnabled();

  // Recommendations depend on the analysis; a saved draft is reused only if the analysis hasn't been redone.
  const [basis] = useState(() => {
    const skinStep = getStep("skin_analysis");
    const hairStep = getStep("hair_analysis");
    const skinId = includeSkin && skinStep?.status === "completed" ? skinStep.data.skin_analysis_id : "";
    const hairId = includeHair && hairStep?.status === "completed" ? hairStep.data.hair_analysis_id : "";
    return `${skinId ?? ""}:${hairId ?? ""}`;
  });
  const { initial, save: saveDraft } = useStepDraft<TreatmentDraft>(stepId);
  // Older draft shapes (no `recommendations`, or an earlier version) are rebuilt.
  const draft = initial?.basis === basis && initial.version === DRAFT_VERSION ? initial : undefined;

  const [loading, setLoading] = useState(!draft);
  const [recommendations, setRecommendations] = useState<TreatmentRecommendation[]>(draft?.recommendations ?? []);
  const [products, setProducts] = useState<RecommendedProduct[]>(draft?.products ?? []);
  const [summary, setSummary] = useState(draft?.recommendation_summary ?? "");
  const [chosenServices, setChosenServices] = useState<Set<string>>(() => new Set(draft?.chosen_services));
  const [chosenProducts, setChosenProducts] = useState<Set<string>>(() => new Set(draft?.chosen_products));
  // Areas whose treatment request failed (network / server); shown with a retry, never as "no analysis".
  const [failedAreas, setFailedAreas] = useState<TreatmentArea[]>([]);
  const [retrying, setRetrying] = useState(false);

  /** The analysis scores per area in scope (empty when that analysis wasn't completed). */
  const analysisFor = (area: TreatmentArea): { name: string; score: number }[] => {
    const step = getStep(area === "skin" ? "skin_analysis" : "hair_analysis");
    if ((area === "skin" ? !includeSkin : !includeHair) || step?.status !== "completed") return [];
    return area === "skin"
      ? ((step.data.results as SkinCategory[]) ?? []).map(({ name, score }) => ({ name, score }))
      : ((step.data.hair_attributes as HairAttribute[]) ?? []).map(({ attribute, score }) => ({ name: attribute, score }));
  };

  useEffect(() => {
    if (draft) return;
    const skinStep = getStep("skin_analysis");
    const hairStep = getStep("hair_analysis");
    const skin = includeSkin && skinStep?.status === "completed" ? ((skinStep.data.results as SkinCategory[]) ?? []) : [];
    const hair = includeHair && hairStep?.status === "completed" ? ((hairStep.data.hair_attributes as HairAttribute[]) ?? []) : [];

    const load = async () => {
      const [sp, hp, sr, hr] = await Promise.all([
        skin.length ? recommendProducts(RECOMMEND_SKIN_PRODUCTS_URL, { skin_analysis: skin }) : null,
        hair.length ? recommendProducts(RECOMMEND_HAIR_PRODUCTS_URL, { hair_analysis: hair }) : null,
        skin.length ? recommendFor("skin", analysisFor("skin")) : null,
        hair.length ? recommendFor("hair", analysisFor("hair")) : null,
      ]);
      const recs = [sr, hr].filter((r): r is TreatmentRecommendation => r != null);
      setFailedAreas([
        ...(skin.length && !sr ? (["skin"] as const) : []),
        ...(hair.length && !hr ? (["hair"] as const) : []),
      ]);
      setRecommendations(recs);
      setProducts([...(sp?.items ?? []), ...(hp?.items ?? [])]);
      setSummary([sp?.summary, hp?.summary].filter(Boolean).join(" "));
      // The recommended treatment starts selected; products are opt-in.
      setChosenServices(new Set(recs.flatMap((r) => (r.status === "recommend" && r.service ? [r.service.title] : []))));
      setLoading(false);
    };
    void load();
    // Derived once from the saved analysis records.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryFailed = async () => {
    setRetrying(true);
    const results = await Promise.all(failedAreas.map((area) => recommendFor(area, analysisFor(area))));
    const recs = results.filter((r): r is TreatmentRecommendation => r != null);
    setRecommendations((prev) => [...prev, ...recs].sort((a, b) => a.area.localeCompare(b.area)).reverse());
    setChosenServices((prev) => new Set([...prev, ...recs.flatMap((r) => (r.status === "recommend" && r.service ? [r.service.title] : []))]));
    setFailedAreas(failedAreas.filter((area) => !recs.some((r) => r.area === area)));
    setRetrying(false);
  };

  // A plan with a failed area isn't saved as a draft, so Resume asks again.
  const currentDraft = useMemo<TreatmentDraft | null>(
    () =>
      loading || failedAreas.length > 0
        ? null
        : {
            version: DRAFT_VERSION,
            basis,
            recommendations,
            products,
            recommendation_summary: summary,
            chosen_services: [...chosenServices],
            chosen_products: [...chosenProducts],
          },
    [loading, failedAreas, basis, recommendations, products, summary, chosenServices, chosenProducts],
  );

  useEffect(() => {
    if (currentDraft) saveDraft(currentDraft);
  }, [currentDraft, saveDraft]);

  const toggle = (set: Set<string>, key: string, update: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    update(next);
  };

  const save = () => {
    const pickedProducts = products.filter((p) => chosenProducts.has(p.sku));
    const offered = recommendations.flatMap((r) => serviceCards(r).map((c) => c.service));
    const picked = offered.filter((s, i) => chosenServices.has(s.title) && offered.findIndex((o) => o.title === s.title) === i);
    complete({
      services: picked.map(toSnapshot),
      recommendation: Object.fromEntries(recommendations.map((r) => [r.area, r])),
      products: pickedProducts.map(({ sku, name, brand, price, currency, image, product_type, recommendation_reason }) => ({
        sku, name, brand, price, currency, image, product_type, recommendation_reason,
      })),
      selected_skus: pickedProducts.map((p) => p.sku),
      recommendation_summary: summary,
    });
  };

  const handleBack = () => {
    const prev = previousStep(stepId);
    if (session && prev) router.push(sessionStepPath(session.session_type, prev));
    else router.push("/");
  };

  const empty = !loading && recommendations.length === 0 && products.length === 0 && failedAreas.length === 0;

  return (
    <FlowScreen
      title={flowStepTitle(stepId, session)}
      progress={progress}
      onBack={handleBack}
      primary={loading ? undefined : { label: empty ? "Continue" : "Save my plan", onClick: save, loading: isSaving }}
      secondary={loading ? undefined : { label: "Skip", onClick: () => void skip(), disabled: isSaving }}
    >
      {loading ? (
        <div className="flex flex-col items-center gap-8 mt-40">
          <Loader2 className="w-20 h-20 animate-spin text-bv-accent" />
          <p className="text-3xl text-bv-ink-muted">Building your personalised plan…</p>
        </div>
      ) : empty ? (
        <p className="text-3xl text-bv-ink-muted text-center mt-40">No analysis results yet, so there are no personalised recommendations.</p>
      ) : (
        <div className="flex flex-col gap-14">
          {failedAreas.length > 0 && (
            <Panel className="flex items-center gap-8">
              <p className="flex-1 text-2xl leading-relaxed">
                We couldn&apos;t load your {failedAreas.map((a) => AREA_LABEL[a].toLowerCase()).join(" and ")} treatment
                recommendation. Please try again.
              </p>
              <button
                type="button"
                onClick={() => void retryFailed()}
                disabled={retrying}
                className={buttonClass("outline", "sm")}
              >
                {retrying ? <Loader2 className="w-7 h-7 animate-spin" /> : <RotateCw className="w-7 h-7" />}
                Retry
              </button>
            </Panel>
          )}

          {recommendations.map((rec) => (
            <Panel key={rec.area} className="flex flex-col gap-6">
              <p className="text-4xl font-semibold">
                {recommendations.length > 1 ? `${AREA_LABEL[rec.area]} services` : "Recommended services"}
              </p>

              {rec.priority_pair.length > 0 && (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-xl text-bv-ink-muted">Focus areas</span>
                  {rec.priority_pair.map((p) => (
                    <Chip key={p.name}>
                      {p.label} <span className="text-bv-accent">{p.score}</span>
                    </Chip>
                  ))}
                </div>
              )}
              {rec.staff_review && (
                <p className="text-xl text-bv-ink-muted">Close scores: your beauty professional will confirm these.</p>
              )}

              {(() => {
                const cards = serviceCards(rec);
                const line = statusLine(rec, cards.length > 0);
                return (
                  <>
                    {line && (
                      <p className="flex items-center gap-4 text-2xl text-bv-ink">
                        {rec.status === "all_green" ? (
                          <Sparkles className="size-8 shrink-0 text-bv-accent" />
                        ) : (
                          <Stethoscope className="size-8 shrink-0 text-bv-accent" />
                        )}
                        {line}
                      </p>
                    )}
                    {cards.length > 0 && (
                      <div className="grid grid-cols-2 gap-5">
                        {cards.map((card) => (
                          <ServiceCard
                            key={card.service.id}
                            card={card}
                            weeks={rec.follow_up?.weeks}
                            selected={chosenServices.has(card.service.title)}
                            showPricing={showPricing}
                            onToggle={() => toggle(chosenServices, card.service.title, setChosenServices)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              <FollowUp rec={rec} />
            </Panel>
          ))}

          {summary && <p className="text-3xl text-bv-ink-muted leading-relaxed">{summary}</p>}

          {products.length > 0 && (
            <Panel>
              <p className="text-4xl font-semibold mb-2">Products for you</p>
              <p className="text-2xl text-bv-ink-muted mb-6">Tap to add the ones you&apos;d like in your report.</p>
              <div className="grid grid-cols-2 gap-5">
                {products.map((p) => {
                  const selected = chosenProducts.has(p.sku);
                  return (
                    <button
                      key={p.sku}
                      type="button"
                      onClick={() => toggle(chosenProducts, p.sku, setChosenProducts)}
                      aria-pressed={selected}
                      className={cn(
                        "flex flex-col rounded-[1.75rem] border-2 bg-bv-surface-raised p-6 text-left transition active:scale-[0.98]",
                        selected ? "border-bv-accent shadow-bv-glow" : "border-bv-line",
                      )}
                    >
                      <div className="relative flex h-44 items-center justify-center rounded-2xl bg-white">
                        {p.image && (
                          // eslint-disable-next-line @next/next/no-img-element -- product catalogue URL
                          <img src={p.image} alt={p.name} className="max-h-40 max-w-[80%] object-contain" />
                        )}
                        <span className="absolute right-3 top-3">
                          <SelectMark selected={selected} kind="add" size="sm" onPhoto />
                        </span>
                      </div>
                      <p className="mt-4 text-2xl font-semibold text-bv-ink">{p.name}</p>
                      <p className="text-xl text-bv-ink-muted">{p.brand}</p>
                      {showPricing && <p className="mt-2 text-2xl font-semibold text-bv-accent">{CURRENCY[p.currency] ?? ""}{p.price}</p>}
                      {p.recommendation_reason && <p className="mt-2 line-clamp-3 text-lg text-bv-ink-muted">{p.recommendation_reason}</p>}
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      )}
    </FlowScreen>
  );
}
