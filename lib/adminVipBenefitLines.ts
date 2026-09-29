/**
 * Admin VIP benefit bullets must stay English.
 * Live CMS `vipGradeConfigs[].benefits` often still has Hangul marketing copy
 * (e.g. "5% 상시 할인") — never dump that raw into Admin User Information.
 */

const HANGUL_RE = /[\uAC00-\uD7A3]/

const FALLBACK_BENEFITS_BY_CODE: Record<number, string[]> = {
  0: ['5% coupon (no automatic discount)'],
  1: ['5% ongoing discount', 'Max discount $10,000', 'Birthday coupon'],
  2: ['10% ongoing discount', 'Free shipping', 'Max discount $20,000'],
  3: ['20% ongoing discount', 'Free shipping', 'Max discount $50,000', 'Dedicated support'],
  4: ['50% ongoing discount', 'Free shipping', 'Max discount $100,000', 'Special gift'],
}

export type AdminVipBenefitRowLike = {
  baseDiscountPercentage?: number
  freeShipping?: boolean
  maxDiscountAmount?: number
  additionalBenefits?: string[]
  isActive?: boolean
}

function isEnglishLine(s: string): boolean {
  const t = String(s || '').trim()
  return Boolean(t) && !HANGUL_RE.test(t)
}

function uniq(lines: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/**
 * Prefer structured vipGradeBenefits (numbers → English), then non-Hangul config
 * strings, then English fallbacks by grade code.
 */
export function adminVipBenefitLines(args: {
  gradeCode: number
  configBenefits?: string[] | null
  benefitRow?: AdminVipBenefitRowLike | null
}): string[] {
  const code = Math.max(0, Math.min(4, Math.floor(Number(args.gradeCode) || 0)))
  const structured: string[] = []
  const row = args.benefitRow
  if (row && row.isActive !== false) {
    const pct = Number(row.baseDiscountPercentage) || 0
    if (pct > 0) structured.push(`${pct}% ongoing discount`)
    if (row.freeShipping) structured.push('Free shipping')
    const max = Number(row.maxDiscountAmount)
    if (Number.isFinite(max) && max > 0) {
      structured.push(`Max discount $${max.toLocaleString()}`)
    }
    for (const line of row.additionalBenefits || []) {
      if (isEnglishLine(line)) structured.push(String(line).trim())
    }
  }
  if (structured.length > 0) return uniq(structured)

  const fromConfig = (args.configBenefits || []).filter(isEnglishLine).map((s) => s.trim())
  if (fromConfig.length > 0) return uniq(fromConfig)

  return FALLBACK_BENEFITS_BY_CODE[code] || []
}
