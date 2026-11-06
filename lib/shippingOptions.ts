/** Legacy static list — checkout uses `contentStore` shipping options. Keep ids aligned with `defaultShippingOptions`. */
import {
  AUSPOST_LARGE_LETTER_125G,
  AUSPOST_PARCEL_OWN_PACK_500G,
  CMS_EXPRESS_POST_DEFAULT_PRICE,
  CMS_TRACKED_LETTER_DEFAULT_PRICE,
} from './shipping/ausPostRetailRates'

export interface ShippingOption {
  id: string
  name: string
  description: string
  price: number
  deliveryTime: string
  tracking: boolean
  insurance: boolean
}

/**
 * Defaults aligned to AusPost retail (2026):
 * - Standard / Market S letter → Large letter ≤125g $3.70 (untracked)
 * - Tracked letter → Domestic letter with tracking Medium C5 $8.10 (not untracked ≤250g $5.55)
 * - Parcel Post ≤500g → $11.70
 * - Express Post ≤500g → $15.20
 * Live CMS values in Admin → Shipping override these after hydrate/save.
 */
export const shippingOptions: ShippingOption[] = [
  {
    id: 'market-s-untracked-letter',
    name: 'Untracked letter (Market S singles)',
    description:
      'For 1–3 Single Item packs (and up to 3 sticker sheets) at 20 mm / 500 g or under',
    price: AUSPOST_LARGE_LETTER_125G,
    deliveryTime: '2–8 business days',
    tracking: false,
    insurance: false
  },
  {
    id: 'standard-letter',
    name: 'Standard Letter',
    description: 'Best for name stickers and flat custom sheets',
    price: AUSPOST_LARGE_LETTER_125G,
    deliveryTime: '2–8 business days',
    tracking: false,
    insurance: false
  },
  {
    id: 'tracked-letter',
    name: 'Tracked Letter',
    description:
      'Australia Post Domestic letter with tracking (Medium C5 prepaid band) — proof of posting + tracking',
    price: CMS_TRACKED_LETTER_DEFAULT_PRICE,
    deliveryTime: '3–7 business days',
    tracking: true,
    insurance: false
  },
  {
    id: 'express-post',
    name: 'Express Post',
    description: 'Fastest service where available (Express Post ≤500 g band)',
    price: CMS_EXPRESS_POST_DEFAULT_PRICE,
    deliveryTime: '1–3 business days',
    tracking: true,
    insurance: true
  },
  {
    id: 'parcel-post',
    name: 'Parcel Post (Goods)',
    description: 'Parcel for merchandise and heavier goods',
    price: AUSPOST_PARCEL_OWN_PACK_500G,
    deliveryTime: '3–10 business days',
    tracking: true,
    insurance: false
  },
  {
    id: 'local-pickup',
    name: 'Click & Collect (Mansfield)',
    description: 'Collect from Mansfield store',
    price: 0.0,
    deliveryTime: 'Store hours',
    tracking: false,
    insurance: false
  }
]

export const getShippingOption = (id: string): ShippingOption | undefined => {
  return shippingOptions.find(option => option.id === id)
}

export const getDefaultShippingOption = (): ShippingOption => {
  return shippingOptions[0]
}
