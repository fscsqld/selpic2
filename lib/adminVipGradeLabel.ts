/**
 * Admin / ops UI: always show English VIP grade labels (never Hangul or "Silver (실버)").
 * Storefront Korean copy still uses vipGradeConfig.name via getGradeName(..., 'ko').
 */

export const ADMIN_VIP_GRADE_LABELS = ['Basic', 'Silver', 'Gold', 'Black', 'VVIP'] as const

const HANGUL_RE = /[\uAC00-\uD7A3]/

/** Strip trailing bilingual junk e.g. "Silver (실버)" → "Silver". */
export function stripBilingualVipGradeLabel(raw: string): string {
  return String(raw || '')
    .replace(/\s*\([^)]*[\uAC00-\uD7A3][^)]*\)\s*/g, '')
    .trim()
}

/**
 * Canonical English label for admin selects/badges.
 * Prefer grade code 0–4; never append Korean `name`.
 */
export function adminVipGradeLabel(grade: {
  code?: number
  nameEn?: string
  name?: string
} | null | undefined): string {
  const code = Math.floor(Number(grade?.code))
  if (Number.isFinite(code) && code >= 0 && code <= 4) {
    return ADMIN_VIP_GRADE_LABELS[code]
  }
  const fromEn = stripBilingualVipGradeLabel(String(grade?.nameEn || ''))
  if (fromEn && !HANGUL_RE.test(fromEn)) return fromEn
  const fromName = stripBilingualVipGradeLabel(String(grade?.name || ''))
  if (fromName && !HANGUL_RE.test(fromName)) return fromName
  return 'Unknown'
}

export function adminVipGradeLabelFromCode(gradeCode: number): string {
  return adminVipGradeLabel({ code: gradeCode })
}
