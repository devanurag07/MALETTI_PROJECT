import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const cdnDomain = process.env.NEXT_PUBLIC_CDN_DOMAIN || "trymystyle-pullzone.b-cdn.net";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: cdnDomain },
      { protocol: "https", hostname: "fluxv2-salon-products.s3.us-east-1.amazonaws.com" },
      { protocol: "https", hostname: "api.trymystyle.com" },
      { protocol: "https", hostname: "trymystyle-pullzone.b-cdn.net" },
      { protocol: "https", hostname: "cdn.trymystyle.com" },
      { protocol: "https", hostname: "api.trymystyle.co.in" },
      { protocol: "https", hostname: "tms-api-cdn.b-cdn.net" },
    ],
  },
  // Chromium for the session-report PDF route must stay a server external.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/**": ["node_modules/@sparticuz/chromium/bin/**"],
  },
  output: "standalone",
  // Option pictures / brand assets: cache them in the browser (Next serves public/ with max-age=0 by default, so a
  // fresh page re-asked the server for every tile and the grids opened empty). A day, then refreshed in the background.
  async headers() {
    return [{
      source: "/studio/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
    }];
  },
};

export default withNextIntl(nextConfig);
