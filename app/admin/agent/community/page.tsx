'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useAdminAuth } from '@/lib/adminAuth'
import { adminHasPermission } from '@/lib/adminPermissionCheck'
import { logAdminActivity } from '@/lib/logAdminActivity'
import {
  COMMUNITY_POST_CATEGORIES,
  type CanonicalPostCategory,
} from '@/lib/community/navCategories'
import type { CommunityDraftTopic } from '@/lib/agent/communityDraft'
import type { CommunityCalendarSuggestion } from '@/lib/agent/auCommunityCalendar'
import type { QueuedCommunityDraft } from '@/lib/agent/communityDraftQueue'
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  ListTodo,
  PenLine,
} from 'lucide-react'

type DraftState = {
  topicId: string
  title: string
  content: string
  category: CanonicalPostCategory
  sources: string[]
  autonomyNote: string
}

type WorkspaceTab = 'queue' | 'compose'

export default function AdminAgentCommunityPage() {
  return (
    <AdminRoute requiredAnyPermissions={['community:read', 'agent:read']}>
      <CommunityDraftWorkspace />
    </AdminRoute>
  )
}

function CommunityDraftWorkspace() {
  const { adminUser } = useAdminAuth()
  const canPublish = adminHasPermission(adminUser, 'community:write')

  const [tab, setTab] = useState<WorkspaceTab>('queue')
  const [topics, setTopics] = useState<CommunityDraftTopic[]>([])
  const [suggestedTopics, setSuggestedTopics] = useState<CommunityCalendarSuggestion[]>([])
  const [calendarWindow, setCalendarWindow] = useState('')
  const [visionNote, setVisionNote] = useState('')
  const [topicId, setTopicId] = useState('back_to_school_labels')
  const [sourceNotes, setSourceNotes] = useState('')
  const [customBrief, setCustomBrief] = useState('')
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [queue, setQueue] = useState<QueuedCommunityDraft[]>([])
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null)
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [loadingQueue, setLoadingQueue] = useState(true)
  const [drafting, setDrafting] = useState(false)
  const [queueBusy, setQueueBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState('')
  const [includeMarketS, setIncludeMarketS] = useState(false)

  const selectedQueued = queue.find((q) => q.id === selectedQueueId) || null

  const loadTopics = useCallback(async () => {
    setLoadingTopics(true)
    try {
      const res = await fetch('/api/admin/agent/community/draft', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        topics?: CommunityDraftTopic[]
        suggestedTopics?: CommunityCalendarSuggestion[]
        calendarWindow?: string
        visionNote?: string
        error?: string
      } | null
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load topics')
      const list = json.topics || []
      setTopics(list)
      setSuggestedTopics(json.suggestedTopics || [])
      setCalendarWindow(json.calendarWindow || '')
      setVisionNote(json.visionNote || '')
      const topSuggest = json.suggestedTopics?.[0]?.topicId
      if (topSuggest && list.some((t) => t.id === topSuggest)) {
        setTopicId(topSuggest)
      } else if (list[0]) {
        setTopicId((prev) => (list.some((t) => t.id === prev) ? prev : list[0].id))
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load topics')
    } finally {
      setLoadingTopics(false)
    }
  }, [])

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true)
    try {
      const res = await fetch('/api/admin/agent/community/queue', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        items?: QueuedCommunityDraft[]
        calendarWindow?: string
        error?: string
      } | null
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load queue')
      const items = json.items || []
      setQueue(items)
      if (json.calendarWindow) setCalendarWindow(json.calendarWindow)
      setSelectedQueueId((prev) => {
        if (prev && items.some((i) => i.id === prev)) return prev
        return items[0]?.id ?? null
      })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load queue')
    } finally {
      setLoadingQueue(false)
    }
  }, [])

  useEffect(() => {
    void loadTopics()
    void loadQueue()
  }, [loadTopics, loadQueue])

  const generateDraft = async () => {
    setDrafting(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/agent/community/draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          sourceNotes: sourceNotes.trim() || undefined,
          customBrief: topicId === 'custom_brief' ? customBrief : undefined,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        draft?: DraftState
        error?: string
      } | null
      if (!res.ok || !json?.draft) throw new Error(json?.error || 'Draft failed')
      setDraft({
        ...json.draft,
        category: (COMMUNITY_POST_CATEGORIES as readonly string[]).includes(json.draft.category)
          ? (json.draft.category as CanonicalPostCategory)
          : 'News',
      })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setDrafting(false)
    }
  }

  const addComposeToQueue = async () => {
    if (!draft) return
    setQueueBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/agent/community/queue', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enqueue',
          topicId: draft.topicId,
          sourceNotes: sourceNotes.trim() || undefined,
          customBrief: draft.topicId === 'custom_brief' ? customBrief : undefined,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        items?: QueuedCommunityDraft[]
        item?: QueuedCommunityDraft
        error?: string
      } | null
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Enqueue failed')
      setQueue(json.items || [])
      if (json.item) setSelectedQueueId(json.item.id)
      setTab('queue')
      setMessage('Added to queue (not published). Review on the Queue tab, then Approve.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Enqueue failed')
    } finally {
      setQueueBusy(false)
    }
  }

  const generateWeekIntoQueue = async () => {
    setQueueBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/agent/community/queue', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_week',
          forceMarketS: includeMarketS,
          hotGoodsActive: includeMarketS,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        items?: QueuedCommunityDraft[]
        added?: QueuedCommunityDraft[]
        skipped?: { topicId: string; skipReason?: string }[]
        calendarWindow?: string
        error?: string
      } | null
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Week generate failed')
      setQueue(json.items || [])
      if (json.calendarWindow) setCalendarWindow(json.calendarWindow)
      const addedN = json.added?.length ?? 0
      const skippedN = json.skipped?.length ?? 0
      setMessage(
        `Queued ${addedN} draft${addedN === 1 ? '' : 's'} for this week` +
          (skippedN ? ` (${skippedN} skipped — already pending)` : '') +
          '. Nothing was published.'
      )
      setTab('queue')
      if (json.added?.[0]) setSelectedQueueId(json.added[0].id)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Week generate failed')
    } finally {
      setQueueBusy(false)
    }
  }

  const saveQueuedEdits = async () => {
    if (!selectedQueued) return
    setQueueBusy(true)
    setMessage('')
    try {
      const res = await fetch(
        `/api/admin/agent/community/queue/${encodeURIComponent(selectedQueued.id)}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: selectedQueued.title,
            content: selectedQueued.content,
            category: selectedQueued.category,
          }),
        }
      )
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        item?: QueuedCommunityDraft
        error?: string
      } | null
      if (!res.ok || !json?.item) throw new Error(json?.error || 'Save failed')
      setQueue((prev) => prev.map((q) => (q.id === json.item!.id ? json.item! : q)))
      setMessage('Queue draft saved.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setQueueBusy(false)
    }
  }

  const discardQueued = async (id: string) => {
    if (!confirm('Discard this queued draft? It will not be published.')) return
    setQueueBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/agent/community/queue/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Discard failed')
      setQueue((prev) => prev.filter((q) => q.id !== id))
      setSelectedQueueId((prev) => (prev === id ? null : prev))
      setMessage('Discarded from queue.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Discard failed')
    } finally {
      setQueueBusy(false)
    }
  }

  const publishPayload = async (payload: {
    title: string
    content: string
    category: string
    topicId: string
    queueId?: string
  }) => {
    const title = payload.title.trim()
    const content = payload.content.trim()
    if (!title || !content) {
      setMessage('Title and body are required before Approve & publish.')
      return
    }
    if (/safer brief/i.test(title)) {
      setMessage('Replace the blocked brief before publishing.')
      return
    }
    if (!canPublish) {
      setMessage('Publishing requires community:write.')
      return
    }

    setPublishing(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/community/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          category: payload.category,
          author: 'SELPIC',
          pinned: false,
          hidden: false,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        post?: { id?: string }
        error?: string
      } | null
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Publish failed')

      const postId = String(json.post?.id || '')
      await logAdminActivity({
        action: 'agent_community_draft_published',
        target: postId || title.slice(0, 80),
        field: 'community_post',
        newValue: { title, category: payload.category, topicId: payload.topicId },
        description: `Published community draft “${title.slice(0, 80)}” via Agent`,
      })

      if (payload.queueId) {
        await fetch(`/api/admin/agent/community/queue/${encodeURIComponent(payload.queueId)}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        setQueue((prev) => prev.filter((q) => q.id !== payload.queueId))
        setSelectedQueueId((prev) => (prev === payload.queueId ? null : prev))
      } else {
        setDraft(null)
      }

      setMessage(
        postId
          ? `Published. Open Community admin or /community (id ${postId}).`
          : 'Published. Open Community admin or /community.'
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const selectedTopic = topics.find((t) => t.id === topicId)

  const updateSelectedQueued = (patch: Partial<QueuedCommunityDraft>) => {
    if (!selectedQueueId) return
    setQueue((prev) =>
      prev.map((q) => (q.id === selectedQueueId ? { ...q, ...patch } : q))
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Community drafts"
        icon={<Sparkles className="w-7 h-7 text-violet-600" />}
      />
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/agent"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Agent hub
          </Link>
          <Link href="/admin/community" className="text-sm text-violet-700 hover:underline">
            Open Community admin
          </Link>
          <button
            type="button"
            onClick={() => {
              void loadTopics()
              void loadQueue()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingTopics || loadingQueue ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Wave 5 — Queue holds calendar drafts for Approve; Compose is on-demand. Nothing auto-publishes.
          Homepage Hero stays out of scope.
        </p>

        <div className="mb-4 flex gap-1 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab('queue')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === 'queue'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ListTodo className="h-4 w-4" />
            Queue ({queue.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('compose')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === 'compose'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <PenLine className="h-4 w-4" />
            Compose
          </button>
        </div>

        <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-medium">No auto-publish</p>
          <p className="mt-1 text-violet-900/90">
            {visionNote ||
              'Generate this week’s suggestions into the queue, edit, then Approve & publish one by one.'}
          </p>
          {calendarWindow ? (
            <p className="mt-2 text-xs font-medium text-violet-800">
              This week’s window: {calendarWindow}
            </p>
          ) : null}
        </div>

        {message ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {message}
          </div>
        ) : null}

        {tab === 'queue' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => void generateWeekIntoQueue()}
                disabled={queueBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {queueBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate this week into queue
              </button>
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={includeMarketS}
                  onChange={(e) => setIncludeMarketS(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Include Market S (drop is live)
              </label>
              <p className="text-xs text-gray-500 w-full sm:w-auto">
                Uses AU calendar suggestions. Skips topics already pending. Does not publish.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
                {loadingQueue ? (
                  <div className="flex items-center gap-2 px-4 py-8 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
                  </div>
                ) : queue.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-gray-600 space-y-2">
                    <p className="font-medium text-gray-800">Queue is empty</p>
                    <p>
                      Click <span className="font-medium">Generate this week into queue</span>, or use
                      Compose → Add to queue.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
                    {queue.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedQueueId(item.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                            selectedQueueId === item.id ? 'bg-violet-50' : ''
                          }`}
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                            {item.topicId} · {item.source}
                          </div>
                          <div className="mt-1 text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                {!selectedQueued ? (
                  <p className="py-12 text-center text-sm text-gray-500">Select a queued draft.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Title
                      </label>
                      <input
                        value={selectedQueued.title}
                        onChange={(e) => updateSelectedQueued({ title: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Category
                      </label>
                      <select
                        value={
                          (COMMUNITY_POST_CATEGORIES as readonly string[]).includes(
                            selectedQueued.category
                          )
                            ? selectedQueued.category
                            : 'News'
                        }
                        onChange={(e) => updateSelectedQueued({ category: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {COMMUNITY_POST_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Body
                      </label>
                      <textarea
                        value={selectedQueued.content}
                        onChange={(e) => updateSelectedQueued({ content: e.target.value })}
                        rows={14}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveQueuedEdits()}
                        disabled={queueBusy}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Save edits
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void publishPayload({
                            title: selectedQueued.title,
                            content: selectedQueued.content,
                            category: selectedQueued.category,
                            topicId: String(selectedQueued.topicId),
                            queueId: selectedQueued.id,
                          })
                        }
                        disabled={publishing || !canPublish}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {publishing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Approve &amp; publish
                      </button>
                      <button
                        type="button"
                        onClick={() => void discardQueued(selectedQueued.id)}
                        disabled={queueBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Discard
                      </button>
                    </div>
                    {!canPublish ? (
                      <p className="text-xs text-amber-800">
                        You can edit/discard with read access. Publish needs community:write.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestedTopics.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">
                  Suggested for this week (AU)
                </h2>
                <ul className="space-y-2">
                  {suggestedTopics.map((s) => (
                    <li key={s.topicId}>
                      <button
                        type="button"
                        onClick={() => setTopicId(s.topicId)}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                          topicId === s.topicId
                            ? 'border-violet-400 bg-violet-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium text-gray-900">
                          #{s.priority} {s.label}
                        </span>
                        <span className="block text-xs text-gray-600 mt-0.5">{s.reason}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Topic
                </label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  disabled={loadingTopics}
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {selectedTopic ? (
                  <p className="mt-1 text-xs text-gray-500">{selectedTopic.brief}</p>
                ) : null}
              </div>

              {topicId === 'custom_brief' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Custom brief
                  </label>
                  <textarea
                    value={customBrief}
                    onChange={(e) => setCustomBrief(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Source notes (optional — one per line)
                </label>
                <textarea
                  value={sourceNotes}
                  onChange={(e) => setSourceNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void generateDraft()}
                  disabled={drafting || loadingTopics}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {drafting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate draft
                </button>
              </div>
            </div>

            {draft ? (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Title
                  </label>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Category
                  </label>
                  <select
                    value={draft.category}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        category: e.target.value as CanonicalPostCategory,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {COMMUNITY_POST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Body
                  </label>
                  <textarea
                    value={draft.content}
                    onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                    rows={14}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500">{draft.autonomyNote}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void addComposeToQueue()}
                    disabled={queueBusy}
                    className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-60"
                  >
                    Add to queue
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void publishPayload({
                        title: draft.title,
                        content: draft.content,
                        category: draft.category,
                        topicId: draft.topicId,
                      })
                    }
                    disabled={publishing || !canPublish}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {publishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Approve &amp; publish now
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <p className="mt-8 text-[11px] text-gray-400" data-agent-ux="community-wave5-queue-v1">
          Community drafts queue v1 — file-backed pending drafts; cron auto-publish later.
        </p>
      </div>
    </div>
  )
}
