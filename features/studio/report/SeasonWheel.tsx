"use client";

import { useTranslations } from "next-intl";
import { c } from "../ui";

/**
 * The 12-season colour wheel (armocromia), drawn in code on the dark theme. The season the backend returned
 * (`colour.label.key`) is pulled out with a gold outline and the needle points at it.
 * Order and hues follow the color-harmony report artwork, clockwise from the top.
 */
const WHEEL: { key: string; hex: string }[] = [
  { key: "light_spring", hex: "#C9E27F" },
  { key: "light_summer", hex: "#7FCDB5" },
  { key: "cool_summer", hex: "#9BBFE6" },
  { key: "soft_summer", hex: "#E9A3B5" },
  { key: "soft_autumn", hex: "#EA8A80" },
  { key: "warm_autumn", hex: "#F2B23E" },
  { key: "deep_autumn", hex: "#5B6838" },
  { key: "deep_winter", hex: "#1F5A47" },
  { key: "cool_winter", hex: "#2A4CA8" },
  { key: "bright_winter", hex: "#C8239A" },
  { key: "bright_spring", hex: "#F0435A" },
  { key: "warm_spring", hex: "#F8D03A" },
];

const SIZE = 400;
const C = SIZE / 2;
const R_IN = 108;
const R_OUT = 178;
const STEP = 360 / WHEEL.length;
const START = -105; // first segment centred just left of 12 o'clock, like the artwork
const GAP = 1.6; // degrees between segments

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, d: number, dx = 0, dy = 0) => [C + dx + r * Math.cos(rad(d)), C + dy + r * Math.sin(rad(d))] as const;

function segment(mid: number, push: number) {
  const a0 = mid - STEP / 2 + GAP / 2;
  const a1 = mid + STEP / 2 - GAP / 2;
  const dx = push * Math.cos(rad(mid));
  const dy = push * Math.sin(rad(mid));
  const [x0, y0] = pt(R_OUT, a0, dx, dy);
  const [x1, y1] = pt(R_OUT, a1, dx, dy);
  const [x2, y2] = pt(R_IN, a1, dx, dy);
  const [x3, y3] = pt(R_IN, a0, dx, dy);
  return `M${x0} ${y0} A${R_OUT} ${R_OUT} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${R_IN} ${R_IN} 0 0 0 ${x3} ${y3} Z`;
}

/** Dark text on light segments, light text on dark ones. */
const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
};

export default function SeasonWheel({ season }: { season: string }) {
  const tr = useTranslations("studio.report.harmony.wheel");
  const idx = WHEEL.findIndex((s) => s.key === season);
  const selMid = START + Math.max(idx, 0) * STEP;
  // Needle from the centre to just inside the ring, at the backend's season.
  const [nx, ny] = pt(R_IN - 14, selMid);
  const head = (o: number, r: number) => pt(r, selMid + o);

  return (
    <div style={{ borderRadius: 16, background: c("surface"), border: `1px solid ${c("line")}`, padding: 8 }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" role="img" aria-label={idx >= 0 ? tr(season).replace("\n", " ") : undefined}
        style={{ display: "block", width: "80%", maxWidth: 352, margin: "0 auto" }}>
        {WHEEL.map((s, i) => {
          const mid = START + i * STEP;
          const on = i === idx;
          const push = on ? 10 : 0;
          const [tx, ty] = pt((R_IN + R_OUT) / 2, mid, push * Math.cos(rad(mid)), push * Math.sin(rad(mid)));
          const lines = tr(s.key).split("\n");
          const ink = isLight(s.hex) ? "#1C140E" : "#FFFFFF";
          return (
            <g key={s.key} opacity={idx < 0 || on ? 1 : 0.7}>
              <path d={segment(mid, push)} fill={s.hex}
                stroke={on ? "var(--mm-accent)" : "none"} strokeWidth={on ? 4 : 0} strokeLinejoin="round" />
              <text x={tx} y={ty - (lines.length - 1) * 7} textAnchor="middle" dominantBaseline="middle"
                fill={ink} fontSize={on ? 14 : 12.5} fontWeight={on ? 700 : 600} fontFamily="var(--mm-font-body)">
                {lines.map((l, k) => <tspan key={k} x={tx} dy={k ? 15 : 0}>{l}</tspan>)}
              </text>
            </g>
          );
        })}
        {idx >= 0 ? (
          <g>
            <line x1={C} y1={C} x2={nx} y2={ny} stroke="var(--mm-accent)" strokeWidth={4} strokeLinecap="round" />
            <polygon fill="var(--mm-accent)" points={[pt(R_IN - 4, selMid), head(-9, R_IN - 30), head(9, R_IN - 30)].map(([x, y]) => `${x},${y}`).join(" ")} />
          </g>
        ) : null}
        <circle cx={C} cy={C} r={11} fill="var(--mm-accent)" />
        <circle cx={C} cy={C} r={5} fill="var(--mm-surface)" />
      </svg>
    </div>
  );
}
