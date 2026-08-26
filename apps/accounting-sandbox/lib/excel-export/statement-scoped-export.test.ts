import { describe, expect, it } from 'vitest'
import { buildStatementExportRows } from '@/lib/excel-export/statement-scoped-export'
import type { StatementExportRow } from '@/lib/excel-export/statement-scoped-export'
import { buildGeneralLedgerSheet, gstAndNetForExport } from '@/lib/excel-export'
import { cleanTransactionDescription } from '@/lib/dashboard/clean-transaction-description'
import { getTransactionCategoryLabel } from '@/lib/dashboard/category-labels'
import { formatDateAustralian } from '@/lib/utils/date-format'

function row(partial: Partial<StatementExportRow> & { id: string; date: string }): StatementExportRow {
  return {
    description: 'tx',
    debit: null,
    credit: null,
    department: 'cleaning',
    source: 'bank',
    category: 'UNCATEGORIZED',
    ...partial,
  }
}

describe('P&L Period Excel vs Transaction History', () => {
  const q3 = { startDate: '2026-01-01', endDate: '2026-03-31' }

  it('includes AU-format dates that sit inside the selected P&L window', () => {
    const rows = buildStatementExportRows(
      [
        row({ id: 'in', date: '15/01/2026', credit: 110, category: 'INCOME_SALES_CLEANING' }),
        row({ id: 'out', date: '15/04/2026', credit: 50, category: 'INCOME_SALES_CLEANING' }),
      ],
      'company',
      true,
      { dateRangeFilter: q3 }
    )
    expect(rows.map((r) => r.id)).toEqual(['in'])
  })

  it('merges Cash Expense in the period and drops cash outside it', () => {
    const bank = [
      row({ id: 'b1', date: '2026-02-01', debit: 20, category: 'EXPENSE_OFFICE_SUPPLIES' }),
    ]
    const cash = [
      row({
        id: 'cash_in',
        date: '2026-02-10',
        debit: 33,
        source: 'manual',
        category: 'CASH_EXPENSE_PETTY',
      }),
      row({
        id: 'cash_out',
        date: '2026-04-02',
        debit: 99,
        source: 'manual',
        category: 'CASH_EXPENSE_PETTY',
      }),
    ]
    const rows = buildStatementExportRows(bank, 'company', true, {
      dateRangeFilter: q3,
      cashExpenses: cash,
    })
    expect(rows.map((r) => r.id).sort()).toEqual(['b1', 'cash_in'])
  })

  it('does not clip Dec–Jun P&L exports down to the last Q4 PDF period', () => {
    const raw = [
      row({ id: 'dec_bank', date: '2025-12-20', debit: 10, category: 'EXPENSE_BANK_FEES_INTEREST' }),
      row({ id: 'q4_bank', date: '2026-04-14', debit: 20, category: 'EXPENSE_FUEL_TRAVEL' }),
    ]
    const cash = [
      row({
        id: 'cash_air',
        date: '2025-12-07',
        debit: 1516.08,
        source: 'manual',
        category: 'EXPENSE_TRAVEL_TRANSPORT',
      }),
    ]
    const rows = buildStatementExportRows(raw, 'company', true, {
      statementPeriod: { startDate: '2026-04-01', endDate: '2026-06-29' },
      dateRangeFilter: { startDate: '2025-12-07', endDate: '2026-06-29' },
      cashExpenses: cash,
    })
    expect(rows.map((r) => r.id).sort()).toEqual(['cash_air', 'dec_bank', 'q4_bank'])
  })

  it('excludes personal department from Export Business Only (same as P&L)', () => {
    const rows = buildStatementExportRows(
      [
        row({ id: 'biz', date: '2026-02-01', debit: 10, category: 'EXPENSE_OFFICE_SUPPLIES' }),
        row({
          id: 'pers',
          date: '2026-02-02',
          debit: 40,
          department: 'personal',
          category: 'EXPENSE_MEALS_ENTERTAINMENT',
        }),
      ],
      'company',
      true,
      { dateRangeFilter: q3 }
    )
    expect(rows.map((r) => r.id)).toEqual(['biz'])
  })

  it('writes the selected P&L period on the sheet and AU dates/labels matching History', () => {
    const { allRows } = buildGeneralLedgerSheet(
      [
        {
          date: '2026-02-15',
          description: 'STRIPE PAYOUT SELPIC 15022026',
          category: 'INCOME_SALES_CLEANING',
          debit: null,
          credit: 220,
          department: 'cleaning',
          status: 'Normal',
          source: 'bank',
        },
      ],
      {
        periodLabel: 'Q3 Jan–Mar 2026',
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
        accountType: 'company',
      }
    )

    expect(allRows[0][0]).toBe('P&L Period')
    expect(allRows[0][1]).toBe('Q3 Jan–Mar 2026')
    expect(allRows[0][2]).toBe('01/01/2026 to 31/03/2026')
    expect(allRows[0][3]).toBe(1)

    const data = allRows[3]
    expect(data[0]).toBe(formatDateAustralian('2026-02-15'))
    expect(data[1]).toBe(cleanTransactionDescription('STRIPE PAYOUT SELPIC 15022026'))
    expect(data[1]).toBe('Stripe')
    expect(data[2]).toBe(getTransactionCategoryLabel('INCOME_SALES_CLEANING'))
    expect(data[6]).toBe(220)
    expect(data[7]).toBe('Company')
  })

  it('does not invent GST on GST-free cash expenses', () => {
    const { gst, net } = gstAndNetForExport({
      date: '2026-02-01',
      description: 'Petty',
      category: 'CASH_EXPENSE_PETTY',
      debit: 55,
      credit: null,
      department: 'cleaning',
      status: 'Normal',
      source: 'manual',
      gstInfo: { gstType: 'FREE', gstAmount: 0, netAmount: 55 },
    })
    expect(gst).toBe(0)
    expect(net).toBe(55)
  })

  it('uses inclusive ÷11 GST for untagged bank purchases (same as BAS default)', () => {
    const { gst } = gstAndNetForExport({
      date: '2026-02-01',
      description: 'Officeworks',
      category: 'EXPENSE_OFFICE_SUPPLIES',
      debit: 110,
      credit: null,
      department: 'cleaning',
      status: 'Normal',
      source: 'bank',
    })
    expect(gst).toBe(10)
  })
})
