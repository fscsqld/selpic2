/**
 * Persist fundraising outreach replies (Supabase preferred, file fallback).
 * Run docs/fundraising-outreach-replies.sql in Supabase for production durability.
 */

import path from 'path'
import fs from 'fs/promises'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import type { OutreachReplyIntent } from '@/lib/fundraising/outreachReplyClassify'

export type OutreachReplyQueueStatus = 'open' | 'closed'

export type OutreachReplyRecord = {
  id: string
  fromEmail: string
  targetId?: string
  organizationName?: string
  subject: string
  excerpt: string
  intent: OutreachReplyIntent
  status: OutreachReplyQueueStatus
  messageId?: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  closedReason?: string
  handledBy?: string
  adminNote?: string
}

const DATA_DIR = path.join(process.cwd(), 'data', 'agent')
const DATA_FILE = path.join(DATA_DIR, 'fundraising-outreach-replies.json')

let supabaseTableMissing = false

function mapRow(row: Record<string, unknown>): OutreachReplyRecord {
  return {
    id: String(row.id || ''),
    fromEmail: String(row.from_email || ''),
    targetId: row.target_id ? String(row.target_id) : undefined,
    organizationName: row.organization_name ? String(row.organization_name) : undefined,
    subject: String(row.subject || ''),
    excerpt: String(row.excerpt || ''),
    intent: String(row.intent || 'other') as OutreachReplyIntent,
    status: (row.status === 'closed' ? 'closed' : 'open') as OutreachReplyQueueStatus,
    messageId: row.message_id ? String(row.message_id) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
    closedAt: row.closed_at ? String(row.closed_at) : undefined,
    closedReason: row.closed_reason ? String(row.closed_reason) : undefined,
    handledBy: row.handled_by ? String(row.handled_by) : undefined,
    adminNote: row.admin_note ? String(row.admin_note) : undefined,
  }
}

function toRow(r: OutreachReplyRecord): Record<string, unknown> {
  return {
    id: r.id,
    from_email: r.fromEmail,
    target_id: r.targetId || null,
    organization_name: r.organizationName || null,
    subject: r.subject,
    excerpt: r.excerpt,
    intent: r.intent,
    status: r.status,
    message_id: r.messageId || null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    closed_at: r.closedAt || null,
    closed_reason: r.closedReason || null,
    handled_by: r.handledBy || null,
    admin_note: r.adminNote || null,
  }
}

function isMissingTableError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = String(err.message || '').toLowerCase()
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table')
  )
}

async function readFileStore(): Promise<OutreachReplyRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is OutreachReplyRecord =>
        !!row && typeof row === 'object' && typeof (row as OutreachReplyRecord).id === 'string'
    )
  } catch {
    return []
  }
}

async function writeFileStore(items: OutreachReplyRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8')
}

export async function getOutreachReplyByMessageId(
  messageId: string
): Promise<OutreachReplyRecord | null> {
  const mid = String(messageId || '').trim()
  if (!mid) return null

  if (isSupabaseConfigured() && !supabaseTableMissing) {
    try {
      const admin = getSupabaseAdmin()
      const { data, error } = await admin
        .from('fundraising_outreach_replies')
        .select('*')
        .eq('message_id', mid)
        .maybeSingle()
      if (isMissingTableError(error)) {
        supabaseTableMissing = true
      } else if (!error && data) {
        return mapRow(data as Record<string, unknown>)
      }
    } catch {
      /* fall through */
    }
  }

  const all = await readFileStore()
  return all.find((r) => r.messageId === mid) || null
}

export async function getOutreachReplyById(id: string): Promise<OutreachReplyRecord | null> {
  const rid = String(id || '').trim()
  if (!rid) return null

  if (isSupabaseConfigured() && !supabaseTableMissing) {
    try {
      const admin = getSupabaseAdmin()
      const { data, error } = await admin
        .from('fundraising_outreach_replies')
        .select('*')
        .eq('id', rid)
        .maybeSingle()
      if (isMissingTableError(error)) {
        supabaseTableMissing = true
      } else if (!error && data) {
        return mapRow(data as Record<string, unknown>)
      }
    } catch {
      /* fall through */
    }
  }

  const all = await readFileStore()
  return all.find((r) => r.id === rid) || null
}

