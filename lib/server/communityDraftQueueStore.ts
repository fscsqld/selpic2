/**
 * Community agent HITL draft queue store.
 * Primary: Supabase `site_configs` key agent_community_draft_queue (shared across deploys).
 * Fallback: data/agent/community-draft-queue.json (local/dev when Supabase off).
 * No auto-publish — Approve still goes through community posts API.
 *
 * Cousins: empty remote + local file migrate-once, remote wins when both set,
 * Sources footer strip, missing site_configs, multi-admin devices, serverless ephemeral disk.
 */

import path from 'path'
import fs from 'fs/promises'

import type { QueuedCommunityDraft } from '@/lib/agent/communityDraftQueue'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { AGENT_COMMUNITY_DRAFT_QUEUE_CONFIG_KEY } from '@/lib/siteConfigConstants'
import {
  mergeQueueReadPreference,
  parseCommunityDraftQueueValue,
  sanitizeQueuedDraft,
  type CommunityDraftQueueSnapshot,
} from '@/lib/agent/communityDraftQueueNormalize'

const DATA_DIR = path.join(process.cwd(), 'data', 'agent')
const DATA_FILE = path.join(DATA_DIR, 'community-draft-queue.json')

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readLocalFileQueue(): Promise<QueuedCommunityDraft[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    return parseCommunityDraftQueueValue(JSON.parse(raw)).items
  } catch {
    return []
  }
}

async function writeLocalFileQueue(items: QueuedCommunityDraft[]): Promise<void> {
  await ensureDir()
  const snapshot: CommunityDraftQueueSnapshot = {
    updatedAt: new Date().toISOString(),
    items,
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(snapshot, null, 2), 'utf-8')
}

async function readRemoteQueue(): Promise<QueuedCommunityDraft[] | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('site_configs')
      .select('value')
      .eq('config_key', AGENT_COMMUNITY_DRAFT_QUEUE_CONFIG_KEY)
      .maybeSingle()
    if (error) return null
    if (!data) return []
    return parseCommunityDraftQueueValue(data.value).items
  } catch {
    return null
  }
}

async function writeRemoteQueue(items: QueuedCommunityDraft[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const admin = getSupabaseAdmin()
    const now = new Date().toISOString()
    const { error } = await admin.from('site_configs').upsert(
      {
        config_key: AGENT_COMMUNITY_DRAFT_QUEUE_CONFIG_KEY,
        value: {
          updatedAt: now,
          items,
        },
        updated_at: now,
      },
      { onConflict: 'config_key' }
    )
    return !error
  } catch {
    return false
  }
}

async function persistQueue(items: QueuedCommunityDraft[]): Promise<void> {
  const cleaned = items.map(sanitizeQueuedDraft)
  const remoteOk = await writeRemoteQueue(cleaned)
  // Keep a local mirror for offline/dev; ignore write failures on read-only FS (Vercel).
  try {
    await writeLocalFileQueue(cleaned)
  } catch {
    if (!remoteOk) {
      throw new Error('Failed to persist community draft queue (remote and local)')
    }
  }
  if (!remoteOk && !isSupabaseConfigured()) {
    // File-only mode already wrote above (or threw).
    return
  }
}

export async function readCommunityDraftQueue(): Promise<QueuedCommunityDraft[]> {
  const remote = await readRemoteQueue()
  const local = await readLocalFileQueue()

  if (remote === null) {
    // Supabase unavailable — file fallback only.
    const sanitized = local.map(sanitizeQueuedDraft)
    if (sanitized.some((row, i) => row.content !== local[i]?.content)) {
      try {
        await writeLocalFileQueue(sanitized)
      } catch {
        /* ignore */
      }
    }
    return sanitized
  }

  const { items, migrateLocalToRemote } = mergeQueueReadPreference(remote, local)
  if (migrateLocalToRemote) {
    await persistQueue(items)
    return items
  }

  // Strip Sources footers and persist if changed (shared SSOT).
  const before = items.map((i) => i.content).join('\0')
  const sanitized = items.map(sanitizeQueuedDraft)
  const after = sanitized.map((i) => i.content).join('\0')
  if (before !== after) {
    await persistQueue(sanitized)
  }
  return sanitized
}

export async function writeCommunityDraftQueue(
  items: QueuedCommunityDraft[]
): Promise<void> {
  await persistQueue(items)
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
