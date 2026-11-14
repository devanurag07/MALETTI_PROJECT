"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { studioApi, type I18n } from "../api";
import { catalogKey, useCatalog, useStudio } from "../context/StudioContext";
import { hairColourOf, isFluxShade } from "../data/haircolor";
import { lookParams } from "../save-look";
import { theme } from "../theme";
import { ActionBar, c, CompareArch, Diamond, ErrorLine, H1, Icon, ICON, LoadingStage, PrimaryButton, Screen } from "../ui";
import { useNav, usePrefetch } from "../use-nav";

const absolute = (url: string | null) => (!url ? "" : url.startsWith("http") ? url : `${window.location.origin}${url}`);

/** Step 6 — Your look today: before/after, summary, products, QR / e-mail / send to stylist. */
export default function LookScreen() {
  const router = useRouter();
  const { go, pending } = useNav();
  usePrefetch("/report");
  const { t, tx, config, session, setSession, look, gender, photo } = useStudio();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Save the draft look on the backend, then mint the QR share link.
  useEffect(() => {
    if (!session || !config) return;
    (async () => {
      try {
        let headline: I18n = {};
        if (session.flow === "consultant") {
          const r = await studioApi.results(session.id);
          const colour = r.tabs.find((x) => x.module === "colour")?.label?.name;
          const skin = r.tabs.find((x) => x.module === "skin")?.label?.name;
          headline = Object.fromEntries(
            config.locales.map((l) => [l, [colour?.[l], skin?.[l]?.toLowerCase()].filter(Boolean).join(", ")])
          );
        }
        // The look = what the kept try-on images show: fall back to each kept layer's params if a field is empty.
        const lp = (k: "cut" | "colour" | "makeup" | "beard", f: string) =>
          (look.layers[k]?.params?.[f] as string | undefined) ?? null;
        const cut = look.cut ?? lp("cut", "item");
        const shade = look.hair_shade ?? lp("colour", "shade") ?? lp("colour", "shade_key"); // shade_key = FLUX colour
        const s = await studioApi.saveLook(session.id, {
          // An uploaded style ("your photo") has no catalog item: the try-on image is the result.
          cut: catalogKey(cut),
          // A FLUX_VERSION_3 colour is not a backend catalogue key: saved in params.hair_colour instead.
          hair_shade: isFluxShade(shade) ? null : catalogKey(shade),
          technique: catalogKey(shade) && !isFluxShade(shade) ? look.technique ?? lp("colour", "technique") : null,
          makeup_look: catalogKey(look.makeup_look ?? lp("makeup", "look")),
          lip: look.lip ?? lp("makeup", "lip"),
          eye: look.eye ?? lp("makeup", "eye"),
          beard: catalogKey(look.beard ?? lp("beard", "beard")),
          // Recommended salon skin services ride along in params, so the report (and its PDF) can list them.
          params: lookParams(look, shade),
          products: look.products,
          final_tryon_id: look.lastTryon?.status === "done" ? look.lastTryon.id : null,
          headline,
        });
        setSession(s);
        setSaved(true);
        if (config.share_channels.includes("qr")) {
          const share = await studioApi.share(session.id, { channel: "qr" });
          setQrUrl(absolute(share.url));
          setShareToken(share.token);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.client.slug, session?.id]);

  const techniques = useCatalog("hair_technique");
  if (!config || !session) return <LoadingStage />;
  const s = session.look;
  const fluxColour = hairColourOf(s?.params);
  const fluxTech = techniques.find((x) => x.key === fluxColour?.technique);
  const none = t("look", "none");
  const third = gender === "man"
    ? { key: "beard", label: t("look", "beard"), value: tx(s?.beard?.name), hex: c("ink") }
    : {
        key: "makeup", label: t("look", "makeup"),
        value: tx(s?.makeup_look?.name) || [tx(s?.lip?.name), tx(s?.eye?.name)].filter(Boolean).join(" - "),
        hex: s?.lip?.hex ?? (s?.makeup_look?.attributes.lip_hex as string | undefined) ?? c("accent"),
      };
  const items = [
    { key: "cut", label: t("look", "cut"), value: tx(s?.cut?.name), hex: c("ink") },
    {
      key: "colour", label: t("look", "colour"),
      // Backend colour, else the FLUX_VERSION_3 colour saved in params.hair_colour.
      value: s?.hair_shade ? `${tx(s.hair_shade.name)}${s.technique ? `, ${tx(s.technique.name).toLowerCase()}` : ""}`
        : fluxColour ? `${tx(fluxColour.name)}${fluxTech ? `, ${tx(fluxTech.name).toLowerCase()}` : ""}` : "",
      hex: s?.hair_shade?.hex ?? fluxColour?.hex ?? c("ink"),
    },
    third,
  ];
  // Skin products only: Maletti does no hair analysis, so no hair products.
  const skinProducts = (s?.products ?? []).filter((p) => p.area === "skin").map((p) => tx(p.name)).join(", ");

  return (
    <Screen step={6}>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "16px 34px 0 34px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <H1 size={36}>{t("look", "title")}</H1>
          <p style={{ margin: 0, fontSize: 14, color: c("ink-muted") }}>{tx(s?.headline) || " "}</p>
        </div>
        
      </div>

      <CompareArch before={photo} after={s?.after_url ?? look.lastTryon?.output_url ?? null} height={300} ry={140} />

      <div style={{ flex: "0 0 auto", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, margin: "16px 34px 0 34px" }}>
        {items.map((it) => (
          <button key={it.key} type="button" onClick={() => router.push(`/try/${it.key}?next=/look`)} aria-label={`${t("look", "edit")} ${it.label}`} style={{
            position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, minWidth: 0, height: 80,
            boxSizing: "border-box", padding: "10px 12px", borderRadius: 16, background: c("surface"), border: `1px solid ${c("line")}`,
            color: c("ink"), textAlign: "left", cursor: "pointer",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: c("ink-muted") }}>
              <Diamond size={10} color={it.hex} />
              <span>{it.label}</span>
            </span>
            <span style={{ display: "block", maxHeight: 34, overflow: "hidden", fontSize: 13, lineHeight: 1.3, color: it.value ? c("ink") : c("ink-faint") }}>
              {it.value || none}
            </span>
            <Icon d={ICON.pencil} size={14} width={1.8} stroke="var(--mm-ink-muted)" style={{ position: "absolute", top: 11, right: 11 }} />
          </button>
        ))}
      </div>

      <div style={{
        flex: "0 0 auto", display: "flex", alignItems: "center", gap: 12, margin: "12px 34px 0 34px", padding: "6px 6px 6px 14px",
        borderRadius: 16, background: c("surface"), border: `1px solid ${c("line")}`,
      }}>
        <Icon d={ICON.bottle} size={20} width={1.5} stroke="var(--mm-icon-fg)" />
        {/* Skin: what the customer added from the AI picks */}
        <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {[["productsTitle", skinProducts]].map(([title, list]) => (
            <span key={title} style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, color: c("ink-muted") }}>{t("look", title)}</span>
              <span style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: list ? c("ink") : c("ink-faint") }}>
                {list || (saved ? t("look", "noProducts") : "…")}
              </span>
            </span>
          ))}
        </span>
        {session.flow === "consultant" ? (
          <button type="button" onClick={() => router.push("/results/skin")} style={{
            flex: "0 0 auto", height: 44, padding: "0 12px", background: "none", border: "none", fontSize: 14, color: c("ink"),
            textDecoration: "underline", textUnderlineOffset: 4, cursor: "pointer",
          }}>
            {t("look", "review")}
          </button>
        ) : null}
      </div>

      <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center", gap: 16, margin: "12px 34px 0 34px" }}>
        {qrUrl ? (
          <div style={{ flex: "0 0 auto", width: 78, height: 78, boxSizing: "border-box", padding: 6, borderRadius: 10, background: c("surface-raised"), border: `1px solid ${c("line")}` }}>
            <QRCodeSVG value={qrUrl} size={64} fgColor={theme.colors.ink} bgColor="transparent" />
          </div>
        ) : null}
        <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 14, lineHeight: 1.35 }}>{t("look", "qr")}</span>
        </div>
      </div>
      <ErrorLine message={error} />

      {/* Like beauty_platform: the journey ends on the report page (QR → PDF download). */}
      <ActionBar>
        <PrimaryButton disabled={!saved}
          loading={pending} onClick={() => go(shareToken ? `/report?token=${encodeURIComponent(shareToken)}` : "/report")}>
          {t("report", "cta")}
        </PrimaryButton>
      </ActionBar>
    </Screen>
  );
}
