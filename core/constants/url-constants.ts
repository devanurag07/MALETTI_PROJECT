/** Prefer env so local PDF rendering can hit the same Django as the admin app. */
// export const BASE_URL = "http://localhost:8000/api";
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.trymystyle.com/api";
// export const BASE_URL = "https://testing-api.trymystyle.com/api";
// process.env.NEXT_PUBLIC_API_URL ?? "https://api.trymystyle.com/api";
// export const BASE_URL = "https://api.trymystyle.co.in/api";
// Local override example: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api

//export const BASE_URL = "http://localhost:8000/api"
export const LOGIN_URL = `${BASE_URL}/auth/login/`;
export const CHECK_AUTH_URL = "auth/check-auth/";
export const CHANGE_HAIRSTYLE_URL = "salon/mirror/hairstyle-change/";
export const CHANGE_MAKEUP_URL = "salon/makeup/change/";
export const MAKEUP_LOOK_ADVISOR_URL = "salon/makeup/look-advisor/";
// query params sessionId
export const GET_RESULTS_URL = (sessionId: string) =>
  `salon/mirror/results/?session_id=${sessionId}`;
export const FETCH_RESULTS_URL = "salon/mirror/results/";
export const CHECK_FOR_RESULT_URL = "salon/mirror/check-for-result/";
export const ANALYZE_SKIN_URL = "skin/analyze/";

export const CURRENT_SALON_URL = "salon/current";
export const SALON_NOTIFICATIONS_URL = "salon/notifications/";
export const salonNotificationMarkReadUrl = (id: number | string) =>
  `salon/notifications/${id}/mark-read/`;

// comment
// skin analysis
export const SKIN_ANALYSIS_URL = "skin/analyze/";
export const SKIN_VISUALIZATION_URL = "skin/visualization/";

// hair analysis
export const HAIR_ANALYSIS_URL = "salon/mirror/deep-hair-analysis/";

//hairstyle-recommender
export const RECOMMEND_HAIRSTYLE_URL = "salon/mirror/recommend-hairstyle/";
//recommend-haircolor
export const RECOMMEND_HAIRCOLOR_URL = "salon/mirror/recommend-haircolor/";
// haircut pool (name + prompt), shared by Custom Look and the recommender
export const HAIRCUT_POOL_URL = "salon/mirror/haircut-pool/";

//comment 2
// product recommendations
export const RECOMMEND_HAIR_PRODUCTS_URL = "salon/recommend-hair-products/";
export const RECOMMEND_SKIN_PRODUCTS_URL = "salon/recommend-skin-products/";
export const SALON_PRODUCTS_URL = "salon/products/";
export const SALON_PAYMENT_STATUS_URL = "salon/payment-status/";

// service recommendations
export const SALON_SERVICES_URL = "salon/services/";

// customer sessions (Bridal / Function-Ready / Makeover) — Django app `customer_session`
export const CUSTOMER_SESSIONS_URL = "customer-session/sessions/";
// Pair-rule salon treatment recommendation (one area per call).
export const RECOMMEND_TREATMENT_URL = "customer-session/recommend-treatment/";
export const customerSessionUrl = (id: number | string) =>
  `customer-session/sessions/${id}/`;
export const customerSessionStepUrl = (id: number | string, step: string) =>
  `customer-session/sessions/${id}/steps/${step}/`;
export const customerSessionCompleteUrl = (id: number | string) =>
  `customer-session/sessions/${id}/complete/`;
export const customerSessionReportTokenUrl = (id: number | string) =>
  `customer-session/sessions/${id}/report-token/`;
export const CUSTOMER_SESSION_REPORT_URL = "customer-session/report/";
export const CLOTHING_CATEGORIES_URL = "customer-session/clothing/categories/";
export const CLOTHING_ITEMS_URL = "customer-session/clothing/items/";
export const CLOTHING_CATALOGUE_TRYON_URL = "customer-session/clothing/tryon/";
// AI picks from the predefined bridal / function makeup looks.
export const BRIDAL_LOOKS_RECOMMEND_URL = "customer-session/makeup/bridal-looks/";
