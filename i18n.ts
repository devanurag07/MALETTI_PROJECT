import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'hi', 'ar', 'tu', 'el'];
export const defaultLocale = 'en';

export default getRequestConfig(async ({ requestLocale }) => {
  // Ensure that the locale is valid
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;
  }

  let messages;
  try {
    messages = (await import(`./locales/${locale}.json`)).default;
  } catch {
    messages = (await import(`./locales/${defaultLocale}.json`)).default;
    locale = defaultLocale;
  }

  // Studio labels exist in en/it only; other locales fall back to English for that namespace.
  if (!messages.studio) {
    messages = { ...messages, studio: (await import(`./locales/${defaultLocale}.json`)).default.studio };
  }

  return {
    locale,
    messages,
  };
});
