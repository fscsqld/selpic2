/**
 * Human-readable summary for bespoke sticker custom requests.
 * Single source of truth: Agent inbound, Bespoke admin, admin notify emails.
 * Never JSON.stringify the full payload for operator/customer-facing copy.
 *
 * Storefront payload schema: app/stickers/custom/page.tsx (~L879)
 */

export type BespokeStickerPayloadLike = Record<string, unknown>

export type BespokePayloadDetailLine = { label: string; value: string }

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function num(v: unknown): string {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : ''
}

/** Every customer-entered field from the customize form, in display order. */
export function bespokePayloadDetailLines(
  payload: BespokeStickerPayloadLike | null | undefined
): BespokePayloadDetailLine[] {
  if (!payload || typeof payload !== 'object') return []

  const roll = (payload.roll || {}) as BespokeStickerPayloadLike
  const text = (payload.text || {}) as BespokeStickerPayloadLike
  const logo = (payload.logo || {}) as BespokeStickerPayloadLike
  const contact = (payload.contact || {}) as BespokeStickerPayloadLike
  const font = (payload.font || {}) as BespokeStickerPayloadLike
  const presets = (font.presets || {}) as BespokeStickerPayloadLike
  const sizes = (font.sizes || {}) as BespokeStickerPayloadLike

  const lines: BespokePayloadDetailLine[] = []

  const rollPreset = str(roll.preset)
  const rollVariant = str(roll.variant)
  if (rollPreset || rollVariant) {
    lines.push({
      label: 'Roll',
      value:
        rollPreset && rollVariant && rollVariant !== rollPreset
          ? `${rollPreset} (${rollVariant})`
          : rollVariant || rollPreset,
    })
  }
  if (str(roll.characterProductName)) {
    lines.push({ label: 'Character product name', value: str(roll.characterProductName) })
  }
  if (str(roll.notes)) lines.push({ label: 'Roll notes', value: str(roll.notes) })

  if (str(text.line1)) {
    const second = text.layout === 'two' && str(text.line2) ? ` / ${str(text.line2)}` : ''
    lines.push({ label: 'Sticker text', value: `${str(text.line1)}${second}` })
  }
  if (str(text.notes)) lines.push({ label: 'Text layout notes', value: str(text.notes) })

  if (presets.mode === 'single' && str(presets.presetLabel)) {
    lines.push({ label: 'Font preset', value: str(presets.presetLabel) })
  } else {
    const fontLabels = [str(presets.line1PresetLabel), str(presets.line2PresetLabel)].filter(Boolean)
    if (fontLabels.length) lines.push({ label: 'Font presets', value: fontLabels.join(' / ') })
  }
  if (str(font.name)) lines.push({ label: 'Custom font name', value: str(font.name) })
  if (str(font.source)) lines.push({ label: 'Font source / link', value: str(font.source) })
  if (str(font.notes)) lines.push({ label: 'Font notes', value: str(font.notes) })

  if (sizes.layout === 'single' && num(sizes.textPt)) {
    lines.push({ label: 'Font size', value: `${num(sizes.textPt)} pt` })
  } else if (sizes.layout === 'two') {
    const parts = [
      num(sizes.line1Pt) ? `line 1: ${num(sizes.line1Pt)} pt` : '',
      num(sizes.line2Pt) ? `line 2: ${num(sizes.line2Pt)} pt` : '',
    ].filter(Boolean)
    if (parts.length) lines.push({ label: 'Font sizes', value: parts.join(', ') })
  }

  if (str(logo.placementNotes)) {
    lines.push({ label: 'Logo placement', value: str(logo.placementNotes) })
  }

  if (str(contact.name)) lines.push({ label: 'Contact name', value: str(contact.name) })
  if (str(contact.email)) lines.push({ label: 'Contact email', value: str(contact.email) })
  if (str(contact.phone)) lines.push({ label: 'Phone', value: str(contact.phone) })
  if (str(contact.extra)) {
    lines.push({ label: 'Additional customer notes', value: str(contact.extra) })
  }

  return lines
}

export function formatBespokeStickerPayloadSummary(
  payload: BespokeStickerPayloadLike | null | undefined
): string {
  return bespokePayloadDetailLines(payload)
    .map((l) => `${l.label}: ${l.value}`)
    .join('\n')
}

export function bespokeInboundSubject(payload: BespokeStickerPayloadLike | null | undefined): string {
  const roll = (payload?.roll || {}) as BespokeStickerPayloadLike
  const rollLabel = str(roll.variant) || str(roll.preset) || 'bespoke label'
  return `Re: Your ${rollLabel} request`
}

export function bespokeQueueListSubject(payload: BespokeStickerPayloadLike | null | undefined, id: string): string {
  const roll = (payload?.roll || {}) as BespokeStickerPayloadLike
  const rollLabel = str(roll.variant) || str(roll.preset)
  return rollLabel ? `Bespoke: ${rollLabel}` : `Bespoke request ${id.slice(0, 8)}`
}
