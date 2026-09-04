'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { FUNDRAISING_ORG_TYPE_LABELS, FUNDRAISING_ORG_TYPE_OPTIONS } from '@/lib/fundraising/types'
import type { FundraisingOutreachTarget, FundraisingOutreachTargetStatus } from '@/lib/fundraising/types'
import { logAdminActivity } from '@/lib/logAdminActivity'
import { Bot, HeartHandshake, Loader2, Mail, Plus, RefreshCw, Trash2, Upload, ListChecks } from 'lucide-react'

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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    organizationName: '',
    contactName: '',
    contactEmail: '',
    orgType: '' as '' | keyof typeof FUNDRAISING_ORG_TYPE_LABELS,
    state: '',
    notes: '',
  })
  const [importText, setImportText] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [dailyQuota, setDailyQuota] = useState<DailyQuotaState | null>(null)

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
      if (json.warning) setMessage(String(json.warning))
      await loadDailyQueue()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load targets')
      setTargets([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, loadDailyQueue])

  useEffect(() => {
    void load()
  }, [load])

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
          organizationName: form.organizationName.trim(),
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim(),
          orgType: form.orgType || undefined,
          state: form.state.trim() || undefined,
          notes: form.notes.trim() || undefined,
          status: 'PENDING',
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Save failed')
      logAdminActivity({
        action: 'fundraising_agent_target_saved',
        target: json.target?.id || 'outreach-target',
        field: 'outreach_target',
        newValue: {
          organizationName: form.organizationName.trim(),
          contactEmail: form.contactEmail.trim(),
        },
        description: `Fundraising agent target saved · ${form.organizationName.trim()}`,
      })
      setForm({
        organizationName: '',
        contactName: '',
        contactEmail: '',
        orgType: '',
        state: '',
        notes: '',
      })
      setMessage('Target saved.')
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const onImport = async () => {
    if (!importText.trim()) {
      setMessage('Paste CSV / JSON / pipe lines, or choose a CSV file first.')
      return
    }
    setImportBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/fundraising/agent/targets/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
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
        },
        description: `Fundraising agent import · saved ${s.saved ?? 0} (insert ${s.inserted ?? 0}, update ${s.updated ?? 0}, skip ${s.skipped ?? 0})`,
      })
      const errNote =
        Array.isArray(json.errors) && json.errors.length > 0
          ? ` · ${json.errors.length} save error(s)`
          : ''
      setMessage(
        `Import finished · parsed ${s.parsed ?? 0}, inserted ${s.inserted ?? 0}, updated ${s.updated ?? 0}, skipped ${s.skipped ?? 0}, saved ${s.saved ?? 0}${s.truncated ? ' (truncated to 200)' : ''}${errNote}`
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
      setMessage('Select at least one target to email.')
      return
    }
    if (ids.length > 10) {
      setMessage('Select at most 10 targets per send (v1 safety cap).')
      return
    }
    const remaining = dailyQuota?.remaining ?? 10
    if (ids.length > remaining) {
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
      setMessage(
        `Confirm Send finished · sent ${json.sent ?? 0}, failed ${json.failed ?? 0}, skipped ${json.skipped ?? 0} · today ${json.sentToday ?? '—'}/${json.dailyCap ?? 10} (Sydney)`
      )
      setSelected(new Set())
      await load()
    } catch (err) {
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
        subtitle="Import targets, build today’s Sydney queue (≤10), then Confirm Send — no auto-scrape / unsupervised blast."
        current="/admin/fundraising/agent"
      >
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <Bot className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Supply targets via CSV/paste or single add, then use <strong>Build today’s queue</strong> +{' '}
            <strong>Confirm Send</strong> (Sydney day cap 10). Rows without email are skipped on import.
            Opt-outs become <strong>OPTED_OUT</strong> and are never re-sent. Requires{' '}
            <strong>fundraising:write</strong> to save, import, or send.
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="h-4 w-4" /> Import targets (CSV / paste)
        </h2>
        <p className="text-xs text-gray-600">
          Header row recommended:{' '}
          <code className="rounded bg-gray-100 px-1">Organisation, Email, Contact, Type, State, Notes</code>
          . Also accepts JSON arrays or{' '}
          <code className="rounded bg-gray-100 px-1">Org | email | contact | type | state</code> lines.
          No web scrape — paste licensed / manual lists only.
        </p>
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
          Semi-auto Step 2: build up to <strong>10 PENDING</strong> targets for today, review, then{' '}
          <strong>Confirm Send</strong>. No cron / auto-blast. Cap resets on the Australia/Sydney calendar day.
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
        </div>
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
        </div>
      </div>

      <form onSubmit={onCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add outreach target
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
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Save target
        </button>
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

      {message && (
        <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
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
