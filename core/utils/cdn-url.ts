/** Custom CDN that proxies UploadThing so salon Wi‑Fi DNS cannot block utfs.io. */
export const CDN_DOMAIN =
  process.env.NEXT_PUBLIC_CDN_DOMAIN || "trymystyle-pullzone.b-cdn.net";

const UT_ORIGIN = /^https:\/\/(?:utfs\.io|[a-z0-9-]+\.ufs\.sh)/i;

export function toCdnUrl(url: string): string {
  if (!url) return url;
  return url.replace(UT_ORIGIN, `https://${CDN_DOMAIN}`);
}

export function rewriteUtfsUrls<T>(value: T): T {
  if (typeof value === "string") {
    return toCdnUrl(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteUtfsUrls(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = rewriteUtfsUrls(nested);
    }
    return out as T;
  }
  return value;
}
