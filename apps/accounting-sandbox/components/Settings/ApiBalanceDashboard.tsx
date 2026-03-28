'use client'

import { useState, useEffect } from 'react'
import { DollarSign, ExternalLink, AlertTriangle, CheckCircle, Loader2, RotateCcw, Info, ChevronDown, ChevronUp } from 'lucide-react'

interface ApiBalanceDashboardProps {
  apiKey: string | null
  userApiKey: string | null
}

interface UsageData {
  totalUsage: number
  estimatedRemaining: number | null
  hasLowBalance: boolean
  budgetExceeded: boolean
  budgetLimit: number | null
  lastUpdated: string
  error?: string
  message?: string
  dashboardUrl?: string
  stats?: {
    totalCost: number
    totalTokens: number
    callCount: number
    byModel: Record<string, { cost: number; tokens: number; calls: number }>
  }
  // User-provided balance info (from manual input or initial setup)
  initialBalance?: number
  actualUsage?: number
  actualRemaining?: number
}

export function ApiBalanceDashboard({ apiKey, userApiKey }: ApiBalanceDashboardProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [syncStatus, setSyncStatus] = useState<'auto' | 'manual' | null>(null)
  const [recentLogs, setRecentLogs] = useState<Array<{
    id: string
    timestamp: string
    model: string
    estimatedCost: number
    totalTokens: number
  }>>([])
  // Recent API Usage Logs collapse state
  const [isRecentLogsExpanded, setIsRecentLogsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recentApiLogs_expanded')
      return saved === 'true'
    }
    return true // Default to expanded
  })
  // Removed manual input features - focusing on auto-tracking only

  // Determine which API key to use (user's key takes priority)
  const effectiveApiKey = userApiKey || apiKey

  const fetchUsage = async (forceSync: boolean = false) => {
    if (!effectiveApiKey) {
      setError('No API key configured')
      return
    }

    setIsLoading(true)
    setError(null)

    // Preserve existing usageData in case of error
    const previousUsageData = usageData

    try {
      const { indexedDBStorage } = await import('@/lib/storage/indexed-db')
      
      // Ensure IndexedDB is initialized
      if (!indexedDBStorage) {
        throw new Error('IndexedDB storage not available')
      }
      
      // Get stored balance from IndexedDB (with defaults)
      // IMPORTANT: Always load from IndexedDB first - stored values take priority
      let storedBalance = await indexedDBStorage.getApiBalance(effectiveApiKey)
      
      // Fixed values - no manual override
      const INITIAL_BALANCE = 5.00
      const BUDGET_LIMIT = 10.00
      
      // Always use auto-calculated usage from IndexedDB (sum of all transaction costs)
      // This is the single source of truth
      let initialBalance = INITIAL_BALANCE
      let actualUsage: number
      let actualRemaining: number
      let budgetLimit = BUDGET_LIMIT
      
      // Get current month's tracked usage from IndexedDB (AUTO-SYNC)
      // Use useMonthStart=true to get data from the start of current month
      let stats
      let autoCalculatedUsage = 0
      let autoSyncSuccessful = false
      
      try {
        stats = await indexedDBStorage.getApiUsageStats(30, true) // true = use month start
        autoCalculatedUsage = stats.totalCost
        
        console.log('[API Balance] Auto-calculated usage from IndexedDB:', {
          totalCost: autoCalculatedUsage,
          callCount: stats.callCount,
          totalTokens: stats.totalTokens
        })
        
        // Mark as successful if we got valid data (even if 0, but with proper stats)
        autoSyncSuccessful = true
      } catch (statsErr: any) {
        console.warn('[API Balance] Failed to get API usage stats:', statsErr)
        // Use default stats if getApiUsageStats fails
        stats = {
          totalCost: 0,
          totalTokens: 0,
          callCount: 0,
          byModel: {}
        }
        autoSyncSuccessful = false
      }
      
      // Always use auto-calculated usage from IndexedDB (sum of all API transaction costs)
      // This is the single source of truth
      actualUsage = autoCalculatedUsage
      actualRemaining = initialBalance - actualUsage
      
      // Always save auto-calculated values (this is the source of truth)
      try {
        await indexedDBStorage.saveApiBalance(effectiveApiKey, {
          initialBalance: INITIAL_BALANCE,
          actualUsage,
          actualRemaining,
          budgetLimit: BUDGET_LIMIT,
          lastSyncedAt: new Date().toISOString()
        })
        setSyncStatus('auto')
        console.log('[API Balance] ✅ Auto-sync successful:', {
          initialBalance: INITIAL_BALANCE,
          budgetLimit: BUDGET_LIMIT,
          actualUsage,
          actualRemaining,
          autoCalculatedUsage
        })
      } catch (saveErr) {
        console.warn('[API Balance] Failed to save balance:', saveErr)
        setSyncStatus('auto')
      }

      // Check budget exceeded
      const budgetExceeded = budgetLimit !== null && actualUsage > budgetLimit

      // Update usage data - auto-calculated from IndexedDB
      setUsageData({
        totalUsage: actualUsage, // Auto-synced from tracked API calls (sum of all transaction costs)
        estimatedRemaining: actualRemaining, // Auto-calculated: $5.00 - Usage
        hasLowBalance: actualRemaining < 0.50,
        budgetExceeded: budgetExceeded,
        budgetLimit: budgetLimit,
        lastUpdated: new Date().toISOString(),
        stats: stats || {
          totalCost: 0,
          totalTokens: 0,
          callCount: 0,
          byModel: {}
        },
        initialBalance: initialBalance, // Fixed: $5.00
        actualUsage: actualUsage,
        actualRemaining: actualRemaining,
      })
      setLastRefresh(new Date())
      
      // Auto-tracking: No manual inputs to preserve
      
      // Load recent API usage logs
      try {
        const recentLogsData = await indexedDBStorage.getRecentApiUsageLogs(5)
        setRecentLogs(recentLogsData)
      } catch (logsErr) {
        console.warn('[API Balance] Failed to load recent logs:', logsErr)
        // Don't set empty array, keep previous logs if available
      }
    } catch (err: any) {
      console.error('[API Balance] Error fetching usage:', err)
      setError(`Failed to fetch usage data: ${err.message || 'Unknown error'}. Previous data preserved.`)
      
      // Preserve previous usageData if available, otherwise set minimal data
      if (previousUsageData) {
        console.log('[API Balance] Preserving previous usage data due to error')
        // Keep previous data but update error state
      } else {
        // If no previous data, set minimal default data to prevent UI from breaking
        setUsageData({
          totalUsage: 0,
          estimatedRemaining: 5.00,
          hasLowBalance: false,
          budgetExceeded: false,
          budgetLimit: 10.00,
          lastUpdated: new Date().toISOString(),
          stats: {
            totalCost: 0,
            totalTokens: 0,
            callCount: 0,
            byModel: {}
          },
          initialBalance: 5.00,
          actualUsage: 0,
          actualRemaining: 5.00,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load: Load from IndexedDB first, then sync
  useEffect(() => {
    if (effectiveApiKey) {
      // Step 1: Load stored values from IndexedDB immediately
      const loadStoredValues = async () => {
        try {
          const { indexedDBStorage } = await import('@/lib/storage/indexed-db')
          const storedBalance = await indexedDBStorage.getApiBalance(effectiveApiKey)
          
          if (storedBalance) {
            console.log('[API Balance] Initial load from IndexedDB:', storedBalance)
            
            // Immediately update usageData with stored values (before fetchUsage)
            setUsageData({
              totalUsage: storedBalance.actualUsage,
              estimatedRemaining: storedBalance.actualRemaining,
              hasLowBalance: storedBalance.actualRemaining < 0.50,
              budgetExceeded: storedBalance.actualUsage > storedBalance.budgetLimit,
              budgetLimit: storedBalance.budgetLimit,
              lastUpdated: storedBalance.updatedAt || new Date().toISOString(),
              stats: {
                totalCost: storedBalance.actualUsage,
                totalTokens: 0,
                callCount: 0,
                byModel: {}
              },
              initialBalance: storedBalance.initialBalance,
              actualUsage: storedBalance.actualUsage,
              actualRemaining: storedBalance.actualRemaining,
            })
            setSyncStatus('auto') // Auto-tracked from IndexedDB
          }
        } catch (err) {
          console.warn('[API Balance] Failed to load stored values on init:', err)
        }
      }
      
      // Load stored values first (for initial display)
      loadStoredValues()
      
      // Then fetch usage (auto-calculated from IndexedDB)
      fetchUsage(false)
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => fetchUsage(false), 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [effectiveApiKey])

  // Save Recent API Usage Logs collapse state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('recentApiLogs_expanded', isRecentLogsExpanded.toString())
    }
  }, [isRecentLogsExpanded])

  // Reset/Initialize API Balance Dashboard
  const handleReset = async () => {
    if (!effectiveApiKey) {
      setError('No API key configured')
      return
    }

    const confirmed = window.confirm(
      'API Balance Dashboard를 초기화하시겠습니까?\n\n' +
      '이 작업은 다음을 수행합니다:\n' +
      '• 저장된 잔액 정보 삭제\n' +
      '• 초기값으로 재설정 (Initial: $5.00, Budget: $10.00)\n' +
      '• 사용량 통계는 유지됩니다 (IndexedDB의 API Usage Logs)\n\n' +
      '계속하시겠습니까?'
    )

    if (!confirmed) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { indexedDBStorage } = await import('@/lib/storage/indexed-db')
      
      // Delete stored balance for this API key
      await indexedDBStorage.deleteApiBalance(effectiveApiKey)
      
      console.log('[API Balance] Dashboard reset successful')
      
      // Reset usage data to initial state
      const INITIAL_BALANCE = 5.00
      const BUDGET_LIMIT = 10.00
      
      // Get current usage from IndexedDB (this won't be reset)
      let stats
      let autoCalculatedUsage = 0
      
      try {
        stats = await indexedDBStorage.getApiUsageStats(30, true)
        autoCalculatedUsage = stats.totalCost
      } catch (statsErr) {
        stats = {
          totalCost: 0,
          totalTokens: 0,
          callCount: 0,
          byModel: {}
        }
      }
      
      const actualRemaining = INITIAL_BALANCE - autoCalculatedUsage
      
      // Save reset balance
      await indexedDBStorage.saveApiBalance(effectiveApiKey, {
        initialBalance: INITIAL_BALANCE,
        actualUsage: autoCalculatedUsage,
        actualRemaining: actualRemaining,
        budgetLimit: BUDGET_LIMIT,
        lastSyncedAt: new Date().toISOString()
      })
      
      // Update UI
      setUsageData({
        totalUsage: autoCalculatedUsage,
        estimatedRemaining: actualRemaining,
        hasLowBalance: actualRemaining < 0.50,
        budgetExceeded: autoCalculatedUsage > BUDGET_LIMIT,
        budgetLimit: BUDGET_LIMIT,
        lastUpdated: new Date().toISOString(),
        stats: stats,
        initialBalance: INITIAL_BALANCE,
        actualUsage: autoCalculatedUsage,
        actualRemaining: actualRemaining,
      })
      
      setSyncStatus('auto')
      setLastRefresh(new Date())
      
      alert('✅ API Balance Dashboard가 성공적으로 초기화되었습니다.\n\n' +
            `Initial Balance: $${INITIAL_BALANCE.toFixed(2)}\n` +
            `Budget Limit: $${BUDGET_LIMIT.toFixed(2)}\n` +
            `Current Usage: $${autoCalculatedUsage.toFixed(4)}\n` +
            `Remaining: $${actualRemaining.toFixed(4)}`)
    } catch (err: any) {
      console.error('[API Balance] Error resetting dashboard:', err)
      setError(`초기화 실패: ${err.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!effectiveApiKey) {
    return (
      <div className="card">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          API Balance Dashboard
        </h2>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
          <p>Please configure an API key to view usage information.</p>
        </div>
      </div>
    )
  }

  const openAIBillingUrl = 'https://platform.openai.com/account/billing'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          API Balance Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <a
            href={openAIBillingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
            title="Open OpenAI Billing Dashboard"
          >
            <ExternalLink className="w-4 h-4" />
            Open Dashboard
          </a>
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
            title="Reset API Balance Dashboard to initial state"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {usageData && (
        <div className="space-y-4">
          {/* Sync Status Indicator */}
          {syncStatus && (
            <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${
              syncStatus === 'auto' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            }`}>
              {syncStatus === 'auto' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Auto-synced from tracked API calls</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Using manually entered values</span>
                </>
              )}
            </div>
          )}

          {/* Usage Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Usage Card */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-800">Total Usage (Current Month)</p>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">
                ${usageData.totalUsage.toFixed(4)}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {usageData.stats?.callCount ? `Auto-synced from ${usageData.stats.callCount} API calls` : 'Auto-synced from tracked usage'}
              </p>
              {usageData.message && (
                <p className="text-xs text-blue-700 mt-1">{usageData.message}</p>
              )}
            </div>

            {/* Estimated Remaining Card */}
            <div className={`p-4 border rounded-lg ${
              usageData.estimatedRemaining !== null
                ? usageData.hasLowBalance || usageData.budgetExceeded
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${
                    usageData.estimatedRemaining !== null
                      ? usageData.hasLowBalance || usageData.budgetExceeded
                        ? 'text-red-800'
                        : 'text-green-800'
                      : 'text-yellow-800'
                  }`}>
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold text-orange-600">Est.</span>
                      Remaining
                    </span>
                  </p>
                  <Info 
                    className="w-4 h-4 text-amber-600 cursor-help" 
                    title="This is an estimated value based on local logs. For accurate billing, check OpenAI Dashboard."
                  />
                </div>
                {usageData.estimatedRemaining !== null ? (
                  usageData.hasLowBalance || usageData.budgetExceeded ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                )}
              </div>
              {usageData.estimatedRemaining !== null ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-orange-600">Est.</span>
                    <p className={`text-2xl font-bold ${
                      usageData.hasLowBalance || usageData.budgetExceeded ? 'text-red-900' : 'text-green-900'
                    }`}>
                      ${usageData.estimatedRemaining.toFixed(4)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Initial: $5.00 - Usage: ${usageData.totalUsage.toFixed(4)} = Remaining: ${usageData.estimatedRemaining?.toFixed(4) || '0.00'}
                  </p>
                  {/* Accuracy Disclaimer */}
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-amber-800 font-medium">
                          Note: This balance is an estimate based on local logs. For the most accurate billing information, please refer to the official OpenAI Dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-yellow-900">
                    Unable to determine
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Set initial balance in settings to track remaining credits
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Budget Exceeded Warning */}
          {usageData.budgetExceeded && usageData.budgetLimit !== null && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 mb-1">Budget Exceeded</p>
                  <p className="text-sm text-red-700 mb-2">
                    Your usage (${usageData.totalUsage.toFixed(4)}) has exceeded your budget limit (${usageData.budgetLimit.toFixed(2)}).
                  </p>
                  <p className="text-sm text-red-700 mb-3">
                    Please increase your budget limit or reduce usage to continue using the service.
                  </p>
                  <a
                    href={openAIBillingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Update Budget in OpenAI Dashboard
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Low Balance Warning */}
          {usageData.hasLowBalance && !usageData.budgetExceeded && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 mb-1">Low Balance Warning</p>
                  <p className="text-sm text-red-700 mb-3">
                    Your API balance is running low (${usageData.estimatedRemaining?.toFixed(4) || '0.00'}). Please add credits to continue using the service.
                  </p>
                  <a
                    href={openAIBillingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Add Credits to OpenAI Account
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Manual input features removed - focusing on auto-tracking only */}
          
          {/* Recent API Usage Logs Table */}
          {recentLogs.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    Recent API Usage Logs
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {recentLogs.length} {recentLogs.length === 1 ? 'log' : 'logs'}
                    </span>
                  </h3>
                  <button
                    onClick={() => {
                      const newState = !isRecentLogsExpanded
                      setIsRecentLogsExpanded(newState)
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('recentApiLogs_expanded', newState.toString())
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    title={isRecentLogsExpanded ? 'Collapse' : 'Expand'}
                  >
                    <span className="text-xs font-medium">{isRecentLogsExpanded ? 'Hide' : 'Show'}</span>
                    {isRecentLogsExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Collapsible Content */}
                {isRecentLogsExpanded ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date & Time
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Model
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tokens
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recentLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {new Date(log.timestamp).toLocaleString('en-AU', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                  {log.model}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {log.totalTokens.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                                ${log.estimatedCost.toFixed(4)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {recentLogs.length === 5 && (
                      <p className="mt-2 text-xs text-gray-500 text-center">
                        Showing last 5 API calls. Check IndexedDB for full history.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Total Logs: <span className="text-blue-600 font-bold">{recentLogs.length}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Total Cost: <span className="font-medium text-gray-700">
                                ${recentLogs.reduce((sum, log) => sum + log.estimatedCost, 0).toFixed(4)}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Models used:</span>
                          <div className="flex gap-1 flex-wrap">
                            {Array.from(new Set(recentLogs.map(log => log.model))).map((model, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {model}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsRecentLogsExpanded(true)
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('recentApiLogs_expanded', 'true')
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        View All
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Accuracy Disclaimer Section */}
            <div className="pt-3 border-t border-gray-300">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 mb-1">
                      Accuracy Disclaimer
                    </p>
                    <p className="text-xs text-amber-700">
                      Note: This balance is an estimate based on local logs. For the most accurate billing information, please refer to the official OpenAI Dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">
                    Need to check your balance or add credits?
                  </p>
                  <p className="text-xs text-gray-600">
                    Visit your OpenAI billing dashboard for real-time balance and usage information.
                  </p>
                </div>
                <a
                  href={openAIBillingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <ExternalLink className="w-4 h-4" />
                  OpenAI Billing
                </a>
              </div>
            </div>

          {/* Usage Statistics */}
          {usageData.stats && usageData.stats.callCount > 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm font-medium text-gray-800 mb-3">Usage Statistics (Current Month)</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total API Calls</p>
                  <p className="text-lg font-semibold text-gray-900">{usageData.stats.callCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Tokens</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {usageData.stats.totalTokens.toLocaleString()}
                  </p>
                </div>
              </div>
              {Object.keys(usageData.stats.byModel).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-xs font-medium text-gray-700 mb-2">By Model:</p>
                  {Object.entries(usageData.stats.byModel).map(([model, data]) => (
                    <div key={model} className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{model}:</span>
                      <span>${data.cost.toFixed(4)} ({data.calls} calls, {data.tokens.toLocaleString()} tokens)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Last Updated */}
          {lastRefresh && (
            <div className="text-xs text-gray-500 text-center">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {isLoading && !usageData && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading usage data...</p>
        </div>
      )}
    </div>
  )
}
