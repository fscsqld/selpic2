import { describe, expect, it } from 'vitest'
import {
  buildStatementExportRows,
  filterPlPeriodHistoryForExport,
  type StatementExportRow,
} from '@/lib/excel-export/statement-scoped-export'
import { gstAndNetForExport } from '@/lib/excel-export'
import { applyKnownPurchaseGstTags } from '@/lib/gst/apply-known-purchase-gst'

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

describe('Export Business Only = P&L History', () => {
  const fy = { startDate: '2025-07-01', endDate: '2026-06-30' }

  it('filterPlPeriodHistoryForExport keeps all History rows in the period (not one PDF)', () => {
    const history = [
      row({ id: 's1_a', date: '2025-12-07', debit: 1516.08, category: 'EXPENSE_TRAVEL_TRANSPORT' }),
      row({ id: 's1_b', date: '2026-01-15', credit: 100, category: 'EQUITY_SHARE_CAPITAL' }),
      row({ id: 's2_stripe', date: '2026-04-14', credit: 220, category: 'INCOME_SALES_CLEANING' }),
      row({ id: 's2_fuel', date: '2026-05-01', debit: 84.04, category: 'EXPENSE_FUEL_TRAVEL' }),
      row({
        id: 'cash_stamp',
        date: '2026-01-29',
        debit: 2334.2,
        source: 'manual',
        category: 'EXPENSE_OFFICE_EQUIPMENT',
      }),
      row({
        id: 'outside',
        date: '2026-07-01',
        debit: 10,
        category: 'EXPENSE_BANK_FEES',
      }),
    ]
    // Caller already scoped to FY (dashboardTransactions); helper only filters business
    const inFy = history.filter((tx) => tx.date >= fy.startDate && tx.date <= fy.endDate)
    const rows = filterPlPeriodHistoryForExport(inFy, 'company', true)
    expect(rows.map((r) => r.id).sort()).toEqual([
      'cash_stamp',
      's1_a',
      's1_b',
      's2_fuel',
      's2_stripe',
    ])
    expect(rows).toHaveLength(5)
  })

  it('excludes personal department from Export Business Only', () => {
    const rows = filterPlPeriodHistoryForExport(
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
      true
    )
    expect(rows.map((r) => r.id)).toEqual(['biz'])
  })

  it('Export All Depts keeps personal when businessOnly=false', () => {
    const rows = filterPlPeriodHistoryForExport(
      [
        row({ id: 'biz', date: '2026-02-01', debit: 10 }),
        row({ id: 'pers', date: '2026-02-02', debit: 40, department: 'personal' }),
      ],
      'company',
      false
    )
    expect(rows.map((r) => r.id).sort()).toEqual(['biz', 'pers'])
  })

  it('legacy buildStatementExportRows still merges cash in range (tooling)', () => {
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
      dateRangeFilter: { startDate: '2026-01-01', endDate: '2026-03-31' },
      cashExpenses: cash,
    })
    expect(rows.map((r) => r.id).sort()).toEqual(['b1', 'cash_in'])
  })

  it('AU-format dates in history still count for business filter path', () => {
    const rows = filterPlPeriodHistoryForExport(
      [
        row({ id: 'in', date: '15/01/2026', credit: 110, category: 'INCOME_SALES_CLEANING' }),
      ],
      'company',
      true
    )
    expect(rows.map((r) => r.id)).toEqual(['in'])
  })
})

describe('Excel GST = History Claim GST (1B)', () => {
  it('CrazyDomains Startup shows claimable GST (not category-forced $0)', () => {
    const [tagged] = applyKnownPurchaseGstTags([
      row({
        id: 'crazy',
        date: '2026-03-25',
        description: 'Crazydomains Website Ho',
        debit: 50.85,
        category: 'EXPENSE_STARTUP_INCORPORATION',
        source: 'bank',
      }),
    ])
    const { gst, net } = gstAndNetForExport(tagged)
    expect(gst).toBeCloseTo(50.85 / 11, 2)
    expect(net).toBeCloseTo(50.85 - 50.85 / 11, 2)
  })

  it('untagged manual cash expense is GST-free (no Excel ÷11)', () => {
    const { gst, net } = gstAndNetForExport(
      row({
        id: 'cash_free',
        date: '2026-01-29',
        description: 'Stamp Zone',
        debit: 2334.2,
        source: 'manual',
        category: 'EXPENSE_OFFICE_EQUIPMENT',
      })
    )
    expect(gst).toBe(0)
    expect(net).toBeCloseTo(2334.2, 2)
  })

  it('Hanaone freight is GST-free after known tags', () => {
    const [tagged] = applyKnownPurchaseGstTags([
      row({
        id: 'hana',
        date: '2026-03-25',
        description: 'Hanaone Express',
        debit: 129.6,
        category: 'EXPENSE_FREIGHT_SHIPPING',
        source: 'bank',
      }),
    ])
    const { gst, net } = gstAndNetForExport(tagged)
    expect(gst).toBe(0)
    expect(net).toBeCloseTo(129.6, 2)
  })

  it('manual Claim override keeps GST in Excel', () => {
    const { gst } = gstAndNetForExport(
      row({
        id: 'cash_claim',
        date: '2026-01-19',
        description: 'Case',
        debit: 152.1,
        source: 'manual',
        category: 'EXPENSE_OFFICE_SUPPLIES',
        gstInfo: {
          gstType: 'INCLUDED',
          isGSTIncluded: true,
          gstAmount: 152.1 / 11,
          netAmount: 152.1 - 152.1 / 11,
        },
      })
    )
    expect(gst).toBeCloseTo(152.1 / 11, 2)
  })
})
