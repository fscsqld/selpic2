'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Product } from '@/lib/store'
import { Store, ExternalLink } from 'lucide-react'

function defaultMarkupFromEnv(): number {
  const raw = process.env.NEXT_PUBLIC_ETSY_LISTING_MARKUP_DEFAULT
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  return Number.isFinite(n) && n >= 0 ? Math.min(100, Math.max(0, n)) : 15
}

type EtsyStatus = { connected: boolean; shopId?: string; shopName?: string | null }

export default function ProductEtsyAdminPanel({
  product,
  onSaveListingId,
}: {
  product: Product
  onSaveListingId: (listingId: string) => void
}) {
  const [adminGate, setAdminGate] = useState<'loading' | 'no' | 'yes'>('loading')
  const [etsy, setEtsy] = useState<EtsyStatus | null>(null)
  const [markupPercent, setMarkupPercent] = useState(defaultMarkupFromEnv)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const etsyPricePreview = useMemo(() => {
    const p = product.price * (1 + markupPercent / 100)
    return Math.round(p * 100) / 100
  }, [product.price, markupPercent])

  const load = useCallback(async () => {
    setAdminGate('loading')
    try {
      const res = await fetch('/api/admin/integrations/etsy/status', { credentials: 'same-origin' })
      if (res.status === 401) {
        setAdminGate('no')
        return
      }
      const data = (await res.json().catch(() => ({}))) as EtsyStatus
      if (!res.ok) {
        setAdminGate('no')
        return
      }
      setAdminGate('yes')
      setEtsy(data)
    } catch {
      setAdminGate('no')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (adminGate !== 'yes' || !etsy?.connected) {
    return null
  }

  const publish = async (mode: 'create' | 'update') => {
    setBusy(true)
    setMessage(null)
    try {
      const payload = {
        markupPercent,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          detailDescription: product.detailDescription,
          price: product.price,
          stockQuantity: product.stockQuantity,
          inStock: product.inStock,
        },
      }
      const res = await fetch('/api/admin/integrations/etsy/listings', {
        method: mode === 'create' ? 'POST' : 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'update' && product.etsyListingId
            ? { ...payload, listingId: product.etsyListingId }
            : payload
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(typeof data.error === 'string' ? data.error : 'Request failed.')
        return
      }
      const listingId = typeof data.listingId === 'string' ? data.listingId : null
      if (mode === 'create' && listingId) {
        onSaveListingId(listingId)
      }
      setMessage(
        mode === 'create'
          ? `Draft listing created (ID ${listingId ?? '—'}). Add images and publish in Etsy Shop Manager.`
          : 'Etsy listing updated with current product data and markup.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left">
      <div className="flex items-center gap-2 text-amber-900 font-semibold mb-2">
        <Store className="w-5 h-5 shrink-0" />
        Etsy (admin)
      </div>
      <p className="text-sm text-amber-900/90 mb-3">
        Shop {etsy.shopName ? `${etsy.shopName} ` : ''}(ID {etsy.shopId}). Site price ${product.price.toFixed(2)} → Etsy
        draft unit price <strong>${etsyPricePreview.toFixed(2)}</strong> with current markup.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="text-sm text-amber-950 flex items-center gap-2">
          Markup %
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={markupPercent}
            onChange={(e) => setMarkupPercent(Number(e.target.value))}
            className="w-24 rounded border border-amber-300 px-2 py-1 text-gray-900"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !!product.etsyListingId}
          onClick={() => void publish('create')}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          Create Etsy draft
        </button>
        <button
          type="button"
          disabled={busy || !product.etsyListingId}
          onClick={() => void publish('update')}
          className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          Update linked listing
        </button>
        {product.etsyListingId ? (
          <a
            href={`https://www.etsy.com/your/shops/me/tools/listings/editor?listing_id=${encodeURIComponent(product.etsyListingId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-amber-600 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100"
          >
            Open in Etsy <ExternalLink className="w-4 h-4" />
          </a>
        ) : null}
      </div>
      {message ? <p className="mt-3 text-sm text-amber-950">{message}</p> : null}
      <p className="mt-3 text-xs text-amber-900/80">
        Requires <code className="rounded bg-amber-100/80 px-1">ETSY_DEFAULT_TAXONOMY_ID</code> and Etsy shipping/return
        policies (auto-detected from your shop unless overridden by env). OAuth must include the{' '}
        <code className="rounded bg-amber-100/80 px-1">listings_w</code> scope — reconnect from Admin → Integrations if
        publish fails with 403.
      </p>
    </div>
  )
}
