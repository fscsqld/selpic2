import { translations } from './translations'

/** Admin UI copy is always English — ignores storefront `language` in Zustand. */
export function useAdminTranslation() {
  const t = (key: string) => {
    const keys = key.split('.')
    let value: unknown = translations.en

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key
      }
    }

    return typeof value === 'string' ? value : key
  }

  return { t, language: 'en' as const }
}
