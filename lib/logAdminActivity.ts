import type { ActivityLog, ActivityLogAction } from '@/lib/adminActivityLog'

export type LogAdminActivityInput = {
  action: ActivityLogAction
  description: string
  /** Product id, content id, promo code, etc. */
  target?: string
  field?: string
  oldValue?: unknown
  newValue?: unknown
  /** Override actor; defaults to current admin username/email. */
  performedBy?: string
  /** Skip remote POST (tests / bulk import). */
  localOnly?: boolean
}

function resolvePerformedBy(explicit?: string): string {
  if (explicit?.trim()) return explicit.trim()
  try {
    // Lazy require avoids circular imports with adminAuth ↔ stores.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAdminAuth } = require('@/lib/adminAuth') as typeof import('@/lib/adminAuth')
    const user = useAdminAuth.getState().adminUser
    if (user?.username?.trim()) return user.username.trim()
    if (user?.email?.trim()) return user.email.trim()
  } catch {
    /* ignore */
  }
  return 'admin'
}

/**
 * Record an admin operational change for super-admin oversight / disputes.
 * Writes local Activity Log immediately, then best-effort sync to Supabase.
 */
export function logAdminActivity(input: LogAdminActivityInput): string | null {
  if (typeof window === 'undefined') return null

  const performedBy = resolvePerformedBy(input.performedBy)
  const description = input.description.trim() || input.action

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAdminActivityLog } = require('@/lib/adminActivityLog') as typeof import('@/lib/adminActivityLog')
    const { addLog, getUserAgent } = useAdminActivityLog.getState()

    addLog(
      {
        action: input.action,
        performedBy,
        targetAdmin: input.target?.trim() || undefined,
        userAgent: getUserAgent(),
        details: {
          field: input.field,
          oldValue: input.oldValue,
          newValue: input.newValue,
          description,
        },
      },
      { skipRemote: !!input.localOnly }
    )

    const newest = useAdminActivityLog.getState().logs[0]
    return newest?.id ?? null
  } catch (e) {
    console.warn('[logAdminActivity] failed', e)
    return null
  }
}

/** Throttle noisy CMS updates (same resource) so autosave does not flood the audit trail. */
const updateThrottleMs = 45_000
const lastUpdateLogAt = new Map<string, number>()

export function logAdminActivityThrottled(
  key: string,
  input: LogAdminActivityInput,
  windowMs = updateThrottleMs
): string | null {
  const now = Date.now()
  const prev = lastUpdateLogAt.get(key) || 0
  if (now - prev < windowMs) return null
  lastUpdateLogAt.set(key, now)
  return logAdminActivity(input)
}

export async function syncActivityLogToServer(log: ActivityLog): Promise<void> {
  try {
    const res = await fetch('/api/admin/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        id: log.id,
        action: log.action,
        performedBy: log.performedBy,
        target: log.targetAdmin || null,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress || null,
        userAgent: log.userAgent || null,
        details: log.details || null,
      }),
    })
    if (!res.ok && res.status !== 401) {
      const body = await res.text().catch(() => '')
      console.warn('[logAdminActivity] remote sync failed', res.status, body.slice(0, 200))
    }
  } catch (e) {
    console.warn('[logAdminActivity] remote sync error', e)
  }
}

/** Pull shared audit rows into the local Activity Log (merge by id). */
export async function pullAdminActivityLogsFromServer(): Promise<number> {
  try {
    const res = await fetch('/api/admin/activity-logs', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })
    if (!res.ok) return 0
    const body = (await res.json()) as { logs?: ActivityLog[] }
    const remote = Array.isArray(body.logs) ? body.logs : []
    if (!remote.length) return 0

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAdminActivityLog } = require('@/lib/adminActivityLog') as typeof import('@/lib/adminActivityLog')
    return useAdminActivityLog.getState().mergeRemoteLogs(remote)
  } catch (e) {
    console.warn('[logAdminActivity] pull failed', e)
    return 0
  }
}
