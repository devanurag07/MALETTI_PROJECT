/**
 * Stock photos (`public/test-photos/`) that stand in for the camera while testing:
 * one woman's close-up, full-length and skin close-ups, plus four scalp close-ups.
 * Offered only in Debug mode (`core/utils/debug-mode.ts`, settings, salon AMG001).
 */

export const TEST_PHOTOS = {
  closeup: "/test-photos/closeup.jpg",
  full: "/test-photos/full-body.jpg",
  scalp_frontal: "/test-photos/scalp-frontal.jpg",
  scalp_occipital: "/test-photos/scalp-occipital.jpg",
  scalp_parietal: "/test-photos/scalp-parietal.jpg",
  scalp_temporal: "/test-photos/scalp-temporal.jpg",
  skin_nose: "/test-photos/skin-nose.jpg",
  skin_side_cheek: "/test-photos/skin-cheek.jpg",
  skin_forehead: "/test-photos/skin-forehead.jpg",
} as const;

/** Loads a test photo as the same kind of File the camera produces. */
export async function loadTestPhoto(src: string): Promise<File> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to load test photo ${src}: ${res.status}`);
  const blob = await res.blob();
  return new File([blob], src.split("/").pop() ?? "test.jpg", { type: blob.type || "image/jpeg" });
}
