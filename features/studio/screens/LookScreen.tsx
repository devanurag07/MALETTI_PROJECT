"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { studioApi, type I18n } from "../api";
import { catalogKey, useStudio } from "../context/StudioContext";
import { theme } from "../theme";
import { c, CompareArch, Diamond, ErrorLine, H1, Icon, ICON, LoadingStage, PrimaryButton, Screen } from "../ui";

const absolute = (url: string | null) => (!url ? "" : url.startsWith("http") ? url : `${window.location.origin}${url}`);

/** Step 6 — Your look today: before/after, summary, products, QR / e-mail / send to stylist. */
export default function LookScreen() {
  const router = useRouter();
  const { t, tx, config, session, setSession, look, gender, resetAll, photo } = useStudio();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sent, setSent] = useState(false);
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
        const s = await studioApi.saveLook(session.id, {
          // An uploaded style ("your photo") has no catalog item: the try-on image is the result.
          cut: catalogKey(look.cut),
          hair_shade: catalogKey(look.hair_shade),
          technique: catalogKey(look.hair_shade) ? look.technique : null,
          makeup_look: catalogKey(look.makeup_look),
          lip: look.lip,
          eye: look.eye,
          beard: catalogKey(look.beard),
          params: look.params,
          products: look.products,
          final_tryon_id: look.lastTryon?.status === "done" ? look.lastTryon.id : null,
          headline,
        });
        setSession(s);
        setSaved(true);
        if (config.share_channels.includes("qr")) {
          const share = await studioApi.share(session.id, { channel: "qr" });
          setQrUrl(absolute(share.url));
        }
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.client.slug, session?.id]);

  if (!config || !session) return <LoadingStage />;
  const s = session.look;
  const none = t("look", "none");
  const third = gender === "man"
    ? { key: "beard", label: t("look", "beard"), value: tx(s?.beard?.name), hex: c("ink") }
    : {
        key: "makeup", label: t("look", "makeup"),
        value: tx(s?.makeup_look?.name) || [tx(s?.lip?.name), tx(s?.eye?.name)].filter(Boolean).join(", "),
        hex: s?.lip?.hex ?? (s?.makeup_look?.attributes.lip_hex as string | undefined) ?? c("accent"),
      };
  const items = [
    { key: "cut", label: t("look", "cut"), value: tx(s?.cut?.name), hex: c("ink") },
    {
      key: "colour", label: t("look", "colour"),
      value: s?.hair_shade ? `${tx(s.hair_shade.name)}${s.technique ? `, ${tx(s.technique.name).toLowerCase()}` : ""}` : "",
      hex: s?.hair_shade?.hex ?? c("ink"),
    },
    third,
  ];
  const productsFor = (area: "skin" | "hair") =>
    (s?.products ?? []).filter((p) => p.area === area).map((p) => tx(p.name)).join(", ");
  const skinProducts = productsFor("skin");
  const hairProducts = productsFor("hair");
  const canStylist = config.share_channels.includes("stylist");
  const canEmail = config.share_channels.includes("email");

  async function send(channel: "email" | "stylist") {
    if (!session) return;
    setError(null);
    try {
      await studioApi.share(session.id, channel === "email" ? { channel, email } : { channel });
      if (channel === "stylist") setSent(true);
      else setEmailSent(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function newSession() {
    if (session) await studioApi.complete(session.id).catch(() => {});
    resetAll();
    router.replace("/");
  }

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
        {/* Skin: what the customer added from the AI picks · Hair: AI picks for the chosen hair look */}
        <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {[["productsTitle", skinProducts], ["hairProductsTitle", hairProducts]].map(([title, list]) => (
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
          <span style={{ fontSize: 14, lineHeight: 1.35 }}>{emailSent ? `✓ ${t("look", "emailSent")} ${email}` : t("look", "qr")}</span>
          {canEmail ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailSent(false); }}
                aria-label={t("look", "email")} placeholder={t("look", "emailPh")}
                style={{
                  flex: "1 1 auto", minWidth: 0, height: 44, borderRadius: 22, border: `1px solid ${c("line-strong")}`, background: c("surface-raised"),
                  color: c("ink"), fontFamily: "inherit", fontSize: 14, padding: "0 16px", boxSizing: "border-box", outline: "none",
                }}
              />
              <button type="button" aria-label={t("look", "sendEmail")} disabled={!saved || !email.includes("@")} onClick={() => send("email")} style={{
                flex: "0 0 auto", width: 44, height: 44, borderRadius: 22, border: `1px solid ${c("line-strong")}`, background: "transparent",
                color: c("ink"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                opacity: !saved || !email.includes("@") ? 0.45 : 1,
              }}>
                <Icon d={ICON.send} size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <ErrorLine message={error} />

      <div style={{ flex: "0 0 auto", padding: "12px 34px 30px 34px", display: "flex", flexDirection: "column", gap: 10 }}>
        {sent ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}>
            <Diamond size={10} />
            <span>{t("look", "sentNote")}</span>
          </div>
        ) : null}
        {canStylist && !sent ? (
          <PrimaryButton onClick={() => send("stylist")} disabled={!saved}>{t("look", "send")}</PrimaryButton>
        ) : (
          <PrimaryButton onClick={newSession}>{t("look", "newSession")}</PrimaryButton>
        )}
      </div>
    </Screen>
  );
}
