'use client'

import type { DocumentSendLog } from '@/lib/documentSendLogStore'
import { useDocumentSendLogStore } from '@/lib/documentSendLogStore'

const MAX_LOGS = 300

export type DocumentSendLogSyncResult = {
  ok: boolean
  remoteCount: number
  uploadedLocalCount: number
  message?: string
}

function sortBySentAtDesc(logs: DocumentSendLog[]): DocumentSendLog[] {
  return [...logs].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  )
}

function mergeById(remote: DocumentSendLog[], local: DocumentSendLog[]): DocumentSendLog[] {
  const map = new Map<string, DocumentSendLog>()
  for (const log of local) map.set(log.id, log)
  for (const log of remote) map.set(log.id, log) // remote wins on conflict
  return sortBySentAtDesc(Array.from(map.values())).slice(0, MAX_LOGS)
}

export async function fetchDocumentSendLogsFromApi(): Promise<{
  logs: DocumentSendLog[] | null
  error?: string
  status?: number
}> {
  try {
    const res = await fetch('/api/admin/document-send-logs', { method: 'GET' })
    if (!res.ok) {
      const txt = await res.text()
      return { logs: null, error: txt || `HTTP ${res.status}`, status: res.status }
    }
    const json = (await res.json()) as { logs?: DocumentSendLog[] }
    return { logs: Array.isArray(json.logs) ? json.logs : [] }
  } catch (e) {
    return {
      logs: null,
      error: e instanceof Error ? e.message : 'Failed to fetch send logs',
    }
  }
}

export async function upsertDocumentSendLogToApi(
  log: DocumentSendLog
): Promise<{ ok: boolean; error?: string; status?: number }> {
  try {
    const res = await fetch('/api/admin/document-send-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: txt || `HTTP ${res.status}`, status: res.status }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to save send log',
    }
  }
}

export async function deleteDocumentSendLogFromApi(
  id: string
): Promise<{ ok: boolean; error?: string; status?: number }> {
  try {
    const res = await fetch(`/api/admin/document-send-logs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: txt || `HTTP ${res.status}`, status: res.status }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to delete send log',
    }
  }
}

/**
 * Pull remote logs, upload any local-only rows, then replace the Zustand cache.
 * Keeps localStorage as offline cache when Supabase/API is unavailable.
 */
export async function syncDocumentSendLogsWithSupabase(): Promise<DocumentSendLogSyncResult> {
  const local = useDocumentSendLogStore.getState().logs
  const { logs: remote, error, status } = await fetchDocumentSendLogsFromApi()

  if (!remote) {
    return {
      ok: false,
      remoteCount: 0,
      uploadedLocalCount: 0,
      message:
        status === 401
          ? 'Sign in with a Supabase admin account to sync send history across devices.'
          : error || 'Failed to sync send history from Supabase.',
    }
  }

  const remoteIds = new Set(remote.map((l) => l.id))
  const localOnly = local.filter((l) => !remoteIds.has(l.id))
  let uploadedLocalCount = 0

  for (const log of localOnly) {
    const result = await upsertDocumentSendLogToApi(log)
    if (result.ok) uploadedLocalCount += 1
  }

  // Re-fetch after uploads so all admins see a consistent set
  let finalRemote = remote
  if (uploadedLocalCount > 0) {
    const again = await fetchDocumentSendLogsFromApi()
    if (again.logs) finalRemote = again.logs
  }

  const merged = mergeById(finalRemote, local)
  useDocumentSendLogStore.getState().replaceLogs(merged)

  return {
    ok: true,
    remoteCount: finalRemote.length,
    uploadedLocalCount,
    message: `Synced ${finalRemote.length} log(s) from Supabase${
      uploadedLocalCount > 0 ? ` (uploaded ${uploadedLocalCount} local)` : ''
    }.`,
  }
}
