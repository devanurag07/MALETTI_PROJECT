"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { UploadCloud } from "lucide-react";
import { Camera as CameraIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  MICROSCOPIC_CAMERA_KEY,
  NORMAL_CAMERA_KEY,
  INVERT_ON_CAPTURE_KEY,
} from "@/core/constants/common-constants";
import {
  bakeHorizontalFlip,
  drawSquareCropWithRotation,
  getStoredCameraRotation,
  type CameraRotation,
} from "@/core/utils/camera-orientation";
import {
  AUTO_CAPTURE_COOLDOWN_MS,
  AUTO_CAPTURE_WARMUP_MS,
  calculateVideoSharpness,
  canvasToJpegFile,
  cloneCanvas,
  getMicroscopeAutoClickConfig,
} from "@/core/utils/microscope-autofocus";
import {
  AutoCaptureToggle,
  useLocationAutoCapture,
} from "@/design-system/components/common/auto-capture-toggle";

interface CameraProps {
  isLocked: boolean;
  isCheckingAccessCode: boolean;
  onCapture: (file: File) => void;
  enableSwitch?: boolean;
  primaryCamera?: boolean;
  defaultCameraIdx?: number;
  /** Which stored camera assignment to use. "microscopic" → MICROSCOPIC_CAMERA_KEY, "normal" → NORMAL_CAMERA_KEY */
  cameraType?: "microscopic" | "normal";
  /** When false, still shows sharpness but does not auto-shutter (e.g. live scalp view). */
  autoClickCapture?: boolean;
  /** Microscopic only: shows an auto capture toggle whose on/off is remembered per this location key. */
  autoCaptureLocation?: string;
}

