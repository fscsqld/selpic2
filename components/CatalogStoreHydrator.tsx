'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

/**
 * localStorage(selpic-store)에 상품이 없을 때, 동일 비밀번호로 보호된 GET /api/catalog/products로
 * `data/catalog/products.json`을 한 번 불러와 스토어를 채웁니다.
 */
export default function CatalogStoreHydrator() {
  const _hasHydrated = useStore((s) => s._hasHydrated)
  const products = useStore((s) => s.products)
  const tryHydrate = useStore((s) => s.tryHydrateProductsFromServerCatalog)
  const ran = useRef(false)

  useEffect(() => {
    if (!_hasHydrated || ran.current) return
    if (products.length > 0) return
    ran.current = true
    void tryHydrate()
  }, [_hasHydrated, products.length, tryHydrate])

  return null
}
