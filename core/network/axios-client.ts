import axios, { type InternalAxiosRequestConfig } from "axios";
import { BASE_URL } from "../constants/url-constants";
import { TOKEN_KEY } from "../constants/common-constants";
import { rewriteUtfsUrls } from "../utils/cdn-url";
import { parse } from "path";

type TimedRequestConfig = InternalAxiosRequestConfig & { __startTime?: number };

const axiosClient = axios.create({
    baseURL: BASE_URL,
});

function logApiDuration(config: TimedRequestConfig | undefined, status: number | string) {
    if (!config || config.__startTime == null) return;
    const ms = Math.round(performance.now() - config.__startTime);
    const method = (config.method ?? "get").toUpperCase();
    const url = config.url ?? "";
    console.log(`[API] ${method} ${url} ${status} ${ms}ms`);
}

axiosClient.interceptors.request.use((config) => {
    (config as TimedRequestConfig).__startTime = performance.now();
    const token = localStorage.getItem(TOKEN_KEY);
    const skip_urls = [
        "/auth/login/",
        "/auth/register/",
        "/auth/forgot-password/",
        "/auth/reset-password/",
        "/auth/verify-email/",
        "/skin/download-report/"
    ];

    // Skip Bearer token if the URL contains token query param (for PDF generation /
    // Puppeteer has no salon localStorage session).
    if (
        config.url?.includes('/skin/report/?token=') ||
        config.url?.includes('hairanalysis-report/?token=')
    ) {
        return config;
    }

    console.log(config.url);

    // Check if the URL matches any skip_urls (works for both relative and absolute URLs)
    const shouldSkipAuth = skip_urls.some(skipUrl =>
        config.url?.includes(skipUrl) ||
        config.url === skipUrl ||
        config.url === BASE_URL + skipUrl
    );

    if (shouldSkipAuth) {
        console.log("Skipping for url ", config.url);
        return config;
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosClient.interceptors.response.use((response) => {
    logApiDuration(response.config as TimedRequestConfig, response.status);
    if (response.data) {
        response.data = rewriteUtfsUrls(response.data);
    }
    return response;
}, (error) => {
    logApiDuration(
        error.config as TimedRequestConfig | undefined,
        error.response?.status ?? "error"
    );
    return Promise.reject(error);
});


export default axiosClient; 
