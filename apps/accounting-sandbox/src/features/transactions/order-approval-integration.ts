/**
 * Order Approval Integration - 주문 승인 시 회계 장부 자동 기록
 * 
 * ⚠️ 안전성 우선: 기존 홈페이지 API 응답 구조를 절대 변경하지 않음
 * 비동기로 처리하여 홈페이지 속도에 영향 없음
 */

import { Order } from '../../shared/types/order'
import { Transaction } from '../../shared/types/transaction'
import { checkDuplicateOrder, approveOrder, createTransactionFromOrder } from './order-approval'
import { auditLogger } from '../../shared/logging/audit-logger'
import { indexedDBStorage } from '../../../lib/storage/indexed-db'

/**
 * 주문 승인 후 회계 장부에 자동 기록
 * 
 * ⚠️ 중요: 이 함수는 비동기로 호출되어야 하며, await 하지 않음
 * 기존 홈페이지 API 응답에 영향을 주지 않음
 */
export async function recordOrderToAccounting(
  order: Order,
  userId?: string,
  userRole?: string
): Promise<{ success: boolean; transactionId?: string; skipped?: boolean; error?: string }> {
  try {
    auditLogger.log('order_accounting_start', {
      userId,
      userRole,
      resource: 'order',
      resourceId: order.orderId,
      details: { orderId: order.orderId, amount: order.amount },
      success: true,
    })

    // 1. 중복 확인 (Unique Key Guard)
    // Incoming Orders에서 확인 (이미 승인된 주문)
    const existingOrders = await indexedDBStorage.getAllIncomingOrders('approved')
    const duplicateCheck = checkDuplicateOrder(order.orderId, existingOrders.map(o => ({
      orderId: o.orderId,
      matchedTransactionId: o.matchedTransactionId,
      status: o.inboxStatus,
    })))
    
    if (duplicateCheck.isDuplicate) {
      auditLogger.log('duplicate_order_skipped', {
        userId,
        userRole,
        resource: 'order',
        resourceId: order.orderId,
        details: {
          orderId: order.orderId,
          existingTransactionId: duplicateCheck.existingTransactionId,
          matchType: duplicateCheck.matchType,
        },
        success: true,
      })
      
      return {
        success: true,
        skipped: true,
        transactionId: duplicateCheck.existingTransactionId,
      }
    }

    // 2. 주문 승인 처리
    const approvalResult = approveOrder(order, existingOrders)
    if (!approvalResult.success) {
      auditLogger.log('order_approval_failed', {
        userId,
        userRole,
        resource: 'order',
        resourceId: order.orderId,
        details: { error: approvalResult.error },
        success: false,
        error: approvalResult.error,
      })
      
      return {
        success: false,
        error: approvalResult.error,
      }
    }

    // 3. 거래 생성
    const transaction = createTransactionFromOrder(order)

    // 4. IndexedDB에 저장 (Incoming Orders에 저장 후 승인 상태로 변경)
    // 먼저 Incoming Order로 저장
    const incomingOrderId = await indexedDBStorage.saveIncomingOrder({
      orderId: order.orderId,
      referenceNo: order.orderId,
      paymentGateway: order.paymentMethod === 'card' ? 'Stripe' : order.paymentMethod === 'paypal' ? 'PayPal' : 'Unknown',
      paymentMethod: order.paymentMethod,
      totalPaid: order.amount + order.gst,
      grossAmount: order.amount + order.gst,
      gstCollected: order.gst,
      gstAmount: order.gst,
      transactionDate: order.transactionDate.split('T')[0],
      occurredAt: order.transactionDate,
      customerName: order.metadata?.customerName || 'Unknown',
      customerEmail: order.metadata?.customerEmail || '',
      items: order.metadata?.items || [],
      subtotal: order.amount,
      shipping: 0,
      discount: 0,
      status: 'approved',
      currency: 'AUD',
      rawData: order,
    })
    
    // 승인 상태로 업데이트
    await indexedDBStorage.updateIncomingOrderStatus(incomingOrderId, 'approved', userId || 'system')

    auditLogger.log('order_accounting_success', {
      userId,
      userRole,
      resource: 'order',
      resourceId: order.orderId,
      details: {
        orderId: order.orderId,
        transactionId: transaction.id,
        amount: transaction.credit,
      },
      success: true,
    })

    return {
      success: true,
      transactionId: transaction.id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    auditLogger.log('order_accounting_error', {
      userId,
      userRole,
      resource: 'order',
      resourceId: order.orderId,
      details: { error: errorMessage },
      success: false,
      error: errorMessage,
    })

    // 에러가 발생해도 홈페이지에는 영향 없음 (로그만 기록)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * 주문 승인 후 비동기로 회계 장부 기록
 * 
 * ⚠️ 중요: 이 함수는 await 하지 않고 호출해야 함
 * 기존 홈페이지 API 응답 구조를 유지하면서 백그라운드에서 처리
 */
export function recordOrderToAccountingAsync(
  order: Order,
  userId?: string,
  userRole?: string
): void {
  // 비동기로 처리 (await 하지 않음)
  recordOrderToAccounting(order, userId, userRole).catch(err => {
    // 에러는 로깅만 하고 홈페이지 응답에는 영향 없음
    console.error('[Accounting] Failed to record order to accounting:', err)
    auditLogger.log('order_accounting_async_error', {
      userId,
      userRole,
      resource: 'order',
      resourceId: order.orderId,
      details: { error: err instanceof Error ? err.message : String(err) },
      success: false,
      error: err instanceof Error ? err.message : String(err),
    })
  })
}
