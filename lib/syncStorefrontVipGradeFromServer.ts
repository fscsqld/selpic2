/**
 * Pull effective VIP grade (manual override ∪ sales) into local userAuth for UI.
 * Payment APIs already resolve this server-side; profile/checkout UI need the same source.
 */

export type StorefrontVipGradeResponse = {
  gradeCode: number
  totalSales: number
  fromManualOverride: boolean
}

export function buildVipGradeUserPatch(data: StorefrontVipGradeResponse): {
  currentGrade: number
  totalSalesAmount: number
  manualGradeOverride: boolean
  gradeUpdatedAt: string
} {
  const gradeCode = Math.max(0, Math.min(4, Math.floor(Number(data.gradeCode) || 0)))
  return {
    currentGrade: gradeCode,
    totalSalesAmount: Math.max(0, Number(data.totalSales) || 0),
    manualGradeOverride: Boolean(data.fromManualOverride),
    gradeUpdatedAt: new Date().toISOString(),
  }
}

export async function fetchMyVipGradeFromServer(): Promise<StorefrontVipGradeResponse | null> {
  try {
    const res = await fetch('/api/me/vip-grade', { credentials: 'include', cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    if (!data || typeof data !== 'object') return null
    if (typeof data.gradeCode !== 'number') return null
    return {
      gradeCode: data.gradeCode,
      totalSales: typeof data.totalSales === 'number' ? data.totalSales : 0,
      fromManualOverride: Boolean(data.fromManualOverride),
    }
  } catch {
    return null
  }
}
