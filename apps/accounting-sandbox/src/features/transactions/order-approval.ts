/**
 * Order Approval - 주문 승인 로직
 * 
 * 홈페이지에서 전송된 주문을 승인하고 거래로 변환
 */

import { Order, OrderStatus } from '../../shared/types/order'
import { Transaction } from '../../shared/types/transaction'
import { OrderApprovalResult } from './types'
import { checkDuplicateOrder } from './duplicate-detector'

/**
 * 주문 승인 처리
 * @param order - 승인할 주문
 * @param existingOrders - 기존 주문 목록
 * @returns 승인 결과
 */
export function approveOrder(
  order: Order,
  existingOrders: Order[]
): OrderApprovalResult {
  // 중복 확인
  const duplicateCheck = checkDuplicateOrder(order.orderId, existingOrders)
  if (duplicateCheck.isDuplicate) {
    return {
      success: false,
      error: `Order ${order.orderId} already exists and is ${existingOrders.find(o => o.orderId === order.orderId)?.status}`,
    }
  }
  
  // 주문 상태 업데이트
  order.status = 'approved'
  order.updatedAt = new Date().toISOString()
  
  return {
    success: true,
  }
}

/**
 * 주문 거부 처리
 * @param order - 거부할 주문
 * @returns 거부 결과
 */
export function rejectOrder(order: Order): OrderApprovalResult {
  order.status = 'rejected'
  order.updatedAt = new Date().toISOString()
  
  return {
    success: true,
  }
}

/**
 * 주문에서 거래 생성
 * @param order - 주문
 * @returns 생성된 거래
 */
export function createTransactionFromOrder(order: Order): Transaction {
  const transaction: Transaction = {
    id: `order_${order.id}_${Date.now()}`,
    reference: order.orderId,
    date: order.transactionDate,
    description: `Order ${order.orderId} - ${order.metadata?.items?.map(i => i.name).join(', ') || 'Payment'}`,
    credit: order.amount + order.gst, // Total including GST
    debit: null,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
    source: 'order',
    confidence: 'Manual',
    gstInfo: {
      hasGST: order.gst > 0,
      gstAmount: order.gst,
      gstType: 'INCLUDED',
      netAmount: order.amount,
    },
  }
  
  return transaction
}
