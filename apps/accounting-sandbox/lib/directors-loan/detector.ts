/**
 * Thin stub — legacy DirectorsLoanManager UI. Real DL logic lives under
 * lib/classification/directors-loan-*.ts
 */

export interface DirectorsLoanTransaction {
  date: string
  description: string
  amount: number
  loanType?: string
  isRepayment?: boolean
}
