import { calculateBusinessMetrics } from '../lib/utils/business-calculations'
import { calculatePeriodTaxProvision } from '../lib/utils/period-tax-provision'

const txs = [
  {
    date: '2026-05-07',
    description: 'Sale',
    debit: null,
    credit: 110,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
    source: 'bank',
  },
  {
    date: '2026-05-08',
    description: 'Nab fee',
    debit: 11,
    credit: null,
    category: 'EXPENSE_BANK_FEES',
    department: 'cleaning',
    source: 'bank',
    gstInfo: { gstType: 'FREE' as const, gstAmount: 0, netAmount: 11 },
  },
  {
    date: '2026-05-09',
    description: 'OW',
    debit: 110,
    credit: null,
    category: 'EXPENSE_OFFICE_SUPPLIES',
    department: 'cleaning',
    source: 'bank',
  },
]

const m = calculateBusinessMetrics(txs as any, 0, 'company')
console.log('metrics', {
  inc: m.totalIncome,
  exp: m.totalExpenses,
  net: m.netProfit,
  incEx: m.totalIncomeExGst,
  expEx: m.totalExpensesExGst,
  netEx: m.netProfitExGst,
  a: m.gstPayable,
  b: m.gstClaimable,
})

const t = calculatePeriodTaxProvision(txs as any, 0.25, 'company')
console.log('tax', {
  ti: t.taxableIncome,
  cash: t.taxableIncomeCash,
  expEx: t.netExpensesExGst,
})

if (Math.abs(m.totalExpensesExGst - 111) > 0.02) {
  console.error('FAIL expenses ex GST expected ~111')
  process.exit(1)
}
if (Math.abs(m.netProfitExGst - -11) > 0.02) {
  console.error('FAIL net ex GST expected ~-11')
  process.exit(1)
}
console.log('OK')
