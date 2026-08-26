/**
 * GST Summary cadence chip — follows the P&L date window, not useState('quarterly').
 * See .cursor/rules/accounting-gst-summary-period.mdc
 */

export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = new Date(`${startIso.slice(0, 10)}T12:00:00`)
  const end = new Date(`${endIso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

/** Cadence chip for GST Summary header. */
export function gstSummaryCadenceLabel(
  startIso: string,
  endIso: string,
  periodType: 'monthly' | 'quarterly',
  periodLabel?: string
): string {
  const days = daysBetweenInclusive(startIso, endIso)
  const label = (periodLabel || '').toLowerCase()
  if (label.includes('fy') || days >= 300) return 'FY / Period'
  if (days <= 37) return 'Monthly'
  if (days <= 100) return periodType === 'monthly' ? 'Monthly' : 'Quarterly'
  return 'Multi-quarter'
}
