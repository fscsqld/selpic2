import { describe, expect, it } from 'vitest'
import {
  mergeQueueReadPreference,
  parseCommunityDraftQueueValue,
  shouldMigrateLocalQueueToRemote,
} from './communityDraftQueueNormalize'
import type { QueuedCommunityDraft } from './communityDraftQueue'

function draft(
  partial: Partial<QueuedCommunityDraft> & { id: string; title: string }
): QueuedCommunityDraft {
  return {
    status: 'pending',
    topicId: 'custom_sticker_tips',
    content: 'Body',
    category: 'Inspired',
    sources: [],
    createdAt: '2026-09-03T12:00:00.000Z',
    source: 'week_suggestions',
    ...partial,
  }
}

describe('communityDraftQueueNormalize', () => {
  it('parses items wrapper and bare arrays', () => {
    const a = parseCommunityDraftQueueValue({
      updatedAt: 't',
      items: [draft({ id: '1', title: 'A' })],
    })
    expect(a.items).toHaveLength(1)
    expect(a.updatedAt).toBe('t')

    const b = parseCommunityDraftQueueValue([draft({ id: '2', title: 'B' })])
    expect(b.items[0]?.id).toBe('2')
  })

  it('migrates local only when remote is empty', () => {
    const local = [draft({ id: 'l1', title: 'Local' })]
    const remote = [draft({ id: 'r1', title: 'Remote' })]
    expect(shouldMigrateLocalQueueToRemote([], local)).toBe(true)
    expect(shouldMigrateLocalQueueToRemote(remote, local)).toBe(false)
    expect(shouldMigrateLocalQueueToRemote([], [])).toBe(false)
  })

  it('prefers remote when both have drafts', () => {
    const local = [draft({ id: 'l1', title: 'Local' })]
    const remote = [draft({ id: 'r1', title: 'Remote' })]
    const merged = mergeQueueReadPreference(remote, local)
    expect(merged.migrateLocalToRemote).toBe(false)
    expect(merged.items.map((i) => i.id)).toEqual(['r1'])
  })

  it('uses local and flags migrate when remote empty', () => {
    const local = [draft({ id: 'l1', title: 'Local' })]
    const merged = mergeQueueReadPreference([], local)
    expect(merged.migrateLocalToRemote).toBe(true)
    expect(merged.items[0]?.title).toBe('Local')
  })
})
