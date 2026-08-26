/**
 * Thin, non-blocking bridge from storefront admin → accounting API.
 *
 * Accounting lives in apps/accounting-sandbox as an independent app.
 * Do NOT import sandbox modules here — that pulls them into the homepage webpack graph
 * and has broken storefront builds/emails in the past.
 *
 * Soft-retired: order → accounting inbox / gross income posting is disabled.
 * Bank statement deposits (e.g. Stripe payouts) are the revenue source of truth.
 * This function remains a safe no-op so approve / ship flows never block.
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
 * Best-effort notify accounting via HTTP. Soft-retired — never throws; does not fetch.
 */
export function recordOrderToAccountingAsyncWithRetry(
  _order: StorefrontOrderAccountingPayload,
  _userId?: string,
  _userRole?: string
): void {
  // Intentionally empty: do not POST to /api/accounting/orders/import.
}
