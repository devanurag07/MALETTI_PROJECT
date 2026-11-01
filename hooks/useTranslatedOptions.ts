import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { translateText } from '@/utils/translate';
import { AGE_GROUP_OPTIONS } from '@/core/utils/options';

export function useTranslatedAgeGroupOptions() {
    const locale = useLocale();
    const [translatedOptions, setTranslatedOptions] = useState(AGE_GROUP_OPTIONS);

    useEffect(() => {
        const translateOptions = async () => {
            const translated = await Promise.all(
                AGE_GROUP_OPTIONS.map(async (option) => ({
                    ...option,
                    label: await translateText(option.label, locale)
                }))
            );
            setTranslatedOptions(translated);
        };

        translateOptions();
    }, [locale]);

    return translatedOptions;
}
