/**
 * AU FY period keys for Site Review reports (not grant payout automation).
 * Reuses Sydney calendar quarter parts from fundraising helpers.
 */

import { auFyQuarterParts } from '../../fundraising/auFinancialQuarter'

/** e.g. FY2025-26-Q1 */
export function siteReviewPeriodKey(d = new Date()): string {
  const { fyLabel, quarter } = auFyQuarterParts(d)
  return `FY${fyLabel}-Q${quarter}`
}

export function isSiteReviewPeriodKey(raw: string): boolean {
  return /^FY\d{4}-\d{2}-Q[1-4]$/.test(String(raw || '').trim())
}
