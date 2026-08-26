import { useEffect } from 'react'
import { getSsoRoleFlags } from '@/lib/auth/sso-role-flags'
import type { DashboardTab } from '@/lib/dashboard/types'

export function usePayrollOnlyRedirect(
  activeTab: DashboardTab,
  onTabChange: (tab: DashboardTab) => void
): void {
  useEffect(() => {
    const { isPayrollOnly } = getSsoRoleFlags()
    if (isPayrollOnly && activeTab !== 'hr') {
      onTabChange('hr')
    }
  }, [activeTab, onTabChange])
}
