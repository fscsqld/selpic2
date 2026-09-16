/**
 * jsPDF Form XObject helpers for landscape postal labels.
 *
 * Form /BBox and doFormObject `cm` translations are PDF points.
 * Compat draw APIs still take millimetres (× scaleFactor internally).
 * Passing mm into beginFormObject clips most of the label and mis-stamps it.
 *
 * Stamp matrix must be a **proper rotation** (det = +1). The old
 * `Matrix(0,1,1,0,tx,ty)` is a reflection (det = −1) and draws mirrored /
 * “upside-down” glyphs.
 */

export function mmToPdfPoints(mm: number, scaleFactor: number): number {
  return mm * scaleFactor
}

/** Virtual landscape draw size in mm → Form BBox size in points. */
export function landscapeFormBBoxPoints(
  contentWidthMm: number,
  contentHeightMm: number,
  scaleFactor: number
): { widthPt: number; heightPt: number } {
  return {
    widthPt: mmToPdfPoints(contentWidthMm, scaleFactor),
    heightPt: mmToPdfPoints(contentHeightMm, scaleFactor),
  }
}

export type LandscapeFormStampMatrix = {
  /** PDF `cm` a b c d e f — 90° counter-clockwise into the Avery cell. */
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

/**
 * Stamp CTM for rotating landscape Form content into a portrait Avery cell.
 *
 * 90° CCW: (x,y) → (−y, x), then translate so the form BBox fills the cell.
 * PDF origin is bottom-left; jsPDF page helpers use top-left mm.
 *
 * After stamp, form top-left (DELIVER TO) lands at the cell’s bottom-left;
 * reading along form +x goes up the long edge — rotate the sheet 90° CW to read.
 */
export function landscapeFormStampMatrix(args: {
  cellXMm: number
  cellYMm: number
  cellWidthMm: number
  cellHeightMm: number
  /** Virtual form content width in mm (Avery long edge, 139). */
  formWidthMm: number
  /** Virtual form content height in mm (Avery short edge, 99.1). */
  formHeightMm: number
  pageHeightMm: number
  scaleFactor: number
}): LandscapeFormStampMatrix {
  const pdfXMm = args.cellXMm
  const pdfYMm = args.pageHeightMm - args.cellYMm - args.cellHeightMm
  const vhPt = mmToPdfPoints(args.formHeightMm, args.scaleFactor)
  return {
    a: 0,
    b: 1,
    c: -1,
    d: 0,
    e: mmToPdfPoints(pdfXMm, args.scaleFactor) + vhPt,
    f: mmToPdfPoints(pdfYMm, args.scaleFactor),
  }
}

/** @deprecated Use {@link landscapeFormStampMatrix} (includes rotation, not raw bottom-left). */
export function landscapeFormStampTranslationPoints(args: {
  cellXMm: number
  cellYMm: number
  cellHeightMm: number
  pageHeightMm: number
  scaleFactor: number
}): { txPt: number; tyPt: number } {
  const pdfXMm = args.cellXMm
  const pdfYMm = args.pageHeightMm - args.cellYMm - args.cellHeightMm
  return {
    txPt: mmToPdfPoints(pdfXMm, args.scaleFactor),
    tyPt: mmToPdfPoints(pdfYMm, args.scaleFactor),
  }
}
