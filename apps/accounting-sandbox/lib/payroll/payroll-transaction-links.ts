/**
 * Link payroll journal rows ↔ payslips so deletes can cascade cleanly.
 */

export type PayrollLinkableTx = {
  id?: string
  reference?: string
  source?: string
  isPayrollTransaction?: boolean
  payrollMeta?: { payslipId?: string }
}

export function isPayrollJournalTransaction(tx: PayrollLinkableTx): boolean {
  return tx.source === 'payroll' || tx.isPayrollTransaction === true
}

/** Resolve payslip id from a payroll journal row (meta, reference, or entry id). */
export function extractPayslipIdFromPayrollTx(tx: PayrollLinkableTx): string | null {
  const fromMeta = tx.payrollMeta?.payslipId
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim()

  const ref = tx.reference
  if (typeof ref === 'string' && ref.startsWith('PAYROLL_')) {
    const id = ref.slice('PAYROLL_'.length).trim()
    if (id) return id
  }

  const id = tx.id
  if (typeof id === 'string' && id.includes('_entry_')) {
    return id.replace(/_entry_\d+$/, '') || null
  }

  return null
}

/**
 * Whether a payroll journal row should be removed because its payslip is gone.
 * Rows with no resolvable payslip id are treated as orphans (legacy test data).
 */
export function isOrphanPayrollTransaction(
  tx: PayrollLinkableTx,
  existingPayslipIds: Set<string>
): boolean {
  if (!isPayrollJournalTransaction(tx)) return false
  const payslipId = extractPayslipIdFromPayrollTx(tx)
  if (!payslipId) return true
  return !existingPayslipIds.has(payslipId)
}

export function payslipIdsLinkedToTimesheet(
  payslips: Array<{ id?: string; employeeName?: string; payPeriod?: { start?: string; end?: string }; grossPay?: number }>,
  timesheet: {
    id: string
    employeeName?: string
    payPeriod?: { start?: string; end?: string }
    grossPay?: number
  }
): string[] {
  const ids = new Set<string>()
  const prefix = `payslip_${timesheet.id}_`

  for (const ps of payslips) {
    if (!ps.id) continue
    if (ps.id.startsWith(prefix) || ps.id.includes(timesheet.id)) {
      ids.add(ps.id)
      continue
    }
    if (
      timesheet.employeeName &&
      ps.employeeName === timesheet.employeeName &&
      ps.payPeriod?.start === timesheet.payPeriod?.start &&
      ps.payPeriod?.end === timesheet.payPeriod?.end &&
      Math.abs((ps.grossPay || 0) - (timesheet.grossPay || 0)) < 0.01
    ) {
      ids.add(ps.id)
    }
  }

  return [...ids]
}
