const fs = require('fs')
const p =
  'c:/Users/fscsq/Desktop/selpic2/apps/accounting-sandbox/lib/ato-lodgment/compute-lodgment.ts'
let c = fs.readFileSync(p, 'utf8')

c = c.replace(
  /import \{ buildMyTax\w+ \} from '\.\/mytax-field-map'/,
  "import { buildMyTaxAnnualFields } from './mytax-field-map'"
)
c = c.replace(/buildMyTax\w+\(/g, 'buildMyTaxAnnualFields(')

// Normalize metrics property access to BusinessCalculations field names
c = c.replace(/metrics\.totalIncomeExGst/g, 'metrics.totalIncomeExGst')
c = c.replace(/metrics\.totalExpensesExGst/g, 'metrics.totalExpensesExGst')
c = c.replace(/metrics\.netProfitExGst/g, 'metrics.netProfitExGst')
c = c.replace(/taxTotalIncome: metrics\.totalIncomeExGst/g, 'taxTotalIncome: metrics.totalIncomeExGst')
c = c.replace(/taxTotalExpenses: metrics\.totalExpensesExGst/g, 'taxTotalExpenses: metrics.totalExpensesExGst')
c = c.replace(/taxNetProfit: metrics\.netProfitExGst/g, 'taxNetProfit: metrics.netProfitExGst')

fs.writeFileSync(p, c)
console.log('imports', [...new Set(c.match(/buildMyTax\w+/g) || [])])
const i = c.indexOf('buildMyTaxAnnualFields(')
console.log(c.slice(i, i + 550))
