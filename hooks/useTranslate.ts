import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { translateText } from '@/utils/translate'

interface TranslateResult {
    translatedText: string
    isLoading: boolean
}

/**
 * Custom hook for translating text with loading state
 * @param text - Text to translate
 * @returns Object containing translated text and loading state
 */
export function useTranslate(text: string): TranslateResult {
    const locale = useLocale()
    const [translatedText, setTranslatedText] = useState(text)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const translate = async () => {
            if (!text) {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            const result = await translateText(text, locale)
            setTranslatedText(result)
            setIsLoading(false)
        }

        translate()
    }, [text, locale])

    return { translatedText, isLoading }
}

/**
 * Custom hook for translating multiple texts with loading state
 * @param texts - Object with keys and text values to translate
 * @returns Object containing translated texts and loading state
 */
export function useTranslateMultiple<T extends Record<string, string>>(
    texts: T
): { translations: T; isLoading: boolean } {
    const locale = useLocale()
    const [translations, setTranslations] = useState<T>(texts)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const translate = async () => {
            if (!texts || Object.keys(texts).length === 0) {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            const translatedEntries = await Promise.all(
                Object.entries(texts).map(async ([key, value]) => {
                    const translated = await translateText(value, locale)
                    return [key, translated]
                })
            )

            setTranslations(Object.fromEntries(translatedEntries) as T)
            setIsLoading(false)
        }

        translate()
    }, [JSON.stringify(texts), locale])

    return { translations, isLoading }
}
