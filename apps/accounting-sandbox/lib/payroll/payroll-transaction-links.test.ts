import {
  extractPayslipIdFromPayrollTx,
  isOrphanPayrollTransaction,
  payslipIdsLinkedToTimesheet,
} from './payroll-transaction-links'

describe('payroll-transaction-links', () => {
  it('extracts payslip id from meta, reference, and entry id', () => {
    expect(
      extractPayslipIdFromPayrollTx({
        payrollMeta: { payslipId: 'ps_1' },
      })
    ).toBe('ps_1')
    expect(
      extractPayslipIdFromPayrollTx({
        reference: 'PAYROLL_ps_2',
      })
    ).toBe('ps_2')
    expect(
      extractPayslipIdFromPayrollTx({
        id: 'ps_3_entry_0',
      })
    ).toBe('ps_3')
  })

  it('flags orphan payroll when payslip is missing', () => {
    const existing = new Set(['ps_keep'])
    expect(
      isOrphanPayrollTransaction(
        { source: 'payroll', reference: 'PAYROLL_ps_gone' },
        existing
      )
    ).toBe(true)
    expect(
      isOrphanPayrollTransaction(
        { source: 'payroll', reference: 'PAYROLL_ps_keep' },
        existing
      )
    ).toBe(false)
    expect(
      isOrphanPayrollTransaction(
        { source: 'payroll', description: 'legacy' } as any,
        existing
      )
    ).toBe(true)
  })

  it('links payslips to a timesheet by id prefix', () => {
    const ids = payslipIdsLinkedToTimesheet(
      [
        { id: 'payslip_ts_abc_111' },
        { id: 'payslip_other_222' },
      ],
      { id: 'ts_abc' }
    )
    expect(ids).toEqual(['payslip_ts_abc_111'])
  })
})
