/**
 * Duplicate Detector - 중복 거래/주문 감지
 * 
 * Unique Key Guard: 은행 명세서 파싱 시 기존 거래와 중복 확인
 */

import { Transaction } from '../../shared/types/transaction'
import { Order } from '../../shared/types/order'
import { DuplicateCheckResult, TransactionMatchResult } from './types'

/**
 * 주문 ID 기반 중복 확인
 * @param orderId - 주문 ID
 * @param existingOrders - 기존 주문 목록
 * @returns 중복 확인 결과
 */
export function checkDuplicateOrder(
  orderId: string,
  existingOrders: Order[]
): DuplicateCheckResult {
  const existing = existingOrders.find(order => order.orderId === orderId)
  
  if (existing) {
    return {
      isDuplicate: true,
      existingTransactionId: existing.matchedTransactionId,
      matchType: 'orderId',
      confidence: 1.0,
      reason: `Order ID ${orderId} already exists`,
    }
  }
  
  return {
    isDuplicate: false,
  }
}

/**
 * 거래 중복 확인 (날짜/금액/내용 기반)
 * @param transaction - 확인할 거래
 * @param existingTransactions - 기존 거래 목록
 * @param tolerance - 금액 허용 오차 (기본 $0.01)
 * @returns 중복 확인 결과
 */
export function checkDuplicateTransaction(
  transaction: Transaction,
  existingTransactions: Transaction[],
  tolerance: number = 0.01
): DuplicateCheckResult {
  const amount = Math.abs(transaction.debit || transaction.credit || 0)
  const date = new Date(transaction.date)
  
  // Exact match: 같은 날짜, 같은 금액, 같은 설명
  const exactMatch = existingTransactions.find(tx => {
    const txAmount = Math.abs(tx.debit || tx.credit || 0)
    const txDate = new Date(tx.date)
    const amountMatch = Math.abs(txAmount - amount) <= tolerance
    const dateMatch = txDate.toDateString() === date.toDateString()
    const descMatch = tx.description.trim().toLowerCase() === transaction.description.trim().toLowerCase()
    
    return amountMatch && dateMatch && descMatch
  })
  
  if (exactMatch) {
    return {
      isDuplicate: true,
      existingTransactionId: exactMatch.id,
      matchType: 'exact',
      confidence: 1.0,
      reason: 'Exact match found (date, amount, description)',
    }
  }
  
  // Fuzzy match: 같은 날짜, 비슷한 금액 (±$1), 비슷한 설명
  const fuzzyMatch = existingTransactions.find(tx => {
    const txAmount = Math.abs(tx.debit || tx.credit || 0)
    const txDate = new Date(tx.date)
    const amountMatch = Math.abs(txAmount - amount) <= 1.0
    const dateMatch = txDate.toDateString() === date.toDateString()
    
    // Description similarity (simple check - can be enhanced with Levenshtein distance)
    const desc1 = tx.description.trim().toLowerCase()
    const desc2 = transaction.description.trim().toLowerCase()
    const descSimilarity = calculateStringSimilarity(desc1, desc2)
    const descMatch = descSimilarity > 0.8
    
    return amountMatch && dateMatch && descMatch
  })
  
  if (fuzzyMatch) {
    return {
      isDuplicate: true,
      existingTransactionId: fuzzyMatch.id,
      matchType: 'fuzzy',
      confidence: 0.8,
      reason: 'Fuzzy match found (similar date, amount, description)',
    }
  }
  
  return {
    isDuplicate: false,
  }
}

/**
 * 문자열 유사도 계산 (간단한 버전)
 * @param str1 - 첫 번째 문자열
 * @param str2 - 두 번째 문자열
 * @returns 유사도 (0-1)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0
  
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  // Simple word-based similarity
  const words1 = str1.split(/\s+/)
  const words2 = str2.split(/\s+/)
  const commonWords = words1.filter(w => words2.includes(w))
  
  return commonWords.length / Math.max(words1.length, words2.length)
}

/**
 * 거래와 주문 매칭
 * @param transaction - 거래
 * @param order - 주문
 * @returns 매칭 결과
 */
export function findMatchingTransaction(
  transaction: Transaction,
  order: Order
): TransactionMatchResult {
  const txAmount = Math.abs(transaction.debit || transaction.credit || 0)
  const orderAmount = order.amount + order.gst // Total amount including GST
  const amountMatch = Math.abs(txAmount - orderAmount) <= 0.01
  
  const txDate = new Date(transaction.date)
  const orderDate = new Date(order.transactionDate)
  const dateMatch = txDate.toDateString() === orderDate.toDateString()
  
  // Description matching (check if order ID or description contains similar keywords)
  const descMatch = transaction.description.toLowerCase().includes(order.orderId.toLowerCase()) ||
                    order.metadata?.items?.some(item => 
                      transaction.description.toLowerCase().includes(item.name.toLowerCase())
                    ) || false
  
  if (amountMatch && dateMatch && descMatch) {
    return {
      matched: true,
      transactionId: transaction.id,
      orderId: order.orderId,
      matchType: 'exact',
      confidence: 1.0,
      details: {
        dateMatch: true,
        amountMatch: true,
        descriptionMatch: true,
      },
    }
  }
  
  if (amountMatch && dateMatch) {
    return {
      matched: true,
      transactionId: transaction.id,
      orderId: order.orderId,
      matchType: 'fuzzy',
      confidence: 0.8,
      details: {
        dateMatch: true,
        amountMatch: true,
        descriptionMatch: false,
      },
    }
  }
  
  return {
    matched: false,
    matchType: 'none',
    confidence: 0,
  }
}
