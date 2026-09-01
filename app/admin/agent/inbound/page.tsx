'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useAdminAuth } from '@/lib/adminAuth'
import { adminHasPermission } from '@/lib/adminPermissionCheck'
import { parseAgentInboundPreselect } from '@/lib/agent/inboundLinks'
import {
  bespokeRecordToQueueItem,
  contactMessageToQueueItem,
  includeBespokeInInboundQueue,
  includeBespokeInRecentQueue,
  includeContactMessageInInboundQueue,
  includeContactMessageInRecentQueue,
  isBespokeActionableStatus,
  isContactMessageActionableStatus,
  type InboundQueueItem,
  type InboundQueueTab,
} from '@/lib/agent/inboundQueue'
import { emailService } from '@/lib/emailService'
import BespokeLogoAsset from '@/components/admin/BespokeLogoAsset'
import { logAdminActivity } from '@/lib/logAdminActivity'
import { MessageSquare, Loader2, RefreshCw, Send, Sparkles, ArrowLeft } from 'lucide-react'

type QueueItem = InboundQueueItem

type DraftPayload = {
  subject: string
  body: string
  intentHint: string
}

const RECENT_QUEUE_LIMIT = 40

export default function AdminAgentInboundPage() {
  return (
    <AdminRoute requiredAnyPermissions={['messages:read', 'bespoke:read', 'agent:read']}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading draft workspace…
          </div>
        }
      >
        <InboundDraftWorkspace />
      </Suspense>
    </AdminRoute>
  )
}

