'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Heart, Package } from 'lucide-react'
import { useStore, type Product } from '@/lib/store'
import {
  likedProductStockLabel,
  resolveLikedProductStockStatus,
  type LikedProductStockStatus,
} from '@/lib/likedProductStock'

type Row = {
  productId: string
  product: Product | null
  status: LikedProductStockStatus
}

/**
 * Profile: products this customer liked, with clear out-of-stock / unavailable copy.
 */
export default function ProfileLikedProducts() {
  const products = useStore((s) => s.products)
  const [ids, setIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const productById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) {
      m.set(String(p.id), p)
    }
    return m
  }, [products])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products/likes/mine', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.status === 401) {
        setIds([])
        setAvailable(false)
        return
      }
      if (!res.ok) {
        setAvailable(false)
        setIds([])
        return
      }
      const data = (await res.json()) as { productIds?: string[]; available?: boolean }
      setIds(Array.isArray(data.productIds) ? data.productIds : [])
      setAvailable(data.available !== false)
    } catch {
      setAvailable(false)
      setIds([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const rows: Row[] = useMemo(
    () =>
      ids.map((productId) => {
        const product = productById.get(productId) ?? null
        return {
          productId,
          product,
          status: resolveLikedProductStockStatus(product),
        }
      }),
    [ids, productById]
  )

  const unlike = async (productId: string) => {
    setBusyId(productId)
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/like`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setIds((prev) => prev.filter((id) => id !== productId))
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mb-8 bg-white/80 backdrop-blur-md border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
          <Heart className="w-5 h-5 text-rose-600" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Liked products</h2>
          <p className="text-sm text-gray-600">
            Items you liked — open a product to buy again. Out of stock items stay listed so you can check later.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      ) : !available ? (
        <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Liked products are temporarily unavailable. Please try again later.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          You have not liked any products yet. Tap the heart on a product page or listing to save it here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {rows.map(({ productId, product, status }) => {
            const oos = status === 'out_of_stock'
            const gone = status === 'unavailable'
            const href = gone ? null : `/products/${encodeURIComponent(productId)}`
            const name = product?.name || 'Product'
            const img = product?.image

            const body = (
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0 ${
                    oos || gone ? 'opacity-60' : ''
                  }`}
                >
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-300" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={`font-medium truncate ${
                      gone ? 'text-gray-500' : 'text-gray-900'
                    }`}
                  >
                    {name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {product && typeof product.price === 'number'
                      ? `$${product.price.toFixed(2)}`
                      : '—'}
                    <span
                      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        status === 'in_stock'
                          ? 'bg-emerald-50 text-emerald-800'
                          : status === 'out_of_stock'
                            ? 'bg-amber-50 text-amber-900'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {likedProductStockLabel(status)}
                    </span>
                  </p>
                  {oos ? (
                    <p className="text-xs text-amber-800 mt-0.5">
                      This item is currently out of stock. You can keep it liked and check back later.
                    </p>
                  ) : null}
                  {gone ? (
                    <p className="text-xs text-gray-500 mt-0.5">
                      This product is no longer in the shop catalog.
                    </p>
                  ) : null}
                </div>
              </div>
            )

            return (
              <li key={productId} className="py-4 flex items-start justify-between gap-3">
                {href ? (
                  <Link href={href} className="flex-1 min-w-0 hover:opacity-90">
                    {body}
                  </Link>
                ) : (
                  <div className="flex-1 min-w-0">{body}</div>
                )}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {href && status === 'in_stock' ? (
                    <Link
                      href={href}
                      className="text-sm font-medium text-rose-700 hover:text-rose-900"
                    >
                      View
                    </Link>
                  ) : null}
                  {href && oos ? (
                    <Link
                      href={href}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      View details
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === productId}
                    onClick={() => void unlike(productId)}
                    className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                  >
                    {busyId === productId ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