export const Camera = ({
  isLocked,
  isCheckingAccessCode,
  onCapture,
  enableSwitch = true,
  primaryCamera = false,
  defaultCameraIdx,
  cameraType,
  autoClickCapture = true,
  autoCaptureLocation,
}: CameraProps) => {
  const t = useTranslations();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [inputFileValue, setInputFileValue] = useState<string>("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [toogleCameraList, setToogleCameraList] = useState(false);
  const [isFlipped, setIsFlipped] = useState(true);
  const [focusScore, setFocusScore] = useState<number | null>(null);
  const [focusGood, setFocusGood] = useState(false);
  const [autoCapturing, setAutoCapturing] = useState(false);
  const { enabled: autoCaptureOn, toggle: toggleAutoCapture } =
    useLocationAutoCapture(autoCaptureLocation);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef<CameraRotation>(0);
  const isFlippedRef = useRef(true);
  const onCaptureRef = useRef(onCapture);
  const analyzeRafRef = useRef<number | null>(null);
  const lastFocusUiRef = useRef(0);

  const storageKey =
    cameraType === "microscopic"
      ? MICROSCOPIC_CAMERA_KEY
      : cameraType === "normal"
        ? NORMAL_CAMERA_KEY
        : "camera-selected-id";

  isFlippedRef.current = isFlipped;
  onCaptureRef.current = onCapture;

  const setupCamera = async () => {
    try {
      setIsCameraReady(false);
      const constraints = {
        video: {
          deviceId: selectedId !== "" ? { exact: selectedId } : undefined,
          facingMode: "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play();
          setIsCameraReady(true);
          drawToCanvas();
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const drawToCanvas = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context || video.readyState < 2) {
        requestAnimationFrame(drawToCanvas);
        return;
      }

      drawSquareCropWithRotation(context, canvas, video, rotationRef.current);
      requestAnimationFrame(drawToCanvas);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onCapture(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      onCapture(e.dataTransfer.files[0]);
    }
  };

  const handleCapture = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const output = isFlippedRef.current ? bakeHorizontalFlip(canvas) : canvas;

    fetch(output.toDataURL("image/jpeg"))
      .then((res) => res.blob())
      .then((blob) => {
        onCaptureRef.current(
          new File([blob], "camera_capture.jpg", { type: "image/jpeg" }),
        );
      });
  };

  const listCameras = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === "videoinput"));
    } catch {
      console.error("Camera access denied");
    }
  };

  const selectCamera = (deviceId: string) => {
    setSelectedId(deviceId);
    localStorage.setItem(storageKey, deviceId);
  };

  useEffect(() => {
    if (!isLocked && !isCheckingAccessCode) {
      setupCamera();

      // set isFlipped by settings page 
      const invertOnCapture = localStorage.getItem(INVERT_ON_CAPTURE_KEY);
      setIsFlipped(invertOnCapture === "true" ? false : true);
      const type = cameraType === "microscopic" ? "microscopic" : "normal";
      rotationRef.current = getStoredCameraRotation(type);

    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [isLocked, isCheckingAccessCode, selectedId, cameraType]);

  useEffect(() => {
    if (cameras.length === 0) listCameras();
  }, [cameras]);

  // Resolve which camera to use once camera list is available
  useEffect(() => {
    if (cameras.length === 0) return;

    // Explicit index override (no cameraType)
    if (defaultCameraIdx !== undefined && cameraType === undefined) {
      const target = cameras[defaultCameraIdx] ?? cameras[0];
      if (target) {
        setSelectedId(target.deviceId);
        localStorage.setItem(storageKey, target.deviceId);
      }
      return;
    }

    // Use saved assignment from settings page
    if (cameraType !== undefined) {
      const savedId = localStorage.getItem(storageKey);
      if (savedId && cameras.some((c) => c.deviceId === savedId)) {
        setSelectedId(savedId);
      }
      return;
    }

    // Legacy fallback: non-primary camera reads generic saved id
    if (!primaryCamera) {
      const savedId = localStorage.getItem("camera-selected-id");
      if (savedId && cameras.some((c) => c.deviceId === savedId)) {
        setSelectedId(savedId);
      }
    }
  }, [cameras]);

  useEffect(() => {
    if (
      isLocked ||
      isCheckingAccessCode ||
      !isCameraReady ||
      cameraType !== "microscopic" ||
      cameras.length === 0
    ) {
      setFocusScore(null);
      setFocusGood(false);
      setAutoCapturing(false);
      return;
    }

    const config = getMicroscopeAutoClickConfig();
    // Per-location toggle wins over the global setting when this screen has one
    const captureOn =
      autoClickCapture &&
      (autoCaptureLocation ? autoCaptureOn : config.enabled);
    if (!config.enabled && !captureOn) {
      setFocusScore(null);
      setFocusGood(false);
      setAutoCapturing(false);
      return;
    }

    const analyzeCanvas = document.createElement("canvas");
    const analyzeCtx = analyzeCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!analyzeCtx) return;

    let running = true;
    let goodSince: number | null = null;
    let windowStart: number | null = null;
    let bestScore = -Infinity;
    let bestCanvas: HTMLCanvasElement | null = null;
    let cooldownUntil = performance.now() + AUTO_CAPTURE_WARMUP_MS;
    let capturing = false;

    const resetWindow = () => {
      goodSince = null;
      windowStart = null;
      bestScore = -Infinity;
      bestCanvas = null;
    };

    const captureBestFrame = async () => {
      if (capturing || !captureOn) return;
      const preview = bestCanvas ?? canvasRef.current;
      if (!preview) return;
      capturing = true;
      setAutoCapturing(true);
      try {
        const source = cloneCanvas(preview);
        const output = isFlippedRef.current
          ? bakeHorizontalFlip(source)
          : source;
        const file = await canvasToJpegFile(output);
        if (file) onCaptureRef.current(file);
      } finally {
        capturing = false;
        setAutoCapturing(false);
      }
    };

    const analyze = () => {
      if (!running) return;
      const video = videoRef.current;
      const preview = canvasRef.current;
      if (!video || video.readyState < 2) {
        analyzeRafRef.current = requestAnimationFrame(analyze);
        return;
      }

      const score = calculateVideoSharpness(video, analyzeCanvas, analyzeCtx);
      const now = performance.now();
      const isGood = score >= config.threshold;

      if (now - lastFocusUiRef.current > 100) {
        lastFocusUiRef.current = now;
        setFocusScore(score);
        setFocusGood(isGood);
      }

      if (isGood) {
        if (goodSince === null) goodSince = now;
        if (captureOn && now >= cooldownUntil && preview) {
          if (windowStart === null) windowStart = now;
          if (score > bestScore) {
            bestScore = score;
            bestCanvas = cloneCanvas(preview);
          }
          if (
            now - goodSince >= config.stableMs &&
            now - windowStart >= config.windowMs
          ) {
            void captureBestFrame();
            cooldownUntil = now + AUTO_CAPTURE_COOLDOWN_MS;
            resetWindow();
          }
        }
      } else {
        resetWindow();
      }

      analyzeRafRef.current = requestAnimationFrame(analyze);
    };

    analyzeRafRef.current = requestAnimationFrame(analyze);

    return () => {
      running = false;
      if (analyzeRafRef.current !== null) {
        cancelAnimationFrame(analyzeRafRef.current);
        analyzeRafRef.current = null;
      }
    };
  }, [isLocked, isCheckingAccessCode, isCameraReady, cameraType, selectedId, autoClickCapture, autoCaptureLocation, autoCaptureOn, cameras.length]);

  return (
    <div
      className="rounded-lg text-center cursor-pointer relative flex items-center justify-center bg-black"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        onChange={handleFileInputChange}
        className="hidden"
        id="image-upload"
        accept="image/*"
        value={inputFileValue}
      />
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover rounded-lg ${isFlipped ? "scale-x-[-1]" : ""}`}
        style={{ display: isCameraReady ? "block" : "none" }}
      />
      {!isCameraReady && <div className="text-white">Loading camera...</div>}

      {cameraType === "microscopic" && focusScore !== null && (
        <div className="pointer-events-none absolute top-36 left-1/2 z-[1100] -translate-x-1/2 rounded-2xl bg-black/70 px-8 py-4 text-center backdrop-blur-sm">
          <p className="text-5xl font-bold tabular-nums text-white">
            {focusScore.toFixed(1)}
          </p>
          <p
            className={`mt-1 text-3xl font-bold tracking-wide ${
              autoCapturing
                ? "text-amber-300"
                : focusGood
                  ? "text-bv-accent"
                  : "text-red-400"
            }`}
          >
            {autoCapturing
              ? t("cameraSetup.focusCapturing")
              : focusGood
                ? t("cameraSetup.focusSharp")
                : t("cameraSetup.focusFocusing")}
          </p>
        </div>
      )}

      {/* Shutter button */}
      {isCameraReady && (
        <div className="absolute z-[1000] bottom-[5vh] left-1/2 -translate-x-1/2 w-[120px] h-[120px] bg-white/20 rounded-full flex items-center justify-center">
          <button
            onClick={handleCapture}
            className="w-[100px] h-[100px] bg-white rounded-full cursor-pointer"
          />
        </div>
      )}

      {/* Camera switch (bottom-left) */}
      <div className="absolute bottom-[2vh] left-[2vw] bg-black text-white rounded-full p-2 z-40">
        {enableSwitch && (
          <CameraIcon
            onClick={() => { listCameras(); setToogleCameraList(!toogleCameraList); }}
            className="w-[80px] h-[80px] max-w-[100px] max-h-[100px]"
          />
        )}
        <Dialog open={toogleCameraList} onOpenChange={setToogleCameraList}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Select Camera</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 text-white">
              {cameras.length === 0 ? (
                <p>No cameras detected</p>
              ) : (
                cameras.map((c, idx) => (
                  <button
                    key={c.deviceId}
                    onClick={() => selectCamera(c.deviceId)}
                    className={`p-2 rounded ${selectedId === c.deviceId
                      ? "bg-white text-black"
                      : "bg-black text-white border-2 border-white"
                      }`}
                  >
                    {c.label || `Camera ${idx + 1}`}
                  </button>
                ))
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => { setToogleCameraList(false); setupCamera(); }}>
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Auto capture toggle (bottom-right) */}
      {cameraType === "microscopic" && autoClickCapture && autoCaptureLocation && (
        <AutoCaptureToggle
          enabled={autoCaptureOn}
          onToggle={toggleAutoCapture}
          className="absolute bottom-[2vh] right-[2vw] z-40"
        />
      )}

      {/* Upload (top-right) */}
      <div className="absolute top-[2vh] right-[2vw] bg-black text-white rounded-full p-2 z-40">
        <UploadCloud
          onClick={() => document.getElementById("image-upload")?.click()}
          className="w-[80px] h-[80px] max-w-[100px] max-h-[100px]"
        />
      </div>
    </div>
  );
};
