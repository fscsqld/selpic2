'use client'

import Link from 'next/link'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { cartAlreadyHasProduct, findMarketSBaitProduct } from '@/lib/marketSBaitProduct'

export default function MarketSBaitCrossSell() {
  const { products, cart, addToCart } = useStore()
  const { isLoggedIn } = useUserAuth()
  const bait = findMarketSBaitProduct(products)
  if (!bait) return null
  if (cartAlreadyHasProduct(cart.map((item) => item.product?.id), bait.id)) return null

  const href = `/products/${encodeURIComponent(bait.id)}`

  return (
    <aside className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Add-on from Market S</p>
      <div className="mt-3 flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bait.image}
          alt=""
          className="h-16 w-16 rounded-lg object-cover bg-white"
        />
        <div className="min-w-0 flex-1">
          <Link href={href} className="font-semibold text-slate-900 hover:underline">
            {bait.name}
          </Link>
          <p className="text-sm text-slate-700">${Number(bait.price).toFixed(2)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addToCart({ product: bait, quantity: 1, customizations: {} }, isLoggedIn)}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Add to cart
            </button>
            <Link href={href} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-white">
              View
            </Link>
          </div>
          {!isLoggedIn && (
            <p className="mt-2 text-xs text-slate-600">
              Login is required to add this item to your cart.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
