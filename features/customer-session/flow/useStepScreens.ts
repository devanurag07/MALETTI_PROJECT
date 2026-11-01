"use client";
import { useCallback, useState } from "react";

/**
 * Linear sub-screens inside one flow step (e.g. questions → capture → results).
 * `back()` returns false on the first screen so the caller can leave the step.
 * `initial` may be a history (e.g. a restored draft opening on results, with back going to the start).
 */
export function useStepScreens<T extends string>(screens: readonly T[], initial: T | readonly T[] = screens[0]) {
  const [history, setHistory] = useState<T[]>(() => (typeof initial === "string" ? [initial] : [...initial]));
  const screen = history[history.length - 1];

  const go = useCallback((next: T) => setHistory((h) => [...h, next]), []);
  /** Jump without adding to history (e.g. loading → results). */
  const replace = useCallback((next: T) => setHistory((h) => [...h.slice(0, -1), next]), []);
  const back = useCallback(() => {
    if (history.length <= 1) return false;
    setHistory((h) => h.slice(0, -1));
    return true;
  }, [history.length]);

  return { screen, go, replace, back };
}
