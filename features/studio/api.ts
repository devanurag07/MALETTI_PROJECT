import axios from "axios";
import axiosClient from "@/core/network/axios-client";
import { renameMakeupLooks } from "./data/makeup";
import { fillFluxHairColour } from "./data/haircolor";
import { BASE_URL } from "@/core/constants/url-constants";

/**
 * Salon-entered picture URL → one the browser can load: trimmed, `//host` and `http://` upgraded to https (an http
 * image is blocked on the https mirror), and a server path (`/media/…`) put on the API host instead of the mirror's.
 */
export function mediaUrl(url: string | null | undefined): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://")) return `https://${u.slice(7)}`;
  if (u.startsWith("/")) return new URL(u, BASE_URL).toString();
  if (!/^(https:|data:|blob:)/.test(u)) return `https://${u}`; // "cdn.example.com/x.jpg"
  return u;
}

/** Studio backend (ADMIN---DJANGO app `studio`), through the template's authenticated axios client. */
const api = axiosClient;

type Envelope<T> = { success: boolean; message: string; data: T; errors: unknown };

/** Error with the HTTP status kept, so screens can tell "not enabled" (403) from "offline" (no status). */
export class StudioApiError extends Error {
  constructor(message: string, readonly status: number | null) {
    super(message);
    this.name = "StudioApiError";
  }
}

async function unwrap<T>(p: Promise<{ data: Envelope<T> }>): Promise<T> {
  try {
    const res = await p;
    // Make-up looks are shown as "Lips - Eyes - Blush" (their FLUX shades) everywhere: renamed once, here.
    // A FLUX colour saved in a look's params shows as its hair colour.
    return fillFluxHairColour(renameMakeupLooks(res.data.data));
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data;
      throw new StudioApiError(body?.message ?? body?.detail ?? err.message, err.response?.status ?? null);
    }
    throw new StudioApiError(String(err), null);
  }
}

// ---------- Types (mirror studio/serializers.py) ----------

export type I18n = Record<string, string>;
export type Gender = "woman" | "man";
export type TryKind = "cut" | "colour" | "makeup" | "beard";

export type CatalogItem = {
  id: number;
  kind: string;
  key: string;
  gender: "woman" | "man" | "all";
  name: I18n;
  sub: I18n;
  hex: string | null;
  image_url: string | null;
  attributes: Record<string, unknown>;
  product?: { id: number; brand: string; price: number; currency: string; image: string | null };
};

export type StudioConfig = {
  client: { slug: string; name: string; logo_url: string | null };
  salon: { id: number; name: string };
  locales: string[];
  default_locale: string;
  theme: Record<string, string>;
  share_channels: ("qr" | "email" | "stylist")[];
  modules: { module: string; status: "active" | "coming_soon" | "off"; config: Record<string, unknown> }[];
  catalog: Record<string, CatalogItem[]>;
  taxonomy: Record<string, { key: string; name: I18n }[]>;
};

export type TryOn = {
  id: number;
  kind: TryKind;
  params: Record<string, unknown>;
  parent_id: number | null;
  status: "pending" | "done" | "failed";
  input_url: string | null;
  output_url: string | null;
  error: string | null;
};

export type Look = {
  cut: CatalogItem | null;
  hair_shade: CatalogItem | null;
  technique: CatalogItem | null;
  makeup_look: CatalogItem | null;
  lip: CatalogItem | null;
  eye: CatalogItem | null;
  beard: CatalogItem | null;
  params: Record<string, unknown>;
  final_tryon: TryOn | null;
  before_url: string | null;
  after_url: string | null;
  headline: I18n;
  /** Skin products the customer added + hair products the AI picked from the salon catalogue. */
  products: (CatalogItem & { source: string; area: "skin" | "hair"; reason: I18n })[];
};

export type Session = {
  id: string;
  flow: string | null;
  gender: Gender;
  locale: string;
  status: string;
  current_step: string;
  source_image_url: string | null;
  started_at?: string;
  look: Look | null;
};

export type Recommendation = CatalogItem & { rank: number; is_best: boolean; reason: I18n };

export type AnalysisTab = {
  module: "skin" | "face" | "colour";
  status: "pending" | "done" | "failed" | "skipped";
  label: { key: string; name: I18n; desc: I18n; attributes: Record<string, unknown> } | null;
  metrics: Record<string, number | string | null>;
  zones: Record<string, boolean>;
  summary: I18n;
  error: string | null;
  recommendations: Record<string, Recommendation[]>;
};

export type Results = { session: Session; tabs: AnalysisTab[] };

/** Public QR / e-mail payload: the session + everything the report needs (analyses, finished try-ons). */
export type PublicReport = Session & {
  client: { name: string; logo_url: string | null; theme: Record<string, string> };
  analyses: AnalysisTab[];
  tryons: TryOn[];
  created_at: string | null;
  /** Report PDF stored in the background by the kiosk (null until it is ready). */
  pdf_url?: string | null;
};

