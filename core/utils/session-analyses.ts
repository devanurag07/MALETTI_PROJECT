/**
 * Tracks skin & hair analysis result IDs in localStorage so the
 * session-results page can show download-report QR codes for every
 * analysis performed during the current mirror session.
 */

const STORAGE_KEY = "session_analysis_ids";

export interface StoredAnalysis {
  id: number;
  type: "skin" | "hair";
}

function getAll(): StoredAnalysis[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(analyses: StoredAnalysis[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
}

/** Add a completed analysis to the session list (dedupes by id+type). */
export function addSessionAnalysis(id: number, type: "skin" | "hair") {
  const all = getAll();
  if (all.some((a) => a.id === id && a.type === type)) return;
  all.push({ id, type });
  saveAll(all);
}

/** Get all stored analysis IDs grouped by type. */
export function getSessionAnalyses(): {
  skinIds: number[];
  hairIds: number[];
} {
  const all = getAll();
  return {
    skinIds: all.filter((a) => a.type === "skin").map((a) => a.id),
    hairIds: all.filter((a) => a.type === "hair").map((a) => a.id),
  };
}

/** Clear all stored analyses (e.g. when starting a new session). */
export function clearSessionAnalyses() {
  localStorage.removeItem(STORAGE_KEY);
}
