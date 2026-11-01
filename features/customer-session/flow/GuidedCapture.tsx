"use client";
import { Panel } from "@/design-system/bluevella";
import { useCallback, useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { Check, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Camera } from "@/design-system/components/common/camera";
import { SameCameraWarning } from "@/design-system/components/common/same-camera-warning";
import { AutoCaptureToggle, useLocationAutoCapture } from "@/design-system/components/common/auto-capture-toggle";
import TestPhotoButton from "./TestPhotoButton";
import { BV } from "./theme";

export interface CaptureRegion<K extends string = string> {
  key: K;
  /** Plain-language name shown to the customer. */
  label: string;
  /** Clinical name, shown small for the stylist. */
  technical?: string;
  /** One clear instruction for this shot. */
  tip: string;
  sample: StaticImageData;
  /** Stock photo offered while testing (see `testPhotos.ts`). */
  testPhoto?: string;
}

/**
 * State for a guided multi-region capture: one region at a time,
 * camera → review → confirm, auto-advancing to the next missing region.
 */
export function useGuidedCapture<K extends string>(regions: CaptureRegion<K>[]) {
  const [files, setFiles] = useState<Partial<Record<K, File>>>({});
  const [urls, setUrls] = useState<Partial<Record<K, string>>>({});
  const [activeKey, setActiveKey] = useState<K>(regions[0].key);
  const [isReview, setIsReview] = useState(false);
  const urlsRef = useRef(urls);
  urlsRef.current = urls;

  useEffect(() => () => Object.values(urlsRef.current).forEach((u) => u && URL.revokeObjectURL(u as string)), []);

  const setFile = useCallback((key: K, file: File | null) => {
    setUrls((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key] as string);
      const next = { ...prev };
      if (file) next[key] = URL.createObjectURL(file);
      else delete next[key];
      return next;
    });
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }, []);

  const capture = (file: File) => {
    setFile(activeKey, file);
    setIsReview(true);
  };

  const retake = () => {
    setFile(activeKey, null);
    setIsReview(false);
  };

  /** Testing: set photos for several regions at once, then review the last one. */
  const fill = (byKey: Partial<Record<K, File>>) => {
    const keys = regions.map((r) => r.key).filter((k) => byKey[k]);
    if (!keys.length) return;
    keys.forEach((k) => setFile(k, byKey[k] as File));
    setActiveKey(keys[keys.length - 1]);
    setIsReview(true);
  };

  const select = (key: K) => {
    setActiveKey(key);
    setIsReview(!!files[key]);
  };

  const missingAfterConfirm = regions.filter((r) => r.key !== activeKey && !files[r.key]);
  const nextRegion = missingAfterConfirm.find((r) => regions.indexOf(r) > regions.findIndex((x) => x.key === activeKey)) ?? missingAfterConfirm[0] ?? null;
  const allDone = regions.every((r) => !!files[r.key]);

  /** Move to the next region still missing a photo. Returns true when every region is captured. */
  const confirm = () => {
    if (!nextRegion) return true;
    setActiveKey(nextRegion.key);
    setIsReview(false);
    return false;
  };

  return { regions, files, urls, activeKey, isReview, capture, retake, select, confirm, fill, nextRegion, allDone };
}

export type GuidedCaptureState<K extends string> = ReturnType<typeof useGuidedCapture<K>>;

interface GuidedCaptureProps<K extends string> {
  state: GuidedCaptureState<K>;
  title: string;
  cameraType: "microscopic" | "normal";
  /** Microscopic only: turns on FLUX's auto capture toggle, remembered per location (e.g. "skin-analysis"). */
  autoCaptureLocation?: string;
}

