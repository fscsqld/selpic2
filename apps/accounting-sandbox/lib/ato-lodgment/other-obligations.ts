/**
 * Detect FBT / payroll activity for lodgment calendar and Other ATO obligations UI.
 */

type TxLike = {
  category?: string | null
  description?: string | null
  isFBTRelevant?: boolean
  isFBTReportable?: boolean
}

const PAYROLL_CATEGORY_RE =
  /WAGES|SALARIES|PAYG|WITHHOLDING|SUPERANNUATION|SUPER_|PAYROLL|DIRECTORS_FEES|WORKERS_COMP/i

const FBT_CATEGORY_RE = /FBT|FRINGE|ENTERTAINMENT|MOTOR_VEHICLE|CAR_BENEFIT/i

const FBT_DESC_RE = /\bFBT\b|fringe benefit|novated lease|company car/i
const PAYROLL_DESC_RE = /\bPAYG\b|\bwages\b|\bsalary\b|\bsuper(annuation)?\b|\bpayslip\b/i

export function hasPayrollActivity(transactions: TxLike[] | null | undefined): boolean {
  if (!transactions?.length) return false
  return transactions.some((tx) => {
    const cat = tx.category || ''
    const desc = tx.description || ''
    return PAYROLL_CATEGORY_RE.test(cat) || PAYROLL_DESC_RE.test(desc)
  })
}

export function hasFbtActivity(transactions: TxLike[] | null | undefined): boolean {
  if (!transactions?.length) return false
  return transactions.some((tx) => {
    if (tx.isFBTRelevant || tx.isFBTReportable) return true
    const cat = tx.category || ''
    const desc = tx.description || ''
    return FBT_CATEGORY_RE.test(cat) || FBT_DESC_RE.test(desc)
  })
}
