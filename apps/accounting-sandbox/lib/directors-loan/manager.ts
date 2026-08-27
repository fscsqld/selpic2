/**
 * Thin stub — legacy DirectorsLoanManager UI. Real DL logic lives under
 * lib/classification/directors-loan-*.ts
 */

import type { DirectorsLoanTransaction } from './detector'

export interface DirectorsLoanSummary {
  totalLoans: number
  totalRepayments: number
  currentBalance: number
}

export class DirectorsLoanManager {
  generateSummary(loans: DirectorsLoanTransaction[]): DirectorsLoanSummary {
    let totalLoans = 0
    let totalRepayments = 0
    for (const loan of loans) {
      const amount = Number(loan.amount) || 0
      if (loan.isRepayment) totalRepayments += amount
      else totalLoans += amount
    }
    return {
      totalLoans,
      totalRepayments,
      currentBalance: totalLoans - totalRepayments,
    }
  }
}
