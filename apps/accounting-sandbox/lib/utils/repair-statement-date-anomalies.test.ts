import { describe, expect, it } from 'vitest'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'
import { repairStatementDateAnomalies } from '@/lib/utils/repair-statement-date-anomalies'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

describe('OCR / absurd year date repairs', () => {
  it('maps 267-04-08 to 2026-04-08 (not 2067)', () => {
    expect(toIsoDateString('267-04-08')).toBe('2026-04-08')
    expect(toIsoDateString('08/04/267')).toBe('2026-04-08')
    expect(toIsoDateString('2067-04-08')).toBe('2026-04-08')
  })

  it('repairs OCR future year; anonymous 2025 rows stay (no Jason description)', () => {
    const rows = [
      { date: '2026-04-01', id: 'a' },
      { date: '2026-04-15', id: 'b' },
      { date: '2026-05-01', id: 'c' },
      { date: '2026-05-15', id: 'd' },
      { date: '2026-06-01', id: 'e' },
      { date: '2026-06-15', id: 'f' },
      { date: '2025-05-18', id: 'anon' },
      { date: '2067-04-08', id: 'fuel' },
    ]
    const fixed = repairStatementDateAnomalies(rows)
    expect(fixed.find((r) => r.id === 'anon')?.date).toBe('2025-05-18')
    expect(fixed.find((r) => r.id === 'fuel')?.date).toBe('2026-04-08')
  })

  it('repairs Jason Selpic prior-year OCR slip to dominant year (Manual 2026 is correct)', () => {
    const rows = [
      { date: '2026-04-01', description: 'A' },
      { date: '2026-04-15', description: 'B' },
      { date: '2026-05-01', description: 'C' },
      { date: '2026-05-15', description: 'D' },
      { date: '2026-06-01', description: 'E' },
      { date: '2026-06-15', description: 'F' },
      {
        date: '2025-05-18',
        description: 'Jason Selpic',
        id: 'jason',
      },
    ]
    const fixed = repairStatementDateAnomalies(rows)
    expect(fixed.find((r) => r.id === 'jason')?.date).toBe('2026-05-18')
  })

  it('keeps Manual Jason 2026-05-18 (does not pull back to 2025)', () => {
    const rows = [
      { date: '2026-04-01', description: 'A' },
      { date: '2026-04-15', description: 'B' },
      { date: '2026-05-01', description: 'C' },
      { date: '2026-05-15', description: 'D' },
      { date: '2026-06-01', description: 'E' },
      { date: '2026-06-15', description: 'F' },
      {
        date: '2026-05-18',
        description: 'Jason Selpic',
        credit: 1012,
        confidence: 'Manual',
        id: 'jason',
        balance: 8001.72,
      },
    ]
    const fixed = repairStatementDateAnomalies(rows)
    expect(fixed.find((r) => r.id === 'jason')?.date).toBe('2026-05-18')
  })

  it('collapses leftover OCR 2025 Jason when Manual 2026 already exists (no double income)', () => {
    const rows = [
      { date: '2026-04-01', description: 'A' },
      { date: '2026-04-15', description: 'B' },
      { date: '2026-05-01', description: 'C' },
      { date: '2026-05-15', description: 'D' },
      { date: '2026-06-01', description: 'E' },
      { date: '2026-06-15', description: 'F' },
      {
        date: '2025-05-18',
        description: 'Jason Selpic',
        credit: 1012,
        id: 'ocr',
      },
      {
        date: '2026-05-18',
        description: 'Jason Selpic',
        credit: 1012,
        confidence: 'Manual',
        id: 'manual',
        balance: 8001.72,
      },
    ]
    const fixed = repairStatementDateAnomalies(rows)
    const jasons = fixed.filter((r) => r.description === 'Jason Selpic')
    expect(jasons).toHaveLength(1)
    expect(jasons[0].id).toBe('manual')
    expect(jasons[0].date).toBe('2026-05-18')
  })
})

/**
 * User-verified Apr–Jun 2026 company statement amounts (bank debit/credit columns).
 * Categories follow calculateBusinessMetrics inclusion rules.
 */
