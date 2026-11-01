"use client";
import { buttonClass } from "@/design-system/bluevella";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { Ban, Beaker, Droplets, FlaskConical, Hand, Hourglass, Palette, Scissors, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { CAMERA_CAPTURE_KEY } from "@/core/constants/common-constants";
import { getFileFromLocalStorage } from "@/core/utils/common";
import { getStoredSalon } from "@/core/utils/salon-storage";
import AnalysisProgressScreen, { filesToProgressImages } from "@/design-system/components/common/analysis-progress-screen";
import FrontalImg from "@/assets/icons/Frontal.png";
import OccipitalImg from "@/assets/icons/Occipital.png";
import ParietalImg from "@/assets/icons/Parietal.png";
import TemporalImg from "@/assets/icons/Temporal2.png";
import foreheadImg from "@/assets/advance-skin-analysis/forhead.png";
import noseImg from "@/assets/advance-skin-analysis/nose-img.png";
import sideCheekImg from "@/assets/advance-skin-analysis/side-cheek.png";
import acneIcon from "@/assets/skin-icons/acne.png";
import darkCirclesIcon from "@/assets/skin-icons/dark circles.png";
import oilinessIcon from "@/assets/skin-icons/oiliness.png";
import pigmentationIcon from "@/assets/skin-icons/pigmentation.png";
import poresIcon from "@/assets/skin-icons/pores.png";
import rednessIcon from "@/assets/skin-icons/redness.png";
import skinTextureIcon from "@/assets/skin-icons/skin-texture.png";
import wrinklesIcon from "@/assets/skin-icons/wrinkles.png";
import dandruffIcon from "@/assets/skin-icons2/dandruff.png";
import hairTextureIcon from "@/assets/skin-icons2/hair-texture.png";
import hairThinningIcon from "@/assets/skin-icons2/hair-thinning.png";
import { getHairAnalysisQuestions } from "@/features/hair-analysis/utils/questions";
import { getSkinAnalysisQuestions } from "@/features/skin-analysis/utils/questions";
import { useCustomerSession } from "../context/CustomerSessionContext";
import { analysisAreaLabel, flowStepTitle, getAnalysisScope, sessionCapturePath } from "../config/session-types";
import GuidedCapture, { useGuidedCapture, type CaptureRegion } from "../flow/GuidedCapture";
import { TEST_PHOTOS } from "../flow/testPhotos";
import FlowScreen from "../flow/FlowScreen";
import AnalysisResults from "./AnalysisResults";
import VisualQuestion, { type VisualOption } from "../flow/VisualQuestion";
import { useFlowProgress } from "../flow/useFlowProgress";
import { useStepScreens } from "../flow/useStepScreens";
import {
  fetchSkinVisualization,
  runHairAnalysis,
  runSkinAnalysis,
  type HairOutcome,
  type SkinCloseUpImages,
  type SkinCloseUpKey,
  type SkinOutcome,
} from "../hooks/useAnalysis";
import { useStepCompletion, type StepRecord } from "../hooks/useStepCompletion";
import { useStepDraft } from "../hooks/useStepDraft";

/** One sub-screen per question (`q:<key>`), then close-ups, then results. */
type Screen = `q:${string}` | "skin_closeups" | "scalp" | "results";

/** Two questions per area, one per screen; single-choice ones advance on tap. */
const SKIN_KEYS = ["skin-care-goal", "skin-concerns"];
const HAIR_KEYS = ["hair-treated", "hair-concerns"];

const lucide = (Icon: typeof Sparkles) => <Icon className="h-12 w-12" strokeWidth={1.5} />;

/** Icon per option value; the PNGs are the FLUX white line icons used on the results screens. */
const OPTION_ICONS: Record<string, VisualOption["icon"]> = {
  glowing_radiant_skin: lucide(Sparkles),
  anti_aging: lucide(Hourglass),
  acne_control: lucide(ShieldCheck),
  moisture_balance: lucide(Droplets),
  acne: acneIcon,
  redness: rednessIcon,
  dark_circles: darkCirclesIcon,
  oiliness: oilinessIcon,
  pigmentation: pigmentationIcon,
  wrinkles: wrinklesIcon,
  pores: poresIcon,
  skin_texture: skinTextureIcon,
  yes_coloured: lucide(Palette),
  chemically_treated: lucide(FlaskConical),
  yes_both: lucide(Beaker),
  no: lucide(Ban),
  dandruff: dandruffIcon,
  dry_scalp: lucide(Sun),
  split_ends: lucide(Scissors),
  frizziness: hairTextureIcon,
  itchy_scalp: lucide(Hand),
  hair_fall: hairThinningIcon,
};

type ScalpKey = "frontal" | "occipital" | "parietal" | "temporal";

/** Order matches the deep-hair-analysis `images` field (frontal, occipital, parietal, temporal). */
const SCALP_REGIONS: CaptureRegion<ScalpKey>[] = [
  { key: "frontal", label: "Front hairline", technical: "Frontal", tip: "Part the hair at the front hairline and rest the scope gently on the scalp.", sample: FrontalImg, testPhoto: TEST_PHOTOS.scalp_frontal },
  { key: "occipital", label: "Back of head", technical: "Occipital", tip: "Lift the hair at the lower back of the head and hold the scope flat on the skin.", sample: OccipitalImg, testPhoto: TEST_PHOTOS.scalp_occipital },
  { key: "parietal", label: "Crown", technical: "Parietal", tip: "Part the hair at the top of the head, where thinning usually shows first.", sample: ParietalImg, testPhoto: TEST_PHOTOS.scalp_parietal },
  { key: "temporal", label: "Sides", technical: "Temporal", tip: "Move the hair aside just above the ear and capture the scalp there.", sample: TemporalImg, testPhoto: TEST_PHOTOS.scalp_temporal },
];

const SKIN_REGIONS: CaptureRegion<SkinCloseUpKey>[] = [
  { key: "nose", label: "Nose", tip: "Hold the camera close to the side of the nose, where pores show most.", sample: noseImg, testPhoto: TEST_PHOTOS.skin_nose },
  { key: "side_cheek", label: "Cheek", tip: "Turn slightly and capture the middle of the cheek.", sample: sideCheekImg, testPhoto: TEST_PHOTOS.skin_side_cheek },
  { key: "forehead", label: "Forehead", tip: "Move hair off the forehead and capture the centre.", sample: foreheadImg, testPhoto: TEST_PHOTOS.skin_forehead },
];

type Answers = Record<string, string[]>;

/** `skin_analysis` step data; also its draft, saved as soon as the analysis returns. */
interface SkinData {
  skin_analysis_id: number;
  access_token: string;
  results: SkinOutcome["results"];
  answers: Answers;
  skin_map_url: string | null;
}

/** `hair_analysis` step data; also its draft. */
interface HairData {
  hair_analysis_id: number;
  access_token: string;
  hair_attributes: HairOutcome["attributes"];
  weekly_routine: string[];
  answers: Answers;
}

const skinData = (skin: SkinOutcome, answers: Answers, skinMap: string | null): SkinData => ({
  skin_analysis_id: skin.resultId,
  access_token: skin.accessToken,
  results: skin.results,
  answers,
  skin_map_url: skinMap,
});

const hairData = (hair: HairOutcome, answers: Answers): HairData => ({
  hair_analysis_id: hair.resultId,
  access_token: hair.accessToken,
  hair_attributes: hair.attributes,
  weekly_routine: hair.weeklyRoutine,
  answers,
});

/** Drafts are only saved when a face was detected, so a restored skin result always has one. */
const skinFromDraft = (d: SkinData): SkinOutcome => ({
  resultId: d.skin_analysis_id,
  accessToken: d.access_token,
  results: d.results,
  faceDetected: true,
  validCloseups: true,
});

const hairFromDraft = (d: HairData): HairOutcome => ({
  resultId: d.hair_analysis_id,
  accessToken: d.access_token,
  attributes: d.hair_attributes,
  weeklyRoutine: d.weekly_routine,
});

/** Combined Hair & Skin Analysis: one questionnaire, optional close-ups, parallel analysis, one results screen. */
export default function AnalysisScreen({ area: only }: { area?: "hair" | "skin" } = {}) {
  const t = useTranslations();
  const router = useRouter();
  const { session, previousStep } = useCustomerSession();
  // `only`: Bridal / Function-Ready run hair and skin as separate steps, each followed by its own plan.
  const stepId = only ? (`${only}_analysis` as const) : "analysis";
  const { finish, skip, isSaving } = useStepCompletion(stepId);
  const progress = useFlowProgress(stepId);
  const scope = only
    ? { skin: only === "skin", hair: only === "hair" }
    : session
      ? getAnalysisScope(session)
      : { skin: true, hair: true };
  const advanced = getStoredSalon()?.advanced_skin_analysis_enabled === true;

  const questions = useMemo(
    () => [
      ...(scope.skin ? getSkinAnalysisQuestions(t).filter((q) => SKIN_KEYS.includes(q.key)).map((q) => ({ ...q, area: "Skin" })) : []),
      ...(scope.hair ? getHairAnalysisQuestions(t).filter((q) => HAIR_KEYS.includes(q.key)).map((q) => ({ ...q, area: "Hair" })) : []),
    ],
    [t, scope.skin, scope.hair],
  );

  const flow: Screen[] = [
    ...questions.map((q) => `q:${q.key}` as const),
    ...(scope.skin && advanced ? (["skin_closeups"] as const) : []),
    ...(scope.hair ? (["scalp"] as const) : []),
    "results",
  ];
  // Results saved earlier in this step (refresh / Resume): open straight on them.
  const skinDraft = useStepDraft<SkinData>("skin_analysis");
  const hairDraft = useStepDraft<HairData>("hair_analysis");
  const restored = (!scope.skin || !!skinDraft.initial) && (!scope.hair || !!hairDraft.initial);
  const { screen, go, back } = useStepScreens<Screen>(flow, restored ? [flow[0], "results"] : flow[0]);

  const [answers, setAnswers] = useState<Answers>(() =>
    restored ? { ...skinDraft.initial?.answers, ...hairDraft.initial?.answers } : {},
  );
  const scalpCapture = useGuidedCapture(SCALP_REGIONS);
  const skinCapture = useGuidedCapture(SKIN_REGIONS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [skin, setSkin] = useState<SkinOutcome | null>(() =>
    restored && scope.skin && skinDraft.initial ? skinFromDraft(skinDraft.initial) : null,
  );
  const [hair, setHair] = useState<HairOutcome | null>(() =>
    restored && scope.hair && hairDraft.initial ? hairFromDraft(hairDraft.initial) : null,
  );
  const [skinMap, setSkinMap] = useState<string | null>(() => (restored ? (skinDraft.initial?.skin_map_url ?? null) : null));

  const face = useMemo(() => getFileFromLocalStorage(CAMERA_CAPTURE_KEY), []);

  const nextAfter = (current: Screen) => flow[flow.indexOf(current) + 1];

  const analyze = async () => {
    const scalpImages = SCALP_REGIONS.map((r) => scalpCapture.files[r.key]).filter((f): f is File => !!f);
    const skinCloseUps: SkinCloseUpImages = skinCapture.files;
    if (!face) {
      toast.error("Photo not found. Please retake it.");
      if (session) router.push(sessionCapturePath());
      return;
    }
    setIsAnalyzing(true);
    const skinAnswers = Object.fromEntries(Object.entries(answers).filter(([k]) => SKIN_KEYS.includes(k)));
    const hairAnswers = Object.fromEntries(Object.entries(answers).filter(([k]) => HAIR_KEYS.includes(k)));
    const [skinResult, hairResult] = await Promise.allSettled([
      scope.skin ? runSkinAnalysis(face, skinAnswers, skinCloseUps, advanced) : Promise.resolve(null),
      scope.hair ? runHairAnalysis(face, scalpImages, hairAnswers) : Promise.resolve(null),
    ]);
    setIsAnalyzing(false);

    if (skinResult.status === "rejected" || hairResult.status === "rejected") {
      console.error("Analysis failed:", skinResult, hairResult);
      toast.error("Analysis failed. Please try again.");
      return;
    }
    const skinOutcome = skinResult.value;
    const hairOutcome = hairResult.value;
    setSkin(skinOutcome);
    setHair(hairOutcome);
    setSkinMap(null);
    go("results");
    if (hairOutcome) hairDraft.save(hairData(hairOutcome, answers));
    if (skinOutcome?.faceDetected) {
      skinDraft.save(skinData(skinOutcome, answers, null));
      void fetchSkinVisualization(face, skinOutcome.results).then((map) => {
        setSkinMap(map);
        if (map) skinDraft.save(skinData(skinOutcome, answers, map));
      });
    }
  };

  /** Leave a screen: next sub-screen, or run the analysis when results come next. */
  const advanceFrom = (current: Screen) => {
    const next = nextAfter(current);
    if (next === "results") void analyze();
    else go(next);
  };

  /** Footer for a guided capture: confirm the shot (→ next region / next screen) or retake. */
  const captureActions = (capture: typeof scalpCapture | typeof skinCapture, current: Screen) => {
    if (!capture.isReview) return { primary: undefined, secondary: undefined };
    const finalLabel = nextAfter(current) === "results" ? "Analyse my results" : "Continue to scalp photos";
    return {
      primary: {
        label: capture.nextRegion ? `Next: ${capture.nextRegion.label}` : finalLabel,
        onClick: () => {
          if (capture.confirm()) advanceFrom(current);
        },
      },
      secondary: { label: "Retake", onClick: capture.retake },
    };
  };

  const save = () => {
    const records: StepRecord[] = [];
    if (scope.skin && skin) {
      records.push({ step: "skin_analysis", data: { ...skinData(skin, answers, skinMap) } });
    }
    if (scope.hair && hair) {
      records.push({ step: "hair_analysis", data: { ...hairData(hair, answers) } });
    }
    void finish(records);
  };

  const handleBack = () => {
    if (back()) return;
    if (!session) return router.push("/");
    const prev = previousStep(stepId);
    router.push(prev ? `/session/${session.session_type}/${prev}` : sessionCapturePath());
  };

  const area = only ?? (session ? analysisAreaLabel(session).toLowerCase() : "hair & skin");

  if (isAnalyzing) {
    const images = filesToProgressImages([{ file: face, label: "Your photo" }]);
    return (
      <AnalysisProgressScreen
        title={`Analysing your ${area}`}
        images={images}
        stages={["Uploading photos", "Detecting features", `Analysing ${area}`, "Preparing your results"]}
      />
    );
  }

  const questionIndex = questions.findIndex((q) => `q:${q.key}` === screen);
  const question = questions[questionIndex];
  const isMulti = !!question && "multiSelect" in question && !!question.multiSelect;

  /** Selecting only records the answer; the customer moves on with Continue. */
  const answerQuestion = (value: string[]) => {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.key]: value }));
  };

  const faceMissing = scope.skin && skin && !skin.faceDetected;
  const activeCapture =
    screen === "scalp" ? captureActions(scalpCapture, "scalp") : screen === "skin_closeups" ? captureActions(skinCapture, "skin_closeups") : null;

  return (
    <FlowScreen
      title={flowStepTitle(stepId, session)}
      progress={progress}
      onBack={handleBack}
      screenKey={screen}
      bodyClassName={question ? "flex flex-col" : undefined}
      primary={
        question
          ? {
              label: "Continue",
              onClick: () => advanceFrom(screen),
              disabled: !(answers[question.key]?.length ?? 0),
            }
          : screen === "results" && !faceMissing
            ? { label: only ? `See my ${only} plan` : "See my treatment plan", onClick: save, loading: isSaving }
            : activeCapture?.primary
      }
      secondary={
        questionIndex === 0
          ? { label: "Skip analysis", onClick: () => void skip(), disabled: isSaving }
          : activeCapture?.secondary
      }
    >
      {question && (
        <VisualQuestion
          key={question.key}
          eyebrow={`${question.area} · ${questionIndex + 1} of ${questions.length}`}
          question={question.question}
          options={question.options.map((o) => ({ label: o.label, value: o.value, icon: OPTION_ICONS[o.value] }))}
          value={answers[question.key] ?? []}
          multi={isMulti}
          onChange={answerQuestion}
        />
      )}

      {screen === "skin_closeups" && <GuidedCapture state={skinCapture} title="Skin close-ups" cameraType="microscopic" autoCaptureLocation="skin-analysis" />}

      {screen === "scalp" && <GuidedCapture state={scalpCapture} title="Scalp close-ups" cameraType="microscopic" autoCaptureLocation="hair-analysis" />}

      {screen === "results" && faceMissing && (
        <div className="flex flex-col items-center text-center gap-8 mt-20">
          <p className="text-5xl font-semibold">We couldn&apos;t see your face clearly</p>
          <p className="text-2xl text-bv-ink-muted max-w-3xl">Retake the photo facing the camera in good light, then run the analysis again.</p>
          <button
            type="button"
            onClick={() => session && router.push(sessionCapturePath())}
            className={buttonClass("primary", "md")}
          >
            Retake photo
          </button>
        </div>
      )}

      {screen === "results" && !faceMissing && <AnalysisResults skin={skin} hair={hair} face={face} />}
    </FlowScreen>
  );
}
