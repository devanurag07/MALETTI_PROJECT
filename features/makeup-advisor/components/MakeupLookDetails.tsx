"use client";
import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { LookComboItem, MakeupLookGuide } from "../types";

interface MakeupLookGuideSheetProps {
  open: boolean;
  onClose: () => void;
  /** Look name, e.g. "Cocktail Look". */
  lookName: string;
  guide: MakeupLookGuide | null;
  /** Exact shades from a Look Advisor combo, shown as swatches when available. */
  comboItems?: LookComboItem[];
  /** Fallback intro when the guide has no `about` (e.g. the AI combo's description). */
  description?: string;
}

const ACCENT = "#0D3B32";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <p className="text-xl font-semibold uppercase tracking-[0.18em] text-[#7FD1B9]">{title}</p>
      {children}
    </section>
  );
}

/**
 * "How to get this look" as a bottom sheet. Uses `fixed` inside the scaled MirrorFrame (a transformed
 * ancestor is the containing block), so it covers the kiosk screen at kiosk scale — unlike a portal dialog.
 */
export default function MakeupLookGuideSheet({ open, onClose, lookName, guide, comboItems, description }: MakeupLookGuideSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || (!guide && !comboItems?.length)) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={`How to get the ${lookName}`}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/70 animate-in fade-in duration-200" />

      <div className="relative flex max-h-[82%] flex-col rounded-t-[2.5rem] bg-[#141414] text-white animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start justify-between gap-6 border-b border-white/10 px-12 pb-8 pt-10">
          <div>
            <p className="text-2xl text-white/50">How to get this look</p>
            <p className="mt-2 text-5xl font-semibold">{lookName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-white/10 p-4">
            <X className="h-9 w-9" />
          </button>
        </div>

        <div className="flex flex-col gap-12 overflow-y-auto px-12 py-10">
          {(guide?.about || description) && (
            <p className="text-[2rem] leading-[1.55] text-white/85">{guide?.about || description}</p>
          )}

          {comboItems && comboItems.length > 0 && (
            <Section title="Your shades">
              <div className="flex flex-col gap-4">
                {comboItems.map((item) => (
                  <div key={`${item.category}-${item.shadeName}`} className="flex items-center gap-6 rounded-3xl bg-white/5 px-7 py-5">
                    <span className="h-16 w-16 shrink-0 rounded-full border-2 border-white/30" style={{ backgroundColor: item.hex }} />
                    <span>
                      <span className="block text-xl capitalize text-white/50">{item.category}</span>
                      <span className="text-3xl">{item.shadeName}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {guide && (
            <>
              <Section title="The look">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(guide.shades).map(([area, shade]) => (
                    <div key={area} className="rounded-3xl bg-white/5 px-7 py-6">
                      <p className="text-xl capitalize text-white/50">{area}</p>
                      <p className="mt-2 text-[1.9rem] leading-snug">{shade}</p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="What you'll need">
                <ul className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {guide.products.map((p) => (
                    <li key={p} className="flex items-center gap-4 text-[1.9rem]">
                      <CheckCircle2 className="h-8 w-8 shrink-0 text-[#4CC38A]" />
                      {p}
                    </li>
                  ))}
                </ul>
              </Section>

              {guide.tips.length > 0 && (
                <Section title="Step by step">
                  <ol className="flex flex-col gap-6">
                    {guide.tips.map((tip, i) => (
                      <li key={tip} className="flex gap-6 text-[1.9rem] leading-snug">
                        <span
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-semibold"
                          style={{ background: ACCENT }}
                        >
                          {i + 1}
                        </span>
                        <span className="pt-2">{tip}</span>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}
            </>
          )}
        </div>

        <div className="border-t border-white/10 px-12 pb-10 pt-6">
          <button type="button" onClick={onClose} className="w-full rounded-2xl py-7 text-3xl font-semibold" style={{ background: ACCENT }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
