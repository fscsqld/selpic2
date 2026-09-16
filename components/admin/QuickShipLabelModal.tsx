'use client'

import { useState } from 'react'
import { X, Loader2, Printer } from 'lucide-react'
import type { OrderRecord } from '@/lib/store'
import { openInternalShippingLabelPdf } from '@/lib/admin/shippingLabelClient'
import type { AdminShippingLabelSlot } from '@/lib/shipping/buildAdminShippingLabelPdf'
import {
  QUICK_SHIP_PARCEL_PRESETS,
  resolveQuickShipParcelNote,
  type QuickShipParcelPresetId,
} from '@/lib/shipping/quickShipParcelPresets'
import type { ShippingLabelFromOverride } from '@/lib/shipping/shippingLabelFrom'
import ShippingLabelFromOverrideFields, {
  EMPTY_SHIPPING_LABEL_FROM_FORM,
} from '@/components/admin/ShippingLabelFromOverrideFields'

const LABEL_SLOT_OPTIONS: Array<{ value: AdminShippingLabelSlot; label: string }> = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
]

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (order: OrderRecord) => void
  mergeOrdersFromServer: (orders: OrderRecord[]) => void
}

/**
 * Minimal ledger row for printing the internal AusPost-style PDF (address + default weight).
 * No catalog pricing — intended for counter / manual posting only.
 */
export default function QuickShipLabelModal({ open, onClose, onCreated, mergeOrdersFromServer }: Props) {
  const [recipientName, setRecipientName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [streetAddress2, setStreetAddress2] = useState('')
  const [suburb, setSuburb] = useState('')
  const [state, setState] = useState('')
  const [postcode, setPostcode] = useState('')
  const [country, setCountry] = useState('Australia')
  const [parcelPreset, setParcelPreset] = useState<QuickShipParcelPresetId>('none')
  const [customParcelNote, setCustomParcelNote] = useState('')
  const [useCustomFrom, setUseCustomFrom] = useState(false)
  const [fromOverride, setFromOverride] = useState<ShippingLabelFromOverride>(EMPTY_SHIPPING_LABEL_FROM_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [createdOrder, setCreatedOrder] = useState<OrderRecord | null>(null)
  const [printBusy, setPrintBusy] = useState(false)
  const [labelSlot, setLabelSlot] = useState<AdminShippingLabelSlot>('top-left')

  const reset = () => {
    setRecipientName('')
    setEmail('')
    setPhone('')
    setStreetAddress('')
    setStreetAddress2('')
    setSuburb('')
    setState('')
    setPostcode('')
    setCountry('Australia')
    setParcelPreset('none')
    setCustomParcelNote('')
    setUseCustomFrom(false)
    setFromOverride(EMPTY_SHIPPING_LABEL_FROM_FORM)
    setError('')
    setCreatedOrder(null)
    setLabelSlot('top-left')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/orders/manual-ship-label', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          streetAddress: streetAddress.trim(),
          streetAddress2: streetAddress2.trim(),
          suburb: suburb.trim(),
          state: state.trim(),
          postcode: postcode.trim(),
          country: country.trim(),
          labelNotes: resolveQuickShipParcelNote(parcelPreset, customParcelNote),
          useCustomFrom,
          fromOverride: useCustomFrom ? fromOverride : undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { order?: OrderRecord; error?: string }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not create label order.')
        return
      }
      if (!data.order) {
        setError('Invalid response from server.')
        return
      }
      mergeOrdersFromServer([data.order])
      onCreated(data.order)
      setCreatedOrder(data.order)
    } finally {
      setBusy(false)
    }
  }

  const printLabel = async () => {
    if (!createdOrder) return
    setPrintBusy(true)
    try {
      const r = await openInternalShippingLabelPdf(createdOrder.id, {
        slot: labelSlot,
        onOrderMerged: (o) => mergeOrdersFromServer([o]),
      })
      if (!r.ok) window.alert(r.error || 'Failed to open label PDF.')
    } finally {
      setPrintBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quick ship label</h2>
            <p className="mt-1 text-xs text-gray-500">
              Address-only label for Avery L7169 / AV959020 A4 4-up. Saves a minimal ledger row — no storefront
              checkout or customer email required.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {createdOrder ? (
          <div className="space-y-4 p-5">
            <p className="text-sm text-green-800">
              Saved order <span className="font-mono">{createdOrder.id}</span>. You can print the label now or find this
              order in the list.
            </p>
            <div className="max-w-xs">
              <label className="mb-1 block text-xs font-medium text-gray-700">Sheet position</label>
              <select
                value={labelSlot}
                onChange={(e) => setLabelSlot(e.target.value as AdminShippingLabelSlot)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {LABEL_SLOT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={printBusy}
                onClick={() => void printLabel()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {printBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Print shipping label (PDF)
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5">
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recipient</legend>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Full name (required if no email)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery address</legend>
              <input
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Street address *"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={streetAddress2}
                onChange={(e) => setStreetAddress2(e.target.value)}
                placeholder="Address line 2 (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="Suburb *"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State *"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="Postcode * (4 digits AU)"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  inputMode="numeric"
                />
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </fieldset>

            <ShippingLabelFromOverrideFields
              enabled={useCustomFrom}
              onEnabledChange={setUseCustomFrom}
              value={fromOverride}
              onChange={setFromOverride}
            />

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Parcel</legend>
              <label className="block text-xs text-gray-600">
                <span className="mb-1 block font-medium text-gray-700">Common delivery request</span>
                <select
                  value={parcelPreset}
                  onChange={(e) => setParcelPreset(e.target.value as QuickShipParcelPresetId)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {QUICK_SHIP_PARCEL_PRESETS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              {parcelPreset === 'custom' ? (
                <textarea
                  value={customParcelNote}
                  onChange={(e) => setCustomParcelNote(e.target.value)}
                  placeholder="Short custom note for the label"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              ) : null}
              <p className="text-xs text-gray-500">
                Printed on the PDF when selected. Not emailed to the customer. Contents / weight stay at defaults
                (Standard Letter).
              </p>
            </fieldset>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={handleClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save &amp; prepare label
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
