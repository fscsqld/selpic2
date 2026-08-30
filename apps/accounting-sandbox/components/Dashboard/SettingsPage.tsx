'use client'

import { useEffect, useState } from 'react'
import { ApiKeyForm } from '@/components/Settings/ApiKeyForm'
import { ApiBalanceDashboard } from '@/components/Settings/ApiBalanceDashboard'
import { BusinessProfileForm } from '@/components/Settings/BusinessProfileForm'
import { DataBackupRestore } from '@/components/Settings/DataBackupRestore'
import { PeriodManagement } from '@/components/Settings/PeriodManagement'
import { DirectorsLoanSettingsForm } from '@/components/Settings/DirectorsLoanSettingsForm'
import { PAYGConfigForm } from '@/components/Settings/PAYGConfigForm'
import { FyOnboardingGuide } from '@/components/Settings/FyOnboardingGuide'
import { FyStartPreferencesEditor } from '@/components/Settings/FyStartPreferencesEditor'
import { ManualLodgmentPathGuide } from '@/components/Settings/ManualLodgmentPathGuide'
import { BankReconciliationPanel } from '@/components/Reconciliation/BankReconciliationPanel'
import { AuditTrailView } from '@/components/AuditTrailView'
import { ManualJournalPanel } from '@/components/Journal/ManualJournalPanel'
import type { ClassifiedTransaction } from '@/lib/dashboard/types'

export interface SettingsPageProps {
  apiKey: string
  userApiKey: string
  directorName: string
  onApiKeySet: (key: string) => void
  onUserApiKeySet: (key: string) => void
  onDirectorNameSet: (name: string) => void
  onNavigateToPayroll?: () => void
  transactions: ClassifiedTransaction[]
  openingDirectorLoanBalance: number
  onOpeningBalanceChange: (value: number) => void
  priorPeriodDirectorAdvances: number
  onPriorAdvancesChange: (value: number) => void
  autoMatchPriorAdvances: boolean
  onAutoMatchPriorAdvancesChange: (value: boolean) => void
  directorLoanReimbursementTotal: number
  openingCashBalance: number
  viewPeriodId?: string | null
  onClearAllData: () => void
  onTransactionUpdate: (id: string, updates: Partial<ClassifiedTransaction>) => Promise<void>
  onReloadTransactions: () => Promise<void>
}

type SettingsSection =
  | 'business'
  | 'tax'
  | 'period'
  | 'directors'
  | 'data'
  | 'audit'
  | 'reconcile'
  | 'journals'

export function SettingsPage({
  apiKey,
  userApiKey,
  onApiKeySet,
  onUserApiKeySet,
  onDirectorNameSet,
  onNavigateToPayroll,
  transactions,
  openingDirectorLoanBalance,
  onOpeningBalanceChange,
  priorPeriodDirectorAdvances,
  onPriorAdvancesChange,
  autoMatchPriorAdvances,
  onAutoMatchPriorAdvancesChange,
  directorLoanReimbursementTotal,
  openingCashBalance,
  viewPeriodId,
  onClearAllData,
  onTransactionUpdate,
  onReloadTransactions,
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('business')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    if (tabParam === 'payroll') setActiveSection('tax')
  }, [])

  const navBtn = (id: SettingsSection, label: string) => (
    <button
      type="button"
      onClick={() => setActiveSection(id)}
      className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
        activeSection === id
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="card sticky top-4">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <nav className="space-y-2">
            {navBtn('business', 'Business Profile')}
            {navBtn('tax', 'Tax & Reporting')}
            {navBtn('period', 'Period Management')}
            {navBtn('directors', "Director's Loan")}
            {navBtn('journals', 'Manual Journals')}
            {navBtn('reconcile', 'Bank Reconciliation')}
            {navBtn('data', 'Data Management')}
            {navBtn('audit', 'Audit Trail')}
          </nav>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-6">
        {activeSection === 'business' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">Business Profile</h2>
              <BusinessProfileForm />
            </div>
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">FY setup</h2>
              <FyOnboardingGuide />
              <div className="mt-6 pt-6 border-t border-gray-200">
                <FyStartPreferencesEditor />
              </div>
            </div>
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">API Configuration</h2>
              <ApiKeyForm
                onApiKeySet={onApiKeySet}
                onUserApiKeySet={onUserApiKeySet}
                onDirectorNameSet={onDirectorNameSet}
              />
            </div>
            <ApiBalanceDashboard apiKey={apiKey} userApiKey={userApiKey} />
          </div>
        )}

        {activeSection === 'tax' && (
          <div className="card space-y-6">
            <h2 className="text-2xl font-semibold">Tax & Reporting</h2>
            <PAYGConfigForm />
            <div className="pt-6 border-t border-gray-200">
              <ManualLodgmentPathGuide />
            </div>
            <div className="pt-6 border-t border-gray-200">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Note:</strong> Payroll management lives under the{' '}
                  <strong>HR & Payroll</strong> tab.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToPayroll?.()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Go to HR & Payroll
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'period' && (
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Period Management</h2>
            <PeriodManagement />
          </div>
        )}

        {activeSection === 'directors' && (
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Director&apos;s Loan</h2>
            <DirectorsLoanSettingsForm
              openingDirectorLoanBalance={openingDirectorLoanBalance}
              onOpeningBalanceChange={onOpeningBalanceChange}
              priorPeriodDirectorAdvances={priorPeriodDirectorAdvances}
              onPriorAdvancesChange={onPriorAdvancesChange}
              autoMatchPriorAdvances={autoMatchPriorAdvances}
              onAutoMatchPriorAdvancesChange={onAutoMatchPriorAdvancesChange}
              reimbursementTotalHint={directorLoanReimbursementTotal}
              transactions={transactions}
            />
          </div>
        )}

        {activeSection === 'journals' && (
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Manual Journals</h2>
            <ManualJournalPanel onJournalChanged={() => void onReloadTransactions()} />
          </div>
        )}

        {activeSection === 'reconcile' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">Bank reconciliation</h2>
              <p className="text-sm text-gray-600 mb-4">
                Mark cleared bank lines against the statement closing balance. Sales income comes from
                bank deposits on your statement (e.g. Stripe payouts) — not from homepage order import.
              </p>
              <BankReconciliationPanel
                transactions={transactions.map((tx) => ({
                  id: tx.id,
                  date: tx.date,
                  description: tx.description,
                  debit: tx.debit,
                  credit: tx.credit,
                  balance: tx.balance,
                }))}
                openingCashBalance={openingCashBalance}
                defaultPeriodId={viewPeriodId ?? undefined}
              />
            </div>
          </div>
        )}

        {activeSection === 'data' && (
          <div className="card space-y-2">
            <h2 className="text-2xl font-semibold">Data Management</h2>
            <DataBackupRestore onClearAllData={onClearAllData} />
          </div>
        )}

        {activeSection === 'audit' && (
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">Audit Trail</h2>
            <AuditTrailView showAll />
          </div>
        )}
      </div>
    </div>
  )
}