describe('parsed statement P&L (BAS Q4)', () => {
  const q4Rows = [
    { date: '2026-04-01', description: 'Hanaone Express', debit: 153.2, credit: null, category: 'EXPENSE_FREIGHT_SHIPPING', department: 'cleaning' },
    { date: '2026-04-01', description: 'Mr Jinsoo Kim Loan', debit: null, credit: 500, category: 'LIABILITY_DIRECTORS_LOAN', department: 'cleaning' },
    { date: '2026-04-01', description: 'Mjr', debit: 660, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning' },
    { date: '2026-04-07', description: 'Associated Cleaning', debit: null, credit: 3526.6, category: 'INCOME_SALES_CLEANING', department: 'cleaning' },
    { date: '2026-04-08', description: 'Gravatt East)', debit: 45.59, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-04-09', description: 'Liberty', debit: 84.04, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-04-13', description: 'MJR Enterprise', debit: 528, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning' },
    { date: '2026-04-14', description: 'BP', debit: 61.64, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-04-17', description: 'Hanaone Express', debit: 108, credit: null, category: 'EXPENSE_FREIGHT_SHIPPING', department: 'cleaning' },
    { date: '2026-04-17', description: 'AK Innovation', debit: null, credit: 2112, category: 'INCOME_SALES_CLEANING', department: 'cleaning' },
    { date: '2026-04-20', description: 'Tk Maxx', debit: 89.98, credit: null, category: 'EXPENSE_OFFICE_SUPPLIES', department: 'cleaning' },
    { date: '2026-04-20', description: 'Oomenrgy Logan', debit: 62.43, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-04-23', description: 'Caltex', debit: 58.58, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-04-24', description: 'AK Innovation', debit: null, credit: 715, category: 'INCOME_SALES_CLEANING', department: 'cleaning' },
    { date: '2026-04-27', description: 'MJR Enterprise', debit: 660, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning' },
    { date: '2026-05-01', description: 'BP', debit: 73.55, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-05-04', description: 'Stripe', debit: null, credit: 0.68, category: 'INCOME_SALES_CLEANING', department: 'cleaning' },
    { date: '2026-05-04', description: 'Google Australia', debit: 9.52, credit: null, category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS', department: 'cleaning' },
    { date: '2026-05-06', description: 'MJR Enterprise', debit: 330, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning' },
    { date: '2026-05-07', description: 'Associated Cleaning', debit: null, credit: 3526.6, category: 'INCOME_SALES_CLEANING', department: 'cleaning' },
    { date: '2026-05-08', description: 'BP', debit: 60.39, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-05-11', description: 'OKTAX', debit: 1133, credit: null, category: 'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES', department: 'cleaning' },
    { date: '2026-05-12', description: 'ATO', debit: null, credit: 18, category: 'NON_TAXABLE_ATO_GST_REFUND', department: 'cleaning' },
    { date: '2026-05-13', description: 'Etsy', debit: 26, credit: null, category: 'EXPENSE_MERCHANT_FEES', department: 'cleaning' },
    { date: '2026-05-15', description: 'BP', debit: 60.86, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    // OCR year slip — repair pulls into Q4 2026
    { date: '2025-05-18', description: 'Jason Selpic', debit: null, credit: 1012, category: 'INCOME_SALES_CLEANING', department: 'cleaning' },
    { date: '2026-05-18', description: 'Cyc Company Pty', debit: 594, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning' },
    { date: '2026-05-22', description: 'BP', debit: 70.82, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-05-29', description: 'BP', debit: 65.32, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-06-01', description: 'Cyc Company Pty', debit: 660, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning' },
    { date: '2026-06-03', description: 'Liberty', debit: 81.09, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-06-03', description: 'Etsy', debit: 0.56, credit: null, category: 'EXPENSE_MERCHANT_FEES', department: 'cleaning' },
    { date: '2026-06-03', description: 'Google Australia', debit: 12.98, credit: null, category: 'EXPENSE_MERCHANT_FEES', department: 'cleaning' },
    { date: '2026-06-05', description: 'Associated Cleaning', debit: null, credit: 3526.6, category: 'INCOME_SALES_CLEANING', department: 'cleaning' },
    { date: '2026-06-08', description: 'Cyc Company Pty', debit: 264, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning' },
    { date: '2026-06-12', description: 'BP', debit: 70.64, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-06-19', description: 'BP', debit: 69.59, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
    { date: '2026-06-22', description: 'Vistaprint', debit: 85.18, credit: null, category: 'EXPENSE_MARKETING', department: 'cleaning' },
    { date: '2026-06-24', description: 'Mr Jinsoo Kim Return', debit: null, credit: 50.85, category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim Z', debit: 50.85, credit: null, category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim V753', debit: 129.6, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim J178', debit: 152.1, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim Y128', debit: 211.71, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim N197', debit: 599.75, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim D523', debit: 611, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim V067', debit: 893.25, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim K557', debit: 1516.08, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim K229', debit: 2334.2, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', department: 'cleaning' },
    { date: '2026-06-24', description: 'Jinsoo Kim R277', debit: 2334.2, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', department: 'cleaning' },
    { date: '2026-06-29', description: 'Caltex', debit: 81.38, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
  ]

  it('matches categorised parse for BAS Q4 window', () => {
    const inQ4 = q4Rows.filter((r) => r.date >= '2026-04-01' && r.date <= '2026-06-30')
    const m = calculateBusinessMetrics(inQ4, 0, 'company')
    expect(m.totalIncome).toBeCloseTo(13407.48, 2)
    expect(m.totalExpenses).toBeCloseTo(6260.34, 2)
    expect(m.netProfit).toBeCloseTo(7147.14, 2)
  })

  it('excludes unrepaired Jason 2025 income from Q4 date filter', () => {
    const inQ4 = q4Rows.filter((r) => r.date >= '2026-04-01' && r.date <= '2026-06-30')
    expect(inQ4.some((r) => r.description === 'Jason Selpic')).toBe(false)
    const all = calculateBusinessMetrics(q4Rows, 0, 'company')
    expect(all.totalIncome).toBeCloseTo(14419.48, 2)
  })

  it('includes Jason after OCR year repair into Q4 (single row, +1012)', () => {
    const fixed = repairStatementDateAnomalies(q4Rows)
    const jason = fixed.find((r) => r.description === 'Jason Selpic')
    expect(jason?.date).toBe('2026-05-18')
    const inQ4 = fixed.filter((r) => r.date >= '2026-04-01' && r.date <= '2026-06-30')
    expect(inQ4.filter((r) => r.description === 'Jason Selpic')).toHaveLength(1)
    const m = calculateBusinessMetrics(inQ4, 0, 'company')
    expect(m.totalIncome).toBeCloseTo(13407.48 + 1012, 2)
  })
})
