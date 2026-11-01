import type { useTranslations } from "next-intl";

type Translate = ReturnType<typeof useTranslations>;

/** Pre-analysis questionnaire (shared by the FLUX page flow and customer-session step). */
export function getSkinAnalysisQuestions(t: Translate) {
  return [
    {
      key: 'skin-exposure',
      question: t('skinAnalysis.questions.skinExposure.question'),
      options: [{
        label: t('skinAnalysis.questions.skinExposure.rarely'),
        value: 'rarely'
      }, {
        label: t('skinAnalysis.questions.skinExposure.occasionally'),
        value: 'occasionally'
      }, {
        label: t('skinAnalysis.questions.skinExposure.frequently'),
        value: 'frequently'
      }, {
        label: t('skinAnalysis.questions.skinExposure.veryFrequently'),
        value: 'very_frequently'
      }]
    },
    {
      key: 'skin-care-goal',
      question: t('skinAnalysis.questions.skinCareGoal.question'),
      options: [{
        label: t('skinAnalysis.questions.skinCareGoal.glowingRadiant'),
        value: 'glowing_radiant_skin'
      }, {
        label: t('skinAnalysis.questions.skinCareGoal.antiAging'),
        value: 'anti_aging'
      }, {
        label: t('skinAnalysis.questions.skinCareGoal.acneControl'),
        value: 'acne_control'
      }, {
        label: t('skinAnalysis.questions.skinCareGoal.moistureBalance'),
        value: 'moisture_balance'
      }]
    },
    {
      key: 'skin-concerns',
      question: t('skinAnalysis.questions.skinConcerns.question'),
      options: [{
        label: t('skinAnalysis.questions.skinConcerns.acne'),
        value: 'acne'
      }, {
        label: t('skinAnalysis.questions.skinConcerns.redness'),
        value: 'redness'
      }, {
        label: t('skinAnalysis.questions.skinConcerns.darkCircles'),
        value: 'dark_circles'
      }, {
        label: t('skinAnalysis.questions.skinConcerns.oiliness'),
        value: 'oiliness'
      }, {
        label: t('skinAnalysis.questions.skinConcerns.pigmentation'),
        value: 'pigmentation'
      }, {
        label: t('skinAnalysis.questions.skinConcerns.wrinkles'),
        value: 'wrinkles'
      }, {
        label: t('skinAnalysis.questions.skinConcerns.pores'),
        value: 'pores'
      }, {
        label: t('skinAnalysis.questions.skinConcerns.skinTexture'),
        value: 'skin_texture'
      }],
      multiSelect: true
    },
  ];
}
