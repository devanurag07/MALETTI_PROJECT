import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

// Function to detect locale from IP geolocation (using request headers) -- comment
async function detectLocaleFromLocation(request: NextRequest): Promise<string> {
  // Try to get country code from Cloudflare header
  const countryCode = request.headers.get('cf-ipcountry');

  // Try Vercel's geolocation headers
  const vercelCountry = request.headers.get('x-vercel-ip-country');

  const country = countryCode || vercelCountry || 'US';

  // Map country codes to supported locales
  const countryToLocaleMap: { [key: string]: string } = {
    'US': 'en',
    'GB': 'en',
    'CA': 'en',
    'AU': 'en',
    'ES': 'es',
    'MX': 'es',
    'AR': 'es',
    'CO': 'es',
    'FR': 'fr',
    'BE': 'fr',
    'CH': 'fr',
    'DE': 'de',
    'AT': 'de',
    'IT': 'it',
    'PT': 'pt',
    'BR': 'pt',
    'JP': 'ja',
    'CN': 'zh',
    'TW': 'zh',
    'HK': 'zh',
    'IN': 'hi',
    'SA': 'ar',
    'AE': 'ar',
    'EG': 'ar',
    'GR': 'el',
    'CY': 'el',
  };

  if (country && countryToLocaleMap[country]) {
    return countryToLocaleMap[country];
  }

  // Fallback to Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(',')[0].split('-')[0];
    if (locales.includes(browserLocale)) {
      return browserLocale;
    }
  }

  return defaultLocale;
}

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  localePrefix: 'as-needed'
});

export default async function middleware(request: NextRequest) {
  // Check if there's already a locale in the URL
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // If no locale in URL and no locale cookie, use default locale
  if (!pathnameHasLocale && !request.cookies.has('NEXT_LOCALE')) {
    // Use default locale instead of detecting from location
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.set('NEXT_LOCALE', defaultLocale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
    return redirectResponse;
  }

  return intlMiddleware(request);
}

export const config = {
  // Skip all paths that should not be internationalized
  matcher: [
    "/((?!api|_next|_vercel|icons|.*\\..*).*)",
  ],
};
