"use client";
import {
  INPUT_AVAILABLE_KEY,
  SALON_LOGO_KEY,
  SCREENSAVER_TIMEOUT_KEY,
  SHOW_QUESTIONS_KEY,
} from "@/core/constants/common-constants";
import {
  getStoredSalon,
  persistCurrentSalon,
} from "@/core/utils/salon-storage";
import { applySalonTheme } from "@/core/utils/apply-salon-theme";
import { CURRENT_SALON_URL } from "@/core/constants/url-constants";
import { installGlobalButtonClickSound } from "@/core/audio/click-sound";
import axiosClient from "@/core/network/axios-client";
import Login from "@/features/auth/forms/login-form";
import ScreenSaver, {
  DEFAULT_SCREENSAVER_TIMEOUT_MS,
} from "@/design-system/components/common/screen-saver";
import React, { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { usePathname, useRouter } from "next/navigation";
import { locales } from "@/i18n";

interface MirrorFrameProps {
  children: React.ReactNode;
}

function readScreensaverTimeoutMs(hasVideo: boolean): number {
  try {
    const raw = localStorage.getItem(SCREENSAVER_TIMEOUT_KEY);
    if (raw === null || raw === "") {
      return hasVideo ? DEFAULT_SCREENSAVER_TIMEOUT_MS : 0;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return hasVideo ? DEFAULT_SCREENSAVER_TIMEOUT_MS : 0;
  }
}

const MirrorFrame = ({ children }: MirrorFrameProps) => {
  const [scale, setScale] = useState(1);
  const [isLocked, setIsLocked] = useState(true);
  const [isCheckingAccessCode, setIsCheckingAccessCode] = useState(false);
  const [screensaverVideo, setScreensaverVideo] = useState<string | null>(null);
  const [screensaverTimeoutMs, setScreensaverTimeoutMs] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  const pathWithoutLocale = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    if (parts[0] && locales.includes(parts[0])) {
      const rest = parts.slice(1).join("/");
      return rest ? `/${rest}` : "/";
    }
    return path || "/";
  };

  const syncScreensaverFromStorage = () => {
    const salon = getStoredSalon();
    const video = salon?.screensaver_video?.trim() || null;
    setScreensaverVideo(video);
    setScreensaverTimeoutMs(readScreensaverTimeoutMs(Boolean(video)));
  };

  const getCurrentSalon = async () => {
    setIsCheckingAccessCode(true);
    try {
      const response = await axiosClient.get(CURRENT_SALON_URL);
      if (response.status == 200) {
        console.log("CURRENT SALON RESPONSE ", response.data);
        const data = response.data;
        if (data?.data && typeof data.data === "object") {
          persistCurrentSalon(data.data);
          applySalonTheme();
        }
        const inputAvailable = data.data.input_box_available;
        const showQuestions = data.data.show_questions;
        localStorage.setItem(SALON_LOGO_KEY, data.data.logo_image);
        localStorage.setItem(SHOW_QUESTIONS_KEY, showQuestions);

        if (inputAvailable) {
          // setInputBoxAvailable(inputAvailable);
          localStorage.setItem(INPUT_AVAILABLE_KEY, inputAvailable);
        }

        const video =
          typeof data.data?.screensaver_video === "string"
            ? data.data.screensaver_video.trim()
            : "";
        setScreensaverVideo(video || null);
        setScreensaverTimeoutMs(readScreensaverTimeoutMs(Boolean(video)));

        setIsLocked(false);
      } else {
        setIsLocked(true);
      }
    } catch (error) {
      console.error("Error verifying access code:", error);
      setIsLocked(true);
    } finally {
      setIsCheckingAccessCode(false);
    }
  };

  useEffect(() => {
    if (isLocked) return;
    syncScreensaverFromStorage();
  }, [isLocked, pathname]);

  useEffect(() => {
    const updateScale = () => {
      const targetAspectRatio = 1080 / 1920;
      const currentAspectRatio = window.innerWidth / window.innerHeight;

      if (currentAspectRatio > targetAspectRatio) {
        // Window is wider than target ratio, scale based on height
        console.log(
          "setting scale height ",
          document.documentElement.clientHeight,
          document.documentElement.clientHeight / 1920
        );
        setScale(document.documentElement.clientHeight / 1920);
      } else {
        // Window is taller than target ratio, scale based on width
        console.log(
          "setting scale width ",
          document.documentElement.clientWidth,
          document.documentElement.clientWidth / 1080
        );

        setScale(document.documentElement.clientWidth / 1080);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    applySalonTheme();
    getCurrentSalon();
  }, []);

  useEffect(() => {
    return installGlobalButtonClickSound();
  }, []);

  return (
    <div
      className="bg-bv-ground text-bv-ink w-[1000px] md:w-[1080px] absolute top-0 left-1/2 overflow-scroll"
      style={{
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: "top center",
        height: "1920px",
      }}
    >
      {isLocked && (
        <Login
          onLogin={() => {
            if (pathWithoutLocale(pathname) === "/camera-setup") {
              router.replace("/");
            }
            void getCurrentSalon();
          }}
        />
      )}
      {!isLocked && (
        <>
          {children}
          <ScreenSaver
            videoSrc={screensaverVideo}
            timeoutMs={screensaverTimeoutMs}
          />
        </>
      )}
      <ToastContainer />
    </div>
  );
};

export default MirrorFrame;
