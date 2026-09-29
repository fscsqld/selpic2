/**
 * Pure helpers for admin VIP manual grade overrides (email-keyed).
 * Used by server store + unit tests — no I/O.
 */

export type VipManualGradeOverride = {
  email: string
  gradeCode: number
  reason?: string
  updatedAt: string
}

export type VipManualGradeOverridesSnapshot = {
  updatedAt: string
  byEmail: Record<string, VipManualGradeOverride>
}

export function normalizeVipOverrideEmail(email: string): string {
  return (email || '').trim().toLowerCase()
}

export function clampVipGradeCode(code: unknown): number | null {
  const n = Math.floor(Number(code))
  if (!Number.isFinite(n) || n < 0 || n > 4) return null
  return n
}

export function parseVipManualGradeOverridesValue(raw: unknown): VipManualGradeOverridesSnapshot {
  const empty: VipManualGradeOverridesSnapshot = { updatedAt: '', byEmail: {} }
  let value: unknown = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return empty
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return empty
  const obj = value as Record<string, unknown>
  const byEmailRaw =
    obj.byEmail && typeof obj.byEmail === 'object' && !Array.isArray(obj.byEmail)
      ? (obj.byEmail as Record<string, unknown>)
      : {}
  const byEmail: Record<string, VipManualGradeOverride> = {}
  for (const [key, row] of Object.entries(byEmailRaw)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const r = row as Record<string, unknown>
    const email = normalizeVipOverrideEmail(String(r.email || key || ''))
    const gradeCode = clampVipGradeCode(r.gradeCode)
    if (!email || gradeCode === null) continue
    byEmail[email] = {
      email,
      gradeCode,
      reason: typeof r.reason === 'string' && r.reason.trim() ? r.reason.trim() : undefined,
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : '',
    }
  }
  return {
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : '',
    byEmail,
  }
}

/** Prefer manual override grade when present; otherwise keep sales-computed grade. */
export function resolveEffectiveVipGradeCode(
  salesGradeCode: number,
  override: VipManualGradeOverride | null | undefined
): { gradeCode: number; fromManualOverride: boolean } {
  if (override && Number.isFinite(override.gradeCode)) {
    return { gradeCode: override.gradeCode, fromManualOverride: true }
  }
  return { gradeCode: salesGradeCode, fromManualOverride: false }
}
