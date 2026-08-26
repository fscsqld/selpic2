/**
 * Order ↔ bank deposit reconciliation helpers.
 *
 * Unmatched deposits = CREDIT lines that could be SELPIC order income.
 * Never list Director Loan, ATO refunds, equity, transfers, or Cash Expense.
 */

import { Order } from '@/src/shared/types/order'
import { getMatchConfidence } from '@/src/features/transactions/matching'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { isManualCashExpenseTx } from '@/lib/dashboard/view-period-range'

export interface ReconciliationOrder {
  id: string
  orderId: string
  customerName: string
  customerEmail?: string
  grossAmount: number
  gstAmount: number
  transactionDate: string
  inboxStatus: string
  matchedTransactionId?: string
  matchType?: 'exact' | 'fuzzy' | 'manual'
  matchedAt?: string
  items?: Array<{ name: string; quantity: number; unitPrice: number }>
}

export interface ReconciliationTransaction {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  source?: string
  orderId?: string
  matchedOrderId?: string
  reference?: string
}

export interface MatchSuggestion {
  orderId: string
  orderRecordId: string
  transactionKey: string
  confidence: number
  order: ReconciliationOrder
  transaction: ReconciliationTransaction
}

/** Credits that are never SELPIC shop-order deposits. */
export const ORDER_RECON_EXCLUDED_CREDIT_CATEGORIES = new Set([
  'LIABILITY_DIRECTORS_LOAN',
  'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL',
  'NON_TAXABLE_ATO_GST_REFUND',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
  'NON_TAXABLE_CASH_DEPOSIT',
  'EQUITY_SHARE_CAPITAL',
  'NON_TAXABLE_TRANSFER',
  'TRANSFER_INTERNAL',
  'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
  'EXPENSE_DIRECTOR_LOAN_REPAYMENT',
])

export function getOrderTotalAmount(order: ReconciliationOrder): number {
  return order.grossAmount
}

export function incomingOrderToOrder(order: ReconciliationOrder): Order {
  const gst = order.gstAmount || 0
  const total = order.grossAmount
  const net = total - gst

  return {
    id: order.id,
    orderId: order.orderId,
    amount: net > 0 ? net : total / 1.1,
    gst: gst > 0 ? gst : total - total / 1.1,
    paymentMethod: 'card',
    transactionDate: order.transactionDate,
    status: order.matchedTransactionId ? 'matched' : 'approved',
    matchedTransactionId: order.matchedTransactionId,
    createdAt: order.transactionDate,
    updatedAt: new Date().toISOString(),
    metadata: {
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: order.items?.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.unitPrice,
      })),
    },
  }
}

export function getTransactionKey(
  tx: ReconciliationTransaction,
  index?: number
): string {
  if (tx.id) return index !== undefined ? `${tx.id}_${index}` : tx.id
  return `${tx.date}_${tx.description}_${index ?? 0}`
}

export function isUnmatchedOrder(order: ReconciliationOrder): boolean {
  return order.inboxStatus === 'approved' && !order.matchedTransactionId
}

/** True when category can be order trading revenue (or still uncategorised). */
export function isOrderMatchableIncomeCategory(category?: string): boolean {
  if (!category || category === 'UNCATEGORIZED') return true
  return category.startsWith('INCOME_')
}

/**
 * Misclassified director / capital credits (category missing or wrong).
 * Keep genuine INCOME_* rows even if description mentions "loan".
 */
