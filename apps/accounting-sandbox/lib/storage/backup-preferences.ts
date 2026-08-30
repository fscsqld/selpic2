/**
 * Collect and restore localStorage keys used for tax lodgment prep (not in IndexedDB).
 */

const LODGMENT_PREFERENCE_PREFIXES = [
  'individual_tax_overrides_',
  'individual_tax_entered_',
  'journey_reports_reviewed_',
  'ato_lodgment_entered_',
  'ato_ctr_options_',
] as const

export function exportLodgmentPreferences(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if (LODGMENT_PREFERENCE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      const value = localStorage.getItem(key)
      if (value !== null) out[key] = value
    }
  }
  return out
}

export function importLodgmentPreferences(prefs: Record<string, string> | undefined): void {
  if (typeof window === 'undefined' || !prefs) return
  for (const [key, value] of Object.entries(prefs)) {
    if (LODGMENT_PREFERENCE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.setItem(key, value)
    }
  }
}

export function clearLodgmentPreferences(): void {
  if (typeof window === 'undefined') return
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && LODGMENT_PREFERENCE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

/**
 * Browser caches that mirror ledger state.
 * Preserves API keys, director name, PIN/setup, and PAYG/business settings.
 */
const LEDGER_CACHE_KEYS = [
  'accounting_transactions',
  'opening_director_loan_balance',
  'payroll_transactions',
  'directors_loans',
  'selpic_pending_orders',
  'selpic_api_orders_response',
  'selpic_incoming_orders_error_log',
  'selpic_failed_orders',
] as const

export function clearBrowserLedgerCaches(): void {
  if (typeof window === 'undefined') return
  for (const key of LEDGER_CACHE_KEYS) {
    localStorage.removeItem(key)
  }
  clearLodgmentPreferences()
}

export { LEDGER_CACHE_KEYS }
