/**
 * Monthly document reference numbers (invoices SP-*, quotes QT-*).
 * Sequence persisted per calendar month: localStorage key selpic_{prefix}_seq_YYYY_MM (e.g. selpic_sp_seq_2026_03).
 */

export type InvoiceDocPrefix = 'SP' | 'QT'

function normalizePrefix(prefix: string): InvoiceDocPrefix {
  const p = prefix.trim().toUpperCase()
  if (p !== 'SP' && p !== 'QT') {
    throw new Error(`invoiceRefNumber: unsupported prefix "${prefix}" (expected SP or QT)`)
  }
  return p
}

/** localStorage key for the running sequence in a given month */
export function monthlySequenceStorageKey(prefix: string, year: number, monthMm: string): string {
  const p = normalizePrefix(prefix)
  return `selpic_${p.toLowerCase()}_seq_${year}_${monthMm}`
}

/** Display placeholder until download/send allocates a real number: PREFIX-YYYY-MM-000 */
export function getMonthlyPlaceholder(prefix: string): string {
  const p = normalizePrefix(prefix)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${p}-${year}-${month}-000`
}

/** Increment monthly counter and return the next document id (mutates localStorage). */
export function allocateNextMonthlyDocNumber(prefix: string): string {
  if (typeof window === 'undefined') {
    return getMonthlyPlaceholder(prefix)
  }
  const p = normalizePrefix(prefix)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const key = monthlySequenceStorageKey(p, year, month)
  try {
    const raw = window.localStorage.getItem(key)
    const currentValue = Number(raw || '0')
    const nextValue = Number.isFinite(currentValue) ? currentValue + 1 : 1
    window.localStorage.setItem(key, String(nextValue))
    return `${p}-${year}-${month}-${String(nextValue).padStart(3, '0')}`
  } catch {
    return `${p}-${year}-${month}-001`
  }
}

const LEGACY_SP = 'SP-2025-001'
const LEGACY_QT = 'QT-2025-001'

/**
 * If `current` is this month's placeholder or the legacy default (SP-2025-001 / QT-2025-001), allocate
 * the next sequential number; otherwise return `current` unchanged.
 */
export function ensureMonthlyDocNumber(prefix: string, current: string): string {
  if (typeof window === 'undefined') return current
  const p = normalizePrefix(prefix)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const placeholder = `${p}-${year}-${month}-000`
  const legacyDefault = p === 'SP' ? LEGACY_SP : LEGACY_QT
  if (current !== placeholder && current !== legacyDefault) return current
  return allocateNextMonthlyDocNumber(p)
}
