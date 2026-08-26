/**
 * Soft-retire: homepage order → accounting inbox / synthetic income.
 * Bank statement + classify remains the cash revenue SSOT (Stripe net payouts).
 * Keep IndexedDB store + API route stubs so schema and storefront bridges do not break.
 *
 * See `.cursor/rules/accounting-order-import-vs-bank.mdc`.
 */
export const INCOMING_ORDERS_RETIRED = true

export const INCOMING_ORDERS_RETIRED_NOTE =
  'Order import into accounting is retired. Record sales from bank statement deposits (e.g. Stripe payouts), not homepage orders.'
