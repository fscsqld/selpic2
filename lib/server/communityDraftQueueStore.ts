/**
 * File-backed pending draft queue for Wave 5 Community agent.
 * Path: data/agent/community-draft-queue.json
 * Serverless note: local to the instance; fine for HITL ops on one primary deploy.
 * No auto-publish — Approve still goes through community posts API.
 */

import path from 'path'
import fs from 'fs/promises'

import type { QueuedCommunityDraft } from '@/lib/agent/communityDraftQueue'
import { stripCommunitySourcesFooter } from '@/lib/agent/communityDraft'

const DATA_DIR = path.join(process.cwd(), 'data', 'agent')
const DATA_FILE = path.join(DATA_DIR, 'community-draft-queue.json')

function sanitizeQueuedDraft(row: QueuedCommunityDraft): QueuedCommunityDraft {
  const content = stripCommunitySourcesFooter(row.content)
  if (content === row.content) return row
  return { ...row, content }
}
async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export async function readCommunityDraftQueue(): Promise<QueuedCommunityDraft[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const items = parsed.filter(
      (row): row is QueuedCommunityDraft =>
        !!row &&
        typeof row === 'object' &&
        typeof (row as QueuedCommunityDraft).id === 'string' &&
        typeof (row as QueuedCommunityDraft).title === 'string' &&
        typeof (row as QueuedCommunityDraft).content === 'string'
    )
    const sanitized = items.map(sanitizeQueuedDraft)
    // Persist strip once so old Sources footers do not reappear after refresh.
    if (sanitized.some((row, i) => row.content !== items[i].content)) {
      await writeCommunityDraftQueue(sanitized)
    }
    return sanitized
  } catch {
    return []
  }
}

export async function writeCommunityDraftQueue(
  items: QueuedCommunityDraft[]
): Promise<void> {
  await ensureDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8')
}

export async function listPendingCommunityDrafts(): Promise<QueuedCommunityDraft[]> {
  const all = await readCommunityDraftQueue()
  return all
    .filter((i) => i.status === 'pending')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getQueuedCommunityDraft(
  id: string
): Promise<QueuedCommunityDraft | null> {
  const all = await readCommunityDraftQueue()
  return all.find((i) => i.id === id) || null
}

export async function upsertQueuedCommunityDraft(
  item: QueuedCommunityDraft
): Promise<QueuedCommunityDraft> {
  const cleaned = sanitizeQueuedDraft(item)
  const all = await readCommunityDraftQueue()
  const idx = all.findIndex((i) => i.id === cleaned.id)
  if (idx >= 0) all[idx] = cleaned
  else all.unshift(cleaned)
  await writeCommunityDraftQueue(all)
  return cleaned
}

export async function replaceCommunityDraftQueue(
  items: QueuedCommunityDraft[]
): Promise<void> {
  await writeCommunityDraftQueue(items.map(sanitizeQueuedDraft))
}

export async function removeQueuedCommunityDraft(id: string): Promise<boolean> {
  const all = await readCommunityDraftQueue()
  const next = all.filter((i) => i.id !== id)
  if (next.length === all.length) return false
  await writeCommunityDraftQueue(next)
  return true
}

export async function patchQueuedCommunityDraft(
  id: string,
  patch: Partial<Pick<QueuedCommunityDraft, 'title' | 'content' | 'category'>>
): Promise<QueuedCommunityDraft | null> {
  const all = await readCommunityDraftQueue()
  const idx = all.findIndex((i) => i.id === id)
  if (idx < 0) return null
  const next = {
    ...all[idx],
    ...patch,
    title: patch.title !== undefined ? String(patch.title) : all[idx].title,
    content: patch.content !== undefined ? String(patch.content) : all[idx].content,
    category: patch.category !== undefined ? String(patch.category) : all[idx].category,
  }
  all[idx] = next
  await writeCommunityDraftQueue(all)
  return next
}
