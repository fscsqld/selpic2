/**
 * Zustand persist `merge` for the storefront cart.
 *
 * Invariant: a non-empty in-memory cart must never be wiped by rehydrate.
 * Customers can customize and hit Checkout before `selpic-store` finishes
 * reading localStorage; merge used to apply `cart: []` from disk and send
 * them to “Your cart is empty”.
 */
export function mergeCartFromPersist<T>(
  persistedCart: unknown,
  currentCart: unknown
): T[] {
  const current = Array.isArray(currentCart) ? (currentCart as T[]) : []
  if (current.length > 0) return current
  if (Array.isArray(persistedCart)) return persistedCart as T[]
  return current
}
