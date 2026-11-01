"use client";
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "react-toastify";
import { isDebugMode } from "@/core/utils/debug-mode";
import { loadTestPhoto } from "./testPhotos";

interface TestPhotoButtonProps {
  /** One photo, or several for "fill every region". */
  src: string | readonly string[];
  label?: string;
  onSelect: (files: File[]) => void;
}

/** Debug mode only: skips the camera with a stock photo. Renders nothing otherwise. */
export default function TestPhotoButton({ src, label = "Use test photo", onSelect }: TestPhotoButtonProps) {
  const [loading, setLoading] = useState(false);
  // Read after mount: localStorage isn't available during server rendering.
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(isDebugMode()), []);
  if (!enabled) return null;
  const sources = typeof src === "string" ? [src] : src;

  const pick = async () => {
    setLoading(true);
    try {
      onSelect(await Promise.all(sources.map(loadTestPhoto)));
    } catch (e) {
      console.error(e);
      toast.error("Could not load the test photo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={pick}
      disabled={loading}
      className="flex items-center gap-5 self-center rounded-2xl border-2 border-dashed border-bv-line-strong px-6 py-4 text-2xl text-bv-ink-muted hover:border-white/60 hover:text-white disabled:opacity-50"
    >
      <span className="flex -space-x-6">
        {sources.slice(0, 4).map((s) => (
          <img key={s} src={s} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-black" />
        ))}
      </span>
      <FlaskConical className="w-7 h-7 shrink-0" />
      {loading ? "Loading…" : label}
    </button>
  );
}
