"use client";
import { useEffect, useState } from "react";
import type { RailItem } from "./LookRail";

const PHOTO_ID = "photo";

interface Tried {
  id: string;
  name: string;
  preview: string;
}

/**
 * FLUX-style compare mode for try-on screens: pick any two of the customer's photo and the tried
 * results. Feed `items`/`picked`/`pick` to `LookRail` and `{ active, onToggle, pair }` to `TryonCompare`.
 */
export function useComparePicker(face: File | null, tried: Tried[], activeId: string | null) {
  const [active, setActive] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [faceUrl, setFaceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!face) return;
    const url = URL.createObjectURL(face);
    setFaceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [face]);

  const items: RailItem[] = [
    ...(faceUrl ? [{ id: PHOTO_ID, label: "Your photo", image: faceUrl }] : []),
    ...tried.map((t) => ({ id: t.id, label: t.name, image: t.preview })),
  ];

  const onToggle = () => {
    if (active) return setActive(false);
    // Start from the two most recent results, otherwise the photo vs the current one.
    const recent = tried.slice(-2).map((t) => t.id);
    setPicked(recent.length === 2 ? recent : [PHOTO_ID, ...(activeId ? [activeId] : [])]);
    setActive(true);
  };

  const pick = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(-2)));

  const pair = picked
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is RailItem & { image: string } => typeof i?.image === "string")
    .map((i) => ({ src: i.image, label: i.label }));

  return { active, onToggle, exit: () => setActive(false), picked, pick, items, pair, faceUrl };
}
