'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import {
  buildMarketSBundleSwapUndo,
  cartQuantityForProduct,
  getMarketSBundleUpsellOffers,
  pruneMarketSBundleSwapUndos,
  readMarketSBundleSwapUndos,
  writeMarketSBundleSwapUndos,
  type MarketSBundleSwapUndo,
  type MarketSBundleUpsellOffer,
} from '@/lib/marketSBundleUpsell'

/**
 * Cart upsell: per-unit Family Bundle vs Single Item (from qty 1).
 * Switch replaces singles with one bundle; Undo restores the previous Single Item line.
 */
export default function MarketSBundleUpsell() {
  const { products, cart, addToCart, removeFromCart, updateCartItemQuantity } = useStore()
  const { isLoggedIn } = useUserAuth()
  const [undos, setUndos] = useState<MarketSBundleSwapUndo[]>([])

  const offers = useMemo(
    () => getMarketSBundleUpsellOffers(cart, products),
    [cart, products]
  )

  useEffect(() => {
    const next = pruneMarketSBundleSwapUndos(readMarketSBundleSwapUndos(), cart)
    setUndos(next)
    writeMarketSBundleSwapUndos(next)
  }, [cart])

  const persistUndos = (next: MarketSBundleSwapUndo[]) => {
    setUndos(next)
    writeMarketSBundleSwapUndos(next)
  }

  if (!offers.length && !undos.length) return null

  const switchToBundle = (offer: MarketSBundleUpsellOffer) => {
    if (!isLoggedIn) return
    const bundleQtyBefore = cartQuantityForProduct(cart, offer.bundle.id)
    const undo = buildMarketSBundleSwapUndo({
      bundleProductId: offer.bundle.id,
      bundleName: offer.bundle.name,
      bundleQtyBefore,
      singleProductId: offer.singleProductId,
      singleName: offer.singleName,
      singleQuantity: offer.singleQuantityInCart,
    })
    removeFromCart(offer.singleProductId, offer.singleQuantityInCart, isLoggedIn)
    const added = addToCart({ product: offer.bundle, quantity: 1, customizations: {} }, isLoggedIn)
    if (!added) {
      const single = products.find((p) => p.id === offer.singleProductId)
      if (single) {
        addToCart(
          { product: single, quantity: offer.singleQuantityInCart, customizations: {} },
          isLoggedIn
        )
      }
      return
    }
    persistUndos([...undos, undo])
  }

  const undoSwap = (undo: MarketSBundleSwapUndo) => {
    if (!isLoggedIn) return
    const single = products.find((p) => p.id === undo.singleProductId)
    if (!single) return

    const bundleQtyNow = cartQuantityForProduct(cart, undo.bundleProductId)
    if (bundleQtyNow <= undo.bundleQtyBefore) {
      persistUndos(undos.filter((u) => u.id !== undo.id))
      return
    }

    const targetBundleQty = undo.bundleQtyBefore
    if (targetBundleQty <= 0) {
      removeFromCart(undo.bundleProductId, bundleQtyNow, isLoggedIn)
    } else {
      updateCartItemQuantity(undo.bundleProductId, targetBundleQty, isLoggedIn)
    }

    const restored = addToCart(
      { product: single, quantity: undo.singleQuantity, customizations: {} },
      isLoggedIn
    )
    if (!restored) {
      // Roll forward failed — put bundle qty back if we reduced it.
      const bundle = products.find((p) => p.id === undo.bundleProductId)
      if (bundle && targetBundleQty <= 0) {
        addToCart({ product: bundle, quantity: 1, customizations: {} }, isLoggedIn)
      } else if (bundle) {
        updateCartItemQuantity(undo.bundleProductId, bundleQtyNow, isLoggedIn)
      }
      return
    }
    persistUndos(undos.filter((u) => u.id !== undo.id))
  }

  return (
    <aside className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 space-y-3">
      {undos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Bundle switch
          </p>
          <ul className="space-y-2">
            {undos.map((undo) => (
              <li
                key={undo.id}
                className="rounded-lg border border-amber-100 bg-white/90 p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <p className="text-sm text-slate-700">
                  Switched to <span className="font-semibold">{undo.bundleName}</span>
                  <span className="text-slate-500">
                    {' '}
                    (was {undo.singleQuantity}× {undo.singleName})
                  </span>
                </p>
                <button
                  type="button"
                  disabled={!isLoggedIn}
                  onClick={() => undoSwap(undo)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  Undo — keep Single Item
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {offers.length > 0 && (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Better value per pack
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Family Bundles cost less per sheet than buying Single Items. Switch to stock up —
              bundles ship as tracked parcel. You can undo anytime before checkout.
            </p>
          </div>
          <ul className="space-y-3">
            {offers.map((offer) => {
              const href = `/products/${encodeURIComponent(offer.bundle.id)}`
              return (
                <li
                  key={`${offer.singleProductId}:${offer.bundle.id}`}
                  className="flex gap-3 rounded-lg border border-amber-100 bg-white/80 p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={offer.bundle.image}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover bg-white shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={href} className="font-semibold text-slate-900 hover:underline">
                      {offer.bundle.name}
                    </Link>
                    <p className="text-sm text-slate-700">
                      ${offer.bundlePrice.toFixed(2)} for {offer.packCount} ·{' '}
                      <span className="text-emerald-700 font-medium">
                        ${offer.bundleUnitPrice.toFixed(2)}/ea
                      </span>
                      <span className="text-slate-500">
                        {' '}
                        vs ${offer.singleUnitPrice.toFixed(2)} single
                      </span>
                    </p>
                    <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                      Save ${offer.unitSavings.toFixed(2)} per sheet
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Replaces {offer.singleQuantityInCart}× {offer.singleName} with this Family
                      Bundle
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!isLoggedIn}
                        onClick={() => switchToBundle(offer)}
                        className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                      >
                        Switch to this bundle
                      </button>
                      <Link
                        href={href}
                        className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-white"
                      >
                        View
                      </Link>
                    </div>
                    {!isLoggedIn && (
                      <p className="mt-2 text-xs text-slate-600">Log in to update your cart.</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </aside>
  )
}
