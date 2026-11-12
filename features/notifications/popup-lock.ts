/**
 * Ensures only one homepage popup (payment / general notification) is open at
 * a time. A popup must acquire the lock before opening and release it when it
 * closes; waiting popups re-check when the lock is released.
 */
export type HomePopupName = "payment" | "notification";

const RELEASED_EVENT = "home-popup-released";

let active: HomePopupName | null = null;

export function acquirePopup(name: HomePopupName): boolean {
  if (active && active !== name) return false;
  active = name;
  return true;
}

export function releasePopup(name: HomePopupName) {
  if (active !== name) return;
  active = null;
  window.dispatchEvent(new CustomEvent(RELEASED_EVENT, { detail: name }));
}

/** Calls `cb` when another popup releases the lock. Returns an unsubscribe fn. */
export function onPopupReleased(
  self: HomePopupName,
  cb: () => void
): () => void {
  const handler = (e: Event) => {
    if ((e as CustomEvent<HomePopupName>).detail !== self) cb();
  };
  window.addEventListener(RELEASED_EVENT, handler);
  return () => window.removeEventListener(RELEASED_EVENT, handler);
}
