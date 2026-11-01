"use client";
import { useState } from "react";
import { Camera, Droplets, Glasses, Palette, Scissors, Smile, Sparkles, Sun } from "lucide-react";
import BridalImg from "@/assets/bridal-looks/North Indian Bride.png";
import FunctionImg from "@/assets/bridal-looks/Reception Glam.png";
import MakeoverImg from "@/assets/bridal-looks/Cocktail Look.png";
import {
  BV,
  Button,
  Chip,
  ChoiceRow,
  IconTile,
  MediaCard,
  MediaRow,
  Panel,
  SegmentedTabs,
  SelectMark,
  TipRow,
} from "@/design-system/bluevella";
import FlowScreen from "@/features/customer-session/flow/FlowScreen";
import TryonTabs, { type TryonTab } from "@/features/customer-session/flow/TryonTabs";
import LookCarousel from "@/features/customer-session/flow/LookCarousel";
import PagedGrid from "@/features/customer-session/flow/PagedGrid";
import HaircolorPicker from "@/features/look-advisor/components/HaircolorPicker";
import LookCard from "@/features/customer-session/flow/LookCard";
import { LOOK_IMAGES, LOOK_ORDER } from "@/features/makeup-advisor/data/bridal-look-images";
import AnalysisProgressScreen from "@/design-system/components/common/analysis-progress-screen";
import MakeupShadeBuilder, { type ShadePicks } from "@/features/makeup-advisor/components/MakeupShadeBuilder";

const SWATCHES: [keyof typeof BV, string][] = [
  ["ground", "Page background"],
  ["surface", "Glass panels, cards"],
  ["surfaceRaised", "Tiles, inputs, inner panels"],
  ["line", "Hairlines, dividers"],
  ["lineStrong", "Control outlines"],
  ["accentSoft", "Selected fill"],
  ["accent", "Brand aqua"],
  ["onAccent", "Text on aqua"],
  ["inkMuted", "Secondary text"],
  ["ink", "Text"],
];

/**
 * Living reference for the Bluevella design system (no login needed): every token and component
 * as it renders in the kiosk. Open /design-system on the dev server.
 */
