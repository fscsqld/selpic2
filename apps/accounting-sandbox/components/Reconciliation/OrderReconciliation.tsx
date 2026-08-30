'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Link2,
  Unlink,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import {
  applyOrderBankMatch,
  buildMatchSuggestions,
  clearOrderBankMatch,
  getOrderTotalAmount,
  getTransactionKey,
  isBankDepositCandidate,
  isUnmatchedOrder,
  type MatchSuggestion,
  type ReconciliationOrder,
  type ReconciliationTransaction,
} from '@/lib/order-reconciliation/reconciliation'

interface OrderReconciliationProps {
  transactions: ReconciliationTransaction[]
  onTransactionUpdate?: (id: string, updates: Partial<ReconciliationTransaction>) => void
  onReloadTransactions?: () => Promise<void>
}

export function OrderReconciliation({
  transactions,
  onTransactionUpdate,
  onReloadTransactions,
}: OrderReconciliationProps) {
  const [orders, setOrders] = useState<ReconciliationOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedDepositKey, setSelectedDepositKey] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  )

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const approved = await indexedDBStorage.getAllIncomingOrders('approved')
      const all = await indexedDBStorage.getAllIncomingOrders()
      const merged = [...approved, ...all.filter((o) => o.inboxStatus !== 'approved')]
      const byId = new Map<string, ReconciliationOrder>()
      for (const o of merged) {
        byId.set(o.id, o as ReconciliationOrder)
      }
      setOrders(Array.from(byId.values()))
    } catch (err) {
      console.error('[OrderReconciliation] load failed:', err)
      setMessage({ type: 'error', text: 'Failed to load orders.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const unmatchedOrders = useMemo(() => orders.filter(isUnmatchedOrder), [orders])

  const matchedOrders = useMemo(
    () => orders.filter((o) => o.inboxStatus === 'approved' && o.matchedTransactionId),
    [orders]
  )

  const depositCandidates = useMemo(() => {
    return transactions
      .map((tx, index) => ({
        tx,
        index,
        key: getTransactionKey(tx, index),
      }))
      .filter(({ tx }) => isBankDepositCandidate(tx))
  }, [transactions])

  const suggestions = useMemo(
    () => buildMatchSuggestions(orders, transactions, 0.5),
    [orders, transactions]
  )

  const topSuggestions = useMemo(
    () => suggestions.filter((s) => s.confidence >= 0.8).slice(0, 10),
    [suggestions]
  )

  const selectedOrder = unmatchedOrders.find((o) => o.id === selectedOrderId) ?? null

  const suggestionsForSelected = useMemo(() => {
    if (!selectedOrder) return []
    return suggestions
      .filter((s) => s.orderRecordId === selectedOrder.id)
      .slice(0, 5)
  }, [selectedOrder, suggestions])

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const refreshAll = async () => {
    await loadOrders()
    if (onReloadTransactions) await onReloadTransactions()
  }

  const handleMatch = async (
    order: ReconciliationOrder,
    tx: ReconciliationTransaction,
    txIndex: number,
    matchType: 'exact' | 'fuzzy' | 'manual' = 'manual'
  ) => {
    const txKey = getTransactionKey(tx, txIndex)
    setProcessing(true)
    try {
      await applyOrderBankMatch(order, tx, txKey, matchType, onTransactionUpdate)
      await refreshAll()
      setSelectedOrderId(null)
      setSelectedDepositKey(null)
      showMessage('success', `Matched order ${order.orderId} to bank deposit. Journal duplicate excluded.`)
    } catch (err) {
      console.error('[OrderReconciliation] match failed:', err)
      showMessage('error', err instanceof Error ? err.message : 'Match failed.')
    } finally {
      setProcessing(false)
    }
  }

  const handleManualMatch = async () => {
    if (!selectedOrder || !selectedDepositKey) return
    const deposit = depositCandidates.find((d) => d.key === selectedDepositKey)
    if (!deposit) return
    await handleMatch(selectedOrder, deposit.tx, deposit.index, 'manual')
  }

  const handleAutoMatchAll = async () => {
    if (topSuggestions.length === 0) {
      showMessage('info', 'No high-confidence matches found (80%+).')
      return
    }
    if (!confirm(`Apply ${topSuggestions.length} suggested match(es) with 80%+ confidence?`)) return

    setProcessing(true)
    let count = 0
    const usedTx = new Set<string>()

    try {
      for (const suggestion of topSuggestions) {
        if (usedTx.has(suggestion.transactionKey)) continue
        const deposit = depositCandidates.find((d) => d.key === suggestion.transactionKey)
        if (!deposit) continue

        await applyOrderBankMatch(
          suggestion.order,
          deposit.tx,
          deposit.key,
          suggestion.confidence >= 0.95 ? 'exact' : 'fuzzy',
          onTransactionUpdate
        )
        usedTx.add(suggestion.transactionKey)
        count++
      }
      await refreshAll()
      showMessage('success', `Auto-matched ${count} order(s).`)
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Auto-match failed.')
    } finally {
      setProcessing(false)
    }
  }

  const handleUnmatch = async (order: ReconciliationOrder) => {
    if (!order.matchedTransactionId) return
    if (!confirm(`Remove match for order ${order.orderId}?`)) return

    setProcessing(true)
    try {
      await clearOrderBankMatch(order, order.matchedTransactionId, onTransactionUpdate)
      await refreshAll()
      showMessage('info', `Match removed for ${order.orderId}.`)
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Unmatch failed.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="card flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Link2 className="w-6 h-6 text-blue-600" />
              Order Reconciliation
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Match approved SELPIC orders to bank deposit (CREDIT) transactions to prevent double-counting income.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshAll}
              disabled={processing}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleAutoMatchAll}
              disabled={processing || topSuggestions.length === 0}
              className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Auto-match ({topSuggestions.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-700">Unmatched orders</p>
            <p className="text-xl font-bold text-orange-900">{unmatchedOrders.length}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">Unmatched deposits</p>
            <p className="text-xl font-bold text-blue-900">{depositCandidates.length}</p>
          </div>
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">Matched</p>
            <p className="text-xl font-bold text-green-900">{matchedOrders.length}</p>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-700">Suggestions (80%+)</p>
            <p className="text-xl font-bold text-purple-900">{topSuggestions.length}</p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-md flex items-center gap-2 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : message.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}
      </div>

      {topSuggestions.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Suggested matches
          </h3>
          <div className="space-y-2">
            {topSuggestions.map((s) => (
              <div
                key={`${s.orderRecordId}-${s.transactionKey}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3 border border-indigo-100 bg-indigo-50/50 rounded-lg"
              >
                <div className="text-sm">
                  <span className="font-medium">{s.order.orderId}</span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span>{s.transaction.description.slice(0, 40)}</span>
                  <span className="ml-2 text-indigo-700 font-medium">
                    {Math.round(s.confidence * 100)}% match
                  </span>
                </div>
                <button
                  onClick={() => {
                    const dep = depositCandidates.find((d) => d.key === s.transactionKey)
                    if (dep) handleMatch(s.order, dep.tx, dep.index, s.confidence >= 0.95 ? 'exact' : 'fuzzy')
                  }}
                  disabled={processing}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Unmatched orders (approved)</h3>
          {unmatchedOrders.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">All approved orders are matched.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {unmatchedOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(order.id)
                    setSelectedDepositKey(null)
                  }}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    selectedOrderId === order.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{order.orderId}</p>
                      <p className="text-xs text-gray-600">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{formatDateAustralian(order.transactionDate)}</p>
                    </div>
                    <p className="font-semibold text-green-700">
                      {formatCurrency(getOrderTotalAmount(order))}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Unmatched bank deposits</h3>
          {depositCandidates.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No unmatched CREDIT transactions found.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {depositCandidates.map(({ tx, index, key }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDepositKey(key)}
                  disabled={!selectedOrderId}
                  className={`w-full text-left p-3 border rounded-lg transition-colors disabled:opacity-60 ${
                    selectedDepositKey === key
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-500">{formatDateAustralian(tx.date)}</p>
                    </div>
                    <p className="font-semibold text-green-700 shrink-0">
                      {formatCurrency(tx.credit || 0)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="card border-blue-200 bg-blue-50/30">
          <h3 className="font-semibold text-gray-900 mb-3">Manual match</h3>
          <p className="text-sm text-gray-700 mb-3">
            Selected order: <strong>{selectedOrder.orderId}</strong> (
            {formatCurrency(getOrderTotalAmount(selectedOrder))})
          </p>

          {suggestionsForSelected.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Best deposit matches:</p>
              <div className="space-y-1">
                {suggestionsForSelected.map((s) => (
                  <button
                    key={s.transactionKey}
                    type="button"
                    onClick={() => setSelectedDepositKey(s.transactionKey)}
                    className="w-full text-left text-sm px-2 py-1 rounded hover:bg-white/80"
                  >
                    {s.transaction.description.slice(0, 50)} —{' '}
                    {formatCurrency(s.transaction.credit || 0)} ({Math.round(s.confidence * 100)}%)
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleManualMatch}
            disabled={processing || !selectedDepositKey}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Match selected order to deposit
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {matchedOrders.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Matched orders</h3>
          <div className="space-y-2">
            {matchedOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 border border-green-200 bg-green-50/50 rounded-lg"
              >
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{order.orderId}</p>
                  <p className="text-gray-600">
                    {formatCurrency(getOrderTotalAmount(order))} · {order.matchType || 'manual'} match
                    {order.matchedAt && ` · ${formatDateAustralian(order.matchedAt)}`}
                  </p>
                </div>
                <button
                  onClick={() => handleUnmatch(order)}
                  disabled={processing}
                  className="px-3 py-1.5 border border-gray-300 text-sm rounded-md hover:bg-white flex items-center gap-1"
                >
                  <Unlink className="w-3 h-3" />
                  Unmatch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
