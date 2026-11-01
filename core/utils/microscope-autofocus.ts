import {
  MICROSCOPE_AUTO_CAPTURE_LOCATION_PREFIX,
  MICROSCOPE_AUTO_CLICK_KEY,
} from "@/core/constants/common-constants";

export type MicroscopeAutoClickConfig = {
  enabled: boolean;
  /** Variance-of-Laplacian score that counts as sharp. */
  threshold: number;
  /** How long the score must stay at/above threshold before a capture window starts completing. */
  stableMs: number;
  /** After stability, keep the sharpest frame seen in this window, then capture it. */
  windowMs: number;
};

export const DEFAULT_MICROSCOPE_AUTO_CLICK: MicroscopeAutoClickConfig = {
  enabled: false,
  threshold: 350,
  stableMs: 300,
  windowMs: 600,
};

export const MICROSCOPE_AUTO_CLICK_LIMITS = {
  threshold: { min: 0, max: 1000, step: 10 },
  stableMs: { min: 100, max: 1000, step: 50 },
  windowMs: { min: 200, max: 1500, step: 50 },
} as const;

const AUTO_CAPTURE_COOLDOWN_MS = 1500;
/** Wait after the assigned camera stream is live so we don't capture the previous camera. */
const AUTO_CAPTURE_WARMUP_MS = 1000;
const SHARPNESS_MAX_SIZE = 640;

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

const LEGACY_DEFAULT_THRESHOLDS = new Set([100, 250]);

export function parseMicroscopeAutoClickConfig(
  raw: unknown,
): MicroscopeAutoClickConfig {
  const source =
    raw && typeof raw === "object"
      ? (raw as Partial<MicroscopeAutoClickConfig>)
      : {};
  const storedThreshold = clamp(
    Number(source.threshold),
    MICROSCOPE_AUTO_CLICK_LIMITS.threshold.min,
    MICROSCOPE_AUTO_CLICK_LIMITS.threshold.max,
    DEFAULT_MICROSCOPE_AUTO_CLICK.threshold,
  );
  return {
    enabled: source.enabled === true,
    threshold: LEGACY_DEFAULT_THRESHOLDS.has(storedThreshold)
      ? DEFAULT_MICROSCOPE_AUTO_CLICK.threshold
      : storedThreshold,
    stableMs: clamp(
      Number(source.stableMs),
      MICROSCOPE_AUTO_CLICK_LIMITS.stableMs.min,
      MICROSCOPE_AUTO_CLICK_LIMITS.stableMs.max,
      DEFAULT_MICROSCOPE_AUTO_CLICK.stableMs,
    ),
    windowMs: clamp(
      Number(source.windowMs),
      MICROSCOPE_AUTO_CLICK_LIMITS.windowMs.min,
      MICROSCOPE_AUTO_CLICK_LIMITS.windowMs.max,
      DEFAULT_MICROSCOPE_AUTO_CLICK.windowMs,
    ),
  };
}

export function getMicroscopeAutoClickConfig(): MicroscopeAutoClickConfig {
  if (typeof window === "undefined") return DEFAULT_MICROSCOPE_AUTO_CLICK;
  try {
    const raw = localStorage.getItem(MICROSCOPE_AUTO_CLICK_KEY);
    if (!raw) return DEFAULT_MICROSCOPE_AUTO_CLICK;
    const parsed = parseMicroscopeAutoClickConfig(JSON.parse(raw));
    const stored = JSON.parse(raw) as Partial<MicroscopeAutoClickConfig>;
    if (LEGACY_DEFAULT_THRESHOLDS.has(Number(stored.threshold))) {
      persistMicroscopeAutoClickConfig(parsed);
    }
    return parsed;
  } catch {
    return DEFAULT_MICROSCOPE_AUTO_CLICK;
  }
}

export function persistMicroscopeAutoClickConfig(
  config: MicroscopeAutoClickConfig,
): void {
  localStorage.setItem(
    MICROSCOPE_AUTO_CLICK_KEY,
    JSON.stringify(parseMicroscopeAutoClickConfig(config)),
  );
}

/** Auto capture on/off for one screen; falls back to the global setting until toggled there. */
export function getLocationAutoCapture(location: string): boolean {
  if (typeof window === "undefined") return DEFAULT_MICROSCOPE_AUTO_CLICK.enabled;
  try {
    const stored = localStorage.getItem(
      `${MICROSCOPE_AUTO_CAPTURE_LOCATION_PREFIX}:${location}`,
    );
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    // fall through to global setting
  }
  return getMicroscopeAutoClickConfig().enabled;
}

export function persistLocationAutoCapture(location: string, enabled: boolean): void {
  try {
    localStorage.setItem(
      `${MICROSCOPE_AUTO_CAPTURE_LOCATION_PREFIX}:${location}`,
      String(enabled),
    );
  } catch {
    // storage unavailable — toggle still works for this visit
  }
}

/**
 * Variance of Laplacian on a downscaled grayscale frame.
 * Higher scores generally mean more fine detail (sharper focus).
 */
export function calculateVideoSharpness(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): number {
  if (video.videoWidth < 32 || video.videoHeight < 32) return 0;

  const scale = Math.min(
    1,
    SHARPNESS_MAX_SIZE / Math.max(video.videoWidth, video.videoHeight),
  );
  const w = Math.max(32, Math.round(video.videoWidth * scale));
  const h = Math.max(32, Math.round(video.videoHeight * scale));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);

  const pixels = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    gray[i] = 0.299 * pixels[j] + 0.587 * pixels[j + 1] + 0.114 * pixels[j + 2];
  }

  let sum = 0;
  let sq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v =
        8 * gray[i] -
        gray[i - 1] -
        gray[i + 1] -
        gray[i - w] -
        gray[i + w] -
        gray[i - w - 1] -
        gray[i - w + 1] -
        gray[i + w - 1] -
        gray[i + w + 1];
      sum += v;
      sq += v * v;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return Math.max(0, sq / n - mean * mean);
}

export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const clone = document.createElement("canvas");
  clone.width = source.width;
  clone.height = source.height;
  const ctx = clone.getContext("2d");
  if (ctx) ctx.drawImage(source, 0, 0);
  return clone;
}

export function canvasToJpegFile(
  source: HTMLCanvasElement,
  filename = "camera_capture.jpg",
): Promise<File | null> {
  return new Promise((resolve) => {
    source.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(new File([blob], filename, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.95,
    );
  });
}

export { AUTO_CAPTURE_COOLDOWN_MS, AUTO_CAPTURE_WARMUP_MS };
