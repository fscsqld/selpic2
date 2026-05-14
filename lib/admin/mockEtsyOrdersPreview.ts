/** Static preview rows for admin orders UI before live Etsy import (English labels). */
export type MockEtsyOrderRow = {
  orderNo: string
  customerName: string
  productName: string
  orderedAt: string
  status: 'paid' | 'processing' | 'shipped'
}

export const MOCK_ETSY_ORDER_ROWS: MockEtsyOrderRow[] = [
  {
    orderNo: 'ETSY-MOCK-1001',
    customerName: 'Alex Morgan',
    productName: 'Custom vinyl stickers (matte)',
    orderedAt: '2026-05-10',
    status: 'paid',
  },
  {
    orderNo: 'ETSY-MOCK-1002',
    customerName: 'Jordan Lee',
    productName: 'Waterproof name labels × 48',
    orderedAt: '2026-05-09',
    status: 'processing',
  },
  {
    orderNo: 'ETSY-MOCK-1003',
    customerName: 'Sam Rivera',
    productName: 'Clear PET sheet — A4 pack',
    orderedAt: '2026-05-08',
    status: 'shipped',
  },
  {
    orderNo: 'ETSY-MOCK-1004',
    customerName: 'Casey Nguyen',
    productName: 'Round logo stickers (gloss)',
    orderedAt: '2026-05-07',
    status: 'paid',
  },
  {
    orderNo: 'ETSY-MOCK-1005',
    customerName: 'Riley Chen',
    productName: 'Shipping labels bundle',
    orderedAt: '2026-05-06',
    status: 'processing',
  },
]

export function mockEtsyStatusLabel(status: MockEtsyOrderRow['status']): string {
  switch (status) {
    case 'paid':
      return 'Paid'
    case 'processing':
      return 'Processing'
    case 'shipped':
      return 'Shipped'
    default:
      return status
  }
}
