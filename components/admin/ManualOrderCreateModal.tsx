'use client'

import { useMemo, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { OrderRecord } from '@/lib/store'

type ProductLite = { id: string; name: string; price: number; image: string }

type Props = {
  open: boolean
  onClose: () => void
  products: ProductLite[]
  onCreated: (order: OrderRecord) => void
}

export default function ManualOrderCreateModal({ open, onClose, products, onCreated }: Props) {
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [shipping, setShipping] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(() => products.find((p) => p.id === productId), [products, productId])

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
    const qty = Math.max(1, Math.floor(quantity))
    const ship = Math.max(0, Number(shipping) || 0)
    const line = Number(selected.price) * qty
    const total = line + ship

    const orderDraft: Omit<OrderRecord, 'id' | 'createdAtIso'> = {
      customer: {
        name: customerName.trim() || em.split('@')[0] || 'Customer',
        email: em,
        phone: phone.trim(),
      },
      address: {
        streetAddress: '—',
        suburb: '—',
        state: '—',
        postcode: '0000',
        country: 'Australia',
        asSingleLine: 'Manual order — address to be confirmed',
      },
      items: [
        {
          productId: selected.id,
          name: selected.name,
          price: selected.price,
          image: selected.image || '/placeholder-product.png',
          quantity: qty,
          customizations: {},
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-order-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
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
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          <p className="text-sm text-gray-600">
            Creates a row in the Supabase <code className="text-xs">orders</code> ledger (bank transfer / manual flow).
            Only signed-in registry admins can call this API.
          </p>
          {products.length === 0 ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No storefront products loaded. Open the storefront or admin products so the catalog is available, then
              try again.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          ) : null}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer email</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer name (optional)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Shipping (AUD)</label>
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
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
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
