import { useStore } from './store'
import { translations } from './translations'
import { useEffect } from 'react'

export function useTranslation() {
  const { language } = useStore()
  const currentLanguage = language || 'en' // Default to English
  
  // Debug language changes
  useEffect(() => {
    console.log('🌐 useTranslation hook - language changed to:', currentLanguage)
  }, [currentLanguage])
  
  const t = (key: string) => {
    const keys = key.split('.')
    // Try current language first, fallback to English
    let value: any = translations[currentLanguage]
    
    // Navigate through the translation object
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Fallback to English if translation not found in current language
        value = translations['en']
        for (const k2 of keys) {
          if (value && typeof value === 'object' && k2 in value) {
            value = value[k2]
          } else {
            return key // Return key if not found in English either
          }
        }
        return typeof value === 'string' ? value : key
      }
    }
    
    return typeof value === 'string' ? value : key
  }
  
  return { t, language: currentLanguage }
} 