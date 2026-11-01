"use client";

import { useCallback, useRef, useState } from "react";
import { useCustomerSession } from "../context/CustomerSessionContext";
import type { StepId } from "../types";

/**
 * In-progress results for one backend step, so a refresh or Resume doesn't lose them.
 * `initial` is the draft saved earlier (read once, at mount); `save` stores a new one in the background.
 */
export function useStepDraft<T extends object>(step: StepId) {
  const { getStep, saveDraft } = useCustomerSession();
  const [initial] = useState(() => {
    const draft = getStep(step)?.draft;
    return draft && Object.keys(draft).length ? (draft as T) : undefined;
  });
  // Skip re-sending what was just restored (screens save from an effect on mount).
  const last = useRef(initial ? JSON.stringify(initial) : null);
  const save = useCallback(
    (draft: T) => {
      const json = JSON.stringify(draft);
      if (json === last.current) return;
      last.current = json;
      saveDraft(step, draft as Record<string, unknown>);
    },
    [saveDraft, step],
  );
  return { initial, save };
}
