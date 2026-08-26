'use client'

import {
  Coins,
  Shield,
  BarChart,
  History,
  Users,
  Settings,
} from 'lucide-react'
import { getSSOToken } from '@/lib/sso-handler'
import type { DashboardTab } from '@/lib/dashboard/types'

interface DashboardTabNavProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
}

export function DashboardTabNav({ activeTab, onTabChange }: DashboardTabNavProps) {
  const ssoToken = getSSOToken()
  const isAccountingManager =
    ssoToken &&
    (ssoToken.role === 'super_admin' ||
      ssoToken.permissions.includes('accounting:admin') ||
      ssoToken.permissions.includes('accounting:full'))
  const isPayrollOnly =
    ssoToken &&
    !isAccountingManager &&
    (ssoToken.permissions.includes('payroll:read') ||
      ssoToken.permissions.includes('payroll:access'))

  if (isPayrollOnly) {
    return (
      <div className="flex gap-2 mt-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => onTabChange('hr')}
          className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'hr'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-5 h-5" />
          My Payroll
        </button>
      </div>
    )
  }

  const tabClass = (tab: DashboardTab, activeColor: string) =>
    `px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
      activeTab === tab
        ? `${activeColor} border-current`
        : 'border-transparent text-gray-600 hover:text-gray-900'
    }`

  return (
    <div className="flex gap-2 mt-4 border-b border-gray-200">
      <button type="button" onClick={() => onTabChange('dashboard')} className={tabClass('dashboard', 'text-blue-600 border-blue-600')}>
        <Coins className="w-5 h-5" />
        Biz Intel
      </button>
      <button type="button" onClick={() => onTabChange('ato')} className={tabClass('ato', 'text-indigo-600 border-indigo-600')}>
        <Shield className="w-5 h-5" />
        ATO Lodgment
      </button>
      <button type="button" onClick={() => onTabChange('reports')} className={tabClass('reports', 'text-blue-600 border-blue-600')}>
        <BarChart className="w-5 h-5" />
        Reports
      </button>
      <button type="button" onClick={() => onTabChange('history')} className={tabClass('history', 'text-blue-600 border-blue-600')}>
        <History className="w-5 h-5" />
        History
      </button>
      <button type="button" onClick={() => onTabChange('hr')} className={tabClass('hr', 'text-blue-600 border-blue-600')}>
        <Users className="w-5 h-5" />
        HR & Payroll
      </button>
      <button type="button" onClick={() => onTabChange('settings')} className={tabClass('settings', 'text-blue-600 border-blue-600')}>
        <Settings className="w-5 h-5" />
        Settings
      </button>
    </div>
  )
}
