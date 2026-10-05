import type { OrderItemSnapshot, OrderRecord } from './store'
import {
  formatPreorderShipsFromLabel,
  orderIncludesPreorder,
} from './marketSPreorder'
import { resolveOrderShippingSnapshot } from './shipping/shippingSnapshot'

/** Earliest YYYY-MM-DD among frozen pre-order lines (UTC calendar date). */
export function getEarliestPreorderShipsFrom(
  items: Array<{ salesModeAtOrder?: string; preorderShipsFrom?: string } | null | undefined> | null | undefined
): string | undefined {
  let earliest: string | undefined
  for (const item of items || []) {
    if (item?.salesModeAtOrder !== 'preorder') continue
    const raw = (item.preorderShipsFrom || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) continue
    const day = raw.slice(0, 10)
    if (!earliest || day < earliest) earliest = day
  }
  return earliest
}

/**
 * Extra shipping lines for pre-order orders so AusPost "2–8 business days"
 * is not read as starting from payment day.
 */
export function formatPreorderDispatchSummaryLines(order: Pick<OrderRecord, 'items' | 'hasPreorderItems'>): string[] {
  if (!orderIncludesPreorder(order)) return []
  const earliest = getEarliestPreorderShipsFrom(order.items)
  const shipsLabel = formatPreorderShipsFromLabel(earliest)
  const snap = resolveOrderShippingSnapshot(order as OrderRecord)
  const window =
    snap.shippingDeliveryTime && snap.shippingDeliveryTime !== '—'
      ? snap.shippingDeliveryTime
      : ''

  const lines: string[] = []
  if (shipsLabel) {
    lines.push(`Pre-order dispatch: on or after ${shipsLabel.replace(/^Ships from\s+/i, '')}`)
  } else {
    lines.push('Pre-order dispatch: on or after the ships-from date shown on each pre-order line')
  }
  if (window && snap.shippingType !== 'pickup') {
    lines.push(`Transit after dispatch: ${window}`)
  }
  return lines
}

export function applyNewPreorderShipsFromToItems(
  items: OrderItemSnapshot[],
  newShipsFrom: string
): OrderItemSnapshot[] {
  const day = newShipsFrom.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('Ships from must be YYYY-MM-DD.')
  }
  return items.map((item) => {
    if (item.salesModeAtOrder !== 'preorder') return item
    return { ...item, preorderShipsFrom: day }
  })
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildPreorderDelayEmailSubject(orderId: string): string {
  return `[Selpic] Pre-order update: ${orderId} — updated ship date`
}

export function buildPreorderDelayEmailHtml(input: {
  order: OrderRecord
  previousShipsFrom?: string
  newShipsFrom: string
  adminNote?: string
}): string {
  const { order, previousShipsFrom, newShipsFrom, adminNote } = input
  const name = escHtml(order.customer?.name || order.customer?.email?.split('@')[0] || 'Customer')
  const newLabel = escHtml(formatPreorderShipsFromLabel(newShipsFrom) || `Ships from ${newShipsFrom}`)
  const prevLabel = previousShipsFrom
    ? escHtml(formatPreorderShipsFromLabel(previousShipsFrom) || `Ships from ${previousShipsFrom}`)
    : ''
  const note = (adminNote || '').trim().slice(0, 500)
  const itemLines = (order.items || [])
    .filter((i) => i.salesModeAtOrder === 'preorder')
    .map(
      (i) =>
        `<li>${escHtml(i.name)} × ${i.quantity} — ${escHtml(
          formatPreorderShipsFromLabel(i.preorderShipsFrom) || 'Pre-order'
        )}</li>`
    )
    .join('')

  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.55;color:#111;max-width:600px;margin:0 auto;padding:16px;">
  <p style="margin:0 0 12px;">Dear ${name},</p>
  <p style="margin:0 0 12px;">Thank you for your patience. We have an update on the estimated dispatch date for your pre-order.</p>
  <p style="margin:0 0 12px;padding:10px 12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;color:#92400e;">
    <strong>Updated ship date</strong><br/>
    ${prevLabel ? `Previous: ${prevLabel}<br/>` : ''}
    New: ${newLabel}
  </p>
  ${
    note
      ? `<p style="margin:0 0 12px;"><strong>Note from Selpic:</strong><br/>${escHtml(note)}</p>`
      : ''
  }
  <p style="margin:0 0 8px;"><strong>Order ID:</strong> ${escHtml(order.id)}</p>
  <p style="margin:0 0 8px;"><strong>Pre-order items:</strong></p>
  <ul style="margin:0 0 16px;padding-left:20px;">${itemLines || '<li>—</li>'}</ul>
  <p style="margin:0 0 12px;">AusPost transit times start after we dispatch (on or after the updated date above), not from the day you paid.</p>
  <p style="margin:0;">If you have any questions, reply to this email or contact us at <a href="mailto:info@selpic.com.au" style="color:#4f46e5;">info@selpic.com.au</a>.</p>
</div>`
}
