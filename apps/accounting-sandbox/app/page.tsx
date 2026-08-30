'use client'

import { CheckCircle, X, FileText, RefreshCw } from 'lucide-react'
import { strings } from '@/lib/i18n/strings'
import { SetupWizard } from '@/components/Onboarding/SetupWizard'
import { PINLock } from '@/components/Security/PINLock'
import { DashboardTabNav } from '@/components/Dashboard/DashboardTabNav'
import { HistoryPage } from '@/components/Dashboard/HistoryPage'
import { ReportsTabPanel } from '@/components/Dashboard/ReportsTabPanel'
import { AtoLodgmentTabPanel } from '@/components/Dashboard/AtoLodgmentTabPanel'
import { SettingsPage } from '@/components/Dashboard/SettingsPage'
import { BizIntelTabPanel } from '@/components/Dashboard/BizIntelTabPanel'
import { HrPayrollTabPanel } from '@/components/Dashboard/HrPayrollTabPanel'
import { useAccountingDashboard } from '@/hooks/useAccountingDashboard'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { COMPANY_LEGAL } from '@/lib/companyLegal'
import { getSSOToken } from '@/lib/sso-handler'

export default function AccountingDashboard() {
  const d = useAccountingDashboard()

  if (!d.setupComplete) {
    return (
      <SetupWizard
        onComplete={() => {
          d.setSetupComplete(true)
          indexedDBStorage.init().then(async () => {
            const profile = await indexedDBStorage.getBusinessProfile()
            if (profile) {
              d.setCompanyInfo({
                name: profile.companyName || COMPANY_LEGAL.companyName,
                abn: profile.abn || COMPANY_LEGAL.abn,
                acn: profile.acn || COMPANY_LEGAL.acn,
              })
            }
            const homepageApiUrl = localStorage.getItem('homepage_api_url')
            if (homepageApiUrl) {
              console.log('[Main] Homepage API URL loaded:', homepageApiUrl)
            }
          })
        }}
      />
    )
  }

  const ssoToken = getSSOToken()
  const hasValidAdminToken = ssoToken && (ssoToken.role === 'admin' || ssoToken.role === 'super_admin')

  if (!d.isUnlocked && !hasValidAdminToken) {
    return (
      <PINLock
        onUnlock={() => d.setIsUnlocked(true)}
        onSystemResetComplete={() => {
          d.setSetupComplete(false)
          d.setIsUnlocked(false)
        }}
      />
    )
  }

  return (
    <div className="container py-8">
      {d.loadSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg bg-green-50 border-l-4 border-green-400 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">{d.loadSuccessMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => d.setLoadSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {d.duplicateFileDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">File Already Exists</h3>
            <p className="text-gray-700 mb-2">
              A file named <strong>&quot;{d.duplicateFileDialog.fileName}&quot;</strong> already exists in your
              history.
            </p>
            <p className="text-sm text-gray-600 mb-6">What would you like to do?</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => d.handleDuplicateFileChoice('reload')}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Reload Existing Data (No API Cost)
              </button>
              <button
                type="button"
                onClick={() => d.handleDuplicateFileChoice('reanalyze')}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Re-analyze (Will Use API)
              </button>
              <button
                type="button"
                onClick={() => {
                  d.setDuplicateFileDialog(null)
                  const reject = (window as unknown as { __duplicateFileReject?: (e: Error) => void })
                    .__duplicateFileReject
                  delete (window as unknown as Record<string, unknown>).__duplicateFileResolve
                  delete (window as unknown as Record<string, unknown>).__duplicateFileReject
                  delete (window as unknown as Record<string, unknown>).__duplicateFileData
                  reject?.(new Error('User cancelled'))
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div>
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{d.companyInfo.name}</h1>
                {d.companyInfo.abn && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">ABN:</span>
                    <span className="text-sm text-gray-700 font-semibold">{d.companyInfo.abn}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-2">{strings.dashboard.title}</h2>
          <p className="text-gray-600 mt-2">{strings.dashboard.subtitle}</p>
          <p className="text-gray-600">{strings.dashboard.subtitleLine2}</p>
        </div>
        <DashboardTabNav activeTab={d.activeTab} onTabChange={d.setActiveTab} />
      </div>

      {d.activeTab === 'dashboard' && (
        <BizIntelTabPanel
          error={d.error}
          onClearError={() => d.setError(null)}
          accountType={d.accountType}
          transactions={d.transactions}
          dashboardTransactions={d.dashboardTransactions}
          activeLedgerTransactions={d.activeLedgerTransactions}
          journeyFinancialYear={d.journeyFinancialYear}
          profileComplete={d.profileComplete}
          uncategorisedCount={d.uncategorisedCount}
          paymentSummaryCount={d.paymentSummaryCount}
          skipPaymentSummary={d.skipPaymentSummary}
          gstRegistered={d.gstRegistered}
          hasReviewedReports={d.hasReviewedReports}
          allPeriodsLocked={d.allPeriodsLocked}
          hasLodgmentSnapshot={d.hasLodgmentSnapshot}
          onJourneyNavigate={d.handleJourneyNavigate}
          viewPeriodId={d.viewPeriodId}
          viewPeriod={d.viewPeriod}
          viewingPeriod={d.viewingPeriod}
          lockedPeriodIds={d.lockedPeriodIds}
          totalIncome={d.totalIncome || 0}
          totalExpenses={d.totalExpenses || 0}
          netProfit={d.netProfit || 0}
          gstPayable={d.gstPayable || 0}
          gstClaimable={d.gstClaimable || 0}
          directorsLoanBalance={d.directorsLoanBalance || 0}
          personalSpendingNonDeductible={d.personalSpendingNonDeductible || 0}
          openingDirectorLoanBalance={d.openingDirectorLoanBalance}
          metricsOpeningDirectorLoan={d.metricsOpeningDirectorLoan}
          effectivePriorPeriodAdvances={d.effectivePriorPeriodAdvances}
          directorLoanReimbursementTotal={d.directorLoanReimbursementTotal}
          directorLoanInjectionTotal={d.directorLoanInjectionTotal}
          autoMatchPriorAdvances={d.autoMatchPriorAdvances}
          onPriorAdvancesChange={d.setPriorPeriodDirectorAdvances}
          onAutoMatchPriorAdvancesChange={d.setAutoMatchPriorAdvances}
          onOpeningBalanceChange={d.setOpeningDirectorLoanBalance}
          companyInfo={d.companyInfo}
          sessionApiCost={d.sessionApiCost}
          appendMode={d.appendMode}
          onAppendModeChange={d.setAppendMode}
          isProcessing={d.isProcessing}
          processingStage={d.processingStage}
          apiKey={d.apiKey}
          userApiKey={d.userApiKey}
          classificationMode={d.classificationMode}
          onClassificationModeChange={d.onClassificationModeChange}
          onFileUpload={d.handleFileUpload}
          onExportExcel={d.handleExportExcel}
          onExportSummary={d.handleExportSummary}
          onExportBAS={d.handleExportBAS}
          gstReportingCycle={d.gstReportingCycle}
          onTransactionUpdate={d.handleTransactionUpdate}
          onSwitchViewPeriodToData={d.switchViewPeriodToTransactionData}
          onChangeViewPeriod={d.changeViewPeriod}
          onCashExpenseSave={d.handleCashExpenseSave}
          onCashExpenseDelete={d.handleCashExpenseDelete}
          activeStatementSnapshot={d.exportStatementSnapshot}
          isStatementLedgerScope={d.isStatementLedgerScope}
          reportsFyRange={d.reportsFyRange}
        />
      )}

      {d.activeTab === 'history' && (
        <HistoryPage
          statementHistory={d.statementHistory}
          storageSize={d.storageSize}
          formatStorageSize={d.formatStorageSize}
          onLoadStatement={d.loadStatement}
          onDeleteStatement={d.handleDeleteStatement}
          onDeleteAllStatements={d.handleDeleteAllStatements}
          showDeleteConfirm={d.showDeleteConfirm}
          setShowDeleteConfirm={d.setShowDeleteConfirm}
          onReloadHistory={d.loadStatementHistory}
          historyLoadError={d.historyLoadError}
          unsavedCacheTransactionCount={d.unsavedCacheTransactionCount}
          onRecoverFromBrowserCache={d.recoverTransactionsFromBrowserCache}
        />
      )}

      {d.activeTab === 'reports' && (
        <div className="space-y-6">
          <ReportsTabPanel
            transactions={d.reportMappedTransactions}
            accountType={d.accountType}
            taxpayerName={d.companyInfo.name}
            onGoToDashboard={() => d.setActiveTab('dashboard')}
            onOpenAtoLodgment={() => d.setActiveTab('ato')}
            reportMappedTransactions={d.reportMappedTransactions}
            reportsFyRange={d.reportsFyRange}
            financialPeriods={d.financialPeriods}
            lockedPeriodIds={d.lockedPeriodIds}
            viewPeriodId={d.viewPeriodId}
            viewingPeriod={d.viewingPeriod}
            reportsScopeMode={d.reportsScopeMode}
            onReportsScopeModeChange={d.handleReportsScopeModeChange}
            reportsFyTransactions={d.reportsFyTransactions}
            reportsBasTransactions={d.reportsBasTransactions}
            reportsBasDisplayTransactions={d.reportsBasDisplayTransactions}
            reportsBasOpeningDirectorLoan={d.reportsBasOpeningDirectorLoan}
            reportsBasPriorAdvances={d.reportsBasPriorAdvances}
            reportsBasMatchesViewPeriod={d.reportsBasMatchesViewPeriod}
            reportsOpeningDirectorLoan={d.reportsOpeningDirectorLoan}
            reportsBasQuarter={d.reportsBasQuarter}
            gstRegistered={d.gstRegistered}
            gstReportingCycle={d.gstReportingCycle}
            companyTaxRate={d.companyTaxRate}
            onJournalChanged={d.loadAllTransactions}
            onSubledgerChanged={d.loadAllTransactions}
            matchUploadedStatement={d.isStatementLedgerScope}
          />
        </div>
      )}

      {d.activeTab === 'ato' && (
        <div className="space-y-6">
          <AtoLodgmentTabPanel
            transactions={d.reportMappedTransactions}
            accountType={d.accountType}
            individualName={d.companyInfo.name}
            companyName={d.companyInfo.name}
            abn={d.companyInfo.abn}
            onGoToDashboard={() => d.setActiveTab('dashboard')}
            openingDirectorLoanBalance={d.openingDirectorLoanBalance}
            metricsOpeningDirectorLoan={d.metricsOpeningDirectorLoan}
            effectivePriorPeriodAdvances={d.effectivePriorPeriodAdvances}
            viewPeriod={d.viewPeriod}
            openingCashBalance={d.openingCashBalance}
            financialPeriods={d.financialPeriods}
            viewPeriodId={d.viewPeriodId}
            viewingPeriod={d.viewingPeriod}
            lockedPeriodIds={d.lockedPeriodIds}
            onPeriodsChanged={d.setFinancialPeriods}
            gstReportingCycle={d.gstReportingCycle}
            gstRegistered={d.gstRegistered}
            companyTaxRate={d.companyTaxRate}
            matchUploadedStatement={d.isStatementLedgerScope}
          />
        </div>
      )}

      {d.activeTab === 'hr' && <HrPayrollTabPanel transactions={d.transactions} />}

      {d.activeTab === 'settings' && (
        <SettingsPage
          apiKey={d.apiKey}
          userApiKey={d.userApiKey}
          directorName={d.directorName}
          onApiKeySet={(key) => d.setApiKey(key)}
          onUserApiKeySet={(key) => d.setUserApiKey(key)}
          onDirectorNameSet={(name) => d.setDirectorName(name)}
          onNavigateToPayroll={() => d.setActiveTab('hr')}
          transactions={d.transactions}
          openingDirectorLoanBalance={d.openingDirectorLoanBalance}
          onOpeningBalanceChange={d.setOpeningDirectorLoanBalance}
          priorPeriodDirectorAdvances={d.priorPeriodDirectorAdvances}
          onPriorAdvancesChange={d.setPriorPeriodDirectorAdvances}
          autoMatchPriorAdvances={d.autoMatchPriorAdvances}
          onAutoMatchPriorAdvancesChange={d.setAutoMatchPriorAdvances}
          directorLoanReimbursementTotal={d.directorLoanReimbursementTotal}
          openingCashBalance={d.openingCashBalance}
          viewPeriodId={d.viewPeriodId}
          onClearAllData={() => {
            d.setTransactions([])
            d.setCurrentStatementId(null)
            d.setOpeningDirectorLoanBalance(0)
            d.setPriorPeriodDirectorAdvances(0)
            d.setAutoMatchPriorAdvances(false)
          }}
          onTransactionUpdate={d.handleTransactionUpdate}
          onReloadTransactions={d.loadAllTransactions}
        />
      )}
    </div>
  )
}
