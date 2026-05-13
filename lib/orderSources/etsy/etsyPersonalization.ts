/**
 * Etsy line items expose personalization in multiple shapes across API versions.
 * Collect everything we can into structured + merged text for SELPIC `OrderItemSnapshot`.
 */
export function extractEtsyTransactionPersonalization(tx: Record<string, unknown>): {
  merged: string
  responses: Array<{ label: string; value: string; promptId?: string }>
} {
  const responses: Array<{ label: string; value: string; promptId?: string }> = []

  const push = (label: string, value: string, promptId?: string) => {
    const v = value.trim()
    if (!v) return
    responses.push({ label: label.trim() || 'Personalization', value: v, promptId })
  }

  const p = tx.personalization
  if (typeof p === 'string') push('Personalization', p)

  const formattedPers = tx.formatted_personalization
  if (typeof formattedPers === 'string') {
    const pt = typeof p === 'string' ? p.trim() : ''
    if (formattedPers.trim() !== pt) push('Personalization', formattedPers)
  }

  const pers = tx.personalizations
  if (Array.isArray(pers)) {
    for (const entry of pers) {
      if (!entry || typeof entry !== 'object') continue
      const o = entry as Record<string, unknown>
      const label = String(o.label ?? o.buyer_label ?? 'Personalization')
      const value = String(o.value ?? o.buyer_response ?? o.text ?? '').trim()
      const promptId = typeof o.personalization_id === 'string' ? o.personalization_id : undefined
      push(label, value, promptId)
    }
  }

  const variations = tx.variations
  if (Array.isArray(variations)) {
    for (const v of variations) {
      if (!v || typeof v !== 'object') continue
      const vo = v as Record<string, unknown>
      const pvs = vo.property_values
      if (!Array.isArray(pvs)) continue
      for (const pv of pvs) {
        if (!pv || typeof pv !== 'object') continue
        const po = pv as Record<string, unknown>
        const label = String(po.property_name ?? po.formatted_name ?? 'Option')
        const rawVals = po.values
        const value =
          Array.isArray(rawVals) && rawVals.length > 0
            ? String(rawVals[0])
            : String(po.value ?? po.formatted_value ?? '')
        push(label, value)
      }
    }
  }

  const merged = responses.map((r) => `${r.label}: ${r.value}`).join('\n')
  return { merged, responses }
}
