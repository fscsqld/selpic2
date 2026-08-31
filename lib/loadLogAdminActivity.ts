import type { ActivityLog } from '@/lib/adminActivityLog'
import type { LogAdminActivityInput } from '@/lib/logAdminActivity'

type LogAdminActivityModule = typeof import('@/lib/logAdminActivity')

let cachedLoad: Promise<LogAdminActivityModule | null> | null = null

/**
 * Lazy-load admin activity logging without failing CMS/product saves when a dev
 * ChunkLoadError occurs (stale webpack chunk after HMR). Callers should no-op when null.
 */
export async function importLogAdminActivity(): Promise<LogAdminActivityModule | null> {
  if (typeof window === 'undefined') return null
  if (!cachedLoad) {
    cachedLoad = import('@/lib/logAdminActivity')
      .then((mod) => mod)
      .catch((err) => {
        cachedLoad = null
        console.warn(
          '[importLogAdminActivity] chunk load failed — CMS save still succeeded; hard refresh (Ctrl+Shift+R) if this repeats',
          err
        )
        return null
      })
  }
  return cachedLoad
}

export function scheduleLogAdminActivity(input: LogAdminActivityInput): void {
  void importLogAdminActivity().then((mod) => {
    mod?.logAdminActivity(input)
  })
}

export function scheduleLogAdminActivityThrottled(
  key: string,
  input: LogAdminActivityInput,
  windowMs?: number
): void {
  void importLogAdminActivity().then((mod) => {
    mod?.logAdminActivityThrottled(key, input, windowMs)
  })
}

export function scheduleSyncActivityLogToServer(log: ActivityLog): void {
  void importLogAdminActivity().then((mod) => {
    if (mod) void mod.syncActivityLogToServer(log)
  })
}
