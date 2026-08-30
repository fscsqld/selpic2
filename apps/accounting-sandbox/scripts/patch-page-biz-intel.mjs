import fs from 'fs'

const pagePath = 'app/page.tsx'
let content = fs.readFileSync(pagePath, 'utf8')
const lines = content.split(/\r?\n/)

const startMarker = '      {/* Dashboard Tab Content */}'
const endMarker = '      {/* History Tab Content */}'

const startIdx = lines.findIndex((l) => l.includes(startMarker))
const endIdx = lines.findIndex((l) => l.includes(endMarker))

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found', startIdx, endIdx)
  process.exit(1)
}

const replacement = `      {activeTab === 'dashboard' && (
        <BizIntelTabPanel
          error={error}
          onClearError={() => setError(null)}
          accountType={accountType}
          transactions={transactions}
          dashboardTransactions={dashboardTransactions}
          journeyFinancialYear={journeyFinancialYear}
          profileComplete={profileComplete}
          uncategorisedCount={uncategorisedCount}
          paymentSummaryCount={paymentSummaryCount}
          hasReviewedReports={hasReviewedReports}
          allPeriodsLocked={allPeriodsLocked}
          hasLodgmentSnapshot={hasLodgmentSnapshot}
          onJourneyNavigate={handleJourneyNavigate}
          viewPeriodId={viewPeriodId}
          viewingPeriod={viewingPeriod}
          lockedPeriodIds={lockedPeriodIds}
          totalIncome={totalIncome || 0}
          totalExpenses={totalExpenses || 0}
          netProfit={netProfit || 0}
          gstPayable={gstPayable || 0}
          gstClaimable={gstClaimable || 0}
          directorsLoanBalance={directorsLoanBalance || 0}
          personalSpendingNonDeductible={personalSpendingNonDeductible || 0}
          openingDirectorLoanBalance={openingDirectorLoanBalance}
          metricsOpeningDirectorLoan={metricsOpeningDirectorLoan}
          onOpeningBalanceChange={setOpeningDirectorLoanBalance}
          companyInfo={companyInfo}
          sessionApiCost={sessionApiCost}
          appendMode={appendMode}
          onAppendModeChange={setAppendMode}
          isProcessing={isProcessing}
          processingStage={processingStage}
          apiKey={apiKey}
          userApiKey={userApiKey}
          onFileUpload={handleFileUpload}
          onExportExcel={handleExportExcel}
          onExportSummary={handleExportSummary}
          onExportBAS={handleExportBAS}
          onTransactionUpdate={handleTransactionUpdate}
          onCashExpenseSave={handleCashExpenseSave}
        />
      )}

`

const newLines = [...lines.slice(0, startIdx), ...replacement.split('\n'), ...lines.slice(endIdx)]
fs.writeFileSync(pagePath, newLines.join('\n'))
console.log('Replaced dashboard block, removed', endIdx - startIdx, 'lines')
