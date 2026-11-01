const translationCache = new Map<string, string>();

// Map custom locale codes to their Google Translate language codes
const LOCALE_TO_GOOGLE_LANG: Record<string, string> = {
    'tu': 'te', // Telugu (custom locale 'tu' → Google code 'te')
    'el': 'el',
};

export async function translateText(text: string, targetLang: string): Promise<string> {
    // Return original text if target is English
    if (targetLang === 'en') {
        return text;
    }

    // Map locale code to Google Translate code if needed
    const googleLang = LOCALE_TO_GOOGLE_LANG[targetLang] ?? targetLang;

    // Check cache first
    const cacheKey = `${text}:${targetLang}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey)!;
    }

    try {
        const response = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${googleLang}&dt=t&q=${encodeURIComponent(text)}`
        );

        if (!response.ok) {
            console.error('Translation API error:', response.statusText);
            return text;
        }

        const data = await response.json();
        const translatedText = data[0]?.[0]?.[0] || text;

        // Cache the translation
        translationCache.set(cacheKey, translatedText);

        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Fallback to original text
    }
}