export type Share = {
  id: number;
  channel: "qr" | "email" | "stylist";
  status: string;
  token: string;
  url: string | null;
  email: string | null;
  stylist: { id: number; name: string } | null;
};

export type LookPayload = Partial<{
  cut: string | null;
  hair_shade: string | null;
  technique: string | null;
  makeup_look: string | null;
  lip: string | null;
  eye: string | null;
  beard: string | null;
  params: Record<string, unknown>;
  final_tryon_id: number | null;
  products: string[];
  headline: I18n;
}>;

/** Salon service picked for the skin analysis (`salon/recommend-skin-services/`, the salon's own skin services). */
export type SkinService = {
  id: string;
  title: string;
  description: string;
  image: string;
  price: number | null;
  currency: string | null;
  duration: number | null;
  recommendation_reason: string;
};

// ---------- Endpoints ----------

const RESULTS = new Map<string, Results>();
function keepResults(id: string, r: Results): Results {
  RESULTS.set(id, r);
  return r;
}

export const studioApi = {
  login: (code: string, password: string) =>
    unwrap<{ access_token: string }>(api.post("auth/login/", { code, password })),
  config: (gender?: Gender) => unwrap<StudioConfig>(api.get("studio/config/", { params: { gender } })),
  createSession: (body: { gender?: Gender; locale?: string; flow?: string }) =>
    unwrap<Session>(api.post("studio/sessions/", body)),
  updateSession: (id: string, body: Record<string, unknown>) =>
    unwrap<Session>(api.patch(`studio/sessions/${id}/`, body)),
  uploadPhoto: (id: string, blob: Blob) => {
    const fd = new FormData();
    fd.append("image", blob, "photo.jpg");
    return unwrap<Session>(api.post(`studio/sessions/${id}/photo/`, fd));
  },
  analyze: (id: string) => unwrap<Results>(api.post(`studio/sessions/${id}/analyze/`)).then((r) => keepResults(id, r)),
  results: (id: string) => unwrap<Results>(api.get(`studio/sessions/${id}/results/`)).then((r) => keepResults(id, r)),
  /** Last results fetched for a session (in memory), so going back to a screen shows them at once, no loading. */
  cachedResults: (id: string | null | undefined): Results | null => (id ? RESULTS.get(id) ?? null : null),
  /** Maletti results carry no salon-logo watermark: the API stamps it unless `watermark: false` is sent. */
  /** Every try-on of the session (newest first) — the history on the try-on screen comes from here. */
  tryons: (id: string) => unwrap<TryOn[]>(api.get(`studio/sessions/${id}/tryons/`)),
  tryOn: (id: string, body: { kind: TryKind; params: Record<string, unknown>; parent_id?: number | null; reference?: Blob | null }) => {
    if (!body.reference) return unwrap<TryOn>(api.post(`studio/sessions/${id}/tryons/`, { ...body, watermark: false }));
    // Customer's own style picture → multipart.
    const fd = new FormData();
    fd.append("kind", body.kind);
    fd.append("params", JSON.stringify(body.params));
    if (body.parent_id) fd.append("parent_id", String(body.parent_id));
    fd.append("watermark", "false");
    fd.append("reference", body.reference, "reference.jpg");
    return unwrap<TryOn>(api.post(`studio/sessions/${id}/tryons/`, fd));
  },
  saveLook: (id: string, body: LookPayload) => unwrap<Session>(api.put(`studio/sessions/${id}/look/`, body)),
  share: (id: string, body: { channel: Share["channel"]; email?: string; stylist_id?: number }) =>
    unwrap<Share>(api.post(`studio/sessions/${id}/share/`, body)),
  complete: (id: string) => unwrap<Session>(api.post(`studio/sessions/${id}/complete/`)),
  stylistInbox: () => unwrap<(Share & { session: Session })[]>(api.get("studio/stylist/inbox/")),
  stylistAck: (shareId: number) => unwrap<Share>(api.post(`studio/stylist/inbox/${shareId}/ack/`)),
  /** AI picks from the salon's skin services for this skin analysis (same endpoint as FLUX_VERSION_3). */
  skinServices: (skinAnalysis: unknown) =>
    unwrap<{ recommended_services: SkinService[] }>(api.post("salon/recommend-skin-services/", { skin_analysis: skinAnalysis }))
      .then((d) => (d?.recommended_services ?? []).map((x) => ({
        ...x,
        image: mediaUrl(x.image),
        price: x.price ? x.price : null, // 0 = no price set in the admin: don't show "0"
      }))),
  publicLook: (token: string) =>
    unwrap<PublicReport>(
      api.get(`studio/public/looks/${token}/`)
    ),
  /** Phone page: the customer's name before the PDF download. */
  publicLead: (token: string, name: string) =>
    unwrap<{ name: string; pdf_url: string | null }>(api.post(`studio/public/looks/${token}/lead/`, { name })),
};
