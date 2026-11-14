"use client";

import { useLoadingOverlay } from "../use-nav";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setPendingUpload } from "../pending-upload";
import { INVERT_ON_CAPTURE_KEY } from "@/core/constants/common-constants";
import { drawVideoWithRotation, getStoredCameraRotation, type CameraRotation } from "@/core/utils/camera-orientation";
import Webcam from "react-webcam";
import { NORMAL_CAMERA_KEY } from "@/core/constants/common-constants";
import TestPhotoButton from "@/features/customer-session/flow/TestPhotoButton";
import { TEST_PHOTOS } from "@/features/customer-session/flow/testPhotos";
import { convertFileToJpeg } from "@/core/utils/common";
import { studioApi } from "../api";
import { EMPTY_LOOK, useStudio } from "../context/StudioContext";
import { BackButton, Arch, c, ErrorLine, GuidePill, H1, HeroBackdrop, Icon, ICON, LoadingStage, PrimaryButton, Screen } from "../ui";

const ARCH = { w: 440, h: 440 }; // square: the photo is saved 1:1 so before/after compare at the same size

/** Centre-crop to the square frame (what the customer sees) — never stretch. */
async function cropToArch(source: CanvasImageSource, w: number, h: number, mirror: boolean): Promise<Blob | null> {
  const aspect = ARCH.w / ARCH.h;
  const [sw, sh] = w / h > aspect ? [h * aspect, h] : [w, w / aspect];
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.92));
}

