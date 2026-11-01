"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Default inactivity timeout when a salon video exists and storage is unset. */
export const DEFAULT_SCREENSAVER_TIMEOUT_MS = 5 * 60 * 1000;

interface ScreenSaverProps {
  /** Idle time in ms before the screensaver starts. Must be > 0 to arm. */
  timeoutMs: number;
  /** Video URL to play full screen. Empty/undefined disables the screensaver. */
  videoSrc?: string | null;
}

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "click",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
  "touchmove",
  "pointerdown",
];

/**
 * Global kiosk screensaver. After `timeoutMs` of no user interaction it shows a
 * full-screen looping video. Any interaction dismisses it and resets the timer.
 * Does nothing when `videoSrc` is empty or `timeoutMs` is not positive.
 */
const ScreenSaver = ({ timeoutMs, videoSrc }: ScreenSaverProps) => {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const enabled = Boolean(videoSrc?.trim()) && timeoutMs > 0;

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (!enabled) return;
    timerRef.current = setTimeout(() => setActive(true), timeoutMs);
  }, [clearTimer, enabled, timeoutMs]);

  const handleActivity = useCallback(() => {
    if (!enabled) return;
    if (activeRef.current) {
      setActive(false);
    }
    startTimer();
  }, [enabled, startTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      setActive(false);
      return;
    }

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );
    startTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      clearTimer();
    };
  }, [enabled, handleActivity, startTimer, clearTimer]);

  // Restart playback from the beginning each time the screensaver appears.
  useEffect(() => {
    if (!active || !videoRef.current) return;
    const video = videoRef.current;
    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      // Autoplay may be blocked; the overlay still shows and any tap dismisses it.
      playPromise.catch(() => {});
    }
  }, [active]);

  if (!enabled || !active || !videoSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"
      role="presentation"
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
    </div>
  );
};

export default ScreenSaver;
