'use client'

import { useEffect, useState } from 'react'
import { PAYGConfigForm } from '@/components/Settings/PAYGConfigForm'
import { TimesheetApproval } from '@/components/Payroll/TimesheetApproval'
import { PayRunSummaryPanel } from '@/components/Payroll/PayRunSummaryPanel'
import { PayRunBoard } from '@/components/Payroll/PayRunBoard'
import { FixedSalaryPayRunPanel } from '@/components/Payroll/FixedSalaryPayRunPanel'
import { PayrollBankReconcilePanel } from '@/components/Payroll/PayrollBankReconcilePanel'
import { RemittanceAndAbaPanel } from '@/components/Payroll/RemittanceAndAbaPanel'
import { LegacyPayrollHealPanel } from '@/components/Payroll/LegacyPayrollHealPanel'
import { StaffCollapsibleSection } from '@/components/Payroll/StaffCollapsibleSection'
import { PAYGSummary } from '@/components/PAYGSummary'
import { EmployeeList, EmployeeDetailPage, EmployeeAddForm, MyPayrollPage } from '@/components/HR'
import { getCurrentEmployeeSession, logoutEmployee } from '@/lib/auth/employee-auth'
import { getSsoRoleFlags } from '@/lib/auth/sso-role-flags'
import { establishEmployeeSessionFromAdminSso } from '@/lib/auth/sso-employee-bridge'
import { clearSSOToken } from '@/lib/sso-handler'
import { getStorefrontAdminDashboardUrl } from '@/lib/storefront-url'
import type { ClassifiedTransaction } from '@/lib/dashboard/types'

/** Path B: homepage admin SSO → My Payroll without employee password re-login. */
function PayrollOnlyMyPayrollBridge() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ssoToken } = getSsoRoleFlags()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const existing = getCurrentEmployeeSession()
      if (existing) {
        if (!cancelled) setReady(true)
        return
      }
      const username = ssoToken?.username || ''
      const result = await establishEmployeeSessionFromAdminSso(username)
      if (cancelled) return
      if (!result.ok) {
        setError(result.reason)
        setReady(false)
        return
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [ssoToken?.username])

  const handleLogout = () => {
    logoutEmployee()
    clearSSOToken()
    window.location.href = getStorefrontAdminDashboardUrl()
  }

  if (error) {
    return (
      <div className="card border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="text-lg font-semibold mb-2">Cannot open My Payroll</h2>
        <p className="text-sm mb-4">{error}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 bg-amber-700 text-white rounded-md text-sm hover:bg-amber-800"
        >
          Back to admin dashboard
        </button>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="card text-center py-12 text-gray-600">
        Linking your admin login to your employee record…
      </div>
    )
  }

  return <MyPayrollPage onLogout={handleLogout} />
}

export interface HrPayrollTabPanelProps {
  transactions: ClassifiedTransaction[]
}

