"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Microscope,
  Camera,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  LogOut,
  Languages,
  FlipHorizontal,
  MonitorPlay,
  RotateCw,
  RotateCcw,
  Bug,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  MICROSCOPIC_CAMERA_KEY,
  NORMAL_CAMERA_KEY,
  INVERT_ON_CAPTURE_KEY,
  SCREENSAVER_TIMEOUT_KEY,
  CAMERA_ROTATION_NORMAL_KEY,
  CAMERA_ROTATION_MICROSCOPIC_KEY,
} from "@/core/constants/common-constants";
import {
  CAMERA_ROTATION_OPTIONS,
  parseCameraRotation,
  type CameraRotation,
} from "@/core/utils/camera-orientation";
import {
  DEFAULT_MICROSCOPE_AUTO_CLICK,
  MICROSCOPE_AUTO_CLICK_LIMITS,
  getMicroscopeAutoClickConfig,
  persistMicroscopeAutoClickConfig,
  type MicroscopeAutoClickConfig,
} from "@/core/utils/microscope-autofocus";
import { isDebugMode, isDebugSalon, persistDebugMode } from "@/core/utils/debug-mode";
import { DEFAULT_SCREENSAVER_TIMEOUT_MS } from "@/design-system/components/common/screen-saver";
import { logoutMirror } from "@/features/auth/utils/logout";
import { locales } from "@/i18n";

const languageNames: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ja: "日本語",
  zh: "中文",
  hi: "हिन्दी",
  ar: "العربية",
  tu: "తెలుగు",
  el: "Greek",
};

const SCREENSAVER_PRESETS_MS = [
  0,
  1 * 60 * 1000,
  2 * 60 * 1000,
  5 * 60 * 1000,
  10 * 60 * 1000,
] as const;

type CameraDevice = MediaDeviceInfo;

