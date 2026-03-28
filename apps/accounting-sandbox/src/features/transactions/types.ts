/**
 * Transactions Feature - Type Definitions
 */

import { Order, OrderStatus, OrderMatch } from '../../shared/types/order'
import { Transaction } from '../../shared/types/transaction'

export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingTransactionId?: string
  matchType?: 'exact' | 'fuzzy' | 'orderId'
  confidence?: number
  reason?: string
}

export interface TransactionMatchResult {
  matched: boolean
  transactionId?: string
  orderId?: string
  matchType: 'exact' | 'fuzzy' | 'manual' | 'none'
  confidence: number
  details?: {
    dateMatch: boolean
    amountMatch: boolean
    descriptionMatch: boolean
  }
}

export interface OrderApprovalResult {
  success: boolean
  transactionId?: string
  error?: string
}
