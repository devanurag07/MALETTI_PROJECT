import { Button } from "@/components/ui/button";
import MirrorQuestion, {
  MirrorOption,
} from "@/design-system/components/forms/mirror-question";
import React, { useState } from "react";
import { useTranslations } from "next-intl";

export interface MirrorQuestionProps {
  question: string;
  key: string;
  options: MirrorOption[];
  multiSelect?: boolean;
}

interface QuestionsComponentProps {
  questions: MirrorQuestionProps[];
  answers: { [key: string]: string[] };
  onAnswerChange: (questionKey: string, value: string[]) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  buttonSize?: "sm" | "md" | "lg";
  questionsPerPage?: number;
}

const QuestionsComponent = ({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  onCancel,
  cancelLabel,
  buttonSize = "md",
  questionsPerPage = 2,
}: QuestionsComponentProps) => {
  const t = useTranslations();
  const [currentPage, setCurrentPage] = useState(0);
  return (
    <div className="flex flex-col justify-between items-center h-[95%] pt-20">
      {questions
        .slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage)
        .map((question) => (
          <>
            <MirrorQuestion
              key={question.key}
              question={question.question}
              options={question.options}
              multiSelect={question.multiSelect}
              value={answers[question.key] || []}
              answers={answers}
              onChange={(value) => onAnswerChange(question.key, value)}
            />

            {question.key == "service" &&
              answers[question.key]?.[0].toLowerCase() == "beard" && (
                <div className="flex items-center bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-6 rounded-xl mt-6 mb-2 text-3xl">
                  <svg
                    className="w-12 h-12 mr-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 21c-4.5-1-8-5.5-8-10.5V7.3C4 6 6 2.1 12 2c6 .1 8 4 8 5.3v3.2c0 5-3.5 9.5-8 10.5zM8.7 12c.5 1.2 1.8 2 3.3 2s2.8-.8 3.3-2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>
                    Choose a beard style that matches your current beard length
                    and density for the most accurate try-on
                  </span>
                </div>
              )}
          </>
        ))}

      <div className="flex justify-center w-full gap-4">
        {onCancel && (
          <Button
            onClick={onCancel}
            className="bg-black !text-white text-5xl py-10 px-12 border-2 border-white hover:bg-gray"
          >
            {cancelLabel ?? t("common.cancel")}
          </Button>
        )}
        {currentPage > 0 && (
          <Button
            onClick={() => setCurrentPage(currentPage - 1)}
            className="bg-black !text-white text-5xl py-10 px-12 border-2 border-white hover:bg-gray"
          >
            {t("common.back")}
          </Button>
        )}
        {currentPage < Math.ceil(questions.length / questionsPerPage) - 1 && (
          <Button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="text-5xl py-10 px-12 !text-white"
          >
            {t("common.next")}
          </Button>
        )}
        {/* submit button */}
        {currentPage === Math.ceil(questions.length / questionsPerPage) - 1 &&
          questions
            .slice(
              currentPage * questionsPerPage,
              (currentPage + 1) * questionsPerPage
            )
            .every((q) => answers[q.key]?.length > 0) && (
            <Button onClick={() => onSubmit?.()} className="text-5xl py-10 px-12 !text-white">
              {t("common.proceed")}
            </Button>
          )}

      </div>
    </div>
  );
};

export default QuestionsComponent;