export default function CameraSetupPage() {
  const router = useRouter();
  const t = useTranslations();

  const locale = useLocale();
  const pathname = usePathname();

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [microscopicId, setMicroscopicId] = useState<string>("");
  const [normalId, setNormalId] = useState<string>("");
  const [invertOnCapture, setInvertOnCapture] = useState(false);
  /** Debug mode (test-photo buttons); the switch exists only for the debug salon. */
  const [debugSalon, setDebugSalon] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [normalRotation, setNormalRotation] = useState<CameraRotation>(0);
  const [microscopicRotation, setMicroscopicRotation] =
    useState<CameraRotation>(0);
  const [screensaverTimeoutMs, setScreensaverTimeoutMs] = useState(
    DEFAULT_SCREENSAVER_TIMEOUT_MS
  );
  const [autoClick, setAutoClick] = useState<MicroscopeAutoClickConfig>(
    DEFAULT_MICROSCOPE_AUTO_CLICK
  );
  const [showAutoClickAdvanced, setShowAutoClickAdvanced] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<
    "microscopic" | "normal" | "language" | "screensaver" | null
  >(null);

  const handleLanguageChange = (newLocale: string) => {
    const pathnameWithoutLocale = pathname.replace(`/${locale}`, "");
    router.push(`/${newLocale}${pathnameWithoutLocale}`);
    setOpenDropdown(null);
  };

  const loadCameras = async () => {
    setLoading(true);
    setSaved(false);
    setInvertOnCapture(localStorage.getItem(INVERT_ON_CAPTURE_KEY) === "true");
    setDebugSalon(isDebugSalon());
    setDebugMode(isDebugMode());
    setNormalRotation(
      parseCameraRotation(localStorage.getItem(CAMERA_ROTATION_NORMAL_KEY))
    );
    setMicroscopicRotation(
      parseCameraRotation(localStorage.getItem(CAMERA_ROTATION_MICROSCOPIC_KEY))
    );
    const savedTimeout = localStorage.getItem(SCREENSAVER_TIMEOUT_KEY);
    if (savedTimeout === null || savedTimeout === "") {
      setScreensaverTimeoutMs(DEFAULT_SCREENSAVER_TIMEOUT_MS);
    } else {
      const parsed = Number(savedTimeout);
      setScreensaverTimeoutMs(
        Number.isFinite(parsed) && parsed >= 0
          ? parsed
          : DEFAULT_SCREENSAVER_TIMEOUT_MS
      );
    }
    setAutoClick(getMicroscopeAutoClickConfig());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoInputs);

      const savedMicro = localStorage.getItem(MICROSCOPIC_CAMERA_KEY) ?? "";
      const savedNormal = localStorage.getItem(NORMAL_CAMERA_KEY) ?? "";

      setMicroscopicId(
        savedMicro && videoInputs.some((c) => c.deviceId === savedMicro)
          ? savedMicro
          : videoInputs[1]?.deviceId ?? videoInputs[0]?.deviceId ?? ""
      );
      setNormalId(
        savedNormal && videoInputs.some((c) => c.deviceId === savedNormal)
          ? savedNormal
          : videoInputs[0]?.deviceId ?? ""
      );
    } catch {
      console.error("Camera permission denied");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, []);

  const handleSave = () => {
    localStorage.setItem(MICROSCOPIC_CAMERA_KEY, microscopicId);
    localStorage.setItem(NORMAL_CAMERA_KEY, normalId);
    localStorage.setItem(INVERT_ON_CAPTURE_KEY, String(invertOnCapture));
    localStorage.setItem(CAMERA_ROTATION_NORMAL_KEY, String(normalRotation));
    localStorage.setItem(
      CAMERA_ROTATION_MICROSCOPIC_KEY,
      String(microscopicRotation)
    );
    localStorage.setItem(SCREENSAVER_TIMEOUT_KEY, String(screensaverTimeoutMs));
    persistMicroscopeAutoClickConfig(autoClick);
    if (debugSalon) persistDebugMode(debugMode);
    setSaved(true);
    setTimeout(() => router.push("/"), 1200);
  };

  return (
    <div className="flex min-h-full flex-col bg-black text-white">
      {/* Header */}
      <header className="flex items-center gap-6 px-10 pt-12 pb-10 border-b border-bv-line flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-20 h-20 rounded-full border-2 border-bv-line hover:border-bv-line-strong hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft size={40} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-6xl font-bold tracking-tight">{t("cameraSetup.title")}</h1>
          <p className="text-bv-ink-muted text-2xl mt-2">
            {t("cameraSetup.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={logoutMirror}
          className="flex items-center gap-4 rounded-full border-2 border-bv-line hover:border-bv-line-strong hover:bg-white/10 px-8 py-5 text-2xl font-semibold text-bv-ink hover:text-white transition-colors shrink-0"
          aria-label={t("landing.logout")}
        >
          <LogOut size={40} />
          {t("landing.logout")}
        </button>
      </header>

      <main className="flex-1 flex flex-col gap-10 px-10 py-10 max-w-4xl w-full mx-auto overflow-y-auto">

        {/* Language Selector */}
        <div className="rounded-3xl border border-bv-line bg-white/[0.04] overflow-hidden">
          <div className="flex items-center gap-6 px-8 py-7">
            <div className="w-20 h-20 rounded-2xl border border-bv-line bg-white/10 flex items-center justify-center shrink-0">
              <Languages size={52} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-bold text-white">Language</h2>
            </div>
          </div>

          <button
            onClick={() => setOpenDropdown((prev) => (prev === "language" ? null : "language"))}
            className="w-full flex items-center justify-between gap-4 px-8 py-6 bg-white/[0.06] hover:bg-white/10 transition-colors border-t border-bv-line"
          >
            <span className="text-2xl font-semibold text-white truncate">
              {languageNames[locale] ?? locale}
            </span>
            <ChevronDown
              size={36}
              className={`shrink-0 text-bv-ink-muted transition-transform duration-200 ${openDropdown === "language" ? "rotate-180" : ""}`}
            />
          </button>

          {openDropdown === "language" && (
            <div className="flex flex-col gap-2 px-5 py-4 border-t border-bv-line bg-black/60">
              {locales.map((loc) => {
                const isSelected = loc === locale;
                return (
                  <button
                    key={loc}
                    onClick={() => handleLanguageChange(loc)}
                    className={`flex items-center gap-4 rounded-2xl px-6 py-5 text-2xl text-left font-medium transition-colors ${isSelected
                        ? "bg-white text-black"
                        : "text-bv-ink-muted hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={28} className="shrink-0" />
                    ) : (
                      <span className="w-7 h-7 rounded-full border border-bv-line shrink-0" />
                    )}
                    <span>{languageNames[loc] ?? loc}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-bv-ink-muted">
            <RefreshCw size={72} className="animate-spin" />
            <p className="text-4xl">{t("cameraSetup.detecting")}</p>
          </div>
        ) : cameras.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-bv-ink-muted">
            <Camera size={96} />
            <p className="text-4xl text-center leading-snug">
              {t("cameraSetup.noCamerasTitle")}
              <br />
              {t("cameraSetup.noCamerasSubtitle")}
            </p>
            <button
              onClick={loadCameras}
              className="mt-4 flex items-center gap-3 rounded-full border-2 border-bv-line-strong hover:border-white/60 hover:bg-white/10 px-10 py-5 text-2xl font-medium text-bv-ink-muted hover:text-white transition-colors"
            >
              <RefreshCw size={32} />
              {t("cameraSetup.retry")}
            </button>
          </div>
        ) : (
          <>
            {/* Info banner */}
            <div className="rounded-3xl border border-bv-line bg-bv-surface-raised px-8 py-6 flex items-start justify-between gap-6">
              <p className="text-bv-ink-muted text-2xl leading-relaxed">
                {t("cameraSetup.infoBanner")}
              </p>
              <button
                onClick={loadCameras}
                className="shrink-0 flex items-center gap-3 rounded-full border border-bv-line hover:border-bv-line-strong hover:bg-white/10 px-6 py-3 text-xl font-medium text-bv-ink-muted hover:text-white transition-colors"
              >
                <RefreshCw size={24} />
                {t("cameraSetup.refresh")}
              </button>
            </div>

            {/* Normal Camera (Camera 1) */}
            <CameraSelector
              icon={<Camera size={52} className="text-white" />}
              title={t("cameraSetup.normalCamera")}
              description={t("cameraSetup.normalCameraDesc")}
              cameras={cameras}
              selectedId={normalId}
              onSelect={(id) => {
                setNormalId(id);
                setSaved(false);
              }}
              isOpen={openDropdown === "normal"}
              onToggle={() =>
                setOpenDropdown((prev) => (prev === "normal" ? null : "normal"))
              }
              rotation={normalRotation}
              onRotationChange={(deg) => {
                setNormalRotation(deg);
                setSaved(false);
              }}
            />

            {/* Microscopic Camera (Camera 2) */}
            <CameraSelector
              icon={<Microscope size={52} className="text-white" />}
              title={t("cameraSetup.microscopicCamera")}
              description={t("cameraSetup.microscopicCameraDesc")}
              cameras={cameras}
              selectedId={microscopicId}
              onSelect={(id) => {
                setMicroscopicId(id);
                setSaved(false);
              }}
              isOpen={openDropdown === "microscopic"}
              onToggle={() =>
                setOpenDropdown((prev) =>
                  prev === "microscopic" ? null : "microscopic"
                )
              }
              rotation={microscopicRotation}
              onRotationChange={(deg) => {
                setMicroscopicRotation(deg);
                setSaved(false);
              }}
            />

            {/* Invert on capture */}
            <button
              type="button"
              onClick={() => {
                setInvertOnCapture((prev) => !prev);
                setSaved(false);
              }}
              className="rounded-3xl border border-bv-line bg-white/[0.04] overflow-hidden w-full text-left"
            >
              <div className="flex items-center gap-6 px-8 py-7">
                <div className="w-20 h-20 rounded-2xl border border-bv-line bg-white/10 flex items-center justify-center shrink-0">
                  <FlipHorizontal size={52} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-4xl font-bold text-white">
                    {t("cameraSetup.invertOnCapture")}
                  </h2>
                  <p className="text-bv-ink-muted text-2xl mt-1">
                    {t("cameraSetup.invertOnCaptureDesc")}
                  </p>
                </div>
                <div
                  className={`relative w-24 h-12 rounded-full transition-colors shrink-0 ${invertOnCapture ? "bg-white" : "bg-white/20"
                    }`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-1 left-1 w-10 h-10 rounded-full transition-transform ${invertOnCapture
                        ? "translate-x-12 bg-black"
                        : "translate-x-0 bg-white/70"
                      }`}
                  />
                </div>
              </div>
            </button>

            {/* Debug mode: only for the debug salon */}
            {debugSalon && (
              <button
                type="button"
                onClick={() => {
                  setDebugMode((prev) => !prev);
                  setSaved(false);
                }}
                className="rounded-3xl border border-bv-line bg-white/[0.04] overflow-hidden w-full text-left"
              >
                <div className="flex items-center gap-6 px-8 py-7">
                  <div className="w-20 h-20 rounded-2xl border border-bv-line bg-white/10 flex items-center justify-center shrink-0">
                    <Bug size={52} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-4xl font-bold text-white">Debug mode</h2>
                    <p className="text-bv-ink-muted text-2xl mt-1">
                      Show &quot;Use test photo&quot; on every camera screen (close-up, full-length, scalp and skin)
                    </p>
                  </div>
                  <div
                    className={`relative w-24 h-12 rounded-full transition-colors shrink-0 ${debugMode ? "bg-white" : "bg-white/20"}`}
                    aria-hidden
                  >
                    <span
                      className={`absolute top-1 left-1 w-10 h-10 rounded-full transition-transform ${
                        debugMode ? "translate-x-12 bg-black" : "translate-x-0 bg-white/70"
                      }`}
                    />
                  </div>
                </div>
              </button>
            )}

            {/* Screensaver idle timeout */}
            <div className="rounded-3xl border border-bv-line bg-white/[0.04] overflow-hidden">
              <div className="flex items-center gap-6 px-8 py-7">
                <div className="w-20 h-20 rounded-2xl border border-bv-line bg-white/10 flex items-center justify-center shrink-0">
                  <MonitorPlay size={52} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-4xl font-bold text-white">
                    {t("cameraSetup.screensaverIdle")}
                  </h2>
                  <p className="text-bv-ink-muted text-2xl mt-1">
                    {t("cameraSetup.screensaverIdleDesc")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpenDropdown((prev) =>
                    prev === "screensaver" ? null : "screensaver"
                  )
                }
                className="w-full flex items-center justify-between gap-4 px-8 py-6 bg-white/[0.06] hover:bg-white/10 transition-colors border-t border-bv-line"
              >
                <span className="text-2xl font-semibold text-white truncate">
                  {screensaverTimeoutMs === 0
                    ? t("cameraSetup.screensaverOff")
                    : t("cameraSetup.screensaverMinutes", {
                        count: screensaverTimeoutMs / 60000,
                      })}
                </span>
                <ChevronDown
                  size={36}
                  className={`shrink-0 text-bv-ink-muted transition-transform duration-200 ${
                    openDropdown === "screensaver" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openDropdown === "screensaver" && (
                <div className="flex flex-col gap-2 px-5 py-4 border-t border-bv-line bg-black/60">
                  {SCREENSAVER_PRESETS_MS.map((ms) => {
                    const isSelected = ms === screensaverTimeoutMs;
                    const label =
                      ms === 0
                        ? t("cameraSetup.screensaverOff")
                        : t("cameraSetup.screensaverMinutes", {
                            count: ms / 60000,
                          });
                    return (
                      <button
                        key={ms}
                        type="button"
                        onClick={() => {
                          setScreensaverTimeoutMs(ms);
                          setSaved(false);
                          setOpenDropdown(null);
                        }}
                        className={`flex items-center gap-4 rounded-2xl px-6 py-5 text-2xl text-left font-medium transition-colors ${
                          isSelected
                            ? "bg-white text-black"
                            : "text-bv-ink-muted hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {isSelected ? (
                          <CheckCircle2 size={28} className="shrink-0" />
                        ) : (
                          <span className="w-7 h-7 rounded-full border border-bv-line shrink-0" />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-bv-line bg-white/[0.04] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setAutoClick((prev) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }));
                  setSaved(false);
                }}
                className="w-full flex items-center gap-6 px-8 py-7 text-left"
              >
                <div className="w-20 h-20 rounded-2xl border border-bv-line bg-white/10 flex items-center justify-center shrink-0">
                  <Microscope size={52} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-4xl font-bold text-white">
                    {t("cameraSetup.microscopeAutoClick")}
                  </h2>
                  <p className="text-bv-ink-muted text-2xl mt-1">
                    {t("cameraSetup.microscopeAutoClickDesc")}
                  </p>
                </div>
                <div
                  className={`relative w-24 h-12 rounded-full transition-colors shrink-0 ${
                    autoClick.enabled ? "bg-white" : "bg-white/20"
                  }`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-1 left-1 w-10 h-10 rounded-full transition-transform ${
                      autoClick.enabled
                        ? "translate-x-12 bg-black"
                        : "translate-x-0 bg-white/70"
                    }`}
                  />
                </div>
              </button>

              <div className="px-8 pb-6">
                <button
                  type="button"
                  onClick={() => setShowAutoClickAdvanced((prev) => !prev)}
                  className="text-sm text-bv-ink-muted hover:text-bv-ink-muted underline underline-offset-4"
                >
                  {showAutoClickAdvanced
                    ? t("cameraSetup.hideAdvanced")
                    : t("cameraSetup.showAdvanced")}
                </button>
              </div>

              {showAutoClickAdvanced && (
                <div className="flex flex-col gap-8 px-8 pb-7 border-t border-bv-line pt-6">
                  <SetupSlider
                    label={t("cameraSetup.sharpnessThreshold")}
                    hint={t("cameraSetup.sharpnessThresholdHint")}
                    value={autoClick.threshold}
                    min={MICROSCOPE_AUTO_CLICK_LIMITS.threshold.min}
                    max={MICROSCOPE_AUTO_CLICK_LIMITS.threshold.max}
                    step={MICROSCOPE_AUTO_CLICK_LIMITS.threshold.step}
                    displayValue={String(autoClick.threshold)}
                    onChange={(threshold) => {
                      setAutoClick((prev) => ({ ...prev, threshold }));
                      setSaved(false);
                    }}
                  />
                  <SetupSlider
                    label={t("cameraSetup.stabilityTime")}
                    hint={t("cameraSetup.stabilityTimeHint")}
                    value={autoClick.stableMs}
                    min={MICROSCOPE_AUTO_CLICK_LIMITS.stableMs.min}
                    max={MICROSCOPE_AUTO_CLICK_LIMITS.stableMs.max}
                    step={MICROSCOPE_AUTO_CLICK_LIMITS.stableMs.step}
                    displayValue={t("cameraSetup.ms", { ms: autoClick.stableMs })}
                    onChange={(stableMs) => {
                      setAutoClick((prev) => ({ ...prev, stableMs }));
                      setSaved(false);
                    }}
                  />
                  <SetupSlider
                    label={t("cameraSetup.bestFrameWindow")}
                    hint={t("cameraSetup.bestFrameWindowHint")}
                    value={autoClick.windowMs}
                    min={MICROSCOPE_AUTO_CLICK_LIMITS.windowMs.min}
                    max={MICROSCOPE_AUTO_CLICK_LIMITS.windowMs.max}
                    step={MICROSCOPE_AUTO_CLICK_LIMITS.windowMs.step}
                    displayValue={t("cameraSetup.ms", { ms: autoClick.windowMs })}
                    onChange={(windowMs) => {
                      setAutoClick((prev) => ({ ...prev, windowMs }));
                      setSaved(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Detected cameras list */}
            <div className="rounded-3xl border border-bv-line bg-white/[0.03] px-8 py-7">
              <p className="text-bv-ink-muted text-lg mb-5 uppercase tracking-widest font-semibold">
                {t("cameraSetup.detectedCameras", { count: cameras.length })}
              </p>
              <div className="flex flex-col gap-3">
                {cameras.map((cam, idx) => (
                  <div key={cam.deviceId} className="flex items-center gap-5 text-bv-ink-muted">
                    <span className="w-10 h-10 rounded-full border border-bv-line flex items-center justify-center text-lg font-bold text-bv-ink-muted shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate text-2xl">
                      {cam.label || `Camera ${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>


            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!microscopicId || !normalId || saved}
              className={`flex items-center justify-center gap-4 rounded-3xl py-8 text-3xl font-bold tracking-wide transition-all duration-300 ${saved
                ? "bg-white text-black"
                : "bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
            >
              {saved ? (
                <>
                  <CheckCircle2 size={40} />
                  {t("cameraSetup.saved")}
                </>
              ) : (
                t("cameraSetup.saveButton")
              )}
            </button>
          </>
        )}
      </main>
    </div>
  );
}

// ─── CameraSelector ────────────────────────────────────────────────────────────

interface CameraSelectorProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  cameras: CameraDevice[];
  selectedId: string;
  onSelect: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  rotation: CameraRotation;
  onRotationChange: (deg: CameraRotation) => void;
}

function CameraSelector({
  icon,
  title,
  description,
  cameras,
  selectedId,
  onSelect,
  isOpen,
  onToggle,
  rotation,
  onRotationChange,
}: CameraSelectorProps) {
  const t = useTranslations();
  const selectedCam = cameras.find((c) => c.deviceId === selectedId);
  const selectedLabel =
    selectedCam?.label ||
    (selectedCam ? `${t("cameraSetup.camera")} ${cameras.indexOf(selectedCam) + 1}` : t("cameraSetup.selectPlaceholder"));

  return (
    <div className="rounded-3xl border border-bv-line bg-white/[0.04] overflow-hidden">
      <div className="flex items-center gap-6 px-8 py-7">
        <div className="w-20 h-20 rounded-2xl border border-bv-line bg-white/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-4xl font-bold text-white">{title}</h2>
          <p className="text-bv-ink-muted text-2xl mt-1">{description}</p>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-8 py-6 bg-white/[0.06] hover:bg-white/10 transition-colors border-t border-bv-line"
      >
        <span className="text-2xl font-semibold text-white truncate">
          {selectedLabel}
        </span>
        <ChevronDown
          size={36}
          className={`shrink-0 text-bv-ink-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 px-5 py-4 border-t border-bv-line bg-black/60">
          {cameras.map((cam, idx) => {
            const label = cam.label || `Camera ${idx + 1}`;
            const isSelected = cam.deviceId === selectedId;
            return (
              <button
                key={cam.deviceId}
                onClick={() => { onSelect(cam.deviceId); onToggle(); }}
                className={`flex items-center gap-4 rounded-2xl px-6 py-5 text-2xl text-left font-medium transition-colors ${isSelected
                  ? "bg-white text-black"
                  : "text-bv-ink-muted hover:bg-white/10 hover:text-white"
                  }`}
              >
                {isSelected ? (
                  <CheckCircle2 size={28} className="shrink-0" />
                ) : (
                  <span className="w-7 h-7 rounded-full border border-bv-line shrink-0" />
                )}
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-4 px-8 py-6 border-t border-bv-line">
        <div className="flex items-center gap-3 text-bv-ink-muted">
          <RotateCw size={28} />
          <span className="text-xl font-semibold uppercase tracking-wider">
            {t("cameraSetup.cameraRotation")}
          </span>
          <span className="text-lg text-bv-ink-muted/70 normal-case tracking-normal">
            · {t("cameraSetup.cameraRotationHint")}
          </span>
        </div>
        <div className="flex flex-1 gap-3">
          {CAMERA_ROTATION_OPTIONS.map(({ deg, label, hint }) => {
            const selected = rotation === deg;
            return (
              <button
                key={deg}
                type="button"
                onClick={() => onRotationChange(deg)}
                className={`flex-1 rounded-2xl py-4 px-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                  selected
                    ? "bg-white text-black"
                    : "bg-white/10 text-bv-ink-muted hover:bg-white/15 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2 text-2xl font-bold">
                  {deg === 90 && (
                    <RotateCw
                      size={22}
                      className={selected ? "text-black" : "text-bv-ink-muted"}
                    />
                  )}
                  {deg === 270 && (
                    <RotateCcw
                      size={22}
                      className={selected ? "text-black" : "text-bv-ink-muted"}
                    />
                  )}
                  {label}
                </span>
                <span
                  className={`text-sm font-semibold uppercase tracking-wider ${
                    selected ? "text-black/55" : "text-bv-ink-muted"
                  }`}
                >
                  {hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SetupSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-2xl font-semibold text-white">{label}</p>
          <p className="text-bv-ink-muted text-lg mt-1 leading-snug">{hint}</p>
        </div>
        <span className="text-3xl font-bold text-white tabular-nums shrink-0">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 w-full h-4 accent-white"
      />
    </div>
  );
}
