"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { studioApi, type Results } from "../api";
import { useAllShades, useCatalog, useStudio } from "../context/StudioContext";
import { SERVICE_MODULE, SERVICE_TRY, type Service } from "../flows";
import { saveLookDraft } from "../save-look";
import { markingsOf, SkinMapPhoto, SKIN_METRICS } from "../components/SkinMap";
import { ActionBar, c, CompareArch, ErrorLine, H1, ICON, LoadingStage, Muted, PrimaryButton, Screen, SERIF } from "../ui";

const SERVICES: Service[] = ["hairstyle", "beard", "colour", "armocromia", "makeup", "skin"];

/**
 * Simple Service, last page: the result of the ONE service the customer picked (try-on before/after + the chosen
 * style, or the season / skin result), then See your report or Try another service. Nothing else.
 */
export default function SimpleResultScreen() {
  const router = useRouter();
  const raw = useSearchParams().get("s");
  const service = (SERVICES.includes(raw as Service) ? raw : "hairstyle") as Service;
  const { t, tx, config, session, setSession, look, photo } = useStudio();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cuts = useCatalog("haircut");
  const shades = useAllShades(); // backend + FLUX_VERSION_3 colours
  const looks = useCatalog("makeup_look");
  const beards = useCatalog("beard_style");

  useEffect(() => {
    if (session) studioApi.results(session.id).then(setResults).catch(() => {});
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config || !session) return <LoadingStage />;
  const kind = SERVICE_TRY[service];
  const layer = kind ? look.layers[kind] : null;
  const a = results?.tabs.find((x) => x.module === SERVICE_MODULE[service] && x.status === "done");
  const chosen = kind === "cut" ? cuts.find((x) => x.key === look.cut)
    : kind === "colour" ? shades.find((x) => x.key === look.hair_shade)
    : kind === "makeup" ? looks.find((x) => x.key === look.makeup_look)
    : kind === "beard" ? beards.find((x) => x.key === look.beard) : undefined;

  async function report() {
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      setSession(await saveLookDraft(session, look));
      router.push("/report");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <Screen animKey={`simple-result-${service}`}>
      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 4, padding: "18px 34px 0 34px" }}>
        <span style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: c("accent") }}>{t("journey", `${service}.name`)}</span>
        <H1 size={34}>
          {kind ? (chosen ? tx(chosen.name) : layer ? t("tryon", "yourPhoto") : t("simple", "noChange")) : tx(a?.label?.name) || t("journey", `${service}.name`)}
        </H1>
        {!kind && a ? <Muted size={14}>{tx(a.summary) || tx(a.label?.desc)}</Muted> : null}
      </div>

      <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, padding: "10px 34px 0" }}>
        {kind ? (
          <CompareArch before={photo} after={layer?.output_url ?? null} height={420} ry={180} />
        ) : service === "skin" && a ? (
          <>
            <div style={{ alignSelf: "center" }}>
              <SkinMapPhoto src={photo} markings={markingsOf(a.zones)} size={260} style={{ outline: `1.5px solid ${c("accent")}`, outlineOffset: 5 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SKIN_METRICS.filter((k) => k in a.metrics).map((k) => {
                const n = Math.max(0, Math.min(100, Number(a.metrics[k] ?? 0)));
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 110, fontSize: 14 }}>{t("skin", `metric_${k}`)}</span>
                    <span style={{ flex: "1 1 auto", height: 6, borderRadius: 3, background: c("track"), overflow: "hidden" }}>
                      <span style={{ display: "block", height: 6, width: `${n}%`, background: c(n >= 70 ? "metric-cool" : n >= 40 ? "metric-warm" : "metric-neutral") }} />
                    </span>
                    <span style={{ width: 30, textAlign: "right", ...SERIF, fontSize: 18 }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : service === "armocromia" && a ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {((a.label?.attributes?.palette as string[] | undefined) ?? []).slice(0, 8).map((hex, i) => (
              <span key={`${hex}-${i}`} style={{ display: "block", width: 54, height: 54, background: hex, transform: "skewX(var(--mm-skew))", boxShadow: c("shadow-swatch") }} />
            ))}
          </div>
        ) : null}
      </div>

      <ErrorLine message={error} />
      <ActionBar link={{ label: t("simple", "another"), onClick: () => router.push("/service") }}>
        <PrimaryButton iconRight={ICON.next} disabled={saving} onClick={report}>{t("simple", "report")}</PrimaryButton>
      </ActionBar>
    </Screen>
  );
}
