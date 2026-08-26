import { INCOMING_ORDERS_RETIRED } from '@/lib/orders/incoming-orders-retired'

/**
 * Previously synced homepage/API orders from localStorage into IndexedDB.
 * Soft-retired: bank statement deposits are the revenue SSOT.
 * Kept as a no-op so dashboard mount effects stay safe.
 */
export async function syncIncomingOrders(): Promise<void> {
  if (INCOMING_ORDERS_RETIRED) {
    return
  }
}
