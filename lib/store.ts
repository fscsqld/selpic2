import { create } from 'zustand'

import { getProducts } from '@/lib/products'
import type { CartItem, Customization, Product } from '@/lib/types'

type ShopState = {
  products: Product[]
  cart: CartItem[]
  addToCart: (input: { productId: string; quantity?: number; customization?: Customization }) => void
  removeFromCart: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
}

function makeCartItemId() {
  return `ci_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

export const useShopStore = create<ShopState>((set) => ({
  products: getProducts(),
  cart: [],
  addToCart: ({ productId, quantity = 1, customization }) => {
    const safeQty = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1
    set((state) => ({
      cart: [
        ...state.cart,
        {
          id: makeCartItemId(),
          productId,
          quantity: safeQty,
          customization,
        },
      ],
    }))
  },
  removeFromCart: (cartItemId) => {
    set((state) => ({ cart: state.cart.filter((c) => c.id !== cartItemId) }))
  },
  updateQuantity: (cartItemId, quantity) => {
    const safeQty = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1
    set((state) => ({
      cart: state.cart.map((c) => (c.id === cartItemId ? { ...c, quantity: safeQty } : c)),
    }))
  },
  clearCart: () => set({ cart: [] }),
}))

export function formatKRW(value: number) {
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
  } catch {
    return `${value.toLocaleString('ko-KR')}원`
  }
}

