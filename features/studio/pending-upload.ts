import { studioApi, type Results } from "./api";
import { preloadResultImages } from "./preload-images";


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

/**
 * The analysis runs once per session in the background, in two calls side by side: the face first (the consultation
 * opens on the face analysis page, it shouldn't wait for the longer armocromia), then armocromia + skin.
 */
const FACE = ["face"];
const REST = ["colour", "skin"];
type Run = { face: Promise<Results>; all: Promise<Results> };
const analyses = new Map<string, Run>();
/** Forget the session's analysis run (gender changed: the suggestions are redone, fetch them again). */
export function forgetAnalysis(sessionId: string) {
  analyses.delete(sessionId);
}

/** Tabs of `b` replace `a`'s for the same module (the later call knows more). */
function merge(a: Results, b: Results): Results {
  const tabs = new Map(a.tabs.map((t) => [t.module, t]));
  b.tabs.forEach((t) => { if (t.status === "done" || !tabs.has(t.module)) tabs.set(t.module, t); });
  return { session: b.session, tabs: [...tabs.values()] };
}

function start(sessionId: string): Run {
  const existing = (async () => {
    await waitForPendingUpload(); // photo may still be uploading from the Capture screen
    return studioApi.results(sessionId);
  })();
  const part = (modules: string[]) => existing.then((r) =>
    // Already analysed (e.g. back on the mirror after a reload): nothing to run for these modules.
    r.tabs.some((x) => modules.includes(x.module) && x.status === "done") ? r : studioApi.analyze(sessionId, modules));
  const face = part(FACE);
  const rest = part(REST);
  const all = Promise.all([face, rest]).then(([f, r]) => {
    const done = studioApi.keepResults(sessionId, merge(f, r));
    preloadResultImages(done);
    return done;
  });
  face.then(preloadResultImages).catch(() => {});
  const run = { face, all };
  analyses.set(sessionId, run);
  all.catch(() => { if (analyses.get(sessionId) === run) analyses.delete(sessionId); }); // failed: the next screen tries again
  return run;
}

/** Every module's results (armocromia / skin pages, try-on, report). */
export function ensureAnalysis(sessionId: string): Promise<Results> {
  return (analyses.get(sessionId) ?? start(sessionId)).all;
}

/** Just the face analysis (face analysis page, haircut, beard) — doesn't wait for armocromia + skin. */
export function ensureFaceAnalysis(sessionId: string): Promise<Results> {
  return (analyses.get(sessionId) ?? start(sessionId)).face;
}
