"use client";

import { useEffect, useState } from "react";

/**
 * Simulated progress that approaches `cap` asymptotically over expectedDurationMs.
 * Never reaches 100% on its own so the UI does not stall at complete before the API returns.
 */
export function useSimulatedProgress(
  expectedDurationMs = 20_000,
  cap = 92
): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    // ~20s wall: e^(-t/tau) so mid-duration sits in a productive range
    const tau = expectedDurationMs * 0.42;
    let frame = 0;
    let lastUpdate = 0;

    const tick = (now: number) => {
      // Throttle state updates to ~10fps to avoid flicker from excessive re-renders
      if (now - lastUpdate >= 100) {
        const elapsed = now - start;
        const value = cap * (1 - Math.exp(-elapsed / tau));
        setProgress(Math.min(cap, value));
        lastUpdate = now;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [expectedDurationMs, cap]);

  return progress;
}

export function stageIndexForProgress(
  progress: number,
  stageCount: number
): number {
  if (stageCount <= 1) return 0;
  const step = 100 / stageCount;
  // Map 0–cap range onto stages; use progress as 0–100 of cap for band index
  const normalized = Math.min(99.9, (progress / 92) * 100);
  return Math.min(stageCount - 1, Math.floor(normalized / step));
}
