import { useEffect, useRef } from "react";

/**
 * Runs `fn` immediately, then every `intervalMs`, and again whenever the
 * tab becomes visible / regains focus. Always calls the latest `fn`.
 */
export function usePolling(fn: () => void, intervalMs: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const run = () => fnRef.current();
    run();

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
}
