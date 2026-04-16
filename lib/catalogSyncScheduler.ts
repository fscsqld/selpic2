import type { Product } from '@/lib/store'

let debounceTimer: ReturnType<typeof setTimeout> | null = null
/** Prevent out-of-order catalog POSTs from overwriting newer product snapshots. */
let syncChain: Promise<void> = Promise.resolve()

async function syncLatestCatalogFromStore(
  maxAttempts: number
): Promise<{ ok: boolean; status?: number }> {
  const { useStore } = await import('@/lib/store')
  const { syncCatalogToServer } = await import('@/lib/catalogSync')
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const products = useStore.getState().products
    const r = await syncCatalogToServer(products)
    if (r.ok) return r
    await new Promise((resolve) => setTimeout(resolve, attempt * 900))
  }
  return { ok: false }
}

export async function syncCatalogToServerNow(
  maxAttempts = 3
): Promise<{ ok: boolean; status?: number }> {
  return syncLatestCatalogFromStore(maxAttempts)
}

export function scheduleCatalogSyncToServer(_legacySnapshot?: Product[]): void {
  if (typeof window === 'undefined') return

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    syncChain = syncChain
      .then(async () => {
        const r = await syncLatestCatalogFromStore(3)
        if (!r.ok) console.warn('[catalogSyncScheduler] server sync not ok', r)
      })
      .catch(() => {
        /* keep chain alive */
      })
  }, 500)
}
