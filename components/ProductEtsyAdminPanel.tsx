'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Product } from '@/lib/store'
import { useMediaStore } from '@/lib/mediaStore'
import { Store, ExternalLink } from 'lucide-react'

function defaultMarkupFromEnv(): number {
  const raw = process.env.NEXT_PUBLIC_ETSY_LISTING_MARKUP_DEFAULT
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  return Number.isFinite(n) && n >= 0 ? Math.min(100, Math.max(0, n)) : 15
}

type EtsyStatus = { connected: boolean; shopId?: string; shopName?: string | null }

type PricingMode = 'markup_percent' | 'fixed_price'

function collectImageUrls(product: Product): string[] {
  const raw: string[] = []
  const push = (u?: string | null) => {
    if (u && typeof u === 'string' && u.trim()) raw.push(u.trim())
  }
  push(product.image)
  push(product.fallbackImage)
  const gallery = useMediaStore
    .getState()
    .getMediaFilesByProduct(product.id)
    .filter((f) => f.type === 'image')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  for (const f of gallery) {
    if (f.webpUrl) push(f.webpUrl)
    push(f.url)
  }
  return [...new Set(raw)]
}

export default function ProductEtsyAdminPanel({
  product,
  onSaveListingId,
}: {
  product: Product
  onSaveListingId: (listingId: string) => void
}) {
  const [adminGate, setAdminGate] = useState<'loading' | 'no' | 'yes'>('loading')
  const [etsy, setEtsy] = useState<EtsyStatus | null>(null)
  const [pricingMode, setPricingMode] = useState<PricingMode>('markup_percent')
  const [markupPercent, setMarkupPercent] = useState(defaultMarkupFromEnv)
  const [fixedEtsyPrice, setFixedEtsyPrice] = useState<string>(() => product.price.toFixed(2))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const imageUrls = useMemo(() => collectImageUrls(product), [product])

  const etsyPricePreview = useMemo(() => {
    if (pricingMode === 'fixed_price') {
      const n = Number(fixedEtsyPrice)
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
    }
    const p = product.price * (1 + markupPercent / 100)
    return Math.round(p * 100) / 100
  }, [product.price, markupPercent, pricingMode, fixedEtsyPrice])

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

  useEffect(() => {
    if (pricingMode === 'fixed_price') {
      setFixedEtsyPrice((prev) => {
        const n = Number(prev)
        if (!Number.isFinite(n) || n <= 0) return product.price.toFixed(2)
        return prev
      })
    }
  }, [pricingMode, product.price])

  if (adminGate !== 'yes' || !etsy?.connected) {
    return null
  }

  const assetBaseUrl =
    typeof window !== 'undefined' ? `${window.location.origin}` : undefined

  const publish = async (mode: 'create' | 'update') => {
    setBusy(true)
    setMessage(null)
    try {
      let fixed: number | undefined
      if (pricingMode === 'fixed_price') {
        fixed = Number(fixedEtsyPrice)
        if (!Number.isFinite(fixed) || fixed < 0.2) {
          setMessage('Enter a fixed Etsy price of at least 0.20 (shop currency).')
          setBusy(false)
          return
        }
      }

      const payload = {
        pricingMode,
        markupPercent: pricingMode === 'markup_percent' ? markupPercent : undefined,
        fixedEtsyPrice: pricingMode === 'fixed_price' ? fixed : undefined,
        assetBaseUrl,
        imageUrls,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          detailDescription: product.detailDescription,
          price: product.price,
          stockQuantity: product.stockQuantity,
          inStock: product.inStock,
          image: product.image,
          fallbackImage: product.fallbackImage,
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
      const uploaded = typeof data.uploadedImages === 'number' ? data.uploadedImages : 0
      const attempted = typeof data.imageUrlsAttempted === 'number' ? data.imageUrlsAttempted : 0
      const imgErrs = Array.isArray(data.imageUploadErrors) ? (data.imageUploadErrors as string[]) : []
      let extra = ''
      if (mode === 'create') {
        extra = ` Images uploaded: ${uploaded}/${attempted}.`
        if (imgErrs.length > 0) {
          extra += ` Some images failed (see first errors): ${imgErrs.slice(0, 2).join(' | ')}`
        }
      }
      setMessage(
        mode === 'create'
          ? `Draft listing created (ID ${listingId ?? '—'}).${extra} Open Etsy to review and publish.`
          : 'Etsy listing updated (title, description, price, quantity).'
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
        Shop {etsy.shopName ? `${etsy.shopName} ` : ''}(ID {etsy.shopId}). Site catalogue price{' '}
        <strong>${product.price.toFixed(2)}</strong>
        {etsyPricePreview != null ? (
          <>
            {' '}
            → Etsy draft unit price <strong>${etsyPricePreview.toFixed(2)}</strong>
          </>
        ) : null}
        . {imageUrls.length} image URL(s) will be sent with &quot;Create Etsy draft&quot; (max 10).
      </p>

      <fieldset className="mb-3 space-y-2 text-sm text-amber-950">
        <legend className="font-medium text-amber-900 mb-1">Etsy price</legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="etsy-price-mode"
            checked={pricingMode === 'markup_percent'}
            onChange={() => setPricingMode('markup_percent')}
          />
          Markup on site price (%)
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="etsy-price-mode"
            checked={pricingMode === 'fixed_price'}
            onChange={() => setPricingMode('fixed_price')}
          />
          Fixed Etsy unit price (USD / shop currency)
        </label>
      </fieldset>

      {pricingMode === 'markup_percent' ? (
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
      ) : (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <label className="text-sm text-amber-950 flex items-center gap-2">
            Fixed price
            <input
              type="number"
              min={0.2}
              step={0.01}
              value={fixedEtsyPrice}
              onChange={(e) => setFixedEtsyPrice(e.target.value)}
              className="w-32 rounded border border-amber-300 px-2 py-1 text-gray-900"
            />
          </label>
        </div>
      )}

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
      {message ? <p className="mt-3 text-sm text-amber-950 whitespace-pre-wrap">{message}</p> : null}
      <p className="mt-3 text-xs text-amber-900/80">
        Set <code className="rounded bg-amber-100/80 px-1">ETSY_DEFAULT_TAXONOMY_ID</code> in Vercel (seller taxonomy{' '}
        <strong>leaf</strong> id). Find candidates:{' '}
        <code className="rounded bg-amber-100/80 px-1">
          GET /api/admin/integrations/etsy/taxonomy/nodes?q=sticker
        </code>{' '}
        while logged in as admin — see <code className="rounded bg-amber-100/80 px-1">docs/etsy-listing-env.md</code>.
        Shipping and return policies default from your Etsy shop when env overrides are unset. Drafts require{' '}
        <code className="rounded bg-amber-100/80 px-1">listings_w</code> on the token: set{' '}
        <code className="rounded bg-amber-100/80 px-1">ETSY_OAUTH_INCLUDE_LISTING_SCOPES=true</code> and{' '}
        <code className="rounded bg-amber-100/80 px-1">ETSY_OAUTH_EXTRA_SCOPES=listings_w</code> in Vercel, redeploy, then{' '}
        <strong>Connect Etsy</strong> again.
      </p>
    </div>
  )
}
