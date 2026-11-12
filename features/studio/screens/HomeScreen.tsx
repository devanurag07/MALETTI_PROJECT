"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Settings, ShoppingBag } from "lucide-react";
import NotificationsBell from "@/features/notifications/components/NotificationsBell";
import { theme } from "../theme";
import { useStudio } from "../context/StudioContext";
import { c, Icon, ICON, LoadingStage, SERIF, Stage } from "../ui";

/** Big faint brand parallelograms behind the title (from the Maletti brand guidelines). */
const SHAPES: CSSProperties[] = [
  { left: 120, top: 200, width: 300, height: 290 },
  { left: -60, top: 450, width: 150, height: 260 },
  { right: -40, top: 640, width: 190, height: 150 },
  { left: 110, bottom: -40, width: 210, height: 120 },
];

/** Welcome screen — dark, logo, "AI Mirror Beauty Consultation", one CTA into the camera. */
export default function HomeScreen() {
  const router = useRouter();
  const { t, config } = useStudio();
  const tg = useTranslations();
  if (!config) return <LoadingStage />;

  return (
    <Stage>
      <div style={{
        position: "absolute", inset: 0, background: [
          `radial-gradient(120% 45% at 30% 0%, ${c("home-glow")}, transparent 70%)`,
          `radial-gradient(90% 35% at 100% 100%, ${c("home-glow")}, transparent 70%)`,
          c("home-background"),
        ].join(", "),
      }} />
      {SHAPES.map((s, i) => (
        <div key={i} style={{ position: "absolute", border: `14px solid ${c("home-line")}`, transform: `skewX(${theme.shape.skew})`, ...s }} />
      ))}

      <div style={{ position: "relative", flex: "1 1 auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "26px 40px 34px", textAlign: "center" }}>
        <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div />
          {/* Standard kiosk nav (from FLUX_VERSION_3): notifications, products, camera settings.
              Stage is zoomed ×2, so the FLUX 72px icons become 36px here. */}
          <div className="studio-home-nav" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <NotificationsBell />
            <Link href="/products" aria-label={tg("salonProducts.title")} className="p-4 rounded-full border border-white/15 hover:bg-white/10 transition-colors">
              <ShoppingBag size={72} color="white" />
            </Link>
            <Link href="/camera-setup" aria-label={tg("landing.cameraSettings")} className="p-4 rounded-full border border-white/15 hover:bg-white/10 transition-colors">
              <Settings size={72} color="white" />
            </Link>
          </div>
        </div>
        <style>{`.studio-home-nav > a { padding: 8px !important; } .studio-home-nav svg { width: 36px; height: 36px; }
          .studio-home-nav > a > span { min-width: 18px; height: 18px; font-size: 10px; padding: 0 5px; }`}</style>
        <img src={theme.brand.logo} alt={theme.brand.name} style={{ display: "block", height: 74, width: "auto", marginTop: 14 }} />

        <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 26 }}>
          <h1 style={{ margin: 0, ...SERIF, fontWeight: 700, fontSize: 46, lineHeight: 1.18, color: c("home-ink"), maxWidth: 440 }}>
            {t("home", "title")}
          </h1>
          <p style={{ margin: 0, fontSize: 14, letterSpacing: "0.04em", textTransform: "uppercase", color: c("home-ink-muted") }}>
            {t("home", "sub")}
          </p>
        </div>

        <button type="button" onClick={() => router.push("/capture")} style={{
          width: "100%", maxWidth: 420, height: 60, border: "none", borderRadius: 30, cursor: "pointer",
          background: c("home-cta"), color: c("home-cta-ink"), fontFamily: c("font-body"), fontSize: 17, fontWeight: 500,
          boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
        }}>
          {t("home", "cta")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 16, fontSize: 12, color: c("home-ink-muted") }}>
          <Icon d={ICON.lock} size={12} />
          <span>{t("home", "privacy")}</span>
        </div>
      </div>
    </Stage>
  );
}
