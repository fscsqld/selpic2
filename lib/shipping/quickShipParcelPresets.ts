/**
 * Common customer / counter delivery notes for Quick ship Parcel dropdown.
 * Printed on the internal label PERSONALIZATION block (English, AU domestic mail).
 * Keep short — Avery L7169 label space is limited.
 */
export const QUICK_SHIP_PARCEL_PRESETS = [
  { id: 'none', label: 'None (no note on label)', text: '' },
  { id: 'fragile', label: 'Fragile', text: 'Fragile' },
  { id: 'handle-care', label: 'Handle with care', text: 'Handle with care' },
  { id: 'do-not-bend', label: 'Do not bend', text: 'Do not bend' },
  { id: 'leave-at-door', label: 'Leave at door', text: 'Leave at door' },
  { id: 'safe-place', label: 'Leave in a safe place', text: 'Leave in a safe place' },
  { id: 'authority-to-leave', label: 'Authority to leave', text: 'Authority to leave' },
  { id: 'signature', label: 'Signature required', text: 'Signature required' },
  { id: 'call-before', label: 'Call before delivery', text: 'Call before delivery' },
  { id: 'neighbour', label: 'Leave with neighbour if not home', text: 'Leave with neighbour if not home' },
  { id: 'gift', label: 'Gift — no receipt in parcel', text: 'Gift — no receipt in parcel' },
  { id: 'no-crush', label: 'Do not crush (stickers)', text: 'Do not crush — stickers inside' },
  { id: 'custom', label: 'Custom note…', text: '' },
] as const

export type QuickShipParcelPresetId = (typeof QUICK_SHIP_PARCEL_PRESETS)[number]['id']

export function resolveQuickShipParcelNote(
  presetId: QuickShipParcelPresetId,
  customNote: string
): string {
  if (presetId === 'custom') return customNote.trim()
  const preset = QUICK_SHIP_PARCEL_PRESETS.find((p) => p.id === presetId)
  return (preset?.text || '').trim()
}
