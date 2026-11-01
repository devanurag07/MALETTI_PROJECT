"use client";
import { useEffect, useState } from "react";
import { Focus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getLocationAutoCapture,
  persistLocationAutoCapture,
} from "@/core/utils/microscope-autofocus";

const AUTO_CAPTURE_CHANGE_EVENT = "microscope-auto-capture-change";

/** Microscope auto capture on/off remembered per location (e.g. "skin-analysis"). */
export function useLocationAutoCapture(location?: string) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!location) return;
    setEnabled(getLocationAutoCapture(location));
    // Keep camera view and preview toggles for the same location in sync
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ location: string; enabled: boolean }>).detail;
      if (detail.location === location) setEnabled(detail.enabled);
    };
    window.addEventListener(AUTO_CAPTURE_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(AUTO_CAPTURE_CHANGE_EVENT, onChange);
  }, [location]);

  const toggle = () => {
    if (!location) return;
    const next = !enabled;
    setEnabled(next);
    persistLocationAutoCapture(location, next);
    window.dispatchEvent(
      new CustomEvent(AUTO_CAPTURE_CHANGE_EVENT, { detail: { location, enabled: next } }),
    );
  };

  return { enabled, toggle };
}

interface AutoCaptureToggleProps {
  enabled: boolean;
  onToggle: () => void;
  className?: string;
}

export const AutoCaptureToggle = ({
  enabled,
  onToggle,
  className = "",
}: AutoCaptureToggleProps) => {
  const t = useTranslations();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={t("cameraSetup.autoCapture")}
      onClick={onToggle}
      className={`rounded-full border-2 p-4 transition-colors ${enabled ? "border-bv-accent bg-bv-accent text-bv-on-accent shadow-bv-glow" : "border-bv-line-strong bg-bv-surface-raised text-bv-ink"} ${className}`}
    >
      <Focus className={`w-[64px] h-[64px] ${enabled ? "" : "opacity-50"}`} />
    </button>
  );
};
