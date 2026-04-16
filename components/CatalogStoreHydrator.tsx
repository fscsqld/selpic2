'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { type Product, useStore } from '@/lib/store'

type CatalogPublicResponse = {
  success?: boolean
  updatedAt?: string | null
  products?: Array<Partial<Product> & { updatedAt?: string }>
}

function normalizeCatalogProduct(input: Partial<Product> & { updatedAt?: string }): Product | null {
  if (!input || typeof input.id !== 'string' || !input.id.trim()) return null
  if (typeof input.name !== 'string') return null
  if (typeof input.description !== 'string') return null
  if (typeof input.price !== 'number' || !Number.isFinite(input.price)) return null
  if (typeof input.category !== 'string') return null
  if (typeof input.inStock !== 'boolean') return null

  const catalogRowUpdatedAt =
    typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString()

  return {
    ...(input as Product),
    id: input.id,
    name: input.name,
    description: input.description,
    price: input.price,
    category: input.category,
    inStock: input.inStock,
    image: typeof input.image === 'string' ? input.image : '',
    subcategory: typeof input.subcategory === 'string' ? input.subcategory : undefined,
    hasDetailPage: typeof input.hasDetailPage === 'boolean' ? input.hasDetailPage : undefined,
    detailDescription:
      typeof input.detailDescription === 'string' ? input.detailDescription : undefined,
    customizationOptions: Array.isArray(input.customizationOptions)
      ? (input.customizationOptions as Product['customizationOptions'])
      : undefined,
    updatedAt: catalogRowUpdatedAt,
  }
}

function productsSignature(list: Product[]): string {
  const compact = list
    .map((p) => `${p.id}|${p.updatedAt || ''}|${p.price}|${p.inStock ? 1 : 0}`)
    .sort()
  return compact.join('||')
}

/**
 * Storefront-only product hydration:
 * always prefer shared server catalog over device-local selpic-store cache.
 */
export default function CatalogStoreHydrator() {
  const pathname = usePathname()
  const _hasHydrated = useStore((s) => s._hasHydrated)
  const lastRemoteVersion = useRef<string>('')
  const inFlight = useRef(false)

  useEffect(() => {
    if (!_hasHydrated) return
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return

    const syncFromPublicCatalog = async () => {
      if (inFlight.current) return
      inFlight.current = true
      try {
        const res = await fetch('/api/catalog/public', { cache: 'no-store' })
        if (!res.ok) return
        const payload = (await res.json()) as CatalogPublicResponse
        if (!payload.success || !Array.isArray(payload.products)) return

        const remoteProducts = payload.products
          .map(normalizeCatalogProduct)
          .filter((p): p is Product => !!p)

        const version = payload.updatedAt || productsSignature(remoteProducts)
        if (version && version === lastRemoteVersion.current) return

        const localProducts = useStore.getState().products
        const localSig = productsSignature(localProducts)
        const remoteSig = productsSignature(remoteProducts)
        if (localSig === remoteSig) {
          lastRemoteVersion.current = version
          return
        }

        useStore.setState({ products: remoteProducts })
        lastRemoteVersion.current = version
      } catch {
        // silent: storefront should continue with existing local cache when offline
      } finally {
        inFlight.current = false
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncFromPublicCatalog()
      }
    }
    const onOnline = () => {
      void syncFromPublicCatalog()
    }

    void syncFromPublicCatalog()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [_hasHydrated, pathname])

  return null
}
