export type Product = {
  id: string
  name: string
  description: string
  price: number
  tags?: string[]
}

export type Customization = {
  color?: string
  size?: 'S' | 'M' | 'L'
  text?: string
}

export type CartItem = {
  id: string
  productId: string
  quantity: number
  customization?: Customization
}

