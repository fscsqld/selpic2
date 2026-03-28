import type { Product } from '@/lib/store'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleCatalogSyncToServer(products: Product[]): void {
  if (typeof window === 'undefined') return

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void (async () => {
      const { useAdminAuth } = await import('@/lib/adminAuth')
      const auth = useAdminAuth.getState()
      if (!auth.isLoggedIn || !auth.adminUser) return
      const perms = auth.adminUser.permissions || []
      const allowed = auth.adminUser.role === 'super_admin' || perms.includes('products:write')
      if (!allowed) return
      const { syncCatalogToServer } = await import('@/lib/catalogSync')
      await syncCatalogToServer(products)
    })()
  }, 800)
}
