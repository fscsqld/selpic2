import { useEffect, useState } from 'react'
import {
  getReportsReviewed,
  markReportsReviewed,
  type ReportsReviewAccountType,
} from '@/lib/journey/reports-review-flag'
import type { DashboardTab } from '@/lib/dashboard/types'

export function useJourneyReportsReview(
  financialYear: string,
  accountType: ReportsReviewAccountType,
  activeTab: DashboardTab
): boolean {
  const [hasReviewedReports, setHasReviewedReports] = useState(false)

  useEffect(() => {
    setHasReviewedReports(getReportsReviewed(financialYear, accountType))
  }, [accountType, financialYear])

  useEffect(() => {
    if (activeTab === 'reports') {
      markReportsReviewed(financialYear, accountType)
      setHasReviewedReports(true)
    }
  }, [activeTab, accountType, financialYear])

  return hasReviewedReports
}