/** Region progress + instruction card + camera/review for one guided capture. */
export default function GuidedCapture<K extends string>({ state, title, cameraType, autoCaptureLocation }: GuidedCaptureProps<K>) {
  const { regions, files, urls, activeKey, isReview } = state;
  // Same on/off as the camera's own toggle, so it can be changed while reviewing a photo too.
  const autoCapture = useLocationAutoCapture(cameraType === "microscopic" ? autoCaptureLocation : undefined);
  const activeIndex = regions.findIndex((r) => r.key === activeKey);
  const region = regions[activeIndex];
  const doneCount = regions.filter((r) => files[r.key]).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <p className="text-5xl font-semibold">{title}</p>
        <p className="text-2xl text-bv-ink-muted">
          {doneCount} of {regions.length} photos
        </p>
      </div>

      {/* Region progress — tap any region to (re)take it */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${regions.length}, minmax(0, 1fr))` }}>
        {regions.map((r, i) => {
          const done = !!files[r.key];
          const active = r.key === activeKey;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => state.select(r.key)}
              className={cn(
                "relative flex flex-col items-center gap-3 rounded-2xl border-2 p-3 transition-colors",
                active ? "bg-bv-accent-soft" : "bg-bv-surface-raised",
              )}
              style={{ borderColor: active ? BV.accent : done ? BV.lineStrong : BV.line }}
            >
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-bv-line flex items-center justify-center">
                {urls[r.key] ? (
                  <img src={urls[r.key] as string} alt={r.label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-semibold text-bv-ink-muted">{i + 1}</span>
                )}
                {done && (
                  <span className="absolute top-2 right-2 rounded-full bg-bv-accent p-1.5">
                    <Check className="w-6 h-6 text-bv-on-accent" strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className={cn("text-xl leading-tight text-center", active ? "text-bv-ink font-semibold" : "text-bv-ink-muted")}>
                {r.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Instruction for the active region */}
      <Panel key={region.key} padding="md" className="flex items-center gap-8 animate-in fade-in duration-200">
        <div className="shrink-0 w-36 h-36 rounded-2xl border border-bv-line bg-bv-surface-raised flex items-center justify-center">
          <Image src={region.sample} alt={region.label} className="h-32 w-auto object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl text-bv-ink-muted">
            Photo {activeIndex + 1} of {regions.length}
            {region.technical && <span className="ml-3 text-bv-ink-muted">· {region.technical}</span>}
          </p>
          <p className="text-4xl font-semibold mt-1">{region.label}</p>
          <p className="text-2xl text-bv-ink mt-3 flex gap-3">
            <Lightbulb className="w-8 h-8 shrink-0 text-bv-accent" />
            {region.tip}
          </p>
        </div>
      </Panel>

      {/* Camera or review */}
      <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black border-2 border-bv-line">
        {isReview && urls[activeKey] ? (
          <>
            <img src={urls[activeKey] as string} alt={region.label} className="w-full h-full object-cover animate-in fade-in duration-200" />
            {cameraType === "microscopic" && autoCaptureLocation && (
              <AutoCaptureToggle enabled={autoCapture.enabled} onToggle={autoCapture.toggle} className="absolute bottom-4 right-4 z-40" />
            )}
          </>
        ) : (
          <div className="absolute inset-0 [&>div]:h-full">
            <Camera
              key={activeKey}
              isLocked={false}
              isCheckingAccessCode={false}
              enableSwitch
              cameraType={cameraType}
              autoCaptureLocation={autoCaptureLocation}
              onCapture={state.capture}
            />
          </div>
        )}
      </div>

      {!isReview && region.testPhoto && (
        <div className="flex flex-wrap justify-center gap-4">
          <TestPhotoButton src={region.testPhoto} onSelect={([file]) => state.capture(file)} />
          {regions.length > 1 && regions.every((r) => r.testPhoto) && (
            <TestPhotoButton
              src={regions.map((r) => r.testPhoto as string)}
              label={`Use test photos for all ${regions.length}`}
              onSelect={(photos) =>
                state.fill(Object.fromEntries(regions.map((r, i) => [r.key, photos[i]])) as Partial<Record<K, File>>)
              }
            />
          )}
        </div>
      )}

      {isReview && cameraType === "microscopic" && (
        <SameCameraWarning visible onRetakeWithCamera={state.retake} />
      )}
    </div>
  );
}
