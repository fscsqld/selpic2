import { BACKUP_SCHEMA_VERSION } from './indexed-db'

export interface BackupAnalysis {
  schemaVersion: number
  isCurrent: boolean
  isLegacy: boolean
  label: string
  warnings: string[]
  includesPaymentSummaries: boolean
  includesTaxWorksheets: boolean
  includesLodgmentPreferences: boolean
}

const V4_FIELDS = [
  'paymentSummaries',
  'taxWorksheets',
  'lodgmentPreferences',
] as const

export function analyzeBackupPayload(data: unknown): BackupAnalysis {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const schemaVersion =
    typeof record.schemaVersion === 'number' ? record.schemaVersion : 1

  const warnings: string[] = []
  const includesPaymentSummaries = Array.isArray(record.paymentSummaries)
  const includesTaxWorksheets = Array.isArray(record.taxWorksheets)
  const includesLodgmentPreferences =
    !!record.lodgmentPreferences &&
    typeof record.lodgmentPreferences === 'object' &&
    !Array.isArray(record.lodgmentPreferences)

  if (schemaVersion < BACKUP_SCHEMA_VERSION) {
    if (!includesPaymentSummaries) {
      warnings.push('Payment summaries were not included in this backup.')
    }
    if (!includesTaxWorksheets) {
      warnings.push('Rental/CGT tax worksheets were not included in this backup.')
    }
    if (!includesLodgmentPreferences) {
      warnings.push('ATO lodgment field progress (entered checkboxes) was not included.')
    }
  }

  const isCurrent = schemaVersion >= BACKUP_SCHEMA_VERSION
  const isLegacy = schemaVersion < BACKUP_SCHEMA_VERSION

  return {
    schemaVersion,
    isCurrent,
    isLegacy,
    label: `Backup schema v${schemaVersion}${isCurrent ? ' (current)' : ''}`,
    warnings,
    includesPaymentSummaries,
    includesTaxWorksheets,
    includesLodgmentPreferences,
  }
}

export function formatBackupFilename(date = new Date()): string {
  const day = date.toISOString().split('T')[0]
  return `selpic-accounting-backup-v${BACKUP_SCHEMA_VERSION}-${day}.json`
}

export function validateBackupPayload(data: unknown): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file format')
  }
  const record = data as Record<string, unknown>
  if (!Array.isArray(record.statements) && !Array.isArray(record.cashExpenses)) {
    throw new Error('This file does not look like a SELPIC accounting backup')
  }
}

export { BACKUP_SCHEMA_VERSION, V4_FIELDS }
