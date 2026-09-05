/**
 * Fundraising outreach reply loop — types, ingest, funnel, HITL draft helpers.
 * Separate from /admin/agent/inbound (CS Messages/Bespoke).
 */

import { newFundraisingId } from '@/lib/fundraising/ids'
import {
  getFundraisingOutreachTargetById,
  listFundraisingOutreachTargetsFromDb,
  markFundraisingOutreachTargetOptedOut,
  upsertFundraisingOutreachTarget,
} from '@/lib/fundraising/persistence'
import type { FundraisingOutreachTarget } from '@/lib/fundraising/types'
import {
  classifyOutreachReplyIntent,
  formatOutreachReplyAdminExcerpt,
  outreachReplyNeedsAttention,
  type OutreachReplyIntent,
  OUTREACH_REPLY_INTENT_LABELS,
} from '@/lib/fundraising/outreachReplyClassify'
import {
  getOutreachReplyByMessageId,
  insertOutreachReply,
  listOutreachReplies,
  updateOutreachReply,
  type OutreachReplyRecord,
  type OutreachReplyQueueStatus,
} from '@/lib/fundraising/outreachReplyPersistence'
import { sydneyCalendarDateKey, isInstantOnSydneyCalendarDay } from '@/lib/fundraising/auFinancialQuarter'
import { buildOutreachFollowUpDraft } from '@/lib/fundraising/outreachReplyDraft'
import { notifyAdminsOfFundraisingOutreachReply } from '@/lib/server/adminInboundNotify'

export type { OutreachReplyRecord, OutreachReplyQueueStatus, OutreachReplyIntent }
export { OUTREACH_REPLY_INTENT_LABELS, outreachReplyNeedsAttention, buildOutreachFollowUpDraft, formatOutreachReplyAdminExcerpt }

export type OutreachReplyIngestResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  reply?: OutreachReplyRecord
  optedOut?: boolean
  targetId?: string
}