export function looksLikeNonOrderCredit(tx: ReconciliationTransaction): boolean {
  if (tx.category?.startsWith('INCOME_')) return false
  const d = String(tx.description || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
  if (/\bDIRECTOR\s*LOAN\b/.test(d)) return true
  if (/\bLOAN\b/.test(d) && /\b(KIM|JINSOO|MR\s+J)/.test(d)) return true
  if (/\bINITIAL\b/.test(d) && /\b(KIM|JINSOO|MR\s+J)/.test(d)) return true
  if (/\bATO\b/.test(d) && /\b(REFUND|GST|I00)/.test(d)) return true
  if (/\bRETURN\b/.test(d) && /\b(KIM|JINSOO|ERRONEOUS)/.test(d)) return true
  return false
}

/**
 * Bank CREDIT that may match a SELPIC approved order.
 * Excludes Director Loan, ATO, equity, transfers, Cash Expense, payroll.
 */
export function isBankDepositCandidate(tx: ReconciliationTransaction): boolean {
  if (!tx.credit || tx.credit <= 0) return false
  if (tx.matchedOrderId) return false
  if (isManualCashExpenseTx(tx)) return false
  if (tx.source === 'selpic_orders' || tx.source === 'payroll') return false
  if (tx.category && ORDER_RECON_EXCLUDED_CREDIT_CATEGORIES.has(tx.category)) {
    return false
  }
  if (!isOrderMatchableIncomeCategory(tx.category)) return false
  if (looksLikeNonOrderCredit(tx)) return false
  return true
}

export function buildMatchSuggestions(
  orders: ReconciliationOrder[],
  transactions: ReconciliationTransaction[],
  minConfidence = 0.5
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = []
  const unmatchedOrders = orders.filter(isUnmatchedOrder)
  const depositCandidates = transactions
    .map((tx, index) => ({ tx, index, key: getTransactionKey(tx, index) }))
    .filter(({ tx }) => isBankDepositCandidate(tx))

  for (const order of unmatchedOrders) {
    const orderModel = incomingOrderToOrder(order)

    for (const { tx, index, key } of depositCandidates) {
      const alreadySuggested = suggestions.some(
        (s) => s.transactionKey === key && s.confidence >= 0.8
      )
      if (alreadySuggested) continue

      const confidence = getMatchConfidence(orderModel, {
        id: tx.id || key,
        date: tx.date,
        description: tx.description,
        debit: tx.debit,
        credit: tx.credit,
        category: tx.category,
      })

      const customerHint = order.customerName
        ? tx.description.toLowerCase().includes(order.customerName.toLowerCase())
        : false
      const orderIdHint = tx.description.toLowerCase().includes(order.orderId.toLowerCase())
      const boosted = Math.min(
        1,
        confidence + (customerHint ? 0.1 : 0) + (orderIdHint ? 0.15 : 0)
      )

      if (boosted >= minConfidence) {
        suggestions.push({
          orderId: order.orderId,
          orderRecordId: order.id,
          transactionKey: key,
          confidence: boosted,
          order,
          transaction: tx,
        })
      }
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

export async function persistTransactionMatch(
  transactionKey: string,
  matchedOrderId: string,
  category?: string
): Promise<boolean> {
  const statements = await indexedDBStorage.getAllStatements()

  for (const statement of statements) {
    if (!statement.transactions?.length) continue

    let changed = false
    const updatedTransactions = statement.transactions.map((tx: ReconciliationTransaction, index: number) => {
      const key = getTransactionKey(tx, index)
      const baseId = tx.id || ''
      const keyMatches =
        key === transactionKey ||
        baseId === transactionKey ||
        (transactionKey.startsWith(baseId) && baseId.length > 0)

      if (!keyMatches) return tx

      changed = true
      return {
        ...tx,
        matchedOrderId,
        ...(category ? { category } : {}),
      }
    })

    if (changed) {
      await indexedDBStorage.updateStatement(statement.id, {
        ...statement,
        transactions: updatedTransactions,
      })
      return true
    }
  }

  return false
}

export async function clearTransactionMatch(transactionKey: string): Promise<boolean> {
  const statements = await indexedDBStorage.getAllStatements()

  for (const statement of statements) {
    if (!statement.transactions?.length) continue

    let changed = false
    const updatedTransactions = statement.transactions.map((tx: ReconciliationTransaction, index: number) => {
      const key = getTransactionKey(tx, index)
      if (key !== transactionKey && tx.id !== transactionKey) return tx

      changed = true
      const { matchedOrderId, ...rest } = tx as ReconciliationTransaction & { matchedOrderId?: string }
      void matchedOrderId
      return rest
    })

    if (changed) {
      await indexedDBStorage.updateStatement(statement.id, {
        ...statement,
        transactions: updatedTransactions,
      })
      return true
    }
  }

  return false
}

export async function excludeSyntheticOrderTransaction(orderId: string): Promise<boolean> {
  const statements = await indexedDBStorage.getAllStatements()

  for (const statement of statements) {
    if (!statement.transactions?.length) continue

    const txIndex = statement.transactions.findIndex((tx: ReconciliationTransaction) => {
      return (
        tx.orderId === orderId ||
        (tx.source === 'selpic_orders' &&
          (tx.description?.includes(orderId) || tx.reference === orderId))
      )
    })

    if (txIndex < 0) continue

    const updatedTransactions = [...statement.transactions]
    const existing = updatedTransactions[txIndex] as ReconciliationTransaction
    updatedTransactions[txIndex] = {
      ...existing,
      category: 'NON_TAXABLE_TRANSFER',
      matchedOrderId: orderId,
      reconciliationNote: `Excluded: bank deposit matched for order ${orderId}`,
    }

    await indexedDBStorage.updateStatement(statement.id, {
      ...statement,
      transactions: updatedTransactions,
    })
    return true
  }

  return false
}

export async function applyOrderBankMatch(
  order: ReconciliationOrder,
  transaction: ReconciliationTransaction,
  transactionKey: string,
  matchType: 'exact' | 'fuzzy' | 'manual',
  onTransactionUpdate?: (id: string, updates: Partial<ReconciliationTransaction>) => void
): Promise<void> {
  await indexedDBStorage.updateIncomingOrderMatch(order.id, transactionKey, matchType, 'owner')

  const category = transaction.category?.startsWith('INCOME_')
    ? transaction.category
    : 'INCOME_SALES_CLEANING'

  await persistTransactionMatch(transactionKey, order.orderId, category)

  if (onTransactionUpdate) {
    onTransactionUpdate(transactionKey, {
      matchedOrderId: order.orderId,
      category,
    })
  }

  await excludeSyntheticOrderTransaction(order.orderId)
}

export async function clearOrderBankMatch(
  order: ReconciliationOrder,
  transactionKey: string,
  onTransactionUpdate?: (id: string, updates: Partial<ReconciliationTransaction>) => void
): Promise<void> {
  await indexedDBStorage.clearIncomingOrderMatch(order.id)
  await clearTransactionMatch(transactionKey)

  if (onTransactionUpdate) {
    onTransactionUpdate(transactionKey, { matchedOrderId: undefined })
  }
}
