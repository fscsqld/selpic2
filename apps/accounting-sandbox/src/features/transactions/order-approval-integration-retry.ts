/**
 * Order Approval Integration with Retry Logic
 * 
 * 회계 장부 기록 실패 시 재시도 로직 포함
 */

import { recordOrderToAccounting } from './order-approval-integration'
import { auditLogger } from '../../shared/logging/audit-logger'
import { Order } from '../../shared/types/order'

interface RetryConfig {
  maxRetries: number
  retryDelay: number // milliseconds
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1초
  backoffMultiplier: 2
}

/**
 * 재시도 로직이 포함된 주문 승인 후 회계 장부 기록
 */
export async function recordOrderToAccountingWithRetry(
  order: Order,
  userId?: string,
  userRole?: string,
  config: Partial<RetryConfig> = {}
): Promise<{ success: boolean; transactionId?: string; skipped?: boolean; error?: string; retries?: number }> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: string | undefined
  let retries = 0

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const result = await recordOrderToAccounting(order, userId, userRole)
      
      if (result.success) {
        if (retries > 0) {
          auditLogger.log('order_accounting_retry_success', {
            userId,
            userRole,
            resource: 'order',
            resourceId: order.orderId,
            details: {
              orderId: order.orderId,
              retries,
              transactionId: result.transactionId,
            },
            success: true,
          })
        }
        
        return {
          ...result,
          retries
        }
      }

      // 중복으로 스킵된 경우는 성공으로 간주
      if (result.skipped) {
        return {
          ...result,
          retries
        }
      }

      lastError = result.error
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }

    // 마지막 시도가 아니면 재시도
    if (attempt < retryConfig.maxRetries) {
      retries++
      const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt)
      
      auditLogger.log('order_accounting_retry_attempt', {
        userId,
        userRole,
        resource: 'order',
        resourceId: order.orderId,
        details: {
          orderId: order.orderId,
          attempt: attempt + 1,
          maxRetries: retryConfig.maxRetries,
          delay,
          error: lastError,
        },
        success: false,
      })

      // 지수 백오프 (Exponential Backoff)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // 모든 재시도 실패
  auditLogger.log('order_accounting_retry_failed', {
    userId,
    userRole,
    resource: 'order',
    resourceId: order.orderId,
    details: {
      orderId: order.orderId,
      retries,
      finalError: lastError,
    },
    success: false,
    error: lastError,
  })

  // 실패한 주문을 나중에 재시도할 수 있도록 저장
  if (typeof window !== 'undefined') {
    try {
      const failedOrders = JSON.parse(localStorage.getItem('selpic_failed_orders') || '[]')
      failedOrders.push({
        order,
        userId,
        userRole,
        error: lastError,
        timestamp: Date.now(),
        retries
      })
      // 최대 100개까지만 저장
      if (failedOrders.length > 100) {
        failedOrders.shift()
      }
      localStorage.setItem('selpic_failed_orders', JSON.stringify(failedOrders))
    } catch (error) {
      console.error('Failed to save failed order:', error)
    }
  }

  return {
    success: false,
    error: lastError,
    retries
  }
}

/**
 * 비동기로 재시도 로직 포함하여 회계 장부 기록
 * 
 * ⚠️ 중요: 이 함수는 await 하지 않고 호출해야 함
 */
export function recordOrderToAccountingAsyncWithRetry(
  order: Order,
  userId?: string,
  userRole?: string,
  config?: Partial<RetryConfig>
): void {
  recordOrderToAccountingWithRetry(order, userId, userRole, config)
    .catch(err => {
      console.error('[Accounting] Failed to record order with retry:', err)
      auditLogger.log('order_accounting_async_retry_error', {
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

/**
 * 실패한 주문 재시도 (수동 호출)
 */
export async function retryFailedOrders(): Promise<{ success: number; failed: number }> {
  if (typeof window === 'undefined') {
    return { success: 0, failed: 0 }
  }

  try {
    const failedOrders = JSON.parse(localStorage.getItem('selpic_failed_orders') || '[]')
    if (failedOrders.length === 0) {
      return { success: 0, failed: 0 }
    }

    let success = 0
    let failed = 0

    for (const failedOrder of failedOrders) {
      const result = await recordOrderToAccountingWithRetry(
        failedOrder.order,
        failedOrder.userId,
        failedOrder.userRole
      )

      if (result.success) {
        success++
      } else {
        failed++
      }
    }

    // 성공한 주문은 저장 목록에서 제거
    if (success > 0) {
      const remaining = failedOrders.filter((_: any, index: number) => {
        // 성공한 주문은 제외 (인덱스로 추적)
        return index >= success
      })
      localStorage.setItem('selpic_failed_orders', JSON.stringify(remaining))
    }

    return { success, failed }
  } catch (error) {
    console.error('Failed to retry failed orders:', error)
    return { success: 0, failed: 0 }
  }
}
