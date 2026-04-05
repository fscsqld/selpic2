/** Legacy static list — checkout uses `contentStore` shipping options. Keep ids aligned with `defaultShippingOptions`. */
export interface ShippingOption {
  id: string
  name: string
  description: string
  price: number
  deliveryTime: string
  tracking: boolean
  insurance: boolean
}

export const shippingOptions: ShippingOption[] = [
  {
    id: 'standard-letter',
    name: 'Standard Letter',
    description: 'Best for name stickers and flat custom sheets',
    price: 2.4,
    deliveryTime: '2–8 business days',
    tracking: false,
    insurance: false
  },
  {
    id: 'tracked-letter',
    name: 'Tracked Letter',
    description: 'Tracked letter service',
    price: 5.5,
    deliveryTime: '2–8 business days',
    tracking: true,
    insurance: false
  },
  {
    id: 'express-post',
    name: 'Express Post',
    description: 'Fastest service where available',
    price: 14.5,
    deliveryTime: '1–3 business days',
    tracking: true,
    insurance: true
  },
  {
    id: 'parcel-post',
    name: 'Parcel Post (Goods)',
    description: 'Parcel for merchandise and heavier goods',
    price: 10.9,
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
