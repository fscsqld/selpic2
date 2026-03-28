/**
 * Order 타입 정의
 * 홈페이지에서 전송되는 주문 정보
 */

export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'matched'

export interface Order {
  id: string
  orderId: string // Unique order ID from homepage
  amount: number
  gst: number
  paymentMethod: string
  transactionDate: string
  status: OrderStatus
  matchedTransactionId?: string
  createdAt: string
  updatedAt: string
  metadata?: {
    customerName?: string
    customerEmail?: string
    items?: Array<{
      name: string
      quantity: number
      price: number
    }>
  }
}

export interface OrderMatch {
  orderId: string
  transactionId: string
  matchType: 'exact' | 'fuzzy' | 'manual'
  confidence: number
  matchedAt: string
  matchedBy?: string // User ID or 'system'
}
