/** Product card short description that is a sheet layout spec, not marketing copy. */
export function isStickerSheetSpecDescription(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false
  return /labels\s+per\s+sheet/i.test(text)
}