export default function DesignSystemPage() {
  const [tab, setTab] = useState<"findings" | "recs">("findings");
  const [journey, setJourney] = useState("bridal");
  const [shadePage, setShadePage] = useState(0);
  const [colorShade, setColorShade] = useState<string | null>(null);
  const [shadePicks, setShadePicks] = useState<ShadePicks>({ lipstick: "Everyday::Pink Nude" });
  const [choice, setChoice] = useState("medium");
  const [tiles, setTiles] = useState<string[]>(["skin"]);
  const [tryTab, setTryTab] = useState<TryonTab>("recommended");
  const [look, setLook] = useState(0);

  return (
    <div className="h-screen">
      <FlowScreen
        title="Bluevella design system"
        onBack={() => history.back()}
        progress={{ current: 3, total: 5, label: "Analysis", steps: ["Journey", "Photo", "Analysis", "Looks", "Report"] }}
        primary={{ label: "Primary action", onClick: () => undefined }}
        secondary={{ label: "Skip", onClick: () => undefined }}
      >
        <div className="flex flex-col gap-12">
          <Panel title="Colour tokens">
            <div className="grid grid-cols-5 gap-4">
              {SWATCHES.map(([key, use]) => (
                <div key={key} className="flex flex-col gap-2">
                  <span className="h-20 rounded-2xl border border-bv-line" style={{ background: BV[key] }} />
                  <span className="text-lg font-semibold">{key}</span>
                  <span className="text-base text-bv-ink-muted">{BV[key]} · {use}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Buttons">
            <div className="flex flex-wrap items-center gap-5">
              <Button arrow>Start your consultation</Button>
              <Button variant="outline" size="md">Retake</Button>
              <Button size="sm">Use photo</Button>
              <Button variant="ghost">Skip</Button>
              <Button disabled size="sm">Disabled</Button>
            </div>
          </Panel>

          <Panel title="Tabs, chips and marks">
            <div className="flex flex-col gap-6">
              <SegmentedTabs
                tabs={[
                  { id: "findings", label: "Key findings" },
                  { id: "recs", label: "Recommendations", count: 3 },
                ]}
                value={tab}
                onChange={setTab}
              />
              <div className="flex flex-wrap items-center gap-4">
                <Chip tone="solid">Recommended</Chip>
                <Chip>Hair Thinning <span className="text-bv-accent">43</span></Chip>
                <Chip tone="photo" icon={<Sparkles className="text-bv-accent" />}>For you</Chip>
                <SelectMark selected />
                <SelectMark selected={false} />
                <SelectMark selected={false} kind="add" />
              </div>
            </div>
          </Panel>

          <Panel title="Try-on tabs (Recommended | Custom | Results)">
            <TryonTabs active={tryTab} onChange={setTryTab} results={2} split={{ recommended: 3, custom: 10 }} />
          </Panel>

          <LookCarousel
            index={look}
            onIndexChange={setLook}
            looks={["Wolf Cut", "French Bob"].map((n) => ({
              id: n,
              name: n,
              reason: `The **${n}** frames your face and adds movement.`,
              sections: [
                { title: "Styling options", text: "Blow-dry with a round brush for volume." },
                { title: "Maintenance", text: "Trim every 6–8 weeks." },
              ],
              images: [1, 2].map((i) => `/recommended-looks/female_haircut/${encodeURIComponent(n)}/${encodeURIComponent(n)}%20${i}.webp`),
            }))}
          />

          <Panel title="Hair colour Custom (HaircolorPicker)">
            <div id="haircolor-picker">
              <HaircolorPicker gender="female" shade={colorShade} technique="balayage" onShadeChange={setColorShade} onTechniqueChange={() => undefined} />
            </div>
          </Panel>

          <Panel title="Paged grid (Bridal Makeup Custom: all looks, 6 per page)">
            <div id="paged-grid">
              <PagedGrid
                items={LOOK_ORDER}
                label="looks"
                render={(id) => <LookCard key={id} title={id.replace(/-/g, " ")} image={LOOK_IMAGES[id]} onClick={() => undefined} />}
              />
            </div>
          </Panel>

          <Panel title="Makeup Custom builder (MakeupShadeBuilder)">
            <div id="shade-builder">
              <MakeupShadeBuilder page={shadePage} onPageChange={setShadePage} value={shadePicks} onChange={setShadePicks} />
            </div>
          </Panel>

          <Panel title="Loading screens (AnalysisProgressScreen)">
            <div className="flex flex-col gap-10">
              {(["analysis", "recommendation", "generation"] as const).map((variant) => (
                <div key={variant} id={`loading-${variant}`} className="min-h-[60vh]">
                  <AnalysisProgressScreen
                    title={variant === "analysis" ? "Analysing your skin" : variant === "recommendation" ? "Crafting Your Looks" : ""}
                    variant={variant}
                    images={[{ src: "/test-photos/closeup.jpg", label: variant === "analysis" ? "Front" : undefined }]}
                    stages={["Preparing your photo…", "Reading facial features…", "Matching looks for you…", "Putting the finishing touches…"]}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Media rows (journey picker)">
            <div className="flex flex-col gap-5">
              {[
                ["bridal", "Bridal", "Your complete wedding look", BridalImg],
                ["function", "Function-Ready", "Engagement, party or family function", FunctionImg],
              ].map(([id, title, sub, img]) => (
                <MediaRow
                  key={id as string}
                  image={img as typeof BridalImg}
                  title={title as string}
                  subtitle={sub as string}
                  selected={journey === id}
                  onClick={() => setJourney(id as string)}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Media cards (looks, outfits)">
            <div className="grid grid-cols-3 gap-5">
              {[
                ["bridal", "Bridal", "Your big day, traditional or modern", BridalImg],
                ["function", "Function Ready", "Receptions, parties, engagements", FunctionImg],
                ["makeover", "Makeover", "A fresh you, for every day", MakeoverImg],
              ].map(([id, title, sub, img]) => (
                <MediaCard
                  key={id as string}
                  image={img as typeof BridalImg}
                  title={title as string}
                  subtitle={sub as string}
                  align="center"
                  aspect="aspect-[9/14]"
                  selected={journey === id}
                  onClick={() => setJourney(id as string)}
                  corner={<SelectMark selected={journey === id} size="sm" onPhoto />}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Icon tiles">
            <div className="grid grid-cols-3 gap-5">
              {[
                ["skin", "Skin Analysis", <Droplets key="d" />],
                ["hair", "Hair Analysis", <Scissors key="s" />],
                ["makeup", "Makeup Looks", <Palette key="p" />],
              ].map(([id, label, icon]) => (
                <IconTile
                  key={id as string}
                  icon={icon}
                  label={label as string}
                  selected={tiles.includes(id as string)}
                  onClick={() =>
                    setTiles((t) => (t.includes(id as string) ? t.filter((x) => x !== id) : [...t, id as string]))
                  }
                />
              ))}
            </div>
          </Panel>

          <Panel title="Choice rows and tips">
            <div className="grid grid-cols-2 gap-5">
              {["natural", "medium", "bold"].map((v) => (
                <ChoiceRow
                  key={v}
                  label={v[0].toUpperCase() + v.slice(1)}
                  icon={<Smile className="size-12 text-bv-accent" strokeWidth={1.5} />}
                  selected={choice === v}
                  onClick={() => setChoice(v)}
                />
              ))}
              <TipRow icon={<Sun />} title="Good lighting" hint="Avoid harsh light" />
              <TipRow icon={<Glasses />} title="Remove glasses" hint="If possible" />
              <TipRow icon={<Camera />} title="Face forward" hint="Avoid side angles" />
            </div>
          </Panel>
        </div>
      </FlowScreen>
    </div>
  );
}
