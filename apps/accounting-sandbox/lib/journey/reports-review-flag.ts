export type ReportsReviewAccountType = 'individual' | 'company' | 'sole_trader'

export function reportsReviewStorageKey(
  financialYear: string,
  accountType: ReportsReviewAccountType
): string {
  return `journey_reports_reviewed_${accountType}_${financialYear}`
}

/** Legacy key used before account-type scoping (individual only). */
function legacyReportsReviewKey(financialYear: string): string {
  return `journey_reports_reviewed_${financialYear}`
}

export function getReportsReviewed(
  financialYear: string,
  accountType: ReportsReviewAccountType
): boolean {
  if (typeof window === 'undefined') return false
  if (localStorage.getItem(reportsReviewStorageKey(financialYear, accountType)) === '1') {
    return true
  }
  if (accountType === 'individual' && localStorage.getItem(legacyReportsReviewKey(financialYear)) === '1') {
    return true
  }
  return false
}

export function markReportsReviewed(
  financialYear: string,
  accountType: ReportsReviewAccountType
): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(reportsReviewStorageKey(financialYear, accountType), '1')
  if (accountType === 'individual') {
    localStorage.setItem(legacyReportsReviewKey(financialYear), '1')
  }
}
