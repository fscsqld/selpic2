'use client'

import type { ShippingLabelFromOverride } from '@/lib/shipping/shippingLabelFrom'
import { COMPANY_SHIPPING_LABEL_FROM } from '@/lib/shipping/shippingLabelFrom'

type Props = {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  value: ShippingLabelFromOverride
  onChange: (next: ShippingLabelFromOverride) => void
  /** Compact spacing for order detail card */
  className?: string
}

export const EMPTY_SHIPPING_LABEL_FROM_FORM: ShippingLabelFromOverride = {
  name: 'SELPIC',
  streetAddress: '',
  streetAddress2: '',
  suburb: '',
  state: '',
  postcode: '',
  country: 'Australia',
}

/**
 * Default OFF: company FROM. Toggle ON: editable factory / direct-ship FROM.
 */
export default function ShippingLabelFromOverrideFields({
  enabled,
  onEnabledChange,
  value,
  onChange,
  className = '',
}: Props) {
  const patch = (partial: Partial<ShippingLabelFromOverride>) => {
    onChange({ ...value, ...partial })
  }

  return (
    <fieldset className={`space-y-3 ${className}`.trim()}>
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sender (FROM)</legend>
      <p className="text-xs text-gray-500">
        Default: {COMPANY_SHIPPING_LABEL_FROM.name} — {COMPANY_SHIPPING_LABEL_FROM.addressLine1},{' '}
        {COMPANY_SHIPPING_LABEL_FROM.addressLine2}. Does not change company legal address.
      </p>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
        />
        <span>
          <span className="font-medium">Use different FROM (factory / direct ship)</span>
          <span className="mt-0.5 block text-xs text-gray-500">
            Off by default. Turn on only when posting from a factory or non-company address.
          </span>
        </span>
      </label>

      {enabled ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <input
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Sender name"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <input
            required
            value={value.streetAddress}
            onChange={(e) => patch({ streetAddress: e.target.value })}
            placeholder="Street address *"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <input
            value={value.streetAddress2 || ''}
            onChange={(e) => patch({ streetAddress2: e.target.value })}
            placeholder="Address line 2 (optional)"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              value={value.suburb}
              onChange={(e) => patch({ suburb: e.target.value })}
              placeholder="Suburb *"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
            <input
              required
              value={value.state}
              onChange={(e) => patch({ state: e.target.value })}
              placeholder="State *"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              value={value.postcode}
              onChange={(e) => patch({ postcode: e.target.value })}
              placeholder="Postcode * (4 digits AU)"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              inputMode="numeric"
            />
            <input
              value={value.country}
              onChange={(e) => patch({ country: e.target.value })}
              placeholder="Country"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}
    </fieldset>
  )
}
