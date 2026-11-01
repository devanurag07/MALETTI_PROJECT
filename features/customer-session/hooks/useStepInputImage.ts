"use client";

import { useEffect, useState } from "react";
import { CAMERA_CAPTURE_KEY, FULL_BODY_CAPTURE_KEY } from "@/core/constants/common-constants";
import { dataURLtoBlob, getFileFromLocalStorage, imageUrlToBase64 } from "@/core/utils/common";
import { useCustomerSession } from "../context/CustomerSessionContext";
import type { FlowStepId } from "../config/session-types";
import type { CustomerSessionDto, StepId } from "../types";

/** What a try-on runs on: a photo, or the result the customer chose in an earlier step. */
export type InputSource = "closeup" | "fullbody" | "hairstyle" | "haircolor" | "full_makeup";

type Candidate =
  | { source: "closeup" | "fullbody"; key: string }
  | { source: "hairstyle" | "haircolor" | "full_makeup"; url: string };

export interface StepInputImage {
  image: File | null;
  source: InputSource;
  /** True while an earlier step's result is being downloaded. */
  loading: boolean;
}

const CLOSEUP: Candidate = { source: "closeup", key: CAMERA_CAPTURE_KEY };
const FULL_BODY: Candidate = { source: "fullbody", key: FULL_BODY_CAPTURE_KEY };

/** `data.<field>.output_url` of a completed step, if any. */
function chosenOutput(session: CustomerSessionDto | null, step: StepId, field: string): string | null {
  const record = session?.steps.find((s) => s.step === step && s.status === "completed");
  const url = (record?.data?.[field] as { output_url?: unknown } | undefined)?.output_url;
  return typeof url === "string" && url ? url : null;
}

/**
 * The image chain, best first. Analyses always use the real close-up (never an AI result).
 * - haircolor: on the chosen haircut, else the close-up.
 * - makeup: on the chosen hair colour, else the chosen haircut, else the close-up.
 * - full_makeup: on the full-body photo.
 * - clothing: on the chosen full-body makeup, else the full-body photo, else the close-up (Clothing app).
 */
function inputChain(step: FlowStepId, session: CustomerSessionDto | null): Candidate[] {
  const withResult = (source: "hairstyle" | "haircolor" | "full_makeup", url: string | null): Candidate[] =>
    url ? [{ source, url }] : [];
  const haircut = withResult("hairstyle", chosenOutput(session, "hairstyle", "selected_style"));
  switch (step) {
    case "haircolor":
      return [...haircut, CLOSEUP];
    case "makeup":
      return [...withResult("haircolor", chosenOutput(session, "haircolor", "selected_style")), ...haircut, CLOSEUP];
    case "full_makeup":
      return [FULL_BODY, CLOSEUP];
    case "clothing":
      return [...withResult("full_makeup", chosenOutput(session, "full_makeup", "selected_look")), FULL_BODY, CLOSEUP];
    default:
      return [CLOSEUP];
  }
}

async function load(candidate: Candidate): Promise<File | null> {
  if ("key" in candidate) return getFileFromLocalStorage(candidate.key);
  try {
    const dataUrl = await imageUrlToBase64(candidate.url);
    const blob = dataURLtoBlob(dataUrl);
    return new File([blob], `${candidate.source}.jpg`, { type: blob.type || "image/jpeg" });
  } catch (e) {
    // e.g. an expired provider link when the backend's upload failed: fall back to the next image.
    console.error(`Could not load the ${candidate.source} result; using the next image instead:`, e);
    return null;
  }
}

/** First local photo in the chain, read synchronously so screens without a chained result don't flicker. */
function initialState(chain: Candidate[]): StepInputImage {
  if ("url" in chain[0]) return { image: null, source: chain[0].source, loading: true };
  for (const c of chain) {
    if ("url" in c) continue;
    const image = getFileFromLocalStorage(c.key);
    if (image) return { image, source: c.source, loading: false };
  }
  return { image: null, source: "closeup", loading: false };
}

/** The image a flow step's try-ons run on, resolved once when the screen mounts. */
export function useStepInputImage(step: FlowStepId): StepInputImage {
  const { session } = useCustomerSession();
  const [chain] = useState(() => inputChain(step, session));
  const [state, setState] = useState<StepInputImage>(() => initialState(chain));

  useEffect(() => {
    if (!state.loading) return;
    let cancelled = false;
    void (async () => {
      for (const candidate of chain) {
        const image = await load(candidate);
        if (cancelled) return;
        if (image) return setState({ image, source: candidate.source, loading: false });
      }
      if (!cancelled) setState({ image: null, source: "closeup", loading: false });
    })();
    return () => {
      cancelled = true;
    };
    // resolved once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

/** Shown on try-on screens so staff can see what the look is applied on. */
export function inputSourceLabel(source: InputSource, session: Pick<CustomerSessionDto, "session_type"> | null): string | null {
  switch (source) {
    case "hairstyle":
      return "Applied on your new hairstyle";
    case "haircolor":
      return "Applied on your new hair colour";
    case "full_makeup":
      return session?.session_type === "function" ? "Applied on your function makeup" : "Applied on your bridal look";
    case "fullbody":
      return "Applied on your full-length photo";
    default:
      return null;
  }
}
