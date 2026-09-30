/**
 * Default line items / notes for Admin Create Invoice & Quote
 * (Sticker vs Cleaning). Shared by documents + invoices/preview.
 */

export type DocumentBusinessCategory = 'sticker' | 'cleaning'

export type DocumentCreateLineItem = {
  description: string
  qty: number
  unitPrice: number
  taxRate?: number
}

/** Cleaning service seed lines (unit prices ex-GST; taxRate 0.1 = 10%). */
export function getCleaningDefaultLineItems(): DocumentCreateLineItem[] {
  return [
    { description: 'Regular Cleaning Service (per visit)', qty: 1, unitPrice: 0, taxRate: 0.1 },
    { description: 'Deep Clean / End of Lease', qty: 0, unitPrice: 0, taxRate: 0.1 },
    { description: 'Fit Out Cleaning', qty: 0, unitPrice: 0, taxRate: 0.1 },
    { description: 'Additional Services (carpet, windows, etc.)', qty: 0, unitPrice: 0, taxRate: 0.1 },
  ]
}

export function getStickerDefaultLineItems(): DocumentCreateLineItem[] {
  return [
    { description: 'Custom Stickers (Premium Gloss)', qty: 2, unitPrice: 25, taxRate: 0.1 },
    { description: 'Stamp Product (Self-inking)', qty: 1, unitPrice: 32, taxRate: 0.1 },
    { description: 'Shipping (Standard)', qty: 1, unitPrice: 10, taxRate: 0 },
  ]
}

export function getDefaultLineItemsByCategory(
  category: DocumentBusinessCategory
): DocumentCreateLineItem[] {
  return category === 'cleaning' ? getCleaningDefaultLineItems() : getStickerDefaultLineItems()
}

export function getDefaultNotesByCategory(category: DocumentBusinessCategory): string {
  if (category === 'cleaning') {
    return (
      'Thank you for choosing our cleaning services.\n' +
      'Payment is due within 7 days of the invoice date.\n' +
      'Please contact us to confirm booking and for any special requirements.'
    )
  }
  return (
    'Thank you for your business! It is a pleasure to help bring your creative ideas to life.\n' +
    'Please be advised that payment is due within 7 days of the invoice date.'
  )
}

export function getNewDocumentLineItem(
  category: DocumentBusinessCategory
): DocumentCreateLineItem {
  if (category === 'cleaning') {
    return {
      description: 'Cleaning service',
      qty: 1,
      unitPrice: 0,
      taxRate: 0.1,
    }
  }
  return { description: 'New Item', qty: 1, unitPrice: 0, taxRate: 0.1 }
}
