"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Forward navigation for the journey buttons (Proceed, Try it on, Next…).
 *
 * Every route is server-rendered: after a tap nothing changed on screen until the server answered, so on a slow or
 * cold server the button looked dead (Back worked — it reuses a cached page). Now:
 * - `go(href)` runs the navigation in a transition: `pending` is true from the tap until the next screen shows, so the
 *   button can show a spinner and ignore double taps;
 * - `usePrefetch(...)` loads the likely next screens as soon as this one opens, so the tap is usually instant.
 */
export function useNav() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = useCallback((href: string) => startTransition(() => router.push(href)), [router]);
  return { go, pending };
}

/** Prefetch the screens a button on this screen can open (ignores empty entries). */
export function usePrefetch(...hrefs: (string | null | undefined | false)[]) {
  const router = useRouter();
  const key = hrefs.filter(Boolean).join("|");
  useEffect(() => {
    if (!key) return;
    for (const href of key.split("|")) router.prefetch(href);
  }, [key, router]);
}
