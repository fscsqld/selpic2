import type { Product } from '@/lib/store'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export async function syncCatalogToServerNow(
  products: Product[],
  maxAttempts = 3
): Promise<{ ok: boolean; status?: number }> {
  const { syncCatalogToServer } = await import('@/lib/catalogSync')
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const r = await syncCatalogToServer(products)
    if (r.ok) return r
    await new Promise((resolve) => setTimeout(resolve, attempt * 900))
  }
  return { ok: false }
}

export function scheduleCatalogSyncToServer(products: Product[]): void {
  if (typeof window === 'undefined') return

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void (async () => {
      // Do not gate by local adminAuth state: during hydration/login race this can be false
      // even though the user is already in admin UI. API-side checks remain enforced.
      await syncCatalogToServerNow(products, 3)
    })()
  }, 800)
}
