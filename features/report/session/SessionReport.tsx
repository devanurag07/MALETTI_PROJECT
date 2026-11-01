"use client";
import { getBluevellaReportTheme, type getReportTheme } from "@/features/report/utils/report-theme";
import { BluevellaLogo } from "@/design-system/components/common/brand-logo";
import {
  MAKEOVER_SERVICES,
  STEP_TITLES,
  flowStepTitle,
  needsFullBody,
  sessionTitle,
} from "@/features/customer-session/config/session-types";
import type { CustomerSessionReport, ReportStep, StepId, TreatmentRecommendation } from "@/features/customer-session/types";
import type { MakeupLookGuide } from "@/features/makeup-advisor/types";
import { SERVICE_ROLE_LABEL, serviceCards } from "@/features/customer-session/treatment-services";

type Theme = ReturnType<typeof getReportTheme>;
type Variant = "screen" | "print";

/** One try-on image: what was applied and its result. */
interface Shot {
  url: string;
  caption: string;
  sub?: string;
}

interface ScoreItem {
  name: string;
  score: number;
  note?: string;
}

interface ProductSnapshot {
  sku?: string;
  name: string;
  brand?: string;
  price?: number;
  currency?: string;
  image?: string;
  recommendation_reason?: string;
}

interface ServiceSnapshot {
  title: string;
  description?: string;
  price?: number | null;
  currency?: string;
}

interface Ctx {
  theme: Theme;
  variant: Variant;
  report: CustomerSessionReport;
}

const CURRENCY: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", KWD: "KD" };

const formatLabel = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const price = (amount?: number | null, currency?: string) =>
  amount == null ? null : `${CURRENCY[currency ?? "INR"] ?? ""}${amount}`;

/** Same bands as the on-mirror results: red below 55, amber below 75, green when healthy. */
const scoreColor = (score: number) => (score < 55 ? "#D9534F" : score < 75 ? "#E0A526" : "#2E9E6B");

const stepTitle = (step: StepId, report: CustomerSessionReport) =>
  step === "full_makeup" ? flowStepTitle("full_makeup", report) : STEP_TITLES[step];

/** Hide a try-on whose link no longer loads instead of showing a broken image. */
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const figure = e.currentTarget.closest("figure");
  (figure ?? e.currentTarget).style.display = "none";
};