function InboundDraftWorkspace() {
  const searchParams = useSearchParams()
  const preselect = useMemo(
    () => parseAgentInboundPreselect(searchParams.get('channel'), searchParams.get('id')),
    [searchParams]
  )
  const { adminUser } = useAdminAuth()
  const [loading, setLoading] = useState(true)
  const [needsAttention, setNeedsAttention] = useState<QueueItem[]>([])
  const [recentHandled, setRecentHandled] = useState<QueueItem[]>([])
  const [activeTab, setActiveTab] = useState<InboundQueueTab>('needs_attention')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [intentHint, setIntentHint] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const queue = activeTab === 'needs_attention' ? needsAttention : recentHandled

  const selected = useMemo(() => {
    const fromActive = queue.find((q) => q.key === selectedKey)
    if (fromActive) return fromActive
    return (
      needsAttention.find((q) => q.key === selectedKey) ||
      recentHandled.find((q) => q.key === selectedKey) ||
      null
    )
  }, [queue, selectedKey, needsAttention, recentHandled])

  const canSendSelected = useMemo(() => {
    if (!selected) return false
    return selected.channel === 'message'
      ? adminHasPermission(adminUser, 'messages:write')
      : adminHasPermission(adminUser, 'bespoke:write')
  }, [adminUser, selected])

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const preselectId = preselect?.channel === 'message' ? preselect.id : undefined
      const preselectBespokeId = preselect?.channel === 'bespoke' ? preselect.id : undefined

      const [msgRes, bespokeRes] = await Promise.all([
        fetch('/api/admin/contact-messages?limit=200', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/bespoke-requests/stickers/custom', { cache: 'no-store', credentials: 'include' }),
      ])

      const actionable: QueueItem[] = []
      const recent: QueueItem[] = []

      if (msgRes.ok) {
        const json = (await msgRes.json().catch(() => null)) as {
          messages?: Array<Record<string, unknown>>
        } | null
        for (const m of json?.messages || []) {
          const status = String(m.status || 'new')
          const id = String(m.id || '')
          if (!id) continue
          const item = contactMessageToQueueItem(m)
          if (!item) continue
          if (includeContactMessageInInboundQueue(status, id, preselectId)) {
            const deepLinkOnly =
              Boolean(preselectId && id === preselectId) && !isContactMessageActionableStatus(status)
            actionable.push(deepLinkOnly ? { ...item, deepLinkOnly: true } : item)
          } else if (includeContactMessageInRecentQueue(status)) {
            recent.push(item)
          }
        }
      }

      if (bespokeRes.ok) {
        const json = (await bespokeRes.json().catch(() => null)) as {
          records?: Array<Record<string, unknown>>
        } | null
        for (const r of json?.records || []) {
          const status = String(r.status || 'new')
          const id = String(r.id || '')
          if (!id) continue
          const item = bespokeRecordToQueueItem(r)
          if (!item) continue
          if (includeBespokeInInboundQueue(status, id, preselectBespokeId)) {
            const deepLinkOnly =
              Boolean(preselectBespokeId && id === preselectBespokeId) &&
              !isBespokeActionableStatus(status)
            actionable.push(deepLinkOnly ? { ...item, deepLinkOnly: true } : item)
          } else if (includeBespokeInRecentQueue(status)) {
            recent.push(item)
          }
        }
      }

      if (preselect && !actionable.some((i) => i.key === preselect.key)) {
        if (preselect.channel === 'message') {
          const oneRes = await fetch(
            `/api/admin/contact-messages/${encodeURIComponent(preselect.id)}`,
            { cache: 'no-store', credentials: 'include' }
          )
          const oneJson = (await oneRes.json().catch(() => null)) as {
            ok?: boolean
            message?: Record<string, unknown>
          } | null
          if (oneRes.ok && oneJson?.message) {
            const item = contactMessageToQueueItem(oneJson.message)
            if (item) actionable.unshift({ ...item, deepLinkOnly: true })
          }
        } else {
          const oneRes = await fetch(
            `/api/bespoke-requests/stickers/custom/${encodeURIComponent(preselect.id)}`,
            { cache: 'no-store', credentials: 'include' }
          )
          const oneJson = (await oneRes.json().catch(() => null)) as {
            success?: boolean
            record?: Record<string, unknown>
          } | null
          if (oneRes.ok && oneJson?.record) {
            const item = bespokeRecordToQueueItem(oneJson.record)
            if (item) actionable.unshift({ ...item, deepLinkOnly: true })
          }
        }
      }

      const sortDesc = (a: QueueItem, b: QueueItem) => (a.createdAt < b.createdAt ? 1 : -1)
      actionable.sort(sortDesc)
      recent.sort(sortDesc)
      const recentCapped = recent.slice(0, RECENT_QUEUE_LIMIT)

      if (preselect) {
        const pinned = actionable.find((i) => i.key === preselect.key)
        if (pinned) {
          const rest = actionable.filter((i) => i.key !== preselect.key)
          actionable.splice(0, actionable.length, pinned, ...rest)
        }
      }

      setNeedsAttention(actionable)
      setRecentHandled(recentCapped)

      if (preselect && actionable.some((i) => i.key === preselect.key)) {
        setActiveTab('needs_attention')
        setSelectedKey(preselect.key)
      } else if (preselect && recentCapped.some((i) => i.key === preselect.key)) {
        setActiveTab('recent')
        setSelectedKey(preselect.key)
      } else if (preselect) {
        setSelectedKey(null)
        setMessage(
          'Could not load the linked message from Messages/Bespoke. It may have been deleted or you may lack permission.'
        )
      } else {
        setSelectedKey((prev) => {
          if (prev && (actionable.some((i) => i.key === prev) || recentCapped.some((i) => i.key === prev))) {
            return prev
          }
          return actionable[0]?.key ?? null
        })
        if (actionable[0]) setActiveTab('needs_attention')
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load queue')
      setNeedsAttention([])
      setRecentHandled([])
      setSelectedKey(null)
    } finally {
      setLoading(false)
    }
  }, [preselect])

  useEffect(() => {
    void load()
  }, [load])

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
          bespokePayload: selected.channel === 'bespoke' ? selected.bespokePayload : undefined,
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

      setMessage('Sent. Item moved to Recently handled.')
      setDraftBody('')
      setDraftSubject('')
      setActiveTab('recent')
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const switchTab = (tab: InboundQueueTab) => {
    setActiveTab(tab)
    const list = tab === 'needs_attention' ? needsAttention : recentHandled
    setSelectedKey((prev) => {
      if (prev && list.some((i) => i.key === prev)) return prev
      return list[0]?.key ?? null
    })
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
            <div className="border-b border-gray-100 px-2 pt-2 flex gap-1">
              <button
                type="button"
                onClick={() => switchTab('needs_attention')}
                className={`flex-1 rounded-t-lg px-3 py-2 text-sm font-semibold ${
                  activeTab === 'needs_attention'
                    ? 'bg-indigo-50 text-indigo-900 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Needs attention ({needsAttention.length})
              </button>
              <button
                type="button"
                onClick={() => switchTab('recent')}
                className={`flex-1 rounded-t-lg px-3 py-2 text-sm font-semibold ${
                  activeTab === 'recent'
                    ? 'bg-indigo-50 text-indigo-900 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Recently handled ({recentHandled.length})
              </button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : queue.length === 0 ? (
              <div className="px-4 py-8 text-sm text-gray-600 space-y-3">
                {activeTab === 'needs_attention' ? (
                  <>
                    <p className="font-medium text-gray-800">No items need a first reply right now.</p>
                    <p>
                      This tab only lists Messages in <span className="font-medium">new</span> /{' '}
                      <span className="font-medium">read</span> and Bespoke in{' '}
                      <span className="font-medium">new</span> /{' '}
                      <span className="font-medium">reviewed</span>.
                    </p>
                    {recentHandled.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => switchTab('recent')}
                        className="text-indigo-700 font-medium hover:underline"
                      >
                        View {recentHandled.length} recently handled item
                        {recentHandled.length === 1 ? '' : 's'}
                      </button>
                    ) : (
                      <p className="text-gray-500">
                        To open a specific enquiry, use <span className="font-medium">Draft with Agent</span>{' '}
                        on the Messages or Bespoke page.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href="/admin/messages"
                        className="inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Open Messages
                      </Link>
                      <Link
                        href="/admin/bespoke-requests"
                        className="inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Open Bespoke
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-800">No recently handled items in this list.</p>
                    <p className="text-gray-500">
                      After you Send from this workspace, replied items appear here (up to {RECENT_QUEUE_LIMIT}).
                      You can still draft a follow-up.
                    </p>
                  </>
                )}
              </div>
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
              <div className="py-12 text-center space-y-3 text-sm text-gray-500">
                <p>Select an inbound item from the left.</p>
                {needsAttention.length === 0 && recentHandled.length === 0 ? (
                  <p>
                    Or open a row on{' '}
                    <Link href="/admin/messages" className="text-indigo-700 hover:underline">
                      Messages
                    </Link>{' '}
                    /{' '}
                    <Link href="/admin/bespoke-requests" className="text-indigo-700 hover:underline">
                      Bespoke
                    </Link>{' '}
                    and click <span className="font-medium text-gray-700">Draft with Agent</span>.
                  </p>
                ) : null}
              </div>
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

                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selected.excerpt || '(no excerpt)'}
                </div>
                {selected.channel === 'bespoke' ? (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <BespokeLogoAsset
                      logo={selected.bespokeLogo}
                      requestId={selected.id}
                      compact
                    />
                  </div>
                ) : null}
                {selected.deepLinkOnly ? (
                  <p className="text-xs text-amber-800">
                    Opened from Messages/Bespoke — this item is outside the default Needs attention queue. You can
                    still draft and send a follow-up.
                  </p>
                ) : null}
                {activeTab === 'recent' && !selected.deepLinkOnly ? (
                  <p className="text-xs text-gray-500">
                    Recently handled — draft a follow-up if needed. Send will keep status as replied.
                  </p>
                ) : null}

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
                  disabled={sending || !draftBody.trim() || !canSendSelected}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send via Resend
                </button>
                {!canSendSelected ? (
                  <p className="text-xs text-amber-800">
                    Send requires{' '}
                    {selected.channel === 'message' ? 'messages:write' : 'bespoke:write'} permission.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