function truncate(s: string, max: number): string {
  const t = String(s || '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** Prefer live outreach contacts over converted/opted-out when several rows share an email. */
export async function resolveOutreachTargetForReply(
  contactEmail: string
): Promise<FundraisingOutreachTarget | null> {
  const email = String(contactEmail || '')
    .trim()
    .toLowerCase()
  if (!email) return null

  const all = await listFundraisingOutreachTargetsFromDb({ limit: 500 })
  const matches = all.filter(
    (t) => String(t.contactEmail || '').trim().toLowerCase() === email
  )
  if (matches.length === 0) {
    return null
  }

  const rank = (s: string) => {
    if (s === 'CONTACTED') return 0
    if (s === 'PENDING') return 1
    if (s === 'FAILED') return 2
    if (s === 'CONVERTED') return 3
    if (s === 'OPTED_OUT') return 4
    return 5
  }
  matches.sort((a, b) => {
    const rd = rank(a.status) - rank(b.status)
    if (rd !== 0) return rd
    return String(b.updatedAt).localeCompare(String(a.updatedAt))
  })
  return matches[0] || null
}

/**
 * Ingest a Resend (or compatible) inbound reply for fundraising outreach.
 * Unsubscribe → OPTED_OUT + closed reply. Other intents → open Needs-reply queue.
 */
export async function ingestFundraisingOutreachReply(opts: {
  fromEmail: string
  subject?: string
  text?: string
  messageId?: string
}): Promise<OutreachReplyIngestResult> {
  const fromEmail = String(opts.fromEmail || '')
    .trim()
    .toLowerCase()
  if (!fromEmail || !fromEmail.includes('@')) {
    return { ok: true, skipped: true, reason: 'No from address' }
  }

  const subject = String(opts.subject || '').trim()
  const text = String(opts.text || '').trim()
  const messageId = String(opts.messageId || '').trim() || undefined

  if (messageId) {
    const existing = await getOutreachReplyByMessageId(messageId)
    if (existing) {
      return { ok: true, skipped: true, reason: 'Duplicate message id', reply: existing }
    }
  }

  const intent = classifyOutreachReplyIntent(subject, text)
  const target = await resolveOutreachTargetForReply(fromEmail)
  const now = new Date().toISOString()
  const id = newFundraisingId('OR')

  if (intent === 'unsubscribe') {
    const opt = await markFundraisingOutreachTargetOptedOut({
      contactEmail: fromEmail,
      source: 'reply',
    })
    const reply: OutreachReplyRecord = {
      id,
      fromEmail,
      targetId: opt.ok ? opt.target.id : target?.id,
      organizationName: opt.ok ? opt.target.organizationName : target?.organizationName,
      subject: truncate(subject, 300),
      excerpt: formatOutreachReplyAdminExcerpt(text, 800),
      intent: 'unsubscribe',
      status: 'closed',
      messageId,
      createdAt: now,
      updatedAt: now,
      closedAt: now,
      closedReason: 'auto_unsubscribe',
    }
    const saved = await insertOutreachReply(reply)
    if (!saved.ok) {
      return {
        ok: Boolean(opt.ok),
        optedOut: Boolean(opt.ok),
        reason: saved.error || (!opt.ok ? opt.error : undefined),
        targetId: reply.targetId,
        reply,
      }
    }
    return {
      ok: true,
      optedOut: Boolean(opt.ok),
      reply: saved.reply,
      targetId: reply.targetId,
      reason: opt.ok ? undefined : opt.error,
    }
  }

  let status: OutreachReplyQueueStatus = 'open'
  let closedAt: string | undefined
  let closedReason: string | undefined
  let optedOut = false

  if (intent === 'wrong_person') {
    const opt = await markFundraisingOutreachTargetOptedOut({
      contactEmail: fromEmail,
      source: 'reply',
    })
    optedOut = Boolean(opt.ok)
    status = 'closed'
    closedAt = now
    closedReason = 'auto_wrong_person'
  } else if (intent === 'not_now') {
    status = 'closed'
    closedAt = now
    closedReason = 'auto_not_now'
  } else if (intent === 'interested' || intent === 'question' || intent === 'other') {
    status = 'open'
  } else {
    status = 'closed'
    closedAt = now
    closedReason = 'auto_other'
  }

  const reply: OutreachReplyRecord = {
    id,
    fromEmail,
    targetId: target?.id,
    organizationName: target?.organizationName,
    subject: truncate(subject, 300),
    excerpt: formatOutreachReplyAdminExcerpt(text, 800),
    intent,
    status,
    messageId,
    createdAt: now,
    updatedAt: now,
    closedAt,
    closedReason,
  }

  const saved = await insertOutreachReply(reply)
  if (!saved.ok) {
    return { ok: false, reason: saved.error, reply }
  }

  if (target && status === 'open') {
    const next: FundraisingOutreachTarget = {
      ...target,
      payload: {
        ...(target.payload || {}),
        lastReplyAt: now,
        lastReplyIntent: intent,
        lastReplyId: saved.reply.id,
        replyNeedsAttention: true,
      },
      updatedAt: now,
    }
    await upsertFundraisingOutreachTarget(next)
  }

  // Same inbound email path as contact/bespoke/fundraising applications — open queue only.
  if (status === 'open') {
    void notifyAdminsOfFundraisingOutreachReply({
      id: saved.reply.id,
      fromEmail: saved.reply.fromEmail,
      intentLabel: OUTREACH_REPLY_INTENT_LABELS[saved.reply.intent] || saved.reply.intent,
      subject: saved.reply.subject,
      organizationName: saved.reply.organizationName,
      excerpt: saved.reply.excerpt,
    }).catch(() => {
      /* non-blocking */
    })
  }

  return {
    ok: true,
    reply: saved.reply,
    targetId: target?.id,
    optedOut,
  }
}

export type OutreachFunnelStats = {
  dayKey: string
  pending: number
  contacted: number
  converted: number
  optedOut: number
  failed: number
  openReplies: number
  sentToday: number
  convertedWithAgentRef: number
}

export async function buildOutreachFunnelStats(): Promise<OutreachFunnelStats> {
  const dayKey = sydneyCalendarDateKey()
  const targets = await listFundraisingOutreachTargetsFromDb({ limit: 2000 })
  let pending = 0
  let contacted = 0
  let converted = 0
  let optedOut = 0
  let failed = 0
  let sentToday = 0

  for (const t of targets) {
    if (t.status === 'PENDING') pending++
    else if (t.status === 'CONTACTED') contacted++
    else if (t.status === 'CONVERTED') converted++
    else if (t.status === 'OPTED_OUT') optedOut++
    else if (t.status === 'FAILED') failed++

    if (t.lastSentAt && isInstantOnSydneyCalendarDay(t.lastSentAt, dayKey)) {
      sentToday++
    }
  }

  const openReplies = (await listOutreachReplies({ status: 'open', limit: 200 })).length

  return {
    dayKey,
    pending,
    contacted,
    converted,
    optedOut,
    failed,
    openReplies,
    sentToday,
    convertedWithAgentRef: converted,
  }
}

export async function closeOutreachReply(opts: {
  id: string
  reason: string
  handledBy?: string
  note?: string
}): Promise<{ ok: true; reply: OutreachReplyRecord } | { ok: false; error: string }> {
  const now = new Date().toISOString()
  const updated = await updateOutreachReply(opts.id, {
    status: 'closed',
    closedAt: now,
    closedReason: opts.reason,
    handledBy: opts.handledBy,
    adminNote: opts.note,
    updatedAt: now,
  })
  if (!updated.ok) return updated

  if (updated.reply.targetId) {
    const target = await getFundraisingOutreachTargetById(updated.reply.targetId)
    if (target?.payload?.replyNeedsAttention) {
      await upsertFundraisingOutreachTarget({
        ...target,
        payload: {
          ...(target.payload || {}),
          replyNeedsAttention: false,
        },
        updatedAt: now,
      })
    }
  }
  return updated
}
