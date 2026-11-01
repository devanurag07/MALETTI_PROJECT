"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { MdClose, MdCompare } from "react-icons/md";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

interface TryonCompareProps {
  before: File | null;
  /** Result image: URL, data URI or bare base64. */
  after: string | null;
  isLoading: boolean;
  loadingLabel: string;
  /** Extra controls laid over the bottom-left of the result (e.g. "How to get this look"). */
  actions?: ReactNode;
  /**
   * Controlled compare mode: the screen picks which two images to compare (e.g. two tried looks).
   * Without it, compare shows the customer's photo against the result.
   */
  compare?: {
    active: boolean;
    onToggle: () => void;
    /** The two picks, left then right; fewer than two shows a hint to pick more. */
    pair: { src: string; label: string }[];
  };
}

const toSrc = (value: string) => (/^(https?:|data:|blob:|\/)/.test(value) ? value : `data:image/png;base64,${value}`);

/** Natural width / height of an image source, or null until it loads. */
function useAspect(src: string | null): number | null {
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    if (!src) return setRatio(null);
    const img = new window.Image();
    img.onload = () => img.naturalWidth && img.naturalHeight && setRatio(img.naturalWidth / img.naturalHeight);
    img.src = src;
  }, [src]);
  return ratio;
}

/**
 * Try-on result at full width. Only the result is drawn (no photo underneath), in a frame sized to the
 * result's own aspect ratio and capped at 1050 kiosk px (vh would follow the scaled MirrorFrame).
 * The round compare button (as in FLUX) toggles a slider: photo vs result by default, or any two images
 * the screen picks via `compare`.
 */
export default function TryonCompare({ before, after, isLoading, loadingLabel, actions, compare: controlled }: TryonCompareProps) {
  const [beforeSrc, setBeforeSrc] = useState<string | null>(null);
  const [ownCompare, setOwnCompare] = useState(false);
  const compare = controlled ? controlled.active : ownCompare;
  const toggleCompare = controlled ? controlled.onToggle : () => setOwnCompare((v) => !v);

  useEffect(() => {
    if (!before) return;
    const url = URL.createObjectURL(before);
    setBeforeSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [before]);

  const afterSrc = after ? toSrc(after) : null;
  const hasResult = !isLoading && !!afterSrc;
  const ratio = useAspect(hasResult ? afterSrc : beforeSrc) ?? 3 / 4;

  // A new result always opens on the result itself.
  useEffect(() => setOwnCompare(false), [after]);

  const pair = controlled
    ? controlled.pair
    : beforeSrc && afterSrc
      ? [
          { src: beforeSrc, label: "Before" },
          { src: afterSrc, label: "After" },
        ]
      : [];

  const contain = { objectFit: "contain" as const, backgroundColor: "var(--bv-surface)" };

  return (
    <div className="relative w-full max-h-[1050px] overflow-hidden rounded-[2rem] bg-bv-surface" style={{ aspectRatio: ratio }}>
      {!hasResult ? (
        <>
          {beforeSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL
            <img src={beforeSrc} alt="Your photo" className="absolute inset-0 h-full w-full object-contain opacity-50 blur-sm" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            {isLoading && <Loader2 className="h-16 w-16 animate-spin text-bv-accent" />}
            <p className="px-10 text-center text-3xl font-semibold text-bv-ink">{loadingLabel}</p>
          </div>
        </>
      ) : compare && pair.length === 2 ? (
        <>
          <ReactCompareSlider
            className="h-full w-full"
            itemOne={<ReactCompareSliderImage src={pair[0].src} alt={pair[0].label} style={contain} />}
            itemTwo={<ReactCompareSliderImage src={pair[1].src} alt={pair[1].label} style={contain} />}
          />
          <span className="pointer-events-none absolute left-5 top-5 max-w-[45%] truncate rounded-full bg-black/60 px-4 py-1.5 text-lg font-medium">
            1 · {pair[0].label}
          </span>
          <span className="pointer-events-none absolute right-5 top-5 max-w-[45%] truncate rounded-full bg-black/60 px-4 py-1.5 text-lg font-medium">
            2 · {pair[1].label}
          </span>
        </>
      ) : compare ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 / remote result */}
          <img src={pair[0]?.src ?? afterSrc!} alt="" className="absolute inset-0 h-full w-full object-contain opacity-40" />
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-10 text-center text-3xl font-semibold">
            Pick {2 - pair.length} more {pair.length === 1 ? "look" : "looks"} below to compare
          </p>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- base64 / remote result
        <img src={afterSrc!} alt="Your look" className="absolute inset-0 h-full w-full object-contain" />
      )}

      {hasResult && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
          <div className="pointer-events-auto">{!compare && actions}</div>
          {(beforeSrc || controlled) && (
            <button
              type="button"
              onClick={toggleCompare}
              aria-label={compare ? "Close compare" : "Compare looks"}
              aria-pressed={compare}
              className="pointer-events-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-black/80 text-white shadow-lg ring-2 ring-white/20"
            >
              {compare ? <MdClose className="h-14 w-14" /> : <MdCompare className="h-14 w-14" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