function uniqueShots(shots: (Shot | null | undefined)[], exclude: string[] = []): Shot[] {
  const seen = new Set(exclude);
  return shots.filter((s): s is Shot => {
    if (!s?.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

/** Saved try-on results of a step, for sessions saved before `looks` / `styles` / `tried` existed. */
const expandedShots = (step: ReportStep): Shot[] =>
  (step.expanded?.tryons ?? []).map((t) => ({ url: t.output_url, caption: t.name ?? "" }));

/**
 * One report page. In print each one becomes its own PDF page, sized to fit
 * (`data-report-page`, see the print route), so a section is never split.
 */
function Page({ ctx, eyebrow, title, children }: { ctx: Ctx; eyebrow?: string; title: string; children: React.ReactNode }) {
  const { theme, variant, report } = ctx;
  return (
    <section
      data-report-page
      className={variant === "print" ? "bg-white px-16 pt-14 pb-16" : "rounded-3xl bg-white px-10 pt-10 pb-12"}
      style={{ breakInside: "avoid" }}
    >
      <header className="flex items-end justify-between gap-6 pb-6 mb-10 border-b-2" style={{ borderColor: theme.accentBg }}>
        <div>
          {eyebrow && (
            <p className="text-lg font-semibold uppercase tracking-[0.22em]" style={{ color: theme.cardBorder }}>
              {eyebrow}
            </p>
          )}
          <h2 className="text-5xl font-bold mt-2 leading-tight" style={{ color: theme.primary }}>
            {title}
          </h2>
        </div>
        {variant === "print" && <p className="text-xl text-gray-400 shrink-0">{report.salon.name}</p>}
      </header>
      <div className="flex flex-col gap-12 text-[#1d1d1f]">{children}</div>
    </section>
  );
}

function SubHeading({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  return (
    <p className="text-2xl font-bold mb-5 flex items-center gap-3" style={{ color: theme.primary }}>
      <span className="inline-block w-2 h-7 rounded-full" style={{ background: theme.primary }} />
      {children}
    </p>
  );
}

function Figure({ shot, size = "md" }: { shot: Shot; size?: "lg" | "md" }) {
  return (
    <figure className="flex flex-col gap-3" style={{ breakInside: "avoid" }}>
      {/* Remote CDN output; plain <img> so the PDF renderer loads it without the Next image optimiser. */}
      <img src={shot.url} alt={shot.caption} onError={hideBroken} className="w-full h-auto rounded-2xl bg-gray-100" />
      <figcaption className={size === "lg" ? "text-2xl font-semibold" : "text-xl font-semibold"}>
        {shot.caption}
        {shot.sub && <span className="block text-lg font-normal text-gray-500">{shot.sub}</span>}
      </figcaption>
    </figure>
  );
}

/** "Also tried": every other look the customer tried in this step. */
function AlsoTried({ shots, theme }: { shots: Shot[]; theme: Theme }) {
  if (!shots.length) return null;
  return (
    <div>
      <SubHeading theme={theme}>Also tried</SubHeading>
      <div className="grid grid-cols-3 gap-6 items-start">
        {shots.map((s) => (
          <Figure key={s.url} shot={s} />
        ))}
      </div>
    </div>
  );
}

/** The chosen result, large, with its details beside it. */
function Chosen({ shot, theme, label, children }: { shot: Shot | null; theme: Theme; label: string; children?: React.ReactNode }) {
  if (!shot) return null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 items-start">
      <figure style={{ breakInside: "avoid" }}>
        <img src={shot.url} alt={shot.caption} onError={hideBroken} className="w-full h-auto rounded-3xl bg-gray-100 shadow-sm" />
      </figure>
      <div className="flex flex-col gap-6">
        <span
          className="self-start rounded-full px-5 py-2 text-lg font-semibold uppercase tracking-wider text-white"
          style={{ background: theme.primary }}
        >
          {label}
        </span>
        <p className="text-4xl font-bold leading-tight">{shot.caption}</p>
        {shot.sub && <p className="text-2xl text-gray-500 -mt-3">{shot.sub}</p>}
        {children}
      </div>
    </div>
  );
}

// ---------- Analysis ----------

function ScoreOverview({ items, theme, image, imageLabel }: { items: ScoreItem[]; theme: Theme; image?: string | null; imageLabel?: string }) {
  if (!items.length) return <p className="text-2xl text-gray-500">No results saved.</p>;
  const avg = Math.round(items.reduce((a, i) => a + i.score, 0) / items.length);
  const concerns = items.filter((i) => i.score < 75).length;
  return (
    <div className={`grid gap-10 items-center ${image ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_1fr]"}`}>
      <div
        className="w-48 h-48 rounded-full flex flex-col items-center justify-center text-white"
        style={{ background: `conic-gradient(${scoreColor(avg)} ${avg * 3.6}deg, ${theme.accentBg} 0deg)` }}
      >
        <div className="w-36 h-36 rounded-full bg-white flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color: scoreColor(avg) }}>
            {avg}
          </span>
          <span className="text-lg text-gray-500">out of 100</span>
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold">Overall score</p>
        <p className="text-2xl text-gray-600 mt-2">
          {concerns === 0 ? "Everything looks healthy." : `${concerns} of ${items.length} areas to work on, shown first below.`}
        </p>
      </div>
      {image && (
        <figure className="w-56">
          <img src={image} alt={imageLabel ?? ""} onError={hideBroken} className="w-full h-auto rounded-2xl bg-gray-100" />
          {imageLabel && <figcaption className="text-lg text-gray-500 mt-2 text-center">{imageLabel}</figcaption>}
        </figure>
      )}
    </div>
  );
}

function ScoreCards({ items }: { items: ScoreItem[] }) {
  const sorted = [...items].sort((a, b) => a.score - b.score);
  return (
    <div className="grid grid-cols-2 gap-5">
      {sorted.map((item) => {
        const score = Math.round(item.score);
        const color = scoreColor(score);
        return (
          <div key={item.name} className="rounded-2xl border-2 border-gray-100 p-6" style={{ breakInside: "avoid" }}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-2xl font-semibold">{formatLabel(item.name)}</span>
              <span className="rounded-full px-4 py-1 text-xl font-bold" style={{ color, background: `${color}1a` }}>
                {score}
              </span>
            </div>
            <div className="h-3 rounded-full mt-4 bg-gray-100">
              <div className="h-3 rounded-full" style={{ width: `${Math.max(3, Math.min(100, score))}%`, background: color }} />
            </div>
            {item.note && <p className="text-lg text-gray-600 mt-4 leading-snug">{item.note}</p>}
          </div>
        );
      })}
    </div>
  );
}

function SkinPage({ ctx, step, eyebrow }: { ctx: Ctx; step: ReportStep; eyebrow?: string }) {
  const results = (step.data.results as { name: string; score: number; suggestions?: string }[] | undefined) ?? [];
  const items = results.map((r) => ({ name: r.name, score: r.score, note: r.suggestions }));
  return (
    <Page ctx={ctx} eyebrow={eyebrow} title={STEP_TITLES.skin_analysis}>
      <ScoreOverview items={items} theme={ctx.theme} image={step.data.skin_map_url as string | null} imageLabel="Skin map" />
      <ScoreCards items={items} />
    </Page>
  );
}

function HairPage({ ctx, step, eyebrow }: { ctx: Ctx; step: ReportStep; eyebrow?: string }) {
  const attributes = (step.data.hair_attributes as { attribute: string; score: number; recommendation?: string }[] | undefined) ?? [];
  const items = attributes.map((a) => ({ name: a.attribute, score: a.score, note: a.recommendation }));
  const routine = (step.data.weekly_routine as string[] | undefined) ?? [];
  return (
    <Page ctx={ctx} eyebrow={eyebrow} title={STEP_TITLES.hair_analysis}>
      <ScoreOverview items={items} theme={ctx.theme} />
      <ScoreCards items={items} />
      {routine.length > 0 && (
        <div>
          <SubHeading theme={ctx.theme}>Your weekly routine</SubHeading>
          <ol className="grid grid-cols-2 gap-4">
            {routine.map((r, i) => (
              <li key={r} className="flex gap-4 rounded-2xl p-5 text-xl" style={{ background: ctx.theme.accentBg, breakInside: "avoid" }}>
                <span className="font-bold" style={{ color: ctx.theme.primary }}>
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      )}
    </Page>
  );
}

// ---------- Plans ----------

/** Focus areas, the services the customer kept (or the all-clear / assessment message) and the follow-up. */
function RecommendationBlock({ ctx, rec, kept, heading }: { ctx: Ctx; rec: TreatmentRecommendation; kept: ServiceSnapshot[]; heading: string }) {
  const { theme } = ctx;
  const cards = serviceCards(rec).filter((c) => kept.some((k) => k.title === c.service.title));
  return (
    <div style={{ breakInside: "avoid" }}>
      <SubHeading theme={theme}>{heading}</SubHeading>
      <div className="flex flex-col gap-5 rounded-2xl p-6" style={{ background: theme.accentBg }}>
        {rec.priority_pair.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xl">
            <span className="text-gray-600">Focus areas</span>
            {rec.priority_pair.map((p) => (
              <span key={p.name} className="rounded-full px-4 py-1 border-2 font-semibold" style={{ borderColor: scoreColor(p.score) }}>
                {p.label} {p.score}
              </span>
            ))}
          </div>
        )}
        <p className="text-xl text-gray-700 leading-snug">{rec.reason}</p>
        {rec.options_note && cards.some((c) => c.role === "after_assessment") && (
          <p className="text-xl text-gray-700 leading-snug">{rec.options_note}</p>
        )}
        {cards.map(({ service: sv, role }) => (
          <div key={sv.id} className="flex justify-between gap-6 rounded-xl bg-white p-5">
            <div className="min-w-0">
              <p className="text-base font-semibold uppercase tracking-wide" style={{ color: theme.primary }}>
                {SERVICE_ROLE_LABEL[role]}
              </p>
              <p className="text-2xl font-semibold">{sv.title}</p>
              {sv.description && <p className="text-lg text-gray-600 leading-snug">{sv.description}</p>}
              {sv.duration && <p className="text-lg text-gray-600">{sv.duration}</p>}
            </div>
            {sv.price > 0 && price(sv.price, sv.currency) && (
              <span className="text-2xl font-semibold shrink-0" style={{ color: theme.primary }}>{price(sv.price, sv.currency)}</span>
            )}
          </div>
        ))}
        {rec.status === "recommend" && rec.service && cards.length === 0 && (
          <p className="text-lg text-gray-500">Not added to your plan for now.</p>
        )}
        {rec.follow_up && (
          <p className="text-lg text-gray-700">
            <span className="font-semibold">Review in about {rec.follow_up.weeks} weeks.</span> {rec.follow_up.text}
          </p>
        )}
      </div>
    </div>
  );
}

function PlanPage({ ctx, step, title, eyebrow }: { ctx: Ctx; step: ReportStep; title: string; eyebrow?: string }) {
  const { theme } = ctx;
  const services = (step.data.services as ServiceSnapshot[] | undefined) ?? [];
  const products = (step.data.products as ProductSnapshot[] | undefined) ?? [];
  const summary = step.data.recommendation_summary as string | undefined;
  // Pair-rule recommendation per area; sessions saved before it only have `services`.
  const recommendations = Object.values(
    (step.data.recommendation as Partial<Record<string, TreatmentRecommendation>> | undefined) ?? {},
  ).filter((r): r is TreatmentRecommendation => r != null);
  return (
    <Page ctx={ctx} eyebrow={eyebrow} title={title}>
      {recommendations.map((rec) => (
        <RecommendationBlock
          key={rec.area}
          ctx={ctx}
          rec={rec}
          kept={services}
          heading={recommendations.length > 1 ? `${rec.area === "skin" ? "Skin" : "Hair"} services` : "Recommended services"}
        />
      ))}
      {summary && <p className="text-2xl text-gray-700 leading-relaxed">{summary}</p>}
      {recommendations.length === 0 && (
        <div>
          <SubHeading theme={theme}>Salon treatments</SubHeading>
          {services.length === 0 ? (
            <p className="text-xl text-gray-500">No salon treatments recommended.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {services.map((s, i) => (
                <div key={s.title} className="flex gap-6 rounded-2xl p-6" style={{ background: theme.accentBg, breakInside: "avoid" }}>
                  <span
                    className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-xl font-bold text-white"
                    style={{ background: theme.primary }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-6 text-2xl font-semibold">
                      <span>{s.title}</span>
                      {price(s.price, s.currency) && <span style={{ color: theme.primary }}>{price(s.price, s.currency)}</span>}
                    </div>
                    {s.description && <p className="text-lg text-gray-700 mt-2 leading-snug">{s.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {products.length > 0 && (
        <div>
          <SubHeading theme={theme}>Products for home</SubHeading>
          <div className="grid grid-cols-3 gap-5 items-stretch">
            {products.map((p) => (
              <div key={p.sku ?? p.name} className="flex flex-col rounded-2xl border-2 border-gray-100 p-5" style={{ breakInside: "avoid" }}>
                <div className="h-40 flex items-center justify-center rounded-xl bg-gray-50 mb-4">
                  {p.image && <img src={p.image} alt={p.name} onError={(e) => (e.currentTarget.style.display = "none")} className="max-h-36 max-w-full object-contain" />}
                </div>
                <p className="text-xl font-semibold leading-snug">{p.name}</p>
                {p.brand && <p className="text-lg text-gray-500">{p.brand}</p>}
                {p.recommendation_reason && <p className="text-base text-gray-600 mt-2 leading-snug">{p.recommendation_reason}</p>}
                {price(p.price, p.currency) && (
                  <p className="text-xl font-bold mt-auto pt-3" style={{ color: theme.primary }}>
                    {price(p.price, p.currency)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}

// ---------- Try-ons ----------

function MakeupGuide({ guide, theme }: { guide: MakeupLookGuide; theme: Theme }) {
  return (
    <div className="flex flex-col gap-6 text-xl">
      {guide.about && <p className="text-gray-700 leading-relaxed">{guide.about}</p>}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(guide.shades).map(([area, shade]) => (
          <div key={area} className="rounded-2xl p-4" style={{ background: theme.accentBg }}>
            <p className="text-base uppercase tracking-wider text-gray-500">{area}</p>
            <p className="font-semibold leading-snug">{shade}</p>
          </div>
        ))}
      </div>
      {guide.products.length > 0 && (
        <p>
          <span className="font-semibold">Products: </span>
          {guide.products.join(" · ")}
        </p>
      )}
    </div>
  );
}

function MakeupPage({ ctx, step, title, eyebrow }: { ctx: Ctx; step: ReportStep; title: string; eyebrow?: string }) {
  const { theme } = ctx;
  const selected = step.data.selected_look as { name?: string; output_url?: string; occasion?: string } | null | undefined;
  const looks = (step.data.looks as { name?: string; occasion?: string; output_url?: string }[] | undefined) ?? [];
  const guide = step.data.guide as MakeupLookGuide | null | undefined;
  const occasion = (step.data.occasion as string | undefined) ?? selected?.occasion;
  const chosen: Shot | null = selected?.output_url ? { url: selected.output_url, caption: selected.name ?? "Your look" } : null;
  const tried = looks.length
    ? looks.map((l) => (l.output_url ? { url: l.output_url, caption: l.name ?? "", sub: l.occasion ? formatLabel(l.occasion) : undefined } : null))
    : expandedShots(step);
  const others = uniqueShots(tried, chosen ? [chosen.url] : []);
  return (
    <Page ctx={ctx} eyebrow={eyebrow} title={occasion && !title.toLowerCase().includes(occasion.toLowerCase()) ? `${title} · ${formatLabel(occasion)}` : title}>
      <Chosen shot={chosen} theme={theme} label="Your look">
        {guide && <MakeupGuide guide={guide} theme={theme} />}
      </Chosen>
      {guide && guide.tips.length > 0 && (
        <div>
          <SubHeading theme={theme}>How to get this look</SubHeading>
          <ol className="grid grid-cols-2 gap-4">
            {guide.tips.map((tip, i) => (
              <li key={tip} className="flex gap-4 rounded-2xl p-5 text-xl" style={{ background: theme.accentBg, breakInside: "avoid" }}>
                <span className="font-bold" style={{ color: theme.primary }}>
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ol>
        </div>
      )}
      <AlsoTried shots={others} theme={theme} />
    </Page>
  );
}

function StylePage({ ctx, step, title, eyebrow }: { ctx: Ctx; step: ReportStep; title: string; eyebrow?: string }) {
  const selected = step.data.selected_style as { name?: string; output_url?: string } | null | undefined;
  const styles = (step.data.styles as { name?: string; output_url?: string }[] | undefined) ?? [];
  const chosen: Shot | null = selected?.output_url ? { url: selected.output_url, caption: selected.name ?? "Your style" } : null;
  const tried = styles.length ? styles.map((s) => (s.output_url ? { url: s.output_url, caption: s.name ?? "" } : null)) : expandedShots(step);
  return (
    <Page ctx={ctx} eyebrow={eyebrow} title={title}>
      <Chosen shot={chosen} theme={ctx.theme} label="Your style" />
      <AlsoTried shots={uniqueShots(tried, chosen ? [chosen.url] : [])} theme={ctx.theme} />
    </Page>
  );
}

function ClothingPage({ ctx, step, eyebrow }: { ctx: Ctx; step: ReportStep; eyebrow?: string }) {
  const { theme } = ctx;
  type Outfit = { name: string; category?: string; output_url: string };
  const outfits = (step.data.outfits as Outfit[] | undefined) ?? [];
  const triedData = (step.data.tried as Outfit[] | undefined) ?? [];
  const chosen = uniqueShots(outfits.map((o) => ({ url: o.output_url, caption: o.name, sub: o.category })));
  const tried = triedData.length ? triedData.map((o) => ({ url: o.output_url, caption: o.name, sub: o.category })) : expandedShots(step);
  const others = uniqueShots(tried, chosen.map((c) => c.url));
  return (
    <Page ctx={ctx} eyebrow={eyebrow} title={STEP_TITLES.clothing}>
      {chosen.length > 0 && (
        <div>
          <SubHeading theme={theme}>Your outfits</SubHeading>
          <div className="grid grid-cols-2 gap-8 items-start">
            {chosen.map((s) => (
              <Figure key={s.url} shot={s} size="lg" />
            ))}
          </div>
        </div>
      )}
      <AlsoTried shots={others} theme={theme} />
    </Page>
  );
}

// ---------- Cover ----------

/** The last image in the chain: outfit → full makeup → makeup → hair colour (applied on the haircut) → hairstyle. */
function finalLook(completed: Map<StepId, ReportStep>): Shot | null {
  const outfit = (completed.get("clothing")?.data.outfits as { name: string; output_url: string }[] | undefined)?.[0];
  if (outfit?.output_url) return { url: outfit.output_url, caption: outfit.name };
  for (const [step, key] of [
    ["full_makeup", "selected_look"],
    ["makeup", "selected_look"],
    ["haircolor", "selected_style"],
    ["hairstyle", "selected_style"],
  ] as const) {
    const pick = completed.get(step)?.data[key] as { name?: string; output_url?: string } | undefined;
    if (pick?.output_url) return { url: pick.output_url, caption: pick.name ?? "" };
  }
  return null;
}

function Cover({ ctx, order, completed }: { ctx: Ctx; order: StepId[]; completed: Map<StepId, ReportStep> }) {
  const { theme, variant, report } = ctx;
  const date = new Date(report.completed_at ?? report.created_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const services = report.makeover_services.map((id) => MAKEOVER_SERVICES.find((s) => s.id === id)?.title).filter(Boolean);
  const hero = finalLook(completed);
  const statuses = new Map(report.steps.map((s) => [s.step, s.status]));
  const journey = order.filter((id) => statuses.has(id));
  const facts = [
    report.customer_name && ["Prepared for", report.customer_name],
    ["Date", date],
    report.occasion && ["Occasion", formatLabel(report.occasion)],
    services.length > 0 && ["Services", services.join(", ")],
  ].filter(Boolean) as [string, string][];

  return (
    <section
      data-report-page
      className={`text-white ${variant === "print" ? "px-16 pt-16 pb-16" : "rounded-3xl px-10 pt-10 pb-12"}`}
      style={{ background: theme.primary, breakInside: "avoid" }}
    >
      <div className="flex items-center justify-between gap-6">
        <p className="text-2xl font-semibold tracking-wide opacity-90">{report.salon.name}</p>
        <img src={BluevellaLogo.src} alt="Bluevella" className="h-32 w-32 rounded-full object-contain" />
      </div>
      <p className="mt-12 text-xl uppercase tracking-[0.3em] opacity-70">Your beauty report</p>
      <h1 className="text-7xl font-bold mt-3 leading-tight">{sessionTitle(report)}</h1>

      <div className={`grid gap-10 mt-12 items-start ${hero ? "grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" : "grid-cols-1"}`}>
        {hero && (
          <figure>
            <img src={hero.url} alt={hero.caption} onError={hideBroken} className="w-full h-auto rounded-3xl bg-white/10" />
            <figcaption className="text-xl mt-3 opacity-80">Your final look{hero.caption ? ` · ${hero.caption}` : ""}</figcaption>
          </figure>
        )}
        <div className="flex flex-col gap-10">
          <dl className="flex flex-col gap-5">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-lg uppercase tracking-wider opacity-60">{label}</dt>
                <dd className="text-3xl font-semibold mt-1">{value}</dd>
              </div>
            ))}
          </dl>
          {journey.length > 0 && (
            <div>
              <p className="text-lg uppercase tracking-wider opacity-60 mb-4">Your journey</p>
              <ol className="flex flex-col gap-3">
                {journey.map((id, i) => {
                  const done = statuses.get(id) === "completed";
                  return (
                    <li key={id} className={`flex items-center gap-4 text-2xl ${done ? "" : "opacity-50"}`}>
                      <span className="w-10 h-10 shrink-0 rounded-full bg-white/15 flex items-center justify-center text-lg font-bold">{i + 1}</span>
                      <span className="flex-1">{stepTitle(id, report)}</span>
                      <span className="text-lg">{done ? "✓" : "Skipped"}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const SECTION_ORDER: StepId[] = ["skin_analysis", "hair_analysis", "treatment", "makeup", "hairstyle", "haircolor", "clothing"];
/** Bridal / Function-Ready follow their journey: hairstyle, hair colour, hair, skin, makeup, full-body makeup, outfits. */
const JOURNEY_SECTION_ORDER: StepId[] = [
  "hairstyle",
  "haircolor",
  "hair_analysis",
  "hair_plan",
  "skin_analysis",
  "skin_plan",
  "treatment",
  "makeup",
  "full_makeup",
  "clothing",
];

interface SessionReportProps {
  report: CustomerSessionReport;
  variant: Variant;
}

/**
 * Consolidated customer-session report: a cover, then one page per completed step
 * with everything the customer tried. `variant="print"` is laid out for the PDF route
 * (1080px wide pages, each sized to its content).
 */
export default function SessionReport({ report, variant }: SessionReportProps) {
  const theme = getBluevellaReportTheme();
  const ctx: Ctx = { theme, variant, report };
  const completed = new Map(report.steps.filter((s) => s.status === "completed").map((s) => [s.step, s]));
  const order = needsFullBody(report) ? JOURNEY_SECTION_ORDER : SECTION_ORDER;
  const shown = order.filter((id) => completed.has(id));

  return (
    <div className={variant === "print" ? "flex flex-col" : "flex flex-col gap-8"}>
      <Cover ctx={ctx} order={order} completed={completed} />
      {shown.map((id, i) => {
        const step = completed.get(id) as ReportStep;
        const eyebrow = `${String(i + 1).padStart(2, "0")} / ${String(shown.length).padStart(2, "0")}`;
        switch (id) {
          case "skin_analysis":
            return <SkinPage key={id} ctx={ctx} step={step} eyebrow={eyebrow} />;
          case "hair_analysis":
            return <HairPage key={id} ctx={ctx} step={step} eyebrow={eyebrow} />;
          case "treatment":
            return <PlanPage key={id} ctx={ctx} step={step} eyebrow={eyebrow} title="Your Treatment Plan" />;
          case "hair_plan":
            return <PlanPage key={id} ctx={ctx} step={step} eyebrow={eyebrow} title="Your Hair Plan" />;
          case "skin_plan":
            return <PlanPage key={id} ctx={ctx} step={step} eyebrow={eyebrow} title="Your Skin Plan" />;
          case "makeup":
            return <MakeupPage key={id} ctx={ctx} step={step} eyebrow={eyebrow} title={STEP_TITLES.makeup} />;
          case "full_makeup":
            return <MakeupPage key={id} ctx={ctx} step={step} eyebrow={eyebrow} title={flowStepTitle("full_makeup", report)} />;
          case "hairstyle":
            return <StylePage key={id} ctx={ctx} step={step} eyebrow={eyebrow} title={STEP_TITLES.hairstyle} />;
          case "haircolor":
            return <StylePage key={id} ctx={ctx} step={step} eyebrow={eyebrow} title={STEP_TITLES.haircolor} />;
          case "clothing":
            return <ClothingPage key={id} ctx={ctx} step={step} eyebrow={eyebrow} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
