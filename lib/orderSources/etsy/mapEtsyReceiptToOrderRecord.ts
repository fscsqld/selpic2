import type { NormalizedMarketplaceOrder } from '@/lib/orderSources/types'
import type { OrderRecord } from '@/lib/store'
import { extractEtsyTransactionPersonalization } from '@/lib/orderSources/etsy/etsyPersonalization'

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  return null
}

function moneyToNumber(m: unknown): number | null {
  if (!m || typeof m !== 'object') return null
  const o = m as Record<string, unknown>
  const amount = num(o.amount)
  const divisor = num(o.divisor) ?? 100
  if (amount === null || divisor === 0) return null
  return amount / divisor
}

function etsyTimeToIso(ts: unknown): string {
  const n = num(ts)
  if (n === null) return new Date().toISOString()
  const ms = n < 1e12 ? n * 1000 : n
  return new Date(ms).toISOString()
}

function asRecord(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object') return {}
  return v as Record<string, unknown>
}

function buildAddress(receipt: Record<string, unknown>): NormalizedMarketplaceOrder['address'] {
  const ship = asRecord(receipt.shipping_address)
  const first = String(receipt.first_line ?? ship.first_line ?? '').trim()
  const second = String(receipt.second_line ?? ship.second_line ?? '').trim()
  let city = String(receipt.city ?? ship.city ?? '').trim()
  let state = String(receipt.state ?? ship.state ?? '').trim()
  let zip = String(receipt.zip ?? receipt.postal_code ?? ship.zip ?? ship.postal_code ?? '').trim()
  let country = String(
    receipt.country_iso ?? receipt.country_iso3 ?? ship.country_iso ?? receipt.country_name ?? ship.country_name ?? ''
  ).trim()
  const formatted = String(receipt.formatted_address ?? ship.formatted_address ?? '').trim()

  const streetCore = [first, second].filter(Boolean).join(', ')

  // Etsy often returns a printable block in `formatted_address` — parse AU "Suburb STATE 1234" tail for labels.
  if (formatted && (!city || !state || !zip)) {
    const lines = formatted.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length > 0) {
      const last = lines[lines.length - 1]!
      const au = last.match(/^(.+?)\s+(NSW|QLD|VIC|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i)
      if (au) {
        const above = lines.slice(0, -1)
        const streetFromFmt = above.join(', ').trim()
        return {
          streetAddress: streetCore || streetFromFmt || first || '—',
          suburb: au[1]!.trim(),
          state: au[2]!.toUpperCase(),
          postcode: au[3]!,
          country: country || 'AU',
          asSingleLine: formatted.replace(/\r?\n/g, ', '),
        }
      }
    }
  }

  const street = streetCore || first || '—'
  const parts = [street, [city, state, zip].filter(Boolean).join(' '), country].filter(Boolean)
  return {
    streetAddress: street || '—',
    suburb: city || '—',
    state: state || '—',
    postcode: zip || '—',
    country: country || '—',
    asSingleLine: parts.join(', ') || formatted.replace(/\r?\n/g, ', ') || '—',
  }
}

function mapStatus(receipt: Record<string, unknown>): OrderRecord['status'] {
  if (receipt.is_cancelled === true) return 'cancelled'
  if (receipt.was_shipped === true || receipt.is_shipped === true) return 'shipped'
  if (receipt.was_paid === true || receipt.is_paid === true) return 'paid'
  return 'pending'
}

/**
 * @param remote `{ shopId: number, receipt: Etsy ShopReceipt }` or receipt object with `shop_id` set.
 */
export function mapEtsyReceiptEnvelopeToNormalized(remote: unknown): NormalizedMarketplaceOrder {
  if (!remote || typeof remote !== 'object') {
    throw new Error('Invalid Etsy receipt envelope')
  }
  const env = remote as Record<string, unknown>
  const receipt = asRecord(env.receipt ?? remote)
  const shopId = num(env.shopId) ?? num(receipt.shop_id)
  if (shopId === null) throw new Error('Missing Etsy shop id')

  const receiptId = num(receipt.receipt_id)
  if (receiptId === null) throw new Error('Missing Etsy receipt_id')

  const buyer = asRecord(receipt.buyer)
  const buyerName =
    String(receipt.name ?? '').trim() ||
    [buyer.first_name, buyer.last_name].filter(Boolean).join(' ').trim() ||
    String(buyer.login_name ?? 'Etsy buyer').trim()

  const email = String(receipt.buyer_email ?? buyer.email ?? '').trim() || `etsy-buyer-${receiptId}@placeholder.local`
  const phone = String(receipt.buyer_phone ?? buyer.phone ?? '').trim()

  const transactionsRaw = receipt.transactions
  const transactions = Array.isArray(transactionsRaw) ? transactionsRaw : []

  const items: NormalizedMarketplaceOrder['items'] = []
  let subtotal = 0

  for (const tx of transactions) {
    const t = asRecord(tx)
    const qty = Math.max(1, Math.floor(num(t.quantity) ?? 1))
    const listingId = num(t.listing_id)
    const transactionId = num(t.transaction_id)
    const unit = moneyToNumber(t.price) ?? 0
    subtotal += unit * qty
    const title = String(t.title ?? t.description ?? 'Etsy item').trim() || 'Etsy item'
    const { merged, responses } = extractEtsyTransactionPersonalization(t)
    const custom: Record<string, string> = {}
    if (merged) custom['Etsy personalization'] = merged

    items.push({
      externalLineId: transactionId !== null ? String(transactionId) : undefined,
      productId: listingId !== null ? `etsy-listing-${listingId}` : `etsy-tx-${transactionId ?? 'unknown'}`,
      name: title,
      quantity: qty,
      unitPrice: unit,
      image: '',
      buyerPersonalization: merged || undefined,
      personalizationResponses: responses.length ? responses : undefined,
      customizations: Object.keys(custom).length ? custom : undefined,
    })
  }

  if (items.length === 0) {
    items.push({
      productId: `etsy-receipt-${receiptId}`,
      name: 'Etsy order (no line items in payload)',
      quantity: 1,
      unitPrice: 0,
      image: '',
    })
  }

  const shipping = moneyToNumber(receipt.total_shipping_cost) ?? 0
  const tax = moneyToNumber(receipt.total_tax_cost) ?? 0
  const grand =
    moneyToNumber(receipt.grandtotal) ??
    moneyToNumber(receipt.total_price) ??
    subtotal + shipping + tax
  const total = Number((grand ?? subtotal + shipping + tax).toFixed(2))
  const subFixed = Number(subtotal.toFixed(2))
  const shipFixed = Number(shipping.toFixed(2))

  return {
    platform: 'etsy',
    externalOrderKey: `etsy:${receiptId}`,
    createdAtIso: etsyTimeToIso(receipt.creation_timestamp ?? receipt.create_timestamp ?? receipt.created_timestamp),
    customer: {
      name: buyerName,
      firstName: String(buyer.first_name ?? '').trim() || undefined,
      lastName: String(buyer.last_name ?? '').trim() || undefined,
      email,
      phone: phone || '—',
    },
    address: buildAddress(receipt),
    items,
    subtotal: subFixed,
    shippingPrice: shipFixed,
    total,
    shippingOptionId: 'etsy-shipping',
    shippingOptionName: 'Etsy shipping',
    paymentMethodName: 'Etsy Checkout',
    status: mapStatus(receipt),
    integration: { etsy: { receiptId, shopId } },
    raw: { receipt_id: receiptId, shop_id: shopId },
  }
}