export function HrPayrollTabPanel({ transactions }: HrPayrollTabPanelProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false)
  const [isEmployeeLoggedIn, setIsEmployeeLoggedIn] = useState(false)
  const [employeeListRefreshKey, setEmployeeListRefreshKey] = useState(0)

  const { isAccountingManager, isPayrollOnly } = getSsoRoleFlags()

  useEffect(() => {
    const employeeSession = getCurrentEmployeeSession()

    if (isPayrollOnly) {
      setIsEmployeeLoggedIn(true)
      return
    }

    if (employeeSession && !isAccountingManager) {
      setIsEmployeeLoggedIn(true)
    } else {
      setIsEmployeeLoggedIn(false)
    }
  }, [isPayrollOnly, isAccountingManager])

  useEffect(() => {
    const handleEmployeeLoginSuccess = () => {
      const employeeSession = getCurrentEmployeeSession()
      if (employeeSession) {
        setIsEmployeeLoggedIn(true)
        setSelectedEmployee(null)
        setShowAddEmployeeForm(false)
      }
    }

    window.addEventListener('employeeLoginSuccess', handleEmployeeLoginSuccess)
    return () => window.removeEventListener('employeeLoginSuccess', handleEmployeeLoginSuccess)
  }, [])

  const resetEmployeeUi = () => {
    setIsEmployeeLoggedIn(false)
    setSelectedEmployee(null)
    setShowAddEmployeeForm(false)
  }

  if (isPayrollOnly) {
    return (
      <div className="space-y-6">
        <PayrollOnlyMyPayrollBridge />
      </div>
    )
  }

  if (isEmployeeLoggedIn) {
    return (
      <div className="space-y-6">
        <MyPayrollPage onLogout={resetEmployeeUi} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {selectedEmployee ? (
        <EmployeeDetailPage
          employee={selectedEmployee}
          onBack={() => {
            setSelectedEmployee(null)
            setShowAddEmployeeForm(false)
          }}
          onEmployeeUpdate={() => {
            setSelectedEmployee(null)
            setEmployeeListRefreshKey((key) => key + 1)
          }}
        />
      ) : showAddEmployeeForm ? (
        <EmployeeAddForm
          onSave={() => {
            setShowAddEmployeeForm(false)
            setSelectedEmployee(null)
            setEmployeeListRefreshKey((key) => key + 1)
          }}
          onCancel={() => setShowAddEmployeeForm(false)}
        />
      ) : (
        <>
          <div className="card">
            <h2 className="text-2xl font-semibold text-gray-900">Staff &amp; Payroll</h2>
            <p className="text-sm text-gray-600 mt-1">
              Register staff, review hours, confirm pay (PAYG / Super / Net), then mark paid after
              transfer. Bank statement outflows are the cash record — match them later so amounts
              stay consistent without double-counting.
            </p>
          </div>

          <EmployeeList
            refreshKey={employeeListRefreshKey}
            onEmployeeClick={(employee) => setSelectedEmployee(employee)}
            onAddEmployee={() => setShowAddEmployeeForm(true)}
          />

          <StaffCollapsibleSection
            title="Pay Run Summary"
            subtitle="Approved vs paid totals at a glance"
            defaultOpen
          >
            <PayRunSummaryPanel />
          </StaffCollapsibleSection>

          <StaffCollapsibleSection
            title="Fixed salary Pay Run"
            subtitle="Create submitted timesheets for salaried staff (no clock-in)"
            defaultOpen={false}
          >
            <FixedSalaryPayRunPanel />
          </StaffCollapsibleSection>

          <StaffCollapsibleSection
            title="Pay Run (batch)"
            subtitle="Period preview → multi-approve → net-pay CSV"
            defaultOpen
          >
            <PayRunBoard />
          </StaffCollapsibleSection>

          <StaffCollapsibleSection
            title="Bank ↔ Pay Run match"
            subtitle="Clear wages / PAYG / Super liabilities from statement outflows"
            defaultOpen={false}
          >
            <PayrollBankReconcilePanel />
          </StaffCollapsibleSection>

          <StaffCollapsibleSection
            title="Remittance &amp; ABA"
            subtitle="Agency dues + Direct Entry file for approved nets"
            defaultOpen={false}
          >
            <RemittanceAndAbaPanel />
          </StaffCollapsibleSection>

          <StaffCollapsibleSection
            title="Timesheet Approval"
            subtitle="Approve one-by-one; accrual only — Mark Paid after transfer"
            defaultOpen={false}
          >
            <p className="text-sm text-gray-600 mb-4">
              Prefer Pay Run (batch) above for multi-staff periods. Approve creates accrual
              liabilities (not cash). Use Mark Paid after you pay the employee.
            </p>
            <TimesheetApproval />
          </StaffCollapsibleSection>

          <StaffCollapsibleSection
            title="Legacy payroll heal"
            subtitle="Convert old cash-on-approve journals to Wages Payable"
            defaultOpen={false}
          >
            <LegacyPayrollHealPanel />
          </StaffCollapsibleSection>

          <StaffCollapsibleSection
            title="PAYG Withholding Configuration"
            defaultOpen={false}
          >
            <PAYGConfigForm />
          </StaffCollapsibleSection>

          {transactions.length > 0 && (
            <StaffCollapsibleSection
              title="PAYG Withholding Summary"
              defaultOpen={false}
            >
              <PAYGSummary transactions={transactions} />
            </StaffCollapsibleSection>
          )}
        </>
      )}
    </div>
  )
}
