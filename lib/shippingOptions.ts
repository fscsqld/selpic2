export interface ShippingOption {
  id: string
  name: string
  description: string
  price: number
  deliveryTime: string
  tracking: boolean
  insurance: boolean
}

// Factory to build localized shipping options; UI can choose name/description from translations
export const shippingOptions: ShippingOption[] = [
  {
    id: 'auspost-letter',
    name: 'Australia Post Large Letter (No Tracking)',
    description: '',
    price: 2.40,
    deliveryTime: '',
    tracking: false,
    insurance: false
  },
  {
    id: 'auspost-regular',
    name: 'Australia Post Parcel Post',
    description: '',
    price: 9.70,
    deliveryTime: '',
    tracking: true,
    insurance: false
  },
  {
    id: 'auspost-tracked',
    name: 'Australia Post Parcel Post (Signature)',
    description: '',
    price: 12.65,
    deliveryTime: '',
    tracking: true,
    insurance: false
  },
  {
    id: 'auspost-express',
    name: 'Australia Post Express Post',
    description: '',
    price: 13.70,
    deliveryTime: '',
    tracking: true,
    insurance: true
  },
  {
    id: 'local-pickup',
    name: 'Click & Collect (Mansfield)',
    description: '',
    price: 0.0,
    deliveryTime: '',
    tracking: false,
    insurance: false
  },
  {
    id: 'cash-on-delivery',
    name: 'Cash on Delivery',
    description: '',
    price: 0.0,
    deliveryTime: '',
    tracking: false,
    insurance: false
  }
]

export const getShippingOption = (id: string): ShippingOption | undefined => {
  return shippingOptions.find(option => option.id === id)
}

export const getDefaultShippingOption = (): ShippingOption => {
  return shippingOptions[0] // Regular as default
} 