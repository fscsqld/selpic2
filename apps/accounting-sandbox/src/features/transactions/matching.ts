/**
 * Transaction Matching - 거래 매칭 처리
 * 
 * 주문과 거래를 매칭하고 중복을 방지
 */

import { Order, OrderMatch } from '../../shared/types/order'
import { Transaction } from '../../shared/types/transaction'
import { TransactionMatchResult } from './types'
import { findMatchingTransaction } from './duplicate-detector'

/**
 * 주문과 거래 매칭
 * @param order - 주문
 * @param transactions - 거래 목록
 * @returns 매칭 결과
 */
export function matchOrderToTransaction(
  order: Order,
  transactions: Transaction[]
): TransactionMatchResult {
  // 이미 매칭된 경우
  if (order.matchedTransactionId) {
    const matchedTx = transactions.find(tx => tx.id === order.matchedTransactionId)
    if (matchedTx) {
      return {
        matched: true,
        transactionId: matchedTx.id,
        orderId: order.orderId,
        matchType: 'manual',
        confidence: 1.0,
      }
    }
  }
  
  // 자동 매칭 시도
  for (const transaction of transactions) {
    const matchResult = findMatchingTransaction(transaction, order)
    if (matchResult.matched) {
      return matchResult
    }
  }
  
  return {
    matched: false,
    matchType: 'none',
    confidence: 0,
  }
}

/**
 * 매칭 처리
 * @param order - 주문
 * @param transaction - 거래
 * @param matchType - 매칭 유형
 * @returns 매칭 정보
 */
export function handleMatching(
  order: Order,
  transaction: Transaction,
  matchType: 'exact' | 'fuzzy' | 'manual' = 'manual'
): OrderMatch {
  const match: OrderMatch = {
    orderId: order.orderId,
    transactionId: transaction.id!,
    matchType,
    confidence: matchType === 'exact' ? 1.0 : matchType === 'fuzzy' ? 0.8 : 1.0,
    matchedAt: new Date().toISOString(),
    matchedBy: 'system',
  }
  
  // 주문 상태 업데이트
  order.status = 'matched'
  order.matchedTransactionId = transaction.id
  order.updatedAt = new Date().toISOString()
  
  return match
}

/**
 * 매칭 신뢰도 계산
 * @param order - 주문
 * @param transaction - 거래
 * @returns 신뢰도 (0-1)
 */
export function getMatchConfidence(
  order: Order,
  transaction: Transaction
): number {
  let confidence = 0
  
  // 금액 매칭 (40% 가중치)
  const txAmount = Math.abs(transaction.debit || transaction.credit || 0)
  const orderAmount = order.amount + order.gst
  const amountDiff = Math.abs(txAmount - orderAmount)
  if (amountDiff <= 0.01) {
    confidence += 0.4
  } else if (amountDiff <= 1.0) {
    confidence += 0.2
  }
  
  // 날짜 매칭 (30% 가중치)
  const txDate = new Date(transaction.date)
  const orderDate = new Date(order.transactionDate)
  const dateDiff = Math.abs(txDate.getTime() - orderDate.getTime())
  if (dateDiff <= 86400000) { // 1일 이내
    confidence += 0.3
  } else if (dateDiff <= 604800000) { // 1주일 이내
    confidence += 0.15
  }
  
  // 설명 매칭 (30% 가중치)
  const desc1 = transaction.description.toLowerCase()
  const desc2 = order.orderId.toLowerCase()
  if (desc1.includes(desc2) || desc2.includes(desc1)) {
    confidence += 0.3
  } else if (order.metadata?.items?.some(item => desc1.includes(item.name.toLowerCase()))) {
    confidence += 0.15
  }
  
  return Math.min(confidence, 1.0)
}
