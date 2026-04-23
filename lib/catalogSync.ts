import type { CatalogProductRecord } from '@/lib/catalogProductRecord'
import { productToCatalogRecord } from '@/lib/catalogRecordSanitize'
import type { Product } from '@/lib/store'

export function productsToCatalogRecords(products: Product[]): CatalogProductRecord[] {
  const now = new Date().toISOString()
  return products.map((p) => productToCatalogRecord(p, now))
}

export async function syncCatalogToServer(products: Product[]): Promise<{ ok: boolean; status?: number }> {
  const secret = (process.env.NEXT_PUBLIC_CATALOG_SYNC_SECRET || '').trim()
  const snapshots = productsToCatalogRecords(products)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Admin UI marker (route still checks same-origin + admin hint fallback).
      'x-selpic-admin-write': '1',
    }
    if (secret) {
      headers.Authorization = `Bearer ${secret}`
    }

    const res = await fetch('/api/catalog/products', {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({ products: snapshots })
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      console.warn('[catalog] Sync failed:', res.status, data?.message || '')
      return { ok: false, status: res.status }
    }
    return { ok: true, status: res.status }
  } catch (e) {
    console.warn('[catalog] Sync error:', e)
    return { ok: false }
  }
}
