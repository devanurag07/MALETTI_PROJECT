"use client";

import { useCallback, useEffect, useState } from "react";
import { studioApi, type Session, type Share } from "../api";
import { useStudio } from "../context/StudioContext";
import { c, Card, CompareArch, Diamond, H1, H2, Muted, PrimaryButton, Screen } from "../ui";

type InboxItem = Share & { session: Session };

/** Stylist tablet: same salon login, polls for looks sent from the mirror. */
export default function StylistScreen() {
  const { t, tx } = useStudio();
  const [items, setItems] = useState<InboxItem[]>([]);

  const load = useCallback(() => studioApi.stylistInbox().then(setItems).catch(() => {}), []);
  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const first = items[0];
  const look = first?.session.look;
  const parts = look
    ? [look.cut, look.hair_shade, look.technique, look.makeup_look, look.lip, look.eye, look.beard].filter(Boolean).map((i) => tx(i!.name))
    : [];

  return (
    <Screen onBack={false}>
      <div style={{ flex: "0 0 auto", padding: "18px 34px 0 34px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <H1 size={34}>{t("stylist", "title")}</H1>
        <span style={{ fontSize: 13, color: c("ink-muted") }}>{t("stylist", "waiting", { n: items.length })}</span>
      </div>
      {!first ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
          <Muted size={16}>{t("stylist", "empty")}</Muted>
        </div>
      ) : (
        <>
          <div style={{ flex: "0 0 auto", padding: "10px 34px 0 34px" }}>
            <Muted size={14}>
              {first.session.started_at ? new Date(first.session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              {" · "}{tx(look?.headline) || t("profile", first.session.gender)}
            </Muted>
          </div>
          <CompareArch before={first.session.source_image_url} after={look?.after_url ?? null} height={360} ry={160} />
          <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 10, padding: "18px 34px 0 34px" }}>
            <Card>
              <H2 size={20}>{t("look", "title")}</H2>
              {parts.map((p) => (
                <span key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}><Diamond size={9} />{p}</span>
              ))}
              {look?.products.length ? (
                <span style={{ fontSize: 13, color: c("ink-muted") }}>{t("look", "productsTitle")}: {look.products.map((p) => tx(p.name)).join(", ")}</span>
              ) : null}
            </Card>
          </div>
          <div style={{ flex: "0 0 auto", padding: "12px 34px 32px 34px" }}>
            <PrimaryButton onClick={() => studioApi.stylistAck(first.id).then(load)}>{t("stylist", "start")}</PrimaryButton>
          </div>
        </>
      )}
    </Screen>
  );
}
