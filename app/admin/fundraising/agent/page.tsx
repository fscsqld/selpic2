'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { FUNDRAISING_ORG_TYPE_LABELS, FUNDRAISING_ORG_TYPE_OPTIONS } from '@/lib/fundraising/types'
import type { FundraisingOutreachTarget, FundraisingOutreachTargetStatus } from '@/lib/fundraising/types'
import {
  OUTREACH_LIST_SOURCE_LABELS,
  OUTREACH_LIST_SOURCE_TYPES,
  type OutreachListSourceType,
} from '@/lib/fundraising/outreachListSource'
import { logAdminActivity } from '@/lib/logAdminActivity'
import {
  Bot,
  HeartHandshake,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  ListChecks,
  FlaskConical,
  Download,
  MessageSquare,
} from 'lucide-react'
import {
  OUTREACH_REPLY_INTENT_LABELS,
  type OutreachReplyIntent,
} from '@/lib/fundraising/outreachReplyClassify'

const STATUS_FILTERS: Array<'' | FundraisingOutreachTargetStatus> = [
  '',
  'PENDING',
  'CONTACTED',
  'CONVERTED',
  'FAILED',
  'OPTED_OUT',
]

type DailyQuotaState = {
  dayKey: string
  dailyCap: number
  sentToday: number
  remaining: number
  pendingPoolSize: number
  suggestedIds: string[]
}

type AutoSendState = {
  enabled: boolean
  lastRunAt: string | null
  lastResult: string | null
}

type CollectPreviewState = {
  ok: boolean
  error?: string
  feedHost?: string
  parsed: number
  wouldInsert: number
  wouldUpdate: number
  wouldSkip: number
  insertBudgetToday: number
  truncatedFeed: boolean
  parseErrors: string[]
  sample: Array<{
    organizationName: string
    contactEmail: string
    action: 'insert' | 'update' | 'skip'
    skipReason?: string
  }>
}

type FunnelState = {
  dayKey: string
  pending: number
  contacted: number
  converted: number
  optedOut: number
  failed: number
  openReplies: number
  sentToday: number
}

type ReplyRow = {
  id: string
  fromEmail: string
  targetId?: string
  organizationName?: string
  subject: string
  excerpt: string
  intent: OutreachReplyIntent
  status: 'open' | 'closed'
  createdAt: string
  draft?: { subject: string; text: string }
}

type CollectState = {
  enabled: boolean
  feedUrl: string
  listName: string
  licenseNote: string
  dailyInsertCap: number
  hasAuthHeader: boolean
  lastRunAt: string | null
  lastResult: string | null
}

export default function FundraisingAgentPage() {
  return (
    <AdminRoute requiredPermissions={['fundraising:read']}>
      <AgentContent />
    </AdminRoute>
  )
}

