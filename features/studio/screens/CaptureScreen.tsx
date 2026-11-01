"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import { NORMAL_CAMERA_KEY } from "@/core/constants/common-constants";
import TestPhotoButton from "@/features/customer-session/flow/TestPhotoButton";
import { TEST_PHOTOS } from "@/features/customer-session/flow/testPhotos";
import { convertFileToJpeg } from "@/core/utils/common";
import { studioApi } from "../api";
import { EMPTY_LOOK, useStudio } from "../context/StudioContext";
import { Arch, c, ErrorLine, GuidePill, H1, HeroBackdrop, Icon, ICON, LoadingStage, Muted, PrimaryButton, Screen } from "../ui";

const ARCH = { w: 316, h: 404 };

/** Centre-crop to the arch's portrait shape (what the customer sees) — never stretch. */
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDeviceId(localStorage.getItem(NORMAL_CAMERA_KEY) || undefined); // chosen in /camera-setup
    } catch {}
  }, []);

  const upload = useCallback(
    async (file: Blob) => {
      setSaving(true);
      setError(null);
      try {
        let s = session;
        if (!s || s.status === "completed" || s.status === "shared") {
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
        const uploaded = await studioApi.uploadPhoto(s.id, jpeg);
        setLocalPhoto(dataUrl); // after resetAll(): show this copy everywhere, no CDN wait
        updateLook(EMPTY_LOOK); // try-ons / choices belonged to the previous photo
        setSession(uploaded); // status "active" again → the Analysis screen analyses the new photo
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
    const blob = await cropToArch(video, video.videoWidth, video.videoHeight, true); // mirrored, as on screen
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
    <Screen step={1} onBack={false}>
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HeroBackdrop squares={[
          { left: 44, top: 26, width: 132, height: 132 },
          { right: 44, bottom: 18, width: 96, height: 96 },
        ]} />
        <Arch width={ARCH.w} height={ARCH.h}>
          {!camError ? (
            <Webcam
              ref={cam}
              audio={false}
              mirrored
              screenshotFormat="image/jpeg"
              forceScreenshotSourceSize={false}
              videoConstraints={{
                ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }}
              onUserMediaError={() => (deviceId ? setDeviceId(undefined) : setCamError(true))}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null}
          <svg viewBox="0 0 560 700" width={324} height={405} aria-hidden="true" style={{ position: "absolute", left: -4, top: 0 }}>
            <ellipse cx="280" cy="256" rx="152" ry="178" fill="none" stroke="var(--mm-dashed)" strokeWidth="3.6" strokeDasharray="12 13" strokeOpacity="0.95" />
            <path d="M268 70 L292 70 L284 84 L260 84 Z" fill="var(--mm-accent)" />
            <path d="M268 428 L292 428 L284 442 L260 442 Z" fill="var(--mm-accent)" />
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, display: "flex", justifyContent: "center" }}>
            <GuidePill>{camError ? t("capture", "noCamera") : t("capture", "guide")}</GuidePill>
          </div>
        </Arch>
      </div>

      <div style={{ flex: "0 0 auto", padding: "8px 40px 38px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        <H1 size={46} style={{ lineHeight: 1.04 }}>{t("capture", "title")}</H1>
        <Muted size={16} style={{ maxWidth: 390, lineHeight: 1.5 }}>{t("capture", "sub")}</Muted>
        {error ? <ErrorLine message={error} /> : null}
        <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 6 }}>
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
