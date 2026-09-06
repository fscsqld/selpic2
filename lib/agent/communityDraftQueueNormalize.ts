/**
 * Pure helpers for Community draft queue persistence.
 * Cousins: non-array payloads, missing fields, Sources footer strip,
 * empty remote + non-empty local (migrate once), remote wins when both set.
 */

import type { QueuedCommunityDraft } from './communityDraftQueue'
import { stripCommunitySourcesFooter } from './communityDraft'

export type CommunityDraftQueueSnapshot = {
  updatedAt: string
  items: QueuedCommunityDraft[]
}

export function sanitizeQueuedDraft(row: QueuedCommunityDraft): QueuedCommunityDraft {
  const content = stripCommunitySourcesFooter(row.content)
  if (content === row.content) return row
  return { ...row, content }
}

export function isQueuedCommunityDraft(row: unknown): row is QueuedCommunityDraft {
  if (!row || typeof row !== 'object') return false
  const r = row as QueuedCommunityDraft
  return (
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.content === 'string' &&
    typeof r.topicId === 'string' &&
    typeof r.status === 'string'
  )
}

/** Parse site_configs.value or file JSON into a snapshot. */
export function parseCommunityDraftQueueValue(raw: unknown): CommunityDraftQueueSnapshot {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return { updatedAt: '', items: [] }
    }
  }
  if (Array.isArray(value)) {
    const items = value.filter(isQueuedCommunityDraft).map(sanitizeQueuedDraft)
    return { updatedAt: '', items }
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const list = Array.isArray(obj.items) ? obj.items : []
    const items = list.filter(isQueuedCommunityDraft).map(sanitizeQueuedDraft)
    return {
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : '',
      items,
    }
  }
  return { updatedAt: '', items: [] }
}

/**
 * Prefer remote when it already has drafts. Migrate local → remote only when
 * remote is empty and local still has HITL drafts (dev laptop → first prod write).
 */
export function shouldMigrateLocalQueueToRemote(
  remoteItems: QueuedCommunityDraft[],
  localItems: QueuedCommunityDraft[]
): boolean {
  return remoteItems.length === 0 && localItems.length > 0
}

export function mergeQueueReadPreference(
  remoteItems: QueuedCommunityDraft[],
  localItems: QueuedCommunityDraft[]
): { items: QueuedCommunityDraft[]; migrateLocalToRemote: boolean } {
  if (shouldMigrateLocalQueueToRemote(remoteItems, localItems)) {
    return { items: localItems.map(sanitizeQueuedDraft), migrateLocalToRemote: true }
  }
  if (remoteItems.length > 0) {
    return { items: remoteItems.map(sanitizeQueuedDraft), migrateLocalToRemote: false }
  }
  return { items: localItems.map(sanitizeQueuedDraft), migrateLocalToRemote: false }
}
