'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { emailService } from '@/lib/emailService'
import { logAdminActivity } from '@/lib/logAdminActivity'
import { MessageSquare, Loader2, RefreshCw, Send, Sparkles, ArrowLeft } from 'lucide-react'

type QueueItem = {
  key: string
  channel: 'message' | 'bespoke'
  id: string
  customerName: string
  customerEmail: string
  subject: string
  excerpt: string
  createdAt: string
}

type DraftPayload = {
  subject: string
  body: string
  intentHint: string
}

export default function AdminAgentInboundPage() {
  return (
    <AdminRoute requiredAnyPermissions={['messages:read', 'bespoke:read', 'agent:read']}>
      <InboundDraftWorkspace />
    </AdminRoute>
  )
}

function InboundDraftWorkspace() {
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [intentHint, setIntentHint] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const selected = useMemo(
    () => queue.find((q) => q.key === selectedKey) || null,
    [queue, selectedKey]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const [msgRes, bespokeRes] = await Promise.all([
        fetch('/api/admin/contact-messages?limit=50', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/bespoke-requests/stickers/custom', { cache: 'no-store', credentials: 'include' }),
      ])

      const items: QueueItem[] = []

      if (msgRes.ok) {
        const json = (await msgRes.json().catch(() => null)) as {
          messages?: Array<Record<string, unknown>>
        } | null
        for (const m of json?.messages || []) {
          const status = String(m.status || 'new')
          if (status !== 'new') continue
          const id = String(m.id || '')
          if (!id) continue
          items.push({
            key: `message:${id}`,
            channel: 'message',
            id,
            customerName: String(m.name || 'Customer'),
            customerEmail: String(m.email || ''),
            subject: String(m.subject || 'Enquiry'),
            excerpt: String(m.message || m.body || '').slice(0, 500),
            createdAt: String(m.created_at || m.createdAt || ''),
          })
        }
      }

      if (bespokeRes.ok) {
        const json = (await bespokeRes.json().catch(() => null)) as {
          records?: Array<Record<string, unknown>>
        } | null
        for (const r of json?.records || []) {
          const status = String(r.status || 'new')
          if (status !== 'new') continue
          const id = String(r.id || '')
          if (!id) continue
          const payload = (r.payload || {}) as Record<string, unknown>
          const contact = (payload.contact || {}) as { name?: string; email?: string }
          const product = payload.product ? String(payload.product) : ''
          items.push({
            key: `bespoke:${id}`,
            channel: 'bespoke',
            id,
            customerName: String(contact.name || 'Customer'),
            customerEmail: String(contact.email || ''),
            subject: `Bespoke request ${id}`,
            excerpt: product || JSON.stringify(payload).slice(0, 400),
            createdAt: String(r.createdAt || r.created_at || ''),
          })
        }
      }

      items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      setQueue(items)
      setSelectedKey((prev) => {
        if (prev && items.some((i) => i.key === prev)) return prev
        return items[0]?.key ?? null
      })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load queue')
      setQueue([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  const generateDraft = async () => {
    if (!selected) return
    setDrafting(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/agent/inbound/draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: selected.channel,
          customerName: selected.customerName,
          customerEmail: selected.customerEmail,
          subject: selected.subject,
          bodyExcerpt: selected.excerpt,
          requestId: selected.channel === 'bespoke' ? selected.id : undefined,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        draft?: DraftPayload
        error?: string
      } | null
      if (!res.ok || !json?.draft) throw new Error(json?.error || 'Draft failed')
      setDraftSubject(json.draft.subject)
      setDraftBody(json.draft.body)
      setIntentHint(json.draft.intentHint)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setDrafting(false)
    }
  }

  useEffect(() => {
    if (!selected) {
      setDraftSubject('')
      setDraftBody('')
      setIntentHint('')
      return
    }
    void generateDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate when selection changes
  }, [selectedKey])

  const markMessageReplied = async (id: string) => {
    await fetch(`/api/admin/contact-messages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'replied' }),
    })
  }

  const markBespokeReplied = async (id: string) => {
    await fetch(`/api/bespoke-requests/stickers/custom/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'replied' }),
    })
  }

  const handleSend = async () => {
    if (!selected) return
    if (!draftBody.trim()) {
      setMessage('Edit or generate a draft before sending.')
      return
    }
    if (!selected.customerEmail.includes('@')) {
      setMessage('This item has no valid customer email.')
      return
    }

    setSending(true)
    setMessage('')
    try {
      const emailResponse = await emailService.sendResponse({
        customerEmail: selected.customerEmail,
        customerName: selected.customerName,
        subject: draftSubject || `Re: ${selected.subject}`,
        message: draftBody,
        originalSubject: selected.subject,
        adminName: 'Selpic Support Team',
        messageId: selected.channel === 'message' ? selected.id : undefined,
        bespokeRequestId: selected.channel === 'bespoke' ? selected.id : undefined,
        templateUsed: 'agent-inbound-draft',
      })

      if (!emailResponse.success) {
        throw new Error(emailResponse.message || 'Send failed')
      }

      if (selected.channel === 'message') {
        await markMessageReplied(selected.id)
      } else {
        await markBespokeReplied(selected.id)
      }

      logAdminActivity({
        action: 'agent_inbound_draft_sent',
        target: selected.id,
        field: 'channel',
        oldValue: 'new',
        newValue: selected.channel,
        description: `Agent inbound draft sent (${selected.channel}) to ${selected.customerEmail}`,
      })

      setMessage('Sent. Item marked replied.')
      setDraftBody('')
      setDraftSubject('')
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Customer care drafts"
        icon={<MessageSquare className="w-7 h-7 text-indigo-600" />}
      />
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/agent"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Agent hub
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh queue
          </button>
          <p className="text-sm text-gray-500">
            Template drafts only — edit before Send. Full tools remain on Messages / Bespoke pages.
          </p>
        </div>

        {message ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
              New inbound ({queue.length})
            </div>
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : queue.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-500">No new Messages or Bespoke items.</p>
            ) : (
              <ul className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
                {queue.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(item.key)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                        selectedKey === item.key ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                          {item.channel}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-medium text-gray-900 truncate">
                        {item.customerName}
                      </div>
                      <div className="text-xs text-gray-600 truncate">{item.subject}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            {!selected ? (
              <p className="text-sm text-gray-500 py-12 text-center">Select an inbound item.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">To</div>
                  <div className="text-sm text-gray-900">
                    {selected.customerName} &lt;{selected.customerEmail || 'no email'}&gt;
                  </div>
                  {intentHint ? (
                    <div className="mt-1 text-xs text-gray-500">
                      Intent hint: <span className="font-medium text-gray-700">{intentHint}</span>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600 whitespace-pre-wrap max-h-28 overflow-y-auto">
                  {selected.excerpt || '(no excerpt)'}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void generateDraft()}
                    disabled={drafting}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {drafting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Regenerate draft
                  </button>
                  <Link
                    href={
                      selected.channel === 'message'
                        ? '/admin/messages'
                        : '/admin/bespoke-requests'
                    }
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Open full {selected.channel === 'message' ? 'Messages' : 'Bespoke'} page
                  </Link>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Subject</span>
                  <input
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Draft body (edit before send)</span>
                  <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={14}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !draftBody.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send via Resend
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
