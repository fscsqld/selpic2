import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'

/**
 * True when selpic-store persist has finished rehydrate.
 * Catalog products may appear earlier via CatalogStoreHydrator — do not
 * treat “product visible” as cart-persist ready.
 */
export function isStoreCartPersistReady(): boolean {
  return useStore.getState()._hasHydrated === true
}

export function isCustomerAuthPersistReady(): boolean {
  try {
    return Boolean(useUserAuth.persist?.hasHydrated?.())
  } catch {
    return true
  }
}

/** Gate before addToCart + navigate to /checkout or /cart. */
export function canMutateStorefrontCart():
  | { ok: true }
  | { ok: false; reason: 'store' | 'auth' } {
  if (!isStoreCartPersistReady()) return { ok: false, reason: 'store' }
  if (typeof window !== 'undefined' && !isCustomerAuthPersistReady()) {
    return { ok: false, reason: 'auth' }
  }
  return { ok: true }
}

export function cartNotReadyMessage(reason: 'store' | 'auth'): string {
  return reason === 'auth'
    ? 'Please wait a moment while we restore your session, then try again.'
    : 'Please wait a moment while we restore your cart, then try again.'
}
