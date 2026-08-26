import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  exportLodgmentPreferences,
  importLodgmentPreferences,
  clearLodgmentPreferences,
  clearBrowserLedgerCaches,
} from './backup-preferences'
import { analyzeBackupPayload, formatBackupFilename, validateBackupPayload } from './backup-schema'
import { BACKUP_SCHEMA_VERSION } from './indexed-db'
import { normalizeWorksheetRecord } from './tax-worksheet-types'
import type { IndividualTaxWorksheetRecord } from './tax-worksheet-types'

function installMemoryLocalStorage() {
  const store = new Map<string, string>()
  const memory = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: memory },
    configurable: true,
    writable: true,
  })
}

installMemoryLocalStorage()

describe('backup-preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('round-trips lodgment preference keys', () => {
    localStorage.setItem('individual_tax_entered_FY2025', JSON.stringify({ IND_SALARY: true }))
    localStorage.setItem('journey_reports_reviewed_individual_FY2025', '1')
    localStorage.setItem('unrelated_key', 'keep')

    const exported = exportLodgmentPreferences()
    expect(exported['individual_tax_entered_FY2025']).toBeDefined()
    expect(exported['journey_reports_reviewed_individual_FY2025']).toBe('1')
    expect(exported['unrelated_key']).toBeUndefined()

    localStorage.clear()
    importLodgmentPreferences(exported)

    expect(localStorage.getItem('individual_tax_entered_FY2025')).toBe(
      JSON.stringify({ IND_SALARY: true })
    )
    expect(localStorage.getItem('journey_reports_reviewed_individual_FY2025')).toBe('1')
    expect(localStorage.getItem('unrelated_key')).toBeNull()
  })

  it('clearLodgmentPreferences removes only lodgment keys', () => {
    localStorage.setItem('ato_lodgment_entered_bas', '{}')
    localStorage.setItem('director_name', 'Jane')
    clearLodgmentPreferences()
    expect(localStorage.getItem('ato_lodgment_entered_bas')).toBeNull()
    expect(localStorage.getItem('director_name')).toBe('Jane')
  })
})

describe('backup-schema', () => {
  it('detects legacy v3 backup missing individual tax fields', () => {
    const analysis = analyzeBackupPayload({
      schemaVersion: 3,
      statements: [],
      cashExpenses: [],
    })
    expect(analysis.isLegacy).toBe(true)
    expect(analysis.warnings.length).toBeGreaterThanOrEqual(3)
    expect(analysis.includesPaymentSummaries).toBe(false)
  })

  it('accepts current v4 backup shape', () => {
    const analysis = analyzeBackupPayload({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      statements: [],
      paymentSummaries: [],
      taxWorksheets: [],
      lodgmentPreferences: {},
    })
    expect(analysis.isCurrent).toBe(true)
    expect(analysis.warnings).toHaveLength(0)
  })

  it('formats filename with schema version', () => {
    const name = formatBackupFilename(new Date('2026-07-03T00:00:00.000Z'))
    expect(name).toBe(`selpic-accounting-backup-v${BACKUP_SCHEMA_VERSION}-2026-07-03.json`)
  })

  it('rejects invalid backup files', () => {
    expect(() => validateBackupPayload(null)).toThrow(/Invalid backup/)
    expect(() => validateBackupPayload({ foo: 1 })).toThrow(/does not look like/)
    expect(() => validateBackupPayload({ statements: [] })).not.toThrow()
  })
})

describe('clearBrowserLedgerCaches', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('clears ledger caches but keeps API keys and director name', () => {
    localStorage.setItem('accounting_transactions', '[]')
    localStorage.setItem('opening_director_loan_balance', '1500')
    localStorage.setItem('payroll_transactions', '[]')
    localStorage.setItem('openai_api_key', 'sk-test')
    localStorage.setItem('director_name', 'Jane')
    localStorage.setItem('individual_tax_entered_FY2025', '{}')

    clearBrowserLedgerCaches()

    expect(localStorage.getItem('accounting_transactions')).toBeNull()
    expect(localStorage.getItem('opening_director_loan_balance')).toBeNull()
    expect(localStorage.getItem('payroll_transactions')).toBeNull()
    expect(localStorage.getItem('individual_tax_entered_FY2025')).toBeNull()
    expect(localStorage.getItem('openai_api_key')).toBe('sk-test')
    expect(localStorage.getItem('director_name')).toBe('Jane')
  })

  it('does not remove payg config (settings)', () => {
    localStorage.setItem('selpic_payg_config', '{"rate":0.1}')
    clearBrowserLedgerCaches()
    expect(localStorage.getItem('selpic_payg_config')).toBe('{"rate":0.1}')
  })
})

describe('normalizeWorksheetRecord on import', () => {
  it('migrates legacy single rental/cgt to arrays', () => {
    const legacy = {
      id: 'tax_worksheet_FY2025',
      financialYear: 'FY2025',
      rental: { grossRent: 12000, otherRentalIncome: 0, advertising: 0, bodyCorporate: 0, borrowingExpenses: 0, cleaning: 0, councilRates: 500, depreciation: 0, insurance: 0, interest: 2000, landTax: 0, legalFees: 0, repairs: 0, waterCharges: 0, otherExpenses: 0 },
      cgt: { capitalProceeds: 50000, costBase: 30000, incidentalCosts: 1000 },
      rentals: [],
      cgtEvents: [],
      updatedAt: '2026-01-01',
    } as IndividualTaxWorksheetRecord

    const { rentals, cgtEvents } = normalizeWorksheetRecord(legacy)
    expect(rentals).toHaveLength(1)
    expect(rentals[0].grossRent).toBe(12000)
    expect(cgtEvents).toHaveLength(1)
    expect(cgtEvents[0].capitalProceeds).toBe(50000)
  })
})
