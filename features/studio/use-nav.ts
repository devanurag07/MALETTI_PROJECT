"use client";

import { useCallback, useEffect, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Forward navigation for the journey buttons (Proceed, Try it on, Next…).
 *
 * Every route is server-rendered: after a tap nothing changed on screen until the server answered, so on a slow or
 * cold server the button looked dead (Back worked — it reuses a cached page). Now:
 * - `go(href)` runs the navigation in a transition: `pending` is true from the tap until the next screen shows, so the
 *   button can show a spinner and ignore double taps;
 * - `usePrefetch(...)` loads the likely next screens as soon as this one opens, so the tap is usually instant.
 * - while a navigation is pending, every `Stage` shows the full loading screen over itself (`useNavPending`) — never a
 *   spinner inside the button.
 */
export function useNav() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = useCallback((href: string) => startTransition(() => router.push(href)), [router]);
  useEffect(() => {
    if (!pending) return;
    setNavCount(navCount + 1);
    return () => setNavCount(navCount - 1);
  }, [pending]);
  return { go, pending };
}

// Pending forward navigations, app-wide (the button's screen sets it; the Stage overlay reads it).
let navCount = 0;
const listeners = new Set<() => void>();
function setNavCount(n: number) {
  navCount = Math.max(0, n);
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Show the same full loading screen while `active` (e.g. saving the photo before moving on). */
export function useLoadingOverlay(active: boolean) {
  useEffect(() => {
    if (!active) return;
    setNavCount(navCount + 1);
    return () => setNavCount(navCount - 1);
  }, [active]);
}

/** True while a `go(...)` navigation is on its way (show the loading screen). */
export const useNavPending = () => useSyncExternalStore(subscribe, () => navCount > 0, () => false);

/** Prefetch the screens a button on this screen can open (ignores empty entries). */
export function usePrefetch(...hrefs: (string | null | undefined | false)[]) {
  const router = useRouter();
  const key = hrefs.filter(Boolean).join("|");
  useEffect(() => {
    if (!key) return;
    for (const href of key.split("|")) router.prefetch(href);
  }, [key, router]);
}