/** Step 1 — Take a photo. Live camera in the arch; the shot is uploaded and the session created. */
export default function CaptureScreen() {
  const router = useRouter();
  const { t, config, locale, session, setSession, resetAll, setLocalPhoto, updateLook } = useStudio();
  const cam = useRef<Webcam>(null);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [camError, setCamError] = useState(false);
  const [saving, setSaving] = useState(false);
  // Saving the photo → loading screen over the camera (no spinner in the button).
  useLoadingOverlay(saving);
  const [flash, setFlash] = useState(0);
  // Settings page: "invert on capture" turns the mirror off; rotation fixes a camera mounted sideways.
  const [mirror, setMirror] = useState(true);
  const [rotation, setRotation] = useState<CameraRotation>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDeviceId(localStorage.getItem(NORMAL_CAMERA_KEY) || undefined); // chosen in /camera-setup
      setMirror(localStorage.getItem(INVERT_ON_CAPTURE_KEY) !== "true");
      setRotation(getStoredCameraRotation("normal"));
    } catch {}
  }, []);

  const upload = useCallback(
    async (file: Blob) => {
      setSaving(true);
      setError(null);
      try {
        let s = session;
        // A new photo always starts a new session: try-ons, choices and the report belong to one photo.
        if (!s || s.status === "completed" || s.status === "shared" || !!s.source_image_url) {
          resetAll();
          s = await studioApi.createSession({ locale });
        }
        const jpeg = await convertFileToJpeg(file as File, 1600, 0.85);
        const dataUrl = await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.onerror = () => rej(fr.error);
          fr.readAsDataURL(jpeg);
        });
        setLocalPhoto(dataUrl); // after resetAll(): show this copy everywhere, no CDN wait
        updateLook(EMPTY_LOOK); // try-ons / choices belonged to the previous photo
        setSession(s);
        // Upload in the background; Analysis waits for it. Merge only the photo fields so
        // gender / flow picked on the Profile screen meanwhile are kept.
        const sessionId = s.id;
        setPendingUpload(
          studioApi.uploadPhoto(sessionId, jpeg).then((uploaded) =>
            setSession((prev) =>
              prev && prev.id === sessionId
                ? { ...prev, status: uploaded.status, source_image_url: uploaded.source_image_url }
                : prev
            )
          )
        );
        router.push("/profile");
      } catch (e) {
        setError((e as Error).message);
        setSaving(false);
      }
    },
    [session, locale, resetAll, setSession, router]
  );

  /**
   * Crop the frame exactly like the arch shows it (object-fit: cover, mirrored) — never stretch the
   * 16:9 camera frame into a portrait image.
   */
  async function shoot() {
    const video = cam.current?.video;
    if (!video || !video.videoWidth) return setError(t("capture", "noCamera"));
    setFlash((n) => n + 1); // shutter flash first, work happens after
    setSaving(true);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    let blob: Blob | null;
    if (rotation) {
      const rotated = document.createElement("canvas");
      const ctx = rotated.getContext("2d");
      if (!ctx) return setError(t("capture", "noCamera"));
      drawVideoWithRotation(ctx, rotated, video, rotation);
      blob = await cropToArch(rotated, rotated.width, rotated.height, mirror);
    } else {
      blob = await cropToArch(video, video.videoWidth, video.videoHeight, mirror); // as on screen
    }
    if (!blob) return setError(t("capture", "noCamera"));
    await upload(blob);
  }

  /** Photo from the device instead of the camera: same portrait crop, not mirrored. */
  async function pickFile(file: File) {
    setError(null);
    try {
      const jpeg = await convertFileToJpeg(file, 2400, 0.92); // also decodes HEIC
      const bitmap = await createImageBitmap(jpeg);
      const blob = await cropToArch(bitmap, bitmap.width, bitmap.height, false);
      bitmap.close();
      if (blob) await upload(blob);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!config) return <LoadingStage />;

  return (
    <Screen step={1} onBack={() => router.push("/")}>
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HeroBackdrop squares={[
          { left: 44, top: 26, width: 132, height: 132 },
          { right: 44, bottom: 18, width: 96, height: 96 },
        ]} />
        <Arch width={ARCH.w} height={ARCH.h} style={{ borderRadius: 24 }}>
          {!camError ? (
            <Webcam
              ref={cam}
              audio={false}
              mirrored={false}
              screenshotFormat="image/jpeg"
              forceScreenshotSourceSize={false}
              videoConstraints={{
                ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }}
              onUserMediaError={() => (deviceId ? setDeviceId(undefined) : setCamError(true))}
              style={{
                position: "absolute", left: "50%", top: "50%", objectFit: "cover",
                // Sideways cameras: swap the box so the rotated video still covers the arch.
                width: rotation % 180 ? ARCH.h : ARCH.w, height: rotation % 180 ? ARCH.w : ARCH.h,
                transform: `translate(-50%, -50%) scaleX(${mirror ? -1 : 1}) rotate(${rotation}deg)`,
              }}
            />
          ) : null}
          <svg viewBox="0 0 560 560" width={ARCH.w} height={ARCH.h} aria-hidden="true" style={{ position: "absolute", left: 0, top: 0 }}>
            <ellipse cx="280" cy="262" rx="150" ry="182" fill="none" stroke="var(--mm-dashed)" strokeWidth="3.6" strokeDasharray="12 13" strokeOpacity="0.95" />
            <path d="M268 62 L292 62 L284 76 L260 76 Z" fill="var(--mm-accent)" />
            <path d="M268 450 L292 450 L284 464 L260 464 Z" fill="var(--mm-accent)" />
          </svg>
          {flash > 0 && (
            <div key={flash} aria-hidden="true" style={{ position: "absolute", inset: 0, background: "#fff", pointerEvents: "none", animation: "mm-shutter 450ms ease-out forwards" }} />
          )}
          <style>{`@keyframes mm-shutter { 0% { opacity: 0.95 } 100% { opacity: 0 } }`}</style>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, display: "flex", justifyContent: "center" }}>
            <GuidePill>{camError ? t("capture", "noCamera") : t("capture", "guide")}</GuidePill>
          </div>
        </Arch>
      </div>

      <div style={{ flex: "0 0 auto", padding: "8px 40px 38px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        <H1 size={46} style={{ lineHeight: 1.04 }}>{t("capture", "title")}</H1>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          {(["check1", "check2"] as const).map((k, i) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: c("ink-muted") }}>
              <span style={{
                flex: "0 0 auto", width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: c("accent"), color: c("on-dark"), fontSize: 12, fontWeight: 600,
              }}>{i + 1}</span>
              <span>{t("capture", k)}</span>
            </div>
          ))}
        </div>
        {error ? <ErrorLine message={error} /> : null}
        <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 6 }}>
          <BackButton />
          <PrimaryButton icon={ICON.camera} onClick={shoot} loading={saving} disabled={camError} style={{ flex: "1 1 auto", width: "auto" }}>
            {t("capture", "cta")}
          </PrimaryButton>
          {/* Upload a photo from the device instead of the camera */}
          <label title={t("capture", "upload")} aria-label={t("capture", "upload")} style={{
            flex: "0 0 auto", width: 64, height: 64, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${c("ink")}`, color: c("ink"), cursor: saving ? "default" : "pointer", opacity: saving ? 0.45 : 1,
          }}>
            <Icon d={ICON.upload} size={24} width={1.7} />
            <input type="file" accept="image/*" disabled={saving} style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickFile(f); e.target.value = ""; }} />
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: c("ink-muted") }}>
          <Icon d={ICON.lock} size={14} />
          <span>{t("capture", "privacy")}</span>
        </div>
        <TestPhotoButton src={TEST_PHOTOS.closeup} onSelect={([file]) => upload(file)} />
      </div>
    </Screen>
  );
}
