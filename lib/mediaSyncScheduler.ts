import type { MediaFile } from '@/lib/mediaStore'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export async function syncMediaToServerNow(
  mediaFiles: MediaFile[],
  maxAttempts = 3
): Promise<{ ok: boolean; status?: number }> {
  const { syncMediaToServer } = await import('@/lib/mediaSync')
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const r = await syncMediaToServer(mediaFiles)
    if (r.ok) return r
    await new Promise((resolve) => setTimeout(resolve, attempt * 900))
  }
  return { ok: false }
}

export function scheduleMediaSyncToServer(mediaFiles: MediaFile[]): void {
  if (typeof window === 'undefined') return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void syncMediaToServerNow(mediaFiles, 3)
  }, 800)
}
