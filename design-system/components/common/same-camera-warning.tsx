"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  MICROSCOPIC_CAMERA_KEY,
  NORMAL_CAMERA_KEY,
  SAME_CAMERA_WARNING_COLLAPSED_KEY,
} from "@/core/constants/common-constants";

export function areAssignedCamerasTheSame(): boolean {
  if (typeof window === "undefined") return false;
  const micro = localStorage.getItem(MICROSCOPIC_CAMERA_KEY) ?? "";
  const normal = localStorage.getItem(NORMAL_CAMERA_KEY) ?? "";
  return Boolean(micro && normal && micro === normal);
}

function readCollapsed(): boolean {
  try {
    return sessionStorage.getItem(SAME_CAMERA_WARNING_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function persistCollapsed(collapsed: boolean): void {
  try {
    if (collapsed) {
      sessionStorage.setItem(SAME_CAMERA_WARNING_COLLAPSED_KEY, "true");
    } else {
      sessionStorage.removeItem(SAME_CAMERA_WARNING_COLLAPSED_KEY);
    }
  } catch {
    // ignore
  }
}

interface SameCameraWarningProps {
  /** Show only after a photo was taken (preview), not while the live camera is open. */
  visible: boolean;
  onRetakeWithCamera: () => void;
}

export function SameCameraWarning({
  visible,
  onRetakeWithCamera,
}: SameCameraWarningProps) {
  const t = useTranslations("captureImages");
  const [sameCamera, setSameCamera] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microId, setMicroId] = useState("");
  const [normalId, setNormalId] = useState("");

  useEffect(() => {
    if (!visible) return;
    setSameCamera(areAssignedCamerasTheSame());
    setCollapsed(readCollapsed());
    setMicroId(localStorage.getItem(MICROSCOPIC_CAMERA_KEY) ?? "");
    setNormalId(localStorage.getItem(NORMAL_CAMERA_KEY) ?? "");

    let cancelled = false;
    const load = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setCameras(devices.filter((d) => d.kind === "videoinput"));
        }
      } catch {
        if (!cancelled) setCameras([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible || !sameCamera) return null;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    persistCollapsed(next);
  };

  const selectCamera = (deviceId: string) => {
    localStorage.setItem(MICROSCOPIC_CAMERA_KEY, deviceId);
    setMicroId(deviceId);
    persistCollapsed(false);
    setCollapsed(false);
    if (deviceId !== normalId) {
      setSameCamera(false);
    }
    onRetakeWithCamera();
  };

  return (
    <div className="mx-4 mb-2 overflow-hidden rounded-2xl border-2 border-white bg-black">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full items-center gap-5 px-6 py-6 text-left"
      >
        <AlertTriangle size={48} className="shrink-0 text-white" />
        <p className="min-w-0 flex-1 text-4xl font-bold text-white">
          {t("sameCameraWarning")}
        </p>
        {collapsed ? (
          <ChevronDown size={44} className="shrink-0 text-white" />
        ) : (
          <ChevronUp size={44} className="shrink-0 text-white" />
        )}
      </button>

      {!collapsed && (
        <div className="border-t-2 border-white px-6 py-6">
          {cameras.length <= 1 ? (
            <p className="text-3xl text-white">{t("noOtherCameras")}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-3xl font-semibold text-white">
                {t("changeCamera")}
              </p>
              {cameras.map((cam, idx) => {
                const isCurrent = cam.deviceId === microId;
                const isNormal = cam.deviceId === normalId;
                const label = cam.label || `${t("cameraFallback")} ${idx + 1}`;
                return (
                  <button
                    key={cam.deviceId || idx}
                    type="button"
                    onClick={() => selectCamera(cam.deviceId)}
                    className={`flex items-center justify-between gap-4 rounded-2xl px-6 py-5 text-left text-3xl font-medium ${
                      isCurrent
                        ? "bg-white text-black"
                        : "border-2 border-white bg-black text-white"
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    {isNormal ? (
                      <span
                        className={`shrink-0 rounded-full px-4 py-1 text-2xl font-semibold ${
                          isCurrent
                            ? "border border-black text-black"
                            : "border border-white text-white"
                        }`}
                      >
                        {t("normalCameraBadge")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
