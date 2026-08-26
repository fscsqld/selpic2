/**
 * Client-side journey preferences (localStorage).
 */

export const JOURNEY_PREFS_STORAGE_KEY = 'selpic_journey_preferences'
export const JOURNEY_PREFS_UPDATED_EVENT = 'journeyPreferencesUpdated'
export const CLASSIFICATION_MODE_STORAGE_KEY = 'selpic_classification_mode'

export type ClassificationMode = 'ai' | 'rules_only'

export interface JourneyPreferences {
  /** Individual: no salary/wage income — skip payment summary journey step */
  skipPaymentSummary?: boolean
}

const DEFAULT_PREFS: JourneyPreferences = {
  skipPaymentSummary: false,
}

export function getJourneyPreferences(): JourneyPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS }
  try {
    const raw = localStorage.getItem(JOURNEY_PREFS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function saveJourneyPreferences(prefs: Partial<JourneyPreferences>): JourneyPreferences {
  const next = { ...getJourneyPreferences(), ...prefs }
  if (typeof window !== 'undefined') {
    localStorage.setItem(JOURNEY_PREFS_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(JOURNEY_PREFS_UPDATED_EVENT))
  }
  return next
}

export function getClassificationMode(): ClassificationMode {
  if (typeof window === 'undefined') return 'ai'
  const stored = localStorage.getItem(CLASSIFICATION_MODE_STORAGE_KEY)
  return stored === 'rules_only' ? 'rules_only' : 'ai'
}

export function saveClassificationMode(mode: ClassificationMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CLASSIFICATION_MODE_STORAGE_KEY, mode)
  }
}
