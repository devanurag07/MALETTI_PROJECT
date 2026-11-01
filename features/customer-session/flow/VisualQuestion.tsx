"use client";
import type { ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import { ChoiceRow } from "@/design-system/bluevella";

export interface VisualOption {
  label: string;
  value: string;
  /** A white line icon: a PNG asset or a lucide element. */
  icon?: StaticImageData | ReactNode;
}

interface VisualQuestionProps {
  /** Small line above the question, e.g. "Skin · 1 of 4". */
  eyebrow?: string;
  question: string;
  options: VisualOption[];
  value: string[];
  multi?: boolean;
  onChange: (value: string[]) => void;
}

const isImage = (icon: VisualOption["icon"]): icon is StaticImageData =>
  !!icon && typeof icon === "object" && "src" in icon;

/**
 * One question per screen: a large headline and icon-and-label options in two columns,
 * centred as one block so the free space around it stays even.
 */
export default function VisualQuestion({ eyebrow, question, options, value, multi, onChange }: VisualQuestionProps) {
  const toggle = (option: string) => {
    if (!multi) return onChange([option]);
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <fieldset className="my-auto flex flex-col gap-12 py-6">
      <legend className="contents">
        <span className="flex flex-col gap-5">
          {eyebrow && <span className="text-2xl font-semibold uppercase tracking-[0.2em] text-bv-accent">{eyebrow}</span>}
          <span className="text-6xl font-semibold leading-tight text-bv-ink">{question}</span>
          <span className="text-2xl text-bv-ink-muted">{multi ? "Tap all that apply" : "Tap one"}</span>
        </span>
      </legend>
      <div className="grid grid-cols-2 gap-5">
        {options.map((option) => (
          <ChoiceRow
            key={option.value}
            label={option.label}
            multi={multi}
            selected={value.includes(option.value)}
            onClick={() => toggle(option.value)}
            icon={
              option.icon ? (
                isImage(option.icon) ? (
                  <Image src={option.icon} alt="" className="max-h-16 max-w-16 object-contain" />
                ) : (
                  <span className="flex items-center justify-center text-bv-accent [&_svg]:size-12">{option.icon}</span>
                )
              ) : undefined
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
