/**
 * Thin, non-blocking bridge from storefront admin → accounting API.
 *
 * Accounting lives in apps/accounting-sandbox as an independent app.
 * Do NOT import sandbox modules here — that pulls them into the homepage webpack graph
 * and has broken storefront builds/emails in the past.
 */

export type StorefrontOrderAccountingPayload = {
  id: string
  orderId: string
  transactionDate: string
  amount: number
  gst: number
  status: string
  paymentMethod: string
  metadata?: {
    customerName?: string
    customerEmail?: string
    items?: Array<{ name: string; quantity: number; price: number }>
  }
  createdAt?: string
  updatedAt?: string
}

/**
 * Best-effort notify accounting via HTTP. Never throws to callers; do not await.
 */
export function recordOrderToAccountingAsyncWithRetry(
  order: StorefrontOrderAccountingPayload,
  _userId?: string,
  _userRole?: string
): void {
  void (async () => {
    try {
      const orderDate = (order.transactionDate || order.createdAt || new Date().toISOString()).slice(
        0,
        10
      )
      const gst = Number(order.gst) || 0
      const amountExGst = Number(order.amount) || 0
      const total = amountExGst + gst
      const items = (order.metadata?.items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
      }))
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0) || amountExGst

      const res = await fetch('/api/accounting/orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: [
            {
              orderId: order.orderId || order.id,
              orderDate,
              customerName: order.metadata?.customerName || 'Unknown',
              customerEmail: order.metadata?.customerEmail || '',
              items,
              subtotal,
              gst,
              shipping: 0,
              total,
              paymentMethod: order.paymentMethod || 'card',
              status: order.status || 'approved',
              currency: 'AUD',
            },
          ],
          period: {
            startDate: orderDate,
            endDate: orderDate,
          },
        }),
      })

      if (!res.ok) {
        // Accounting may be offline — order approval must not fail.
        const body = await res.json().catch(() => ({}))
        console.info(
          '[Accounting bridge] skipped or unavailable (non-blocking):',
          res.status,
          body?.error || body
        )
      }
    } catch (err) {
      console.info(
        '[Accounting bridge] skipped (non-blocking):',
        err instanceof Error ? err.message : err
      )
    }
  })()
}
