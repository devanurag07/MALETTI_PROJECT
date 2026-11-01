import {
  CAMERA_ROTATION_MICROSCOPIC_KEY,
  CAMERA_ROTATION_NORMAL_KEY,
} from "@/core/constants/common-constants";

export type CameraRotation = 0 | 90 | 180 | 270;

export type CameraRotationOption = {
  deg: CameraRotation;
  label: string;
  hint: string;
};

/** Absolute clockwise degrees from the upright camera feed. */
export const CAMERA_ROTATION_OPTIONS: CameraRotationOption[] = [
  { deg: 0, label: "0°", hint: "None" },
  { deg: 90, label: "90°", hint: "CW" },
  { deg: 180, label: "180°", hint: "Flip" },
  { deg: 270, label: "90°", hint: "CCW" },
];

export function parseCameraRotation(raw: string | null | undefined): CameraRotation {
  const n = Number(raw);
  if (n === 90 || n === 180 || n === 270) return n;
  return 0;
}

export function cameraRotationStorageKey(
  cameraType: "normal" | "microscopic",
): string {
  return cameraType === "microscopic"
    ? CAMERA_ROTATION_MICROSCOPIC_KEY
    : CAMERA_ROTATION_NORMAL_KEY;
}

export function getStoredCameraRotation(
  cameraType: "normal" | "microscopic" = "normal",
): CameraRotation {
  if (typeof window === "undefined") return 0;
  return parseCameraRotation(
    localStorage.getItem(cameraRotationStorageKey(cameraType)),
  );
}

/**
 * Draw a full video frame onto `canvas`, rotated by 0/90/180/270.
 * Sets canvas width/height to the post-rotation size.
 */
export function drawVideoWithRotation(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  rotation: CameraRotation,
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const swap = rotation === 90 || rotation === 270;
  canvas.width = swap ? vh : vw;
  canvas.height = swap ? vw : vh;

  ctx.save();
  switch (rotation) {
    case 90:
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      break;
    case 180:
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate(Math.PI);
      break;
    case 270:
      ctx.translate(0, canvas.height);
      ctx.rotate(-Math.PI / 2);
      break;
    default:
      break;
  }
  ctx.drawImage(video, 0, 0, vw, vh);
  ctx.restore();
}

/**
 * Square-crop the video (center), then rotate onto `canvas`.
 * Canvas remains square (same side length as the crop).
 */
export function drawSquareCropWithRotation(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  rotation: CameraRotation,
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const size = Math.min(vw, vh);
  const startX = (vw - size) / 2;
  const startY = (vh - size) / 2;

  canvas.width = size;
  canvas.height = size;

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-size / 2, -size / 2);
  ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
  ctx.restore();
}

/** Bake horizontal mirror into an existing canvas (matches CSS scale-x-[-1]). */
export function bakeHorizontalFlip(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d");
  if (!ctx) return source;
  ctx.translate(out.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return out;
}
