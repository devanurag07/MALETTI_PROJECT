"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Forward navigation for the journey buttons (Proceed, Try it on, Next…).
 *
 * Pages are pre-rendered (app/[locale]/layout.tsx generateStaticParams), so navigation is fast. No loading screen or
 * button spinner (the only loading UI is the scan screen); `go(href)` ignores repeated taps while a navigation is
 * already on its way (`pending`).
 */
export function useNav() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  busy.current = pending;
  const go = useCallback((href: string) => {
    if (busy.current) return;
    busy.current = true;
    startTransition(() => router.push(href));
  }, [router]);
  return { go, pending };
}
