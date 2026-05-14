'use client'

import { useMemo, useState } from 'react'
import { X, Loader2, MapPin, Palette } from 'lucide-react'
import type { OrderRecord } from '@/lib/store'
import { getCustomizationSurchargePerUnit } from '@/lib/orderCustomizationSurcharge'

export type ManualOrderProductLite = {
  id: string
  name: string
  price: number
  image: string
  /** Catalogue size string — used with two-line surcharge rules when `customizations.size` is empty. */
  size?: string
  twoLineSurcharge?: number
}

type Props = {
  open: boolean
  onClose: () => void
  products: ManualOrderProductLite[]
  onCreated: (order: OrderRecord) => void
}

const DEFAULT_TWO_LINE_SURCHARGE = 2

function buildAsSingleLine(a: {
  streetAddress: string
  streetAddress2: string
  suburb: string
  state: string
  postcode: string
  country: string
}): string {
  const line1 = [a.streetAddress, a.streetAddress2].filter((s) => s.trim()).join(', ')
  const line2 = [a.suburb, a.state, a.postcode, a.country].filter((s) => s.trim()).join(' ')
  return [line1, line2].filter(Boolean).join(' · ')
}

export default function ManualOrderCreateModal({ open, onClose, products, onCreated }: Props) {
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [streetAddress, setStreetAddress] = useState('')
  const [streetAddress2, setStreetAddress2] = useState('')
  const [suburb, setSuburb] = useState('')
  const [state, setState] = useState('')
  const [postcode, setPostcode] = useState('')
  const [country, setCountry] = useState('Australia')

  const [stickerText, setStickerText] = useState('')
  const [stickerFont, setStickerFont] = useState('')
  const [stickerColor, setStickerColor] = useState('')
  const [stickerSizeLabel, setStickerSizeLabel] = useState('')
  const [twoLineSticker, setTwoLineSticker] = useState(false)
  const [twoLineSurchargeInput, setTwoLineSurchargeInput] = useState('')
  const [customizedImageUrl, setCustomizedImageUrl] = useState('')
  const [productionNotes, setProductionNotes] = useState('')
  const [declaredWeightKg, setDeclaredWeightKg] = useState('')

  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [shipping, setShipping] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(() => products.find((p) => p.id === productId), [products, productId])

  const stickerCustomizations = useMemo((): Record<string, string> => {
    const c: Record<string, string> = {}
    const t = stickerText.trim()
    if (t) c.text = t
    if (stickerFont.trim()) c.font = stickerFont.trim()
    if (stickerColor.trim()) c.color = stickerColor.trim()
    const sz = stickerSizeLabel.trim() || (selected?.size ? String(selected.size) : '')
    if (sz) c.size = sz
    if (customizedImageUrl.trim()) c.customizedImage = customizedImageUrl.trim()
    if (productionNotes.trim()) c.adminProductionNotes = productionNotes.trim()
    if (twoLineSticker) {
      const raw = twoLineSurchargeInput.trim()
      const n = raw === '' ? NaN : Number(raw)
      const surcharge =
        Number.isFinite(n) && n >= 0
          ? n
          : typeof selected?.twoLineSurcharge === 'number'
            ? selected.twoLineSurcharge
            : DEFAULT_TWO_LINE_SURCHARGE
      c.twoLineOption = `Manual two-line +$${surcharge.toFixed(2)}`
      c.twoLineSurchargeAmount = String(surcharge)
    }
    return c
  }, [
    stickerText,
    stickerFont,
    stickerColor,
    stickerSizeLabel,
    twoLineSticker,
    twoLineSurchargeInput,
    customizedImageUrl,
    productionNotes,
    selected,
  ])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!selected) {
      setError('Select a product from the catalog.')
      return
    }
    const em = email.trim()
    if (!em.includes('@')) {
      setError('Enter a valid customer email.')
      return
    }
    if (!streetAddress.trim() || !suburb.trim() || !state.trim() || !postcode.trim() || !country.trim()) {
      setError('Fill in all required shipping address fields (street, suburb, state, postcode, country).')
      return
    }

    const qty = Math.max(1, Math.floor(quantity))
    const ship = Math.max(0, Number(shipping) || 0)

    const surchargePerUnit = getCustomizationSurchargePerUnit(stickerCustomizations, {
      size: stickerCustomizations.size || selected.size,
    })
    const unitLine = Number(selected.price) + surchargePerUnit
    const line = unitLine * qty
    const total = line + ship

    const asSingle = buildAsSingleLine({
      streetAddress: streetAddress.trim(),
      streetAddress2: streetAddress2.trim(),
      suburb: suburb.trim(),
      state: state.trim(),
      postcode: postcode.trim(),
      country: country.trim(),
    })

    const weightRaw = declaredWeightKg.trim()
    const weightNum = weightRaw === '' ? undefined : Number(weightRaw)
    const declaredShippingWeightKg =
      weightNum !== undefined && Number.isFinite(weightNum) && weightNum > 0 ? weightNum : undefined

    const orderDraft: Omit<OrderRecord, 'id' | 'createdAtIso'> = {
      customer: {
        name: customerName.trim() || em.split('@')[0] || 'Customer',
        email: em,
        phone: phone.trim(),
      },
      address: {
        streetAddress: [streetAddress.trim(), streetAddress2.trim()].filter(Boolean).join(', '),
        suburb: suburb.trim(),
        state: state.trim(),
        postcode: postcode.trim(),
        country: country.trim(),
        asSingleLine: asSingle,
      },
      items: [
        {
          productId: selected.id,
          name: selected.name,
          price: unitLine,
          baseUnitPrice: selected.price,
          customizationSurchargePerUnit: surchargePerUnit,
          image: selected.image || '/placeholder-product.png',
          quantity: qty,
          customizations: { ...stickerCustomizations },
          buyerPersonalization: stickerText.trim() || undefined,
        },
      ],
      subtotal: line,
      shippingPrice: ship,
      discount: 0,
      paymentFee: 0,
      total,
      shippingOptionId: 'manual-admin',
      shippingOptionName: 'Manual admin entry',
      paymentMethod: 'bank',
      paymentMethodName: 'Bank transfer (manual)',
      status: 'pending',
      ...(declaredShippingWeightKg !== undefined ? { declaredShippingWeightKg } : {}),
    }

    setBusy(true)
    try {
      const res = await fetch('/api/orders/manual', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderDraft }),
      })
      const data = (await res.json().catch(() => ({}))) as { order?: OrderRecord; error?: string }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not create order.')
        return
      }
      if (data.order) {
        onCreated(data.order)
        onClose()
        setCustomerName('')
        setEmail('')
        setPhone('')
        setStreetAddress('')
        setStreetAddress2('')
        setSuburb('')
        setState('')
        setPostcode('')
        setCountry('Australia')
        setStickerText('')
        setStickerFont('')
        setStickerColor('')
        setStickerSizeLabel('')
        setTwoLineSticker(false)
        setTwoLineSurchargeInput('')
        setCustomizedImageUrl('')
        setProductionNotes('')
        setDeclaredWeightKg('')
        setProductId('')
        setQuantity(1)
        setShipping('0')
      }
    } catch {
      setError('Network error.')
    } finally {
      setBusy(false)
    }
  }

  const previewSurcharge = selected
    ? getCustomizationSurchargePerUnit(stickerCustomizations, {
        size: stickerCustomizations.size || selected.size,
      })
    : 0
  const previewUnit = selected ? Number(selected.price) + previewSurcharge : 0
  const previewQty = Math.max(1, Math.floor(quantity))
  const previewShip = Math.max(0, Number(shipping) || 0)
  const previewTotal = previewUnit * previewQty + previewShip

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-order-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="manual-order-title" className="text-lg font-semibold text-gray-900">
            Add order manually
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <p className="text-sm text-gray-600">
            Creates a row in the Supabase <code className="text-xs">orders</code> ledger. Use a full shipping address and
            sticker options so labels and packing workflows match real orders. Registry admins only.
          </p>
          {products.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No storefront products loaded. Load the catalog from admin products, then try again.
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Customer</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
            <legend className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Shipping address
            </legend>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Street address *</label>
              <input
                type="text"
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Unit / street number and name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Address line 2</label>
              <input
                type="text"
                value={streetAddress2}
                onChange={(e) => setStreetAddress2(e.target.value)}
                placeholder="Building, floor, company (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Suburb / City *</label>
                <input
                  type="text"
                  required
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">State / Region *</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="NSW, VIC, CA…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Postcode *</label>
                <input
                  type="text"
                  required
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Country *</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option>Australia</option>
                  <option>New Zealand</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Canada</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Saved to <code className="text-[11px]">order.address</code> and <code className="text-[11px]">asSingleLine</code>{' '}
              for labels and invoices.
            </p>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/20 p-4">
            <legend className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-violet-900">
              <Palette className="h-3.5 w-3.5" aria-hidden />
              Sticker options
            </legend>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Sticker / label text</label>
              <textarea
                value={stickerText}
                onChange={(e) => setStickerText(e.target.value)}
                rows={4}
                placeholder="Name, phone, or other text to print. Use two lines if you enable two-line mode below."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Font</label>
                <input
                  type="text"
                  value={stickerFont}
                  onChange={(e) => setStickerFont(e.target.value)}
                  placeholder="e.g. Inter, Arial"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Text color</label>
                <input
                  type="text"
                  value={stickerColor}
                  onChange={(e) => setStickerColor(e.target.value)}
                  placeholder="e.g. Black, #222"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Size label</label>
                <input
                  type="text"
                  value={stickerSizeLabel}
                  onChange={(e) => setStickerSizeLabel(e.target.value)}
                  placeholder="Matches catalogue size for surcharges"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-4 rounded-lg border border-violet-200 bg-white/80 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={twoLineSticker}
                  onChange={(e) => setTwoLineSticker(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Two-line sticker option (adds surcharge per unit)
              </label>
              {twoLineSticker ? (
                <div className="min-w-[10rem] flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Two-line surcharge (AUD / unit), blank = product default or $2
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={twoLineSurchargeInput}
                    onChange={(e) => setTwoLineSurchargeInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Preview / artwork URL (optional)</label>
              <input
                type="url"
                value={customizedImageUrl}
                onChange={(e) => setCustomizedImageUrl(e.target.value)}
                placeholder="https://… (stored in customizations.customizedImage)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Production notes (optional)</label>
              <textarea
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes for packing / QC"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-gray-500">
              Options are stored in <code className="text-[11px]">items[].customizations</code> (same shape as checkout /
              sticker customize flow).
            </p>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Line & shipping</legend>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Product *</label>
              <select
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${p.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Shipping (AUD)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Declared shipping weight (kg, optional)
              </label>
              <input
                type="number"
                min={0}
                step="0.001"
                value={declaredWeightKg}
                onChange={(e) => setDeclaredWeightKg(e.target.value)}
                placeholder="For AusPost / label workflows"
                className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            {selected ? (
              <p className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">
                <span className="font-medium">Preview total:</span> ${previewTotal.toFixed(2)} (unit catalogue $
                {selected.price.toFixed(2)}
                {previewSurcharge > 0 ? ` + options $${previewSurcharge.toFixed(2)}/unit` : ''} × {previewQty} + shipping $
                {previewShip.toFixed(2)}). Server re-validates against the catalogue.
              </p>
            ) : null}
          </fieldset>

          <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-white pb-1 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || products.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save to Supabase
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
