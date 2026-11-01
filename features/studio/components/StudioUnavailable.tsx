"use client";

import { useEffect, useState } from "react";
import { getStoredSalon } from "@/core/utils/salon-storage";
import { logoutMirror } from "@/features/auth/utils/logout";
import type { StudioApiError } from "../api";
import { theme } from "../theme";
import { c, H1, Icon, Muted, OutlineButton, PrimaryButton, Stage } from "../ui";

/**
 * Full-screen page shown when the Studio config can't load. Rendered outside the Studio context
 * (no config = no header / language toggle), so its copy lives here.
 */
const COPY = {
  en: {
    disabledTitle: "Studio isn't enabled for this salon",
    disabledBody:
      "This mirror is signed in, but the salon isn't linked to a Studio client yet. Ask your administrator to enable Studio for it in the admin panel, or sign in with a different salon code.",
    offlineTitle: "Can't reach the server",
    offlineBody: "Check the mirror's internet connection and try again.",
    errorTitle: "Something went wrong",
    errorBody: "The Studio configuration couldn't be loaded. Try again in a moment.",
    salon: "Salon",
    retry: "Try again",
    logout: "Sign in with another salon",
  },
  it: {
    disabledTitle: "Studio non è attivo per questo salone",
    disabledBody:
      "Lo specchio è collegato, ma il salone non è ancora associato a un cliente Studio. Chiedi all'amministratore di attivare Studio dal pannello di amministrazione, oppure accedi con un altro codice salone.",
    offlineTitle: "Impossibile raggiungere il server",
    offlineBody: "Controlla la connessione internet dello specchio e riprova.",
    errorTitle: "Si è verificato un errore",
    errorBody: "Non è stato possibile caricare la configurazione Studio. Riprova tra poco.",
    salon: "Salone",
    retry: "Riprova",
    logout: "Accedi con un altro salone",
  },
} as const;

const ICONS = {
  disabled: "M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z M4 4l16 16",
  offline: "M2 8.5a15 15 0 0 1 20 0 M5.5 12a10 10 0 0 1 13 0 M9 15.5a5 5 0 0 1 6 0 M12 19h.01 M3 3l18 18",
  error: "M12 8v5 M12 16.5h.01 M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
};

export default function StudioUnavailable({ error, locale, onRetry }: {
  error: StudioApiError; locale: string; onRetry: () => void;
}) {
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [salon, setSalon] = useState<{ name?: string; code?: string } | null>(null);
  useEffect(() => setSalon(getStoredSalon()), []);

  // 401 = token no longer valid: back to the salon login, like the rest of the template.
  useEffect(() => {
    if (error.status === 401) logoutMirror();
  }, [error.status]);

  const kind = error.status === 403 ? "disabled" : error.status === null ? "offline" : "error";
  const title = kind === "disabled" ? copy.disabledTitle : kind === "offline" ? copy.offlineTitle : copy.errorTitle;
  const body = kind === "disabled" ? copy.disabledBody : kind === "offline" ? copy.offlineBody : copy.errorBody;

  return (
    <Stage>
      <div style={{ flex: "0 0 auto", height: 88, display: "flex", alignItems: "center", justifyContent: "center", background: c("header"), borderBottom: `1px solid ${c("header-line")}` }}>
        <img src={theme.brand.logo} alt={theme.brand.name} style={{ height: theme.brand.logoHeight }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: "0 44px", textAlign: "center" }}>
        <div style={{ position: "relative", width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ position: "absolute", left: 10, top: 10, width: 72, height: 72, border: `1.5px solid ${c("accent")}`, transform: "skewX(var(--mm-skew))" }} />
          <Icon d={ICONS[kind]} size={32} width={1.4} style={{ position: "relative" }} />
        </div>
        <H1 size={34}>{title}</H1>
        <Muted size={15} style={{ lineHeight: 1.55 }}>{body}</Muted>
        {salon?.name || salon?.code ? (
          <div style={{ width: "100%", padding: "12px 16px", borderRadius: 18, background: c("surface"), border: `1px solid ${c("line")}` }}>
            <div style={{ fontSize: 12, color: c("ink-muted") }}>{copy.salon}</div>
            <div style={{ fontSize: 18 }}>
              {salon.name}
              {salon.code ? <span style={{ color: c("ink-muted") }}> · {salon.code}</span> : null}
            </div>
          </div>
        ) : null}
        {kind !== "disabled" && error.message ? <code style={{ fontSize: 11, color: c("ink-faint") }}>{error.message}</code> : null}
      </div>
      <div style={{ flex: "0 0 auto", padding: "0 34px 34px", display: "flex", flexDirection: "column", gap: 10 }}>
        <PrimaryButton onClick={onRetry}>{copy.retry}</PrimaryButton>
        <OutlineButton onClick={logoutMirror}>{copy.logout}</OutlineButton>
      </div>
    </Stage>
  );
}
