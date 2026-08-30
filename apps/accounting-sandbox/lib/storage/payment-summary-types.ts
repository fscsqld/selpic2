/** Employer income statement / PAYG payment summary for individual tax returns. */
export interface PaymentSummaryEntry {
  id: string
  financialYear: string
  employerName: string
  payerAbn?: string
  /** Gross payments (salary and wages) */
  grossPayments: number
  /** Total tax withheld */
  taxWithheld: number
  allowances?: number
  reportableFringeBenefits?: number
  createdAt: string
  updatedAt: string
}

export interface PaymentSummaryTotals {
  grossPayments: number
  taxWithheld: number
  count: number
}
