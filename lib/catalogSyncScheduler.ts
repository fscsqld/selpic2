import type { Product } from '@/lib/store'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleCatalogSyncToServer(products: Product[]): void {
  if (typeof window === 'undefined') return

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void (async () => {
      const { syncCatalogToServer } = await import('@/lib/catalogSync')
      // Do not gate by local adminAuth state: during hydration/login race this can be false
      // even though the user is already in admin UI. API-side checks remain enforced.
      for (let attempt = 1; attempt <= 3; attempt++) {
        const r = await syncCatalogToServer(products)
        if (r.ok) return
        await new Promise((resolve) => setTimeout(resolve, attempt * 900))
      }
    })()
  }, 800)
}
