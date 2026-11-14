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
 * The analysis (all modules, one backend call) runs once per session in the background: the journey starts straight on
 * the first service intro, and each service page shows its own scan until its module's results are in.
 */
const analyses = new Map<string, Promise<Results>>();
/** Forget the session's analysis run (gender changed: the suggestions are redone, fetch them again). */
export function forgetAnalysis(sessionId: string) {
  analyses.delete(sessionId);
}

export function ensureAnalysis(sessionId: string): Promise<Results> {
  let run = analyses.get(sessionId);
  if (!run) {
    run = (async () => {
      await waitForPendingUpload(); // photo may still be uploading from the Capture screen
      const r = await studioApi.results(sessionId);
      const done = r.tabs.some((x) => x.status === "done") ? r : await studioApi.analyze(sessionId);
      preloadResultImages(done);
      return done;
    })();
    analyses.set(sessionId, run);
    run.catch(() => analyses.delete(sessionId)); // failed: the next screen tries again
  }
  return run;
}
