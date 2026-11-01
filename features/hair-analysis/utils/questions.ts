import type { useTranslations } from "next-intl";

type Translate = ReturnType<typeof useTranslations>;

/** Pre-analysis questionnaire (shared by the FLUX page flow and customer-session step). */
export function getHairAnalysisQuestions(t: Translate) {
  return [
    {
      key: "hair-treated",
      question: t("hairAnalysis.questions.hairTreated.question"),
      options: [
        {
          label: t("hairAnalysis.questions.hairTreated.yesColoured"),
          value: "yes_coloured",
        },
        {
          label: t("hairAnalysis.questions.hairTreated.chemicallyTreated"),
          description: t(
            "hairAnalysis.questions.hairTreated.chemicalDescription"
          ),
          value: "chemically_treated",
        },
        {
          label: t("hairAnalysis.questions.hairTreated.yesBoth"),
          value: "yes_both",
        },
        {
          label: t("hairAnalysis.questions.hairTreated.no"),
          value: "no",
        },
      ],
    },
    {
      key: "haircare-goal",
      question: t("hairAnalysis.questions.haircareGoal.question"),
      options: [
        {
          label: t("hairAnalysis.questions.haircareGoal.reducedHairFall"),
          value: "reduced_hair_fall",
        },
        {
          label: t("hairAnalysis.questions.haircareGoal.dandruffControl"),
          value: "dandruff_control",
        },
        {
          label: t("hairAnalysis.questions.haircareGoal.increaseThickness"),
          value: "increase_hair_thickness",
        },
        {
          label: t("hairAnalysis.questions.haircareGoal.repairDamaged"),
          value: "repair_damaged_hair",
        },
      ],
    },
    {
      key: "hair-concerns",
      question: t("hairAnalysis.questions.hairConcerns.question"),
      options: [
        {
          label: t("hairAnalysis.questions.hairConcerns.dandruff"),
          value: "dandruff",
        },
        {
          label: t("hairAnalysis.questions.hairConcerns.dryScalp"),
          value: "dry_scalp",
        },
        {
          label: t("hairAnalysis.questions.hairConcerns.splitEnds"),
          value: "split_ends",
        },
        {
          label: t("hairAnalysis.questions.hairConcerns.frizziness"),
          value: "frizziness",
        },
        {
          label: t("hairAnalysis.questions.hairConcerns.itchyScalp"),
          value: "itchy_scalp",
        },
        {
          label: t("hairAnalysis.questions.hairConcerns.hairFall"),
          value: "hair_fall",
        },
      ],
      multiSelect: true,
    },
  ];
}
