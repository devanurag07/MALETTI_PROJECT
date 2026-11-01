/**
 * Image to display for a try-on result. The pipelines return both `image_base64` and `output_url`;
 * the base64 always renders, while `output_url` may not be reachable from the kiosk (private
 * bucket / server-local media). Show base64, keep `output_url` for saving to the report.
 */
export function previewSrc(base64: string | null | undefined, url: string | null | undefined): string | null {
  const raw = base64?.trim();
  if (raw) return raw.startsWith("data:") ? raw : `data:image/png;base64,${raw.split("base64,").pop()}`;
  return url ?? null;
}