export async function listOutreachReplies(opts?: {
  status?: OutreachReplyQueueStatus
  limit?: number
}): Promise<OutreachReplyRecord[]> {
  const limit = Math.max(1, Math.min(200, opts?.limit ?? 50))

  if (isSupabaseConfigured() && !supabaseTableMissing) {
    try {
      const admin = getSupabaseAdmin()
      let q = admin
        .from('fundraising_outreach_replies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (opts?.status) q = q.eq('status', opts.status)
      const { data, error } = await q
      if (isMissingTableError(error)) {
        supabaseTableMissing = true
      } else if (!error && data) {
        return data.map((r) => mapRow(r as Record<string, unknown>))
      }
    } catch {
      /* fall through */
    }
  }

  let all = await readFileStore()
  if (opts?.status) all = all.filter((r) => r.status === opts.status)
  return all
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit)
}

/** Open Needs-reply count for dashboard inbound badges (exact when Supabase is up). */
export async function summarizeOpenOutreachReplies(): Promise<{
  count: number
  latest?: OutreachReplyRecord
}> {
  if (isSupabaseConfigured() && !supabaseTableMissing) {
    try {
      const admin = getSupabaseAdmin()
      const { count, error } = await admin
        .from('fundraising_outreach_replies')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
      if (isMissingTableError(error)) {
        supabaseTableMissing = true
      } else if (!error) {
        const { data: latestRow } = await admin
          .from('fundraising_outreach_replies')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return {
          count: count ?? 0,
          latest: latestRow ? mapRow(latestRow as Record<string, unknown>) : undefined,
        }
      }
    } catch {
      /* fall through */
    }
  }

  const open = await listOutreachReplies({ status: 'open', limit: 200 })
  return { count: open.length, latest: open[0] }
}

export async function insertOutreachReply(
  reply: OutreachReplyRecord
): Promise<{ ok: true; reply: OutreachReplyRecord } | { ok: false; error: string }> {
  if (isSupabaseConfigured() && !supabaseTableMissing) {
    try {
      const admin = getSupabaseAdmin()
      const { data, error } = await admin
        .from('fundraising_outreach_replies')
        .insert(toRow(reply))
        .select('*')
        .maybeSingle()
      if (isMissingTableError(error)) {
        supabaseTableMissing = true
      } else if (error) {
        return { ok: false, error: error.message }
      } else if (data) {
        return { ok: true, reply: mapRow(data as Record<string, unknown>) }
      } else {
        return { ok: true, reply }
      }
    } catch (e) {
      if (!supabaseTableMissing) {
        return { ok: false, error: e instanceof Error ? e.message : 'insert failed' }
      }
    }
  }

  const all = await readFileStore()
  if (all.some((r) => r.id === reply.id)) {
    return { ok: false, error: 'Reply id already exists' }
  }
  if (reply.messageId && all.some((r) => r.messageId === reply.messageId)) {
    return { ok: false, error: 'Duplicate message id' }
  }
  all.unshift(reply)
  await writeFileStore(all.slice(0, 500))
  return { ok: true, reply }
}

export async function updateOutreachReply(
  id: string,
  patch: Partial<OutreachReplyRecord>
): Promise<{ ok: true; reply: OutreachReplyRecord } | { ok: false; error: string }> {
  const rid = String(id || '').trim()
  if (!rid) return { ok: false, error: 'Reply id required' }

  if (isSupabaseConfigured() && !supabaseTableMissing) {
    try {
      const existing = await getOutreachReplyById(rid)
      if (!existing) return { ok: false, error: 'Reply not found' }
      const next: OutreachReplyRecord = {
        ...existing,
        ...patch,
        id: existing.id,
        updatedAt: patch.updatedAt || new Date().toISOString(),
      }
      const admin = getSupabaseAdmin()
      const { data, error } = await admin
        .from('fundraising_outreach_replies')
        .update(toRow(next))
        .eq('id', rid)
        .select('*')
        .maybeSingle()
      if (isMissingTableError(error)) {
        supabaseTableMissing = true
      } else if (error) {
        return { ok: false, error: error.message }
      } else if (data) {
        return { ok: true, reply: mapRow(data as Record<string, unknown>) }
      } else {
        return { ok: true, reply: next }
      }
    } catch (e) {
      if (!supabaseTableMissing) {
        return { ok: false, error: e instanceof Error ? e.message : 'update failed' }
      }
    }
  }

  const all = await readFileStore()
  const idx = all.findIndex((r) => r.id === rid)
  if (idx < 0) return { ok: false, error: 'Reply not found' }
  const next: OutreachReplyRecord = {
    ...all[idx],
    ...patch,
    id: all[idx].id,
    updatedAt: patch.updatedAt || new Date().toISOString(),
  }
  all[idx] = next
  await writeFileStore(all)
  return { ok: true, reply: next }
}
