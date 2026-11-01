/** Deep skin metrics shown only when advanced skin analysis is enabled. */
export const DEEP_SKIN_ANALYSIS_METRICS = new Set([
  "skin_texture",
  "texture",
  "pores",
  "pore",
  "hydration",
  "comedone",
  "comedones",
]);

/** Canonical 6 primary metrics — order matches skin-param6.jpeg (clockwise from top-left). */
export const PRIMARY_SKIN_METRICS_ORDER = [
  "redness",
  "wrinkles",
  "oiliness",
  "pigmentation",
  "dark_circles",
  "acne",
] as const;

/** Extra 4 deep metrics (advanced skin analysis report). */
export const DEEP_SKIN_METRICS_ORDER = [
  "pores",
  "skin_texture",
  "hydration",
  "comedone",
] as const;

/** Full 10-metric order — matches skin-param10.jpeg (clockwise from top-left). */
export const ADVANCED_SKIN_METRICS_ORDER = [
  "skin_texture",
  "comedone",
  "redness",
  "acne",
  "oiliness",
  "pigmentation",
  "dark_circles",
  "hydration",
  "pores",
  "wrinkles",
] as const;

export function normalizeSkinMetricKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_");
}

export function isDeepSkinMetric(name: string): boolean {
  return DEEP_SKIN_ANALYSIS_METRICS.has(normalizeSkinMetricKey(name));
}

export function formatSkinMetricLabel(name: string): string {
  const key = normalizeSkinMetricKey(name);
  const labels: Record<string, string> = {
    acne: "Acne",
    oiliness: "Oiliness",
    redness: "Redness",
    wrinkles: "Wrinkles",
    pores: "Pores",
    pore: "Pores",
    pigmentation: "Pigmentation",
    skin_texture: "Skin Texture",
    texture: "Skin Texture",
    dark_circles: "Dark Circles",
    hydration: "Hydration",
    comedone: "Comedone",
    comedones: "Comedone",
  };
  return (
    labels[key] ??
    name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function filterSkinMetricsForMode<T extends { name: string }>(
  metrics: T[],
  advancedEnabled: boolean,
): T[] {
  if (advancedEnabled) return metrics;
  return metrics.filter((metric) => !isDeepSkinMetric(metric.name));
}

/**
 * Filter + order metrics for the skin report / radar:
 * - advanced → up to 10 params
 * - normal → exactly the 6 primary params (when present)
 */
export function prepareSkinMetricsForReport<T extends { name: string }>(
  metrics: T[],
  advancedEnabled: boolean,
): T[] {
  const byKey = new Map<string, T>();
  for (const metric of metrics) {
    const key = normalizeSkinMetricKey(metric.name);
    // Canonicalize aliases
    const canonical =
      key === "pore"
        ? "pores"
        : key === "texture"
          ? "skin_texture"
          : key === "comedones"
            ? "comedone"
            : key;
    if (!byKey.has(canonical)) {
      byKey.set(canonical, metric);
    }
  }

  const order = advancedEnabled
    ? ADVANCED_SKIN_METRICS_ORDER
    : PRIMARY_SKIN_METRICS_ORDER;

  const ordered: T[] = [];
  for (const key of order) {
    const item = byKey.get(key);
    if (item) ordered.push(item);
  }

  // Include any unexpected extras only in advanced mode (after known order)
  if (advancedEnabled) {
    for (const [key, item] of byKey) {
      if (!(ADVANCED_SKIN_METRICS_ORDER as readonly string[]).includes(key)) {
        ordered.push(item);
      }
    }
  }

  return ordered;
}
