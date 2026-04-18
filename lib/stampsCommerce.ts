/**
 * Stamp products are not on sale yet by default.
 * Set NEXT_PUBLIC_STAMPS_CHECKOUT_ENABLED=true when checkout/cart should allow stamps.
 */
export function isStampsCheckoutEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STAMPS_CHECKOUT_ENABLED === 'true'
}
