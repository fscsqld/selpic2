import type { MediaFile } from '@/lib/mediaStore'

let debounceTimer: ReturnType<typeof setTimeout> | null = null
/** Serializes POSTs so an older in-flight snapshot cannot overwrite a newer full list on the server. */
let syncChain: Promise<void> = Promise.resolve()

async function syncLatestFromStore(maxAttempts: number): Promise<{ ok: boolean; status?: number }> {
  const { useMediaStore } = await import('@/lib/mediaStore')
  const { syncMediaToServer } = await import('@/lib/mediaSync')
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const files = useMediaStore.getState().mediaFiles
    const r = await syncMediaToServer(files)
    if (r.ok) return r
    await new Promise((resolve) => setTimeout(resolve, attempt * 900))
  }
  return { ok: false }
}

/** Push current Zustand media list to the server (always reads latest state per attempt). */
export async function syncMediaToServerNow(maxAttempts = 3): Promise<{ ok: boolean; status?: number }> {
  return syncLatestFromStore(maxAttempts)
}

/**
 * Debounced server sync. Ignores the optional argument (legacy callers passed a snapshot that could be stale).
 * Uses a promise chain so overlapping uploads cannot reorder POSTs and drop files on the server.
 */
export function scheduleMediaSyncToServer(_legacySnapshot?: MediaFile[]): void {
  if (typeof window === 'undefined') return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    syncChain = syncChain
      .then(async () => {
        try {
          const r = await syncLatestFromStore(3)
          if (!r.ok) console.warn('[mediaSyncScheduler] server sync not ok', r)
        } catch (e) {
          console.warn('[mediaSyncScheduler] server sync error', e)
        }
      })
      .catch(() => {
        /* never break the chain */
      })
  }, 500)
}