function AgentContent() {
  const [targets, setTargets] = useState<FundraisingOutreachTarget[]>([])
  const [statusFilter, setStatusFilter] = useState<'' | FundraisingOutreachTargetStatus>('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  /** Confirm Send lives mid-page; keep tone so success is not lost in a green/red-blind strip far below. */
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info'>('info')
  const messageRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    organizationName: '',
    contactName: '',
    contactEmail: '',
    orgType: '' as '' | keyof typeof FUNDRAISING_ORG_TYPE_LABELS,
    state: '',
    notes: '',
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importSource, setImportSource] = useState<OutreachListSourceType>('admin_csv_paste')
  const [listName, setListName] = useState('')
  const [licenseNote, setLicenseNote] = useState('')
  const [dailyQuota, setDailyQuota] = useState<DailyQuotaState | null>(null)
  const [autoSend, setAutoSend] = useState<AutoSendState | null>(null)
  const [autoSendBusy, setAutoSendBusy] = useState(false)
  const [collect, setCollect] = useState<CollectState | null>(null)
  const [collectBusy, setCollectBusy] = useState(false)
  const [collectFeedUrl, setCollectFeedUrl] = useState('')
  const [collectListName, setCollectListName] = useState('')
  const [collectLicenseNote, setCollectLicenseNote] = useState('')
  const [collectAuthHeader, setCollectAuthHeader] = useState('')
  const [collectDailyInsertCap, setCollectDailyInsertCap] = useState(50)
  const [clearAuthOnSave, setClearAuthOnSave] = useState(false)
  const [collectPreview, setCollectPreview] = useState<CollectPreviewState | null>(null)
  const [funnel, setFunnel] = useState<FunnelState | null>(null)
  const [openReplies, setOpenReplies] = useState<ReplyRow[]>([])
  const [repliesBusy, setRepliesBusy] = useState(false)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, { subject: string; text: string }>>(
    {}
  )

  const loadDailyQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/fundraising/agent/daily-queue', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Failed to load daily queue')
      const suggested = Array.isArray(json.suggested) ? json.suggested : []
      setDailyQuota({
        dayKey: String(json.dayKey || ''),
        dailyCap: Number(json.dailyCap) || 10,
        sentToday: Number(json.sentToday) || 0,
        remaining: Number(json.remaining) || 0,
        pendingPoolSize: Number(json.pendingPoolSize) || 0,
        suggestedIds: suggested.map((t: { id?: string }) => String(t.id || '')).filter(Boolean),
      })
    } catch {
      setDailyQuota(null)
    }
  }, [])

  const loadAutoSend = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/fundraising/agent/auto-send', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Failed to load auto-send')
      setAutoSend({
        enabled: Boolean(json.enabled),
        lastRunAt: json.lastRunAt ? String(json.lastRunAt) : null,
        lastResult: json.lastResult ? String(json.lastResult) : null,
      })
    } catch {
      setAutoSend(null)
    }
  }, [])

  const loadCollect = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/fundraising/agent/collect', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Failed to load collect settings')
      const next: CollectState = {
        enabled: Boolean(json.enabled),
        feedUrl: String(json.feedUrl || ''),
        listName: String(json.listName || ''),
        licenseNote: String(json.licenseNote || ''),
        dailyInsertCap: Number(json.dailyInsertCap) || 50,
        hasAuthHeader: Boolean(json.hasAuthHeader),
        lastRunAt: json.lastRunAt ? String(json.lastRunAt) : null,
        lastResult: json.lastResult ? String(json.lastResult) : null,
      }
      setCollect(next)
      setCollectFeedUrl(next.feedUrl)
      setCollectListName(next.listName)
      setCollectLicenseNote(next.licenseNote)
      setCollectDailyInsertCap(next.dailyInsertCap)
    } catch {
      setCollect(null)
    }
  }, [])

  const loadReplies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/fundraising/agent/replies?status=open&funnel=1', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Failed to load replies')
      const rows = Array.isArray(json.replies) ? (json.replies as ReplyRow[]) : []
      setOpenReplies(rows)
      const drafts: Record<string, { subject: string; text: string }> = {}
      for (const r of rows) {
        if (r.draft) drafts[r.id] = { subject: r.draft.subject, text: r.draft.text }
      }
      setReplyDrafts(drafts)
      if (json.funnel) {
        setFunnel({
          dayKey: String(json.funnel.dayKey || ''),
          pending: Number(json.funnel.pending) || 0,
          contacted: Number(json.funnel.contacted) || 0,
          converted: Number(json.funnel.converted) || 0,
          optedOut: Number(json.funnel.optedOut) || 0,
          failed: Number(json.funnel.failed) || 0,
          openReplies: Number(json.funnel.openReplies) || 0,
          sentToday: Number(json.funnel.sentToday) || 0,
        })
      }
    } catch {
      setOpenReplies([])
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
      const res = await fetch(`/api/admin/fundraising/agent/targets${q}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Failed to load targets')
      setTargets(Array.isArray(json.targets) ? json.targets : [])
      // Preserve a just-set Confirm Send success; soft warnings must not wipe it.
      if (json.warning) {
        setMessage((prev) => prev || String(json.warning))
      }
      await Promise.all([loadDailyQueue(), loadAutoSend(), loadCollect(), loadReplies()])
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load targets')
      setMessageTone('error')
      setTargets([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, loadDailyQueue, loadAutoSend, loadCollect, loadReplies])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!message) return
    messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [message])

  const selectedCount = selected.size
  const selectableIds = useMemo(
    () =>
      targets
        .filter((t) => t.status !== 'CONVERTED' && t.status !== 'OPTED_OUT' && t.contactEmail)
        .map((t) => t.id),
    [targets]
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/fundraising/agent/targets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          organizationName: form.organizationName.trim(),
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim(),
          orgType: form.orgType || undefined,
          state: form.state.trim() || undefined,
          notes: form.notes.trim() || undefined,
          status: editingId ? undefined : 'PENDING',
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Save failed')
      const wasEditing = Boolean(editingId)
      const savedName = form.organizationName.trim()
      logAdminActivity({
        action: 'fundraising_agent_target_saved',
        target: json.target?.id || editingId || 'outreach-target',
        field: 'outreach_target',
        newValue: {
          organizationName: savedName,
          contactEmail: form.contactEmail.trim(),
        },
        description: `Fundraising agent target ${wasEditing ? 'updated' : 'saved'} · ${savedName}`,
      })
      setForm({
        organizationName: '',
        contactName: '',
        contactEmail: '',
        orgType: '',
        state: '',
        notes: '',
      })
      setEditingId(null)
      setMessage(
        wasEditing
          ? `Outreach target updated · ${savedName}`
          : `Outreach target saved · ${savedName} (PENDING). You can Build today’s queue next.`
      )
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (t: FundraisingOutreachTarget) => {
    setEditingId(t.id)
    setForm({
      organizationName: t.organizationName || '',
      contactName: t.contactName || '',
      contactEmail: t.contactEmail || '',
      orgType: (t.orgType as typeof form.orgType) || '',
      state: t.state || '',
      notes: String(t.payload?.notes || ''),
    })
    setMessage(`Editing ${t.id} — save to update email / org details.`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetFailedToPending = async (t: FundraisingOutreachTarget) => {
    if (
      !window.confirm(
        `Reset “${t.organizationName}” from FAILED back to PENDING so it can be queued again?`
      )
    ) {
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/fundraising/agent/targets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: t.id,
          organizationName: t.organizationName,
          contactEmail: t.contactEmail,
          contactName: t.contactName,
          orgType: t.orgType,
          state: t.state,
          status: 'PENDING',
          notes: t.payload?.notes,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Reset failed')
      logAdminActivity({
        action: 'fundraising_agent_target_saved',
        target: t.id,
        field: 'status',
        oldValue: 'FAILED',
        newValue: 'PENDING',
        description: `Fundraising agent target reset FAILED → PENDING · ${t.organizationName}`,
      })
      setMessage(`Reset to PENDING · ${t.organizationName}`)
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  const onImport = async () => {
    if (!importText.trim()) {
      setMessage('Paste CSV / JSON / pipe lines, or choose a CSV file first.')
      return
    }
    if (
      (importSource === 'licensed_list_upload' ||
        importSource === 'official_directory_export') &&
      !listName.trim()
    ) {
      setMessage('Enter the list / vendor name for licensed or official directory imports.')
      return
    }
    setImportBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/fundraising/agent/targets/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: importText,
          importSource,
          listName: listName.trim() || undefined,
          licenseNote: licenseNote.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Import failed')
      const s = json.summary || {}
      logAdminActivity({
        action: 'fundraising_agent_targets_imported',
        target: 'fundraising-agent-import',
        field: 'outreach_target_import',
        newValue: {
          parsed: s.parsed,
          inserted: s.inserted,
          updated: s.updated,
          skipped: s.skipped,
          saved: s.saved,
          truncated: s.truncated,
          skipReasons: s.skipReasons,
          importSource: s.importSource || importSource,
          listName: s.listName || listName.trim() || null,
          licenseNote: licenseNote.trim() || null,
        },
        description: `Fundraising agent import · ${OUTREACH_LIST_SOURCE_LABELS[importSource]} · saved ${s.saved ?? 0}`,
      })
      const errNote =
        Array.isArray(json.errors) && json.errors.length > 0
          ? ` · ${json.errors.length} save error(s)`
          : ''
      setMessage(
        `Import finished · ${OUTREACH_LIST_SOURCE_LABELS[importSource]} · parsed ${s.parsed ?? 0}, inserted ${s.inserted ?? 0}, updated ${s.updated ?? 0}, skipped ${s.skipped ?? 0}, saved ${s.saved ?? 0}${s.truncated ? ' (truncated to 200)' : ''}${errNote}`
      )
      setImportText('')
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImportBusy(false)
    }
  }

  const onImportFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      setImportText(text)
      setMessage(`Loaded “${file.name}” (${text.split(/\r?\n/).length} lines). Review then Import.`)
    } catch {
      setMessage('Could not read that file.')
    }
  }

  const onSend = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) {
      setMessageTone('error')
      setMessage('Select at least one target to email.')
      return
    }
    if (ids.length > 10) {
      setMessageTone('error')
      setMessage('Select at most 10 targets per send (v1 safety cap).')
      return
    }
    const remaining = dailyQuota?.remaining ?? 10
    if (ids.length > remaining) {
      setMessageTone('error')
      setMessage(
        `Only ${remaining} send slot(s) left today (Sydney day ${dailyQuota?.dayKey || '—'}). Deselect ${ids.length - remaining}.`
      )
      return
    }
    if (
      !window.confirm(
        `Confirm Send to ${ids.length} selected target(s)?\n\nThis uses Resend, marks them CONTACTED, and counts toward today’s Sydney cap (${dailyQuota?.sentToday ?? 0}/${dailyQuota?.dailyCap ?? 10} already sent).`
      )
    ) {
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/fundraising/agent/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetIds: ids }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok && !json?.results) throw new Error(json?.error || 'Send failed')
      logAdminActivity({
        action: 'fundraising_agent_outreach_sent',
        target: 'fundraising-agent-send',
        field: 'outreach_send',
        newValue: {
          sent: json.sent,
          failed: json.failed,
          skipped: json.skipped,
          dayKey: json.dayKey,
          sentToday: json.sentToday,
          remaining: json.remaining,
          ids,
        },
        description: `Fundraising agent Confirm Send · sent ${json.sent}, failed ${json.failed}, skipped ${json.skipped} · day ${json.dayKey || ''}`,
      })
      const sent = Number(json.sent ?? 0)
      const failed = Number(json.failed ?? 0)
      const summary = `Confirm Send finished · sent ${sent}, failed ${failed}, skipped ${json.skipped ?? 0} · today ${json.sentToday ?? '—'}/${json.dailyCap ?? 10} (Sydney)`
      setMessageTone(failed > 0 && sent === 0 ? 'error' : 'success')
      setMessage(summary)
      setSelected(new Set())
      await load()
    } catch (err) {
      setMessageTone('error')
      setMessage(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  const onBuildDailyQueue = () => {
    if (!dailyQuota) {
      setMessage('Daily queue not loaded yet — refresh and try again.')
      return
    }
    if (dailyQuota.remaining <= 0) {
      setMessage(`Daily outreach cap reached (${dailyQuota.dailyCap} / Sydney day ${dailyQuota.dayKey}).`)
      return
    }
    if (dailyQuota.suggestedIds.length === 0) {
      setMessage('No PENDING targets with email available for today’s queue.')
      return
    }
    setSelected(new Set(dailyQuota.suggestedIds))
    setStatusFilter('PENDING')
    setMessage(
      `Today’s queue ready · ${dailyQuota.suggestedIds.length} PENDING target(s) selected (${dailyQuota.remaining} slot(s) left · pool ${dailyQuota.pendingPoolSize}). Review, then Confirm Send.`
    )
  }

  const onToggleAutoSend = async (enabled: boolean) => {
    setAutoSendBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/fundraising/agent/auto-send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Failed to update auto-send')
      setAutoSend({
        enabled: Boolean(json.enabled),
        lastRunAt: json.lastRunAt ? String(json.lastRunAt) : null,
        lastResult: json.lastResult ? String(json.lastResult) : null,
      })
      logAdminActivity({
        action: 'fundraising_settings_updated',
        target: 'outreach-auto-send',
        field: 'outreachAutoSendEnabled',
        oldValue: !enabled,
        newValue: enabled,
        description: `Fundraising agent auto-send ${enabled ? 'enabled' : 'disabled'}`,
      })
      setMessage(
        enabled
          ? 'Daily auto-send enabled · cron sends up to remaining Sydney slots (≤10) when PENDING exists. Confirm Send still works.'
          : 'Daily auto-send disabled · only Confirm Send will email targets.'
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update auto-send')
    } finally {
      setAutoSendBusy(false)
    }
  }

  const onRunAutoSendNow = async () => {
    if (
      !window.confirm(
        'Run auto-send now for up to today’s remaining PENDING slots? This uses Resend immediately (ignores the Off toggle for this one run).'
      )
    ) {
      return
    }
    setAutoSendBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/fundraising/agent/auto-send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runNow: true }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Auto-send run failed')
      setAutoSend({
        enabled: Boolean(json.enabled),
        lastRunAt: json.lastRunAt ? String(json.lastRunAt) : null,
        lastResult: json.lastResult ? String(json.lastResult) : null,
      })
      const run = json.run
      logAdminActivity({
        action: 'fundraising_agent_outreach_sent',
        target: 'fundraising-agent-auto-send',
        field: 'outreach_auto_send',
        newValue: {
          sent: run?.sent,
          failed: run?.failed,
          skipped: run?.skipped,
          pickedIds: run?.pickedIds,
          reason: run?.reason,
        },
        description: `Fundraising agent auto-send run · sent ${run?.sent ?? 0}, failed ${run?.failed ?? 0}`,
      })
      setMessage(
        run?.ran
          ? `Auto-send finished · sent ${run.sent}, failed ${run.failed}, skipped ${run.skipped} · today ${run.sentToday}/${run.dailyCap}`
          : `Auto-send did not send · ${run?.reason || json.lastResult || 'no action'}`
      )
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Auto-send run failed')
    } finally {
      setAutoSendBusy(false)
    }
  }

  const saveCollectSettings = async (extra?: {
    enabled?: boolean
    runNow?: boolean
  }) => {
    setCollectBusy(true)
    setMessage('')
    try {
      const payload: Record<string, unknown> = {
        feedUrl: collectFeedUrl.trim(),
        listName: collectListName.trim(),
        licenseNote: collectLicenseNote.trim(),
        dailyInsertCap: collectDailyInsertCap,
      }
      if (typeof extra?.enabled === 'boolean') payload.enabled = extra.enabled
      if (clearAuthOnSave) payload.clearAuth = true
      else if (collectAuthHeader.trim()) payload.authHeader = collectAuthHeader.trim()
      if (extra?.runNow) payload.runNow = true

      const res = await fetch('/api/admin/fundraising/agent/collect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Collect settings failed')
      setCollect({
        enabled: Boolean(json.enabled),
        feedUrl: String(json.feedUrl || ''),
        listName: String(json.listName || ''),
        licenseNote: String(json.licenseNote || ''),
        dailyInsertCap: Number(json.dailyInsertCap) || 50,
        hasAuthHeader: Boolean(json.hasAuthHeader),
        lastRunAt: json.lastRunAt ? String(json.lastRunAt) : null,
        lastResult: json.lastResult ? String(json.lastResult) : null,
      })
      setCollectAuthHeader('')
      setClearAuthOnSave(false)
      logAdminActivity({
        action: extra?.runNow
          ? 'fundraising_agent_collect_run'
          : 'fundraising_agent_collect_settings',
        target: 'outreach-collect',
        field: 'outreachCollect',
        newValue: {
          enabled: json.enabled,
          feedUrl: json.feedUrl,
          listName: json.listName,
          run: json.run
            ? {
                inserted: json.run.inserted,
                updated: json.run.updated,
                saved: json.run.saved,
              }
            : null,
        },
        description: extra?.runNow
          ? `Fundraising agent collect run · saved ${json.run?.saved ?? 0}`
          : `Fundraising agent collect settings · ${json.enabled ? 'enabled' : 'disabled'}`,
      })
      if (json.run) {
        setMessage(
          json.run.ran
            ? `Collect finished · inserted ${json.run.inserted}, updated ${json.run.updated}, skipped ${json.run.skipped}, saved ${json.run.saved}`
            : `Collect did not run · ${json.run.reason || json.lastResult || 'no action'}`
        )
        await load()
      } else {
        setMessage(
          json.enabled
            ? 'Licensed-feed auto-collect enabled · daily cron pulls into PENDING (then auto-send if also on).'
            : 'Collect settings saved.'
        )
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Collect settings failed')
    } finally {
      setCollectBusy(false)
    }
  }

  const onReplyAction = async (
    reply: ReplyRow,
    action: 'handle' | 'opt_out' | 'send_draft'
  ) => {
    setRepliesBusy(true)
    setMessage('')
    try {
      const draft = replyDrafts[reply.id]
      const res = await fetch('/api/admin/fundraising/agent/replies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reply.id,
          action,
          subject: draft?.subject,
          text: draft?.text,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Reply action failed')
      logAdminActivity({
        action: 'fundraising_agent_reply_handled',
        target: reply.id,
        field: action,
        newValue: {
          intent: reply.intent,
          fromEmail: reply.fromEmail,
          sent: Boolean(json.sent),
        },
        description: `Fundraising agent reply ${action} · ${reply.fromEmail} · ${reply.intent}`,
      })
      setMessage(
        action === 'send_draft'
          ? `Follow-up sent to ${reply.fromEmail}`
          : action === 'opt_out'
            ? `Marked handled + OPTED_OUT · ${reply.fromEmail}`
            : `Reply marked handled · ${reply.fromEmail}`
      )
      await loadReplies()
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reply action failed')
    } finally {
      setRepliesBusy(false)
    }
  }

  const onTestFeed = async () => {
    if (!collectFeedUrl.trim()) {
      setMessage('Enter a HTTPS feed URL before Test feed.')
      return
    }
    setCollectBusy(true)
    setMessage('')
    setCollectPreview(null)
    try {
      const payload: Record<string, unknown> = {
        dryRun: true,
        feedUrl: collectFeedUrl.trim(),
      }
      if (clearAuthOnSave) payload.clearAuth = true
      else if (collectAuthHeader.trim()) payload.authHeader = collectAuthHeader.trim()

      const res = await fetch('/api/admin/fundraising/agent/collect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Test feed failed')
      const preview = json.preview as CollectPreviewState | undefined
      if (!preview) throw new Error('Test feed returned no preview')
      setCollectPreview(preview)
      logAdminActivity({
        action: 'fundraising_agent_feed_previewed',
        target: 'outreach-collect-preview',
        field: 'feed_preview',
        newValue: {
          feedHost: preview.feedHost,
          parsed: preview.parsed,
          wouldInsert: preview.wouldInsert,
          wouldUpdate: preview.wouldUpdate,
          wouldSkip: preview.wouldSkip,
        },
        description: `Fundraising agent feed preview · host ${preview.feedHost || '—'} · insert ${preview.wouldInsert}`,
      })
      setMessage(
        preview.ok
          ? `Test feed OK · would insert ${preview.wouldInsert}, update ${preview.wouldUpdate}, skip ${preview.wouldSkip} (budget today ${preview.insertBudgetToday}). No rows written.`
          : `Test feed failed · ${preview.error || 'unknown'}`
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Test feed failed')
    } finally {
      setCollectBusy(false)
    }
  }

  const onDelete = async (t: FundraisingOutreachTarget) => {
    if (
      !window.confirm(
        `Delete outreach target “${t.organizationName}” (${t.id})? This cannot be undone.`
      )
    ) {
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(
        `/api/admin/fundraising/agent/targets?id=${encodeURIComponent(t.id)}`,
        { method: 'DELETE', credentials: 'include' }
      )
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Delete failed')
      logAdminActivity({
        action: 'fundraising_agent_target_deleted',
        target: t.id,
        field: 'outreach_target',
        oldValue: {
          organizationName: t.organizationName,
          contactEmail: t.contactEmail,
          status: t.status,
        },
        description: `Fundraising agent target deleted · ${t.organizationName} (${t.id})`,
      })
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(t.id)
        return next
      })
      setMessage(`Deleted “${t.organizationName}”.`)
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Fundraising Agent"
        icon={<HeartHandshake className="w-6 h-6" />}
        showBackButton
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />
      <FundraisingAdminShell
        title="Fundraising Agent"
        subtitle="Licensed-feed auto-collect → PENDING pool → Sydney ≤10 send (Confirm or optional auto-send). No open-web scrape."
        current="/admin/fundraising/agent"
      >
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <Bot className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Goal path: <strong>auto-collect</strong> from a licensed HTTPS list feed into PENDING, then send up to{' '}
            <strong>10/day</strong> (Sydney) via Confirm Send or optional auto-send. Replies land in{' '}
            <strong>Needs reply</strong> below (not CS inbound). ACARA/gov school lists do{' '}
            <strong>not</strong> allow marketing contact use — use a list you are licensed to email. Manual CSV remains
            a backup. Requires <strong>fundraising:write</strong>.
          </div>
        </div>
      </div>

      {message ? (
        <div
          ref={messageRef}
          role="status"
          className={`sticky top-2 z-20 mb-4 flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm shadow-sm ${
            messageTone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : messageTone === 'error'
                ? 'border-red-200 bg-red-50 text-red-950'
                : 'border-sky-200 bg-sky-50 text-sky-950'
          }`}
        >
          <p className="min-w-0 flex-1 break-words leading-snug">{message}</p>
          <button
            type="button"
            onClick={() => setMessage('')}
            className={`shrink-0 rounded-md border bg-white px-2.5 py-1 text-xs font-semibold hover:bg-white/80 ${
              messageTone === 'success'
                ? 'border-emerald-300 text-emerald-900'
                : messageTone === 'error'
                  ? 'border-red-300 text-red-900'
                  : 'border-sky-300 text-sky-900'
            }`}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {funnel ? (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Pending', value: funnel.pending },
            { label: 'Contacted', value: funnel.contacted },
            { label: 'Converted', value: funnel.converted },
            { label: 'Opted out', value: funnel.optedOut },
            { label: 'Failed', value: funnel.failed },
            { label: 'Open replies', value: funnel.openReplies },
            { label: 'Sent today', value: funnel.sentToday },
            { label: 'Day', value: funnel.dayKey },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm"
            >
              <div className="text-[10px] uppercase tracking-wide text-gray-500">{c.label}</div>
              <div className="text-sm font-semibold text-gray-900 tabular-nums">{c.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-sky-700" /> Needs reply ({openReplies.length})
        </h2>
        <p className="text-xs text-gray-700">
          Inbound replies to outreach mail (interested / question / other). Unsubscribe and wrong-person are handled
          automatically. Separate from Customer care at <code className="rounded bg-white px-1">/admin/agent/inbound</code>
          . Run <code className="rounded bg-white px-1">docs/fundraising-outreach-replies.sql</code> once in Supabase
          for durable storage.
        </p>
        {openReplies.length === 0 ? (
          <p className="text-sm text-gray-600">No open replies.</p>
        ) : (
          <div className="space-y-4">
            {openReplies.map((r) => (
              <div key={r.id} className="rounded-lg border border-sky-100 bg-white p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-900">
                      {r.organizationName || 'Unknown org'} · {r.fromEmail}
                    </div>
                    <div className="text-xs text-gray-500">
                      {OUTREACH_REPLY_INTENT_LABELS[r.intent] || r.intent}
                      {r.targetId ? ` · ${r.targetId}` : ' · unmatched email'}
                      {' · '}
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-900">
                    {r.intent}
                  </span>
                </div>
                <p className="text-xs text-gray-700 whitespace-pre-wrap border-l-2 border-sky-200 pl-2">
                  {r.subject ? `${r.subject}\n` : ''}
                  {r.excerpt || '(empty body)'}
                </p>
                <label className="block text-xs font-medium text-gray-700">
                  Follow-up subject
                  <input
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    value={replyDrafts[r.id]?.subject || ''}
                    disabled={repliesBusy || busy}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({
                        ...prev,
                        [r.id]: {
                          subject: e.target.value,
                          text: prev[r.id]?.text || '',
                        },
                      }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-gray-700">
                  Follow-up body
                  <textarea
                    className="mt-1 w-full min-h-[90px] rounded-md border border-gray-300 px-2 py-1.5 font-mono text-xs"
                    value={replyDrafts[r.id]?.text || ''}
                    disabled={repliesBusy || busy}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({
                        ...prev,
                        [r.id]: {
                          subject: prev[r.id]?.subject || '',
                          text: e.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={repliesBusy || busy}
                    onClick={() => {
                      if (window.confirm(`Send follow-up to ${r.fromEmail}?`)) {
                        void onReplyAction(r, 'send_draft')
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                  >
                    {repliesBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    Send follow-up
                  </button>
                  <button
                    type="button"
                    disabled={repliesBusy || busy}
                    onClick={() => void onReplyAction(r, 'handle')}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Mark handled
                  </button>
                  <button
                    type="button"
                    disabled={repliesBusy || busy}
                    onClick={() => {
                      if (window.confirm(`Opt out ${r.fromEmail} and close this reply?`)) {
                        void onReplyAction(r, 'opt_out')
                      }
                    }}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    Opt out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="h-4 w-4 text-emerald-700" /> Auto-collect (licensed HTTPS feed)
        </h2>
        <p className="text-xs text-gray-700">
          Point this at a purchased/official CSV or JSON export URL (https). Use <strong>Test feed</strong> before
          Collect now. Daily cron at 19:00 UTC fills PENDING (insert cap/day), then 21:00 UTC auto-send can mail ≤10
          if enabled. Not a website scraper. Go-live checklist:{' '}
          <code className="rounded bg-white px-1">docs/fundraising-outreach-licensed-list-golive.md</code>
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <a
            href="/samples/fundraising-outreach-feed-sample.csv"
            download
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 font-medium text-emerald-900 hover:bg-emerald-50"
          >
            <Download className="h-3.5 w-3.5" /> Sample CSV
          </a>
          <a
            href="/samples/fundraising-outreach-feed-sample.json"
            download
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 font-medium text-emerald-900 hover:bg-emerald-50"
          >
            <Download className="h-3.5 w-3.5" /> Sample JSON
          </a>
          <span className="self-center text-gray-600">
            Required columns: organisation + email (many vendor header aliases accepted).
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
            Feed URL (https)
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              value={collectFeedUrl}
              disabled={collectBusy || busy}
              onChange={(e) => setCollectFeedUrl(e.target.value)}
              placeholder="https://vendor.example.com/exports/au-schools.csv"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            List / vendor name
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={collectListName}
              disabled={collectBusy || busy}
              onChange={(e) => setCollectListName(e.target.value)}
              placeholder="Vendor Co AU schools"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Daily new-insert cap
            <input
              type="number"
              min={1}
              max={200}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={collectDailyInsertCap}
              disabled={collectBusy || busy}
              onChange={(e) => setCollectDailyInsertCap(Number(e.target.value) || 50)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
            License / reference note
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={collectLicenseNote}
              disabled={collectBusy || busy}
              onChange={(e) => setCollectLicenseNote(e.target.value)}
              placeholder="Purchased 2026-09 · contract ref"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
            Optional feed auth header / token
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              value={collectAuthHeader}
              disabled={collectBusy || busy || clearAuthOnSave}
              onChange={(e) => setCollectAuthHeader(e.target.value)}
              placeholder={
                collect?.hasAuthHeader
                  ? 'Saved token on file — enter new value to replace'
                  : 'Bearer … (optional)'
              }
            />
          </label>
          {collect?.hasAuthHeader ? (
            <label className="flex items-center gap-2 text-xs text-gray-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={clearAuthOnSave}
                disabled={collectBusy || busy}
                onChange={(e) => setClearAuthOnSave(e.target.checked)}
              />
              Clear saved auth token on next Save
            </label>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-gray-800">
          <span className="rounded-md bg-white px-2.5 py-1 border border-emerald-100">
            Collect: <strong>{collect ? (collect.enabled ? 'On' : 'Off') : '—'}</strong>
          </span>
        </div>
        {collect?.lastResult ? (
          <p className="text-xs text-gray-600">
            Last collect:{' '}
            {collect.lastRunAt ? new Date(collect.lastRunAt).toLocaleString() : '—'} · {collect.lastResult}
          </p>
        ) : null}
        {collectPreview ? (
          <div className="rounded-md border border-teal-200 bg-white px-3 py-2 text-xs text-gray-800 space-y-1">
            <p className="font-semibold text-teal-900">Last Test feed preview</p>
            <p>
              Host {collectPreview.feedHost || '—'} · parsed {collectPreview.parsed} · would insert{' '}
              {collectPreview.wouldInsert} · update {collectPreview.wouldUpdate} · skip {collectPreview.wouldSkip}
              {collectPreview.truncatedFeed ? ' · truncated' : ''}
            </p>
            {collectPreview.sample.length > 0 ? (
              <ul className="list-disc pl-4 space-y-0.5 font-mono">
                {collectPreview.sample.map((row, i) => (
                  <li key={`${row.contactEmail}-${i}`}>
                    [{row.action}] {row.organizationName} · {row.contactEmail}
                    {row.skipReason ? ` (${row.skipReason})` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
            {collectPreview.parseErrors.length > 0 ? (
              <p className="text-amber-800">{collectPreview.parseErrors.join(' · ')}</p>
            ) : null}
            {collectPreview.error ? <p className="text-red-700">{collectPreview.error}</p> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={collectBusy || busy || !collectFeedUrl.trim()}
            onClick={() => void onTestFeed()}
            className="inline-flex items-center gap-2 rounded-md border border-teal-300 bg-white px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-50 disabled:opacity-50"
          >
            {collectBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            Test feed
          </button>
          <button
            type="button"
            disabled={collectBusy || busy}
            onClick={() => void saveCollectSettings()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {collectBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save collect settings
          </button>
          <button
            type="button"
            disabled={collectBusy || busy || !collectFeedUrl.trim()}
            onClick={() => void saveCollectSettings({ enabled: !(collect?.enabled) })}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
          >
            {collect?.enabled ? 'Disable daily collect' : 'Enable daily collect'}
          </button>
          <button
            type="button"
            disabled={collectBusy || busy || !collectFeedUrl.trim()}
            onClick={() => {
              if (
                window.confirm(
                  'Pull the licensed feed now into PENDING targets? This does not send email by itself.'
                )
              ) {
                void saveCollectSettings({ runNow: true })
              }
            }}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Collect now
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="h-4 w-4" /> Import targets (CSV / paste) — backup
        </h2>
        <p className="text-xs text-gray-600">
          Header row recommended:{' '}
          <code className="rounded bg-gray-100 px-1">Organisation, Email, Contact, Type, State, Notes</code>
          . Also accepts JSON arrays or{' '}
          <code className="rounded bg-gray-100 px-1">Org | email | contact | type | state</code> lines.
          Tag licensed / official exports below — <strong>no web scrape</strong>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block text-xs font-medium text-gray-700">
            List source
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={importSource}
              disabled={importBusy || busy}
              onChange={(e) => setImportSource(e.target.value as OutreachListSourceType)}
            >
              {OUTREACH_LIST_SOURCE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {OUTREACH_LIST_SOURCE_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-700">
            List / vendor name
            {(importSource === 'licensed_list_upload' ||
              importSource === 'official_directory_export') && (
              <span className="text-red-600"> *</span>
            )}
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={listName}
              disabled={importBusy || busy}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Vendor Co AU schools Q3"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            License / reference note
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={licenseNote}
              disabled={importBusy || busy}
              onChange={(e) => setLicenseNote(e.target.value)}
              placeholder="Optional · contract id or purchase date"
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-gray-700">
          Paste list
          <textarea
            className="mt-1 w-full min-h-[120px] rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
            placeholder={'Organisation,Email,Contact,Type,State\nSunnybank Kinder,office@sunny.edu.au,Jane,kindergarten,QLD'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            disabled={importBusy || busy}
          />
        </label>
        <label className="block text-xs font-medium text-gray-700">
          Or choose CSV / text file
          <input
            type="file"
            accept=".csv,.txt,.tsv,text/csv,text/plain,application/json"
            className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700"
            disabled={importBusy || busy}
            onChange={(e) => {
              void onImportFile(e.target.files?.[0] || null)
              e.target.value = ''
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={importBusy || busy || !importText.trim()}
            onClick={() => void onImport()}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {importBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import into queue
          </button>
          <button
            type="button"
            disabled={importBusy || busy || !importText.trim()}
            onClick={() => setImportText('')}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Clear paste
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-indigo-700" /> Today’s outreach queue (Sydney)
        </h2>
        <p className="text-xs text-gray-700">
          Build up to <strong>10 PENDING</strong> targets for today, review, then{' '}
          <strong>Confirm Send</strong>. Optional daily cron auto-send stays <strong>off</strong> until you enable it
          below. Cap resets on the Australia/Sydney calendar day.
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-gray-800">
          <span className="rounded-md bg-white px-2.5 py-1 border border-indigo-100">
            Day: <strong>{dailyQuota?.dayKey || '—'}</strong>
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 border border-indigo-100">
            Sent today: <strong>{dailyQuota?.sentToday ?? '—'}</strong> / {dailyQuota?.dailyCap ?? 10}
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 border border-indigo-100">
            Remaining: <strong>{dailyQuota?.remaining ?? '—'}</strong>
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 border border-indigo-100">
            PENDING pool: <strong>{dailyQuota?.pendingPoolSize ?? '—'}</strong>
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 border border-indigo-100">
            Auto-send:{' '}
            <strong>{autoSend ? (autoSend.enabled ? 'On' : 'Off') : '—'}</strong>
          </span>
        </div>
        {autoSend?.lastResult ? (
          <p className="text-xs text-gray-600">
            Last auto-send:{' '}
            {autoSend.lastRunAt ? new Date(autoSend.lastRunAt).toLocaleString() : '—'} · {autoSend.lastResult}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              busy ||
              loading ||
              !dailyQuota ||
              dailyQuota.remaining <= 0 ||
              dailyQuota.pendingPoolSize <= 0
            }
            onClick={onBuildDailyQueue}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            title={
              !dailyQuota
                ? 'Loading daily queue…'
                : dailyQuota.remaining <= 0
                  ? 'Daily send cap reached for Sydney today'
                  : dailyQuota.pendingPoolSize <= 0
                    ? 'No PENDING targets with email — import or add targets first'
                    : 'Select up to today’s remaining PENDING targets'
            }
          >
            <ListChecks className="h-4 w-4" />
            Build today’s queue
          </button>
          <button
            type="button"
            disabled={busy || selectedCount === 0}
            onClick={() => void onSend()}
            className="inline-flex items-center gap-2 rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Confirm Send ({selectedCount})
          </button>
          <button
            type="button"
            disabled={autoSendBusy || busy}
            onClick={() => void onToggleAutoSend(!(autoSend?.enabled))}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {autoSendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {autoSend?.enabled ? 'Disable daily auto-send' : 'Enable daily auto-send'}
          </button>
          <button
            type="button"
            disabled={autoSendBusy || busy}
            onClick={() => void onRunAutoSendNow()}
            className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
          >
            Run auto-send now
          </button>
        </div>
        {message && (messageTone === 'success' || message.startsWith('Confirm Send')) ? (
          <p
            className={`text-sm font-medium rounded-md border px-3 py-2 ${
              messageTone === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>

      <form onSubmit={onCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editingId ? `Edit outreach target (${editingId})` : 'Add outreach target'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">
            Organisation name *
            <input
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.organizationName}
              onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))}
            />
          </label>
          <label className="text-xs text-gray-600">
            Contact email
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </label>
          <label className="text-xs text-gray-600">
            Contact name
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
            />
          </label>
          <label className="text-xs text-gray-600">
            Organisation type
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.orgType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  orgType: e.target.value as typeof form.orgType,
                }))
              }
            >
              <option value="">—</option>
              {FUNDRAISING_ORG_TYPE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {FUNDRAISING_ORG_TYPE_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            State
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              placeholder="QLD"
            />
          </label>
          <label className="text-xs text-gray-600 sm:col-span-2">
            Notes
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? 'Update target' : 'Save target'}
          </button>
          {editingId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditingId(null)
                setForm({
                  organizationName: '',
                  contactName: '',
                  contactEmail: '',
                  orgType: '',
                  state: '',
                  notes: '',
                })
                setMessage('')
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="text-xs text-gray-600 flex items-center gap-2">
          Status
          <select
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'All'}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        <button
          type="button"
          onClick={() =>
            setSelected(
              new Set(selectableIds.slice(0, dailyQuota?.remaining ?? 10))
            )
          }
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Select up to {dailyQuota?.remaining ?? 10} sendable
        </button>
        <button
          type="button"
          disabled={busy || selectedCount === 0}
          onClick={() => void onSend()}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Confirm Send ({selectedCount})
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm mb-16">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 w-10" />
              <th className="px-3 py-2">Organisation</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last sent</th>
              <th className="px-3 py-2">Id</th>
              <th className="px-3 py-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : targets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  No outreach targets yet. Add one above.
                </td>
              </tr>
            ) : (
              targets.map((t) => {
                const canSelect =
                  t.status !== 'CONVERTED' && t.status !== 'OPTED_OUT' && Boolean(t.contactEmail)
                return (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        disabled={!canSelect}
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{t.organizationName}</div>
                      <div className="text-xs text-gray-500">
                        {[t.orgType, t.state].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{t.contactName || '—'}</div>
                      <div className="text-xs text-gray-500">{t.contactEmail || 'No email'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                        {t.status}
                      </span>
                      {t.lastError ? (
                        <div className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={t.lastError}>
                          {t.lastError}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {t.lastSentAt ? new Date(t.lastSentAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{t.id}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startEdit(t)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          title="Edit target"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        {t.status === 'FAILED' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void resetFailedToPending(t)}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                            title="Reset FAILED to PENDING"
                          >
                            Retry
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDelete(t)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          title="Delete target"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </FundraisingAdminShell>
    </div>
  )
}
