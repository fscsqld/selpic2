'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { FUNDRAISING_ORG_TYPE_LABELS, FUNDRAISING_ORG_TYPE_OPTIONS } from '@/lib/fundraising/types'
import type { FundraisingOutreachTarget, FundraisingOutreachTargetStatus } from '@/lib/fundraising/types'
import { logAdminActivity } from '@/lib/logAdminActivity'
import { Bot, Loader2, Mail, Plus, RefreshCw } from 'lucide-react'

const STATUS_FILTERS: Array<'' | FundraisingOutreachTargetStatus> = [
  '',
  'PENDING',
  'CONTACTED',
  'CONVERTED',
  'FAILED',
  'OPTED_OUT',
]

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

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
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
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load targets')
      setTargets([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

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
    if (
      !window.confirm(
        `Send outreach email to ${ids.length} selected target(s)? This uses Resend and marks them CONTACTED.`
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
          ids,
        },
        description: `Fundraising agent send · sent ${json.sent}, failed ${json.failed}, skipped ${json.skipped}`,
      })
      setMessage(
        `Send finished · sent ${json.sent ?? 0}, failed ${json.failed ?? 0}, skipped ${json.skipped ?? 0}`
      )
      setSelected(new Set())
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FundraisingAdminShell
      title="Fundraising Agent"
      subtitle="Register outreach targets and send personalised B2B emails (v1: manual list, max 10 per send — not auto-scrape / daily blast)."
      current="/admin/fundraising/agent"
    >
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <Bot className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Targets are added here (or later licensed imports). Emails include an apply link with{' '}
            <code className="text-xs bg-white/80 px-1 rounded">ref=ai_agent&amp;target_id=…</code>. Converted
            applications update status automatically. Requires <strong>fundraising:write</strong> to save or send.
          </div>
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
          onClick={() => setSelected(new Set(selectableIds.slice(0, 10)))}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Select up to 10 sendable
        </button>
        <button
          type="button"
          disabled={busy || selectedCount === 0}
          onClick={() => void onSend()}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send email ({selectedCount})
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : targets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
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
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </FundraisingAdminShell>
  )
}
