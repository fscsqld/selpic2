'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useStore } from '@/lib/store'

type LikeItem = { productId: string; count: number }

/**
 * Dashboard panel: customer likes ranked for stock / buy attention.
 * Data is live clicks only — not admin-entered.
 */
export default function AdminProductLikesPanel() {
  const products = useStore((s) => s.products)
  const [items, setItems] = useState<LikeItem[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)

  const nameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of products) {
      m.set(String(p.id), p.name)
    }
    return m
  }, [products])

  const stockById = useMemo(() => {
    const m = new Map<string, number | undefined>()
    for (const p of products) {
      m.set(
        String(p.id),
        typeof (p as { stockQuantity?: number }).stockQuantity === 'number'
          ? (p as { stockQuantity: number }).stockQuantity
          : undefined
      )
    }
    return m
  }, [products])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/products/likes-summary?limit=15', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok) {
          if (!cancelled) {
            setAvailable(false)
            setLoading(false)
          }
          return
        }
        const data = (await res.json()) as {
          items?: LikeItem[]
          available?: boolean
        }
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : [])
          setAvailable(data.available !== false)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setAvailable(false)
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900">Customer likes</h2>
        </div>
        <Link href="/admin/products" className="text-sm text-blue-600 hover:underline">
          Products
        </Link>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Live heart clicks from logged-in customers (one like per account per product). Use with sales
        and safety stock — not as the only buy signal.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !available ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Likes table not available yet. Run{' '}
          <code className="text-xs">docs/product-likes-supabase.sql</code> in Supabase, then refresh.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No customer likes yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((row) => {
            const name = nameById.get(row.productId) || row.productId
            const stock = stockById.get(row.productId)
            return (
              <li
                key={row.productId}
                className="py-2.5 flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/products/${encodeURIComponent(row.productId)}`}
                    className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {name}
                  </Link>
                  <span className="text-xs text-gray-500">
                    Stock:{' '}
                    {typeof stock === 'number' ? stock : '—'}
                  </span>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 tabular-nums text-red-600 font-semibold">
                  <Heart className="w-3.5 h-3.5 fill-red-500" />
                  {row.count}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
