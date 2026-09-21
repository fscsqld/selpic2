/**
 * Admin Recharts charts must only mount when the layout box is a positive
 * pixel size. Percentage height/width can report -1 on first paint, hidden
 * tabs, empty grid cells, and collapsed sidebars.
 */
export const ADMIN_CHART_DEFAULT_HEIGHT = 320

export function isSafeRechartsBox(width: number, height: number): boolean {
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width >= 1 &&
    height >= 1
  )
}
