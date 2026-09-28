/**
 * Vertical packing helpers for Avery shipping labels.
 * Landscape uses a short virtual height (99.1 mm) — mid content (Items / notes)
 * must not push into the barcode + FROM band or text overlaps.
 */

export function labelBottomReservedMm(barHMm: number, fromBlockHMm: number, gapMm = 2): number {
  return barHMm + fromBlockHMm + gapMm
}

/** How many text lines fit between startY and maxY (exclusive of maxY). */
export function maxLinesThatFit(args: {
  startY: number
  maxY: number
  lineHeight: number
  maxCap: number
}): number {
  const { startY, maxY, lineHeight, maxCap } = args
  if (lineHeight <= 0 || maxCap <= 0) return 0
  const room = maxY - startY
  if (room < lineHeight * 0.5) return 0
  return Math.min(maxCap, Math.max(0, Math.floor(room / lineHeight)))
}

/** Cap wrapped lines; append ellipsis on the last kept line when truncated. */
export function takeLinesWithEllipsis(lines: string[], maxLines: number): string[] {
  if (maxLines <= 0) return []
  if (lines.length <= maxLines) return lines.slice()
  if (maxLines === 1) {
    const s = String(lines[0] ?? '')
    if (!s) return ['…']
    return [s.endsWith('…') ? s : `${s.slice(0, Math.max(1, Math.min(s.length, 72)))}…`]
  }
  const head = lines.slice(0, maxLines - 1)
  const last = String(lines[maxLines - 1] ?? '')
  const clipped =
    last.length > 48
      ? `${last.slice(0, 48)}…`
      : last.endsWith('…')
        ? last
        : `${last}…`
  return [...head, clipped]
}
