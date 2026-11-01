import { CheckIcon } from "lucide-react";
import React from "react";

export interface MirrorOption {
  label: string;
  value: string;
  imageBlack?: string;
  imageWhite?: string;
  description?: string;
  isDisabled?: (answers: { [key: string]: string[] }) => boolean;
}
interface MirrorQuestionProps {
  question: string;
  options: MirrorOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multiSelect?: boolean;
  answers: { [key: string]: string[] };
}
const MirrorQuestion = ({
  question,
  options,
  answers,
  value,
  onChange,
  multiSelect = false,
}: MirrorQuestionProps) => {
  const NONE_VALUE = "__none__";
  const hasOnlyImageOptions =
    options.length > 0 &&
    options.every((o) => Boolean(o.imageBlack && o.imageWhite));
  const renderOptions = multiSelect
    ? [...options, { label: "None", value: NONE_VALUE }]
    : options;

  const handleSelectOption = (option: string) => {
    if (multiSelect) {
      if (option === NONE_VALUE) {
        onChange([NONE_VALUE]);
        return;
      }
      const current = value.includes(NONE_VALUE) ? [] : value;
      if (current.includes(option)) {
        onChange(current.filter((o) => o !== option));
      } else {
        onChange([...current, option]);
      }
    } else {
      onChange([option]);
    }

    console.log("Changed to ", option);
  };
  return (
    <div className="w-full">
      <div className="relative">
        <div className="p-4 text-4xl font-bold text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black">
          {question}
        </div>
        <div className="bg-white h-[2px] w-full"></div>
      </div>
      <div
        className={
          hasOnlyImageOptions
            ? "flex flex-row items-center justify-center gap-8 mt-24"
            : "grid grid-cols-2 gap-8 mt-24"
        }
      >
        {renderOptions.map((option) => {
          const isImage = Boolean(option.imageBlack && option.imageWhite);
          const isDisabled = option.isDisabled && option.isDisabled(answers);
          if (isDisabled) {
            return null;
          }
          if (isImage) {
            return (
              <div className="option" key={option.value}>
                <div
                  key={option.value}
                  className={`aspect-square rounded-3xl max-w-60 w-60 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${value.includes(option.value) ? "bg-primary" : "bg-white"
                    }`}
                  onClick={() => handleSelectOption(option.value)}
                >
                  <img
                    src={
                      value.includes(option.value)
                        ? option.imageWhite!
                        : option.imageBlack!
                    }
                    alt={option.label}
                    className="w-24 h-24 object-contain mb-4"
                  />
                </div>
                <div className="text-4xl font-medium text-center mt-4">
                  {option.label}
                </div>
                {option.description ? (
                  <div className="text-2xl text-gray text-center mt-2">
                    ({option.description})
                  </div>
                ) : null}
              </div>
            );
          }
          const isSelected = value.includes(option.value);
          const isNone = option.value === NONE_VALUE;
          return (
            <div
              key={option.value}
              className={`text-4xl font-medium p-8 rounded-3xl text-black text-center flex ${multiSelect
                ? "flex-row text-start gap-8 "
                : "flex-col justify-center"
                } items-center ${isSelected ? "bg-primary text-white" : "bg-white"
                }`}
              onClick={() => handleSelectOption(option.value)}
            >
              {multiSelect ? (
                <div
                  className={`w-6 h-6  border-gray-light border-2 flex items-center justify-center ${isSelected ? "bg-white" : "bg-white"
                    }`}
                >
                  {isSelected ? (
                    <CheckIcon className="w-4 h-4" color="black" size={32} />
                  ) : null}
                </div>
              ) : null}
              {option.label}
              {option.description && !isNone ? (
                <div
                  className={`text-2xl ${multiSelect ? "text-start" : "text-center"
                    } mt-2`}
                >
                  ({option.description})
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MirrorQuestion;
