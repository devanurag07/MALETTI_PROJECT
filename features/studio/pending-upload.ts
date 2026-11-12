/**
 * The capture photo uploads in the background so the customer moves on instantly.
 * Screens that need the uploaded photo on the server (Analysis) await this first.
 */
let pending: Promise<unknown> | null = null;

export function setPendingUpload(p: Promise<unknown>) {
  pending = p;
  p.finally(() => { if (pending === p) pending = null; }).catch(() => {});
}

export function waitForPendingUpload(): Promise<unknown> {
  return pending ?? Promise.resolve();
}
