'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useStore } from '@/lib/store'
import AdminCollapsibleSection from '@/components/admin/AdminCollapsibleSection'

type LikeItem = { productId: string; count: number }

type CategoryFilter = 'all' | 'Stickers' | 'HotGoods' | 'Stamps' | 'PhoneCases'

const CATEGORY_CHIPS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Stickers', label: 'Stickers' },
  { id: 'HotGoods', label: 'Market S' },
  { id: 'Stamps', label: 'Stamps' },
  { id: 'PhoneCases', label: 'Phone Cases' },
]

function categoryLabel(category: string | undefined): string {
  if (!category) return 'Unknown'
  if (category === 'HotGoods') return 'Market S'
  if (category === 'PhoneCases') return 'Phone Cases'
  return category
}

type AdminProductLikesPanelProps = {
  /** localStorage key for collapse preference. */
  storageKey?: string
  defaultOpen?: boolean
  className?: string
  /** Hide the Products header link when already on `/admin/products`. */
  showProductsLink?: boolean
}

/**
 * Ranked customer likes for stock / buy attention.
 * Primary home: `/admin/products` only. Filter by catalog category.
 */
export default function AdminProductLikesPanel({
  storageKey = 'admin.section.product-likes',
  defaultOpen = true,
  className = '',
  showProductsLink = true,
}: AdminProductLikesPanelProps) {
  const products = useStore((s) => s.products)
  const [items, setItems] = useState<LikeItem[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  const nameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of products) {
      m.set(String(p.id), p.name)
    }
    return m
  }, [products])

  const categoryById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of products) {
      const cat = String(p.category || '').trim()
      if (cat) m.set(String(p.id), cat)
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

  const visibleChips = useMemo(() => {
    const present = new Set<string>()
    for (const row of items) {
      const cat = categoryById.get(row.productId)
      if (cat) present.add(cat)
    }
    // Always offer All + live catalog categories that have products (even before likes).
    for (const p of products) {
      const cat = String(p.category || '').trim()
      if (cat) present.add(cat)
    }
    return CATEGORY_CHIPS.filter((c) => c.id === 'all' || present.has(c.id))
  }, [items, categoryById, products])

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return items
    return items.filter((row) => categoryById.get(row.productId) === categoryFilter)
  }, [items, categoryFilter, categoryById])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Fetch a wide top list so category chips still have depth after filtering.
        const res = await fetch('/api/admin/products/likes-summary?limit=100', {
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

  useEffect(() => {
    if (categoryFilter === 'all') return
    if (!visibleChips.some((c) => c.id === categoryFilter)) {
      setCategoryFilter('all')
    }
  }, [categoryFilter, visibleChips])

  return (
    <AdminCollapsibleSection
      storageKey={storageKey}
      defaultOpen={defaultOpen}
      className={className}
      title={
        <span className="inline-flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" aria-hidden />
          Customer likes
        </span>
      }
      description="Live heart clicks from logged-in customers (one like per account per product). Filter by category for stock planning — not as the only buy signal."
      headerRight={
        showProductsLink ? (
          <Link href="/admin/products" className="text-sm text-blue-600 hover:underline">
            Products
          </Link>
        ) : undefined
      }
    >
      {!loading && available && items.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter likes by category">
          {visibleChips.map((chip) => {
            const active = categoryFilter === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setCategoryFilter(chip.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
                aria-pressed={active}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !available ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Likes table not available yet. Run{' '}
          <code className="text-xs">docs/product-likes-supabase.sql</code> in Supabase, then refresh.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No customer likes yet.</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-sm text-gray-500">
          No likes in {categoryLabel(categoryFilter === 'all' ? undefined : categoryFilter)} yet.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {filteredItems.slice(0, 15).map((row) => {
            const name = nameById.get(row.productId) || row.productId
            const stock = stockById.get(row.productId)
            const cat = categoryById.get(row.productId)
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
                  <p className="text-xs text-gray-500">
                    {categoryLabel(cat)}
                    {' · '}
                    Stock: {typeof stock === 'number' ? stock : '—'}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 font-semibold text-red-600 tabular-nums">
                  <Heart className="w-3.5 h-3.5 fill-red-500" aria-hidden />
                  {row.count}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </AdminCollapsibleSection>
  )
}
