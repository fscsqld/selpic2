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
import { ArrowLeft, Loader2, RefreshCw, Send, Sparkles } from 'lucide-react'

type DraftState = {
  topicId: string
  title: string
  content: string
  category: CanonicalPostCategory
  sources: string[]
  autonomyNote: string
}

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

  const [topics, setTopics] = useState<CommunityDraftTopic[]>([])
  const [suggestedTopics, setSuggestedTopics] = useState<CommunityCalendarSuggestion[]>([])
  const [calendarWindow, setCalendarWindow] = useState('')
  const [visionNote, setVisionNote] = useState('')
  const [topicId, setTopicId] = useState('back_to_school_labels')
  const [sourceNotes, setSourceNotes] = useState('')
  const [customBrief, setCustomBrief] = useState('')
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [drafting, setDrafting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState('')

  const loadTopics = useCallback(async () => {
    setLoadingTopics(true)
    setMessage('')
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
      } else if (list[0] && !list.some((t) => t.id === topicId)) {
        setTopicId(list[0].id)
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load topics')
    } finally {
      setLoadingTopics(false)
    }
  }, [topicId])

  useEffect(() => {
    void loadTopics()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

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

  const handlePublish = async () => {
    if (!draft) return
    if (!canPublish) {
      setMessage('Publishing requires community:write. Ask a super-admin to grant it.')
      return
    }
    const title = draft.title.trim()
    const content = draft.content.trim()
    if (!title || !content) {
      setMessage('Title and body are required before Approve & publish.')
      return
    }
    if (/safer brief/i.test(title)) {
      setMessage('Replace the blocked brief and generate a new draft before publishing.')
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
          category: draft.category,
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
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Publish failed')
      }

      const postId = String(json.post?.id || '')
      await logAdminActivity({
        action: 'agent_community_draft_published',
        target: postId || title.slice(0, 80),
        field: 'community_post',
        newValue: { title, category: draft.category, topicId: draft.topicId },
        description: `Published community draft “${title.slice(0, 80)}” via Agent`,
      })

      setMessage(
        postId
          ? `Published. Open Community admin or /community to review (id ${postId}).`
          : 'Published. Open Community admin or /community to review.'
      )
      setDraft(null)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const selectedTopic = topics.find((t) => t.id === topicId)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Community drafts"
        icon={<Sparkles className="w-7 h-7 text-violet-600" />}
      />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/agent"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Agent hub
          </Link>
          <Link
            href="/admin/community"
            className="text-sm text-violet-700 hover:underline"
          >
            Open Community admin
          </Link>
          <button
            type="button"
            onClick={() => void loadTopics()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingTopics ? 'animate-spin' : ''}`} />
            Refresh topics
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Wave 5 — SELPIC N drafts for Australian families, schools, kindergarten/kinder, and daycare.
          The agent suggests calendar-hot topics; you still Edit → Approve &amp; publish. Nothing goes live
          automatically. Homepage Hero stays out of scope.
        </p>

        <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-medium">No auto-publish (yet)</p>
          <p className="mt-1 text-violet-900/90">
            {visionNote ||
              'Prefer admin-pasted source URLs. Do not scrape third-party sites. Avoid medical, legal, or political campaign copy. Later waves may auto-draft on an AU calendar cadence with Approve still required.'}
          </p>
          {calendarWindow ? (
            <p className="mt-2 text-xs font-medium text-violet-800">This week’s window: {calendarWindow}</p>
          ) : null}
        </div>

        {suggestedTopics.length > 0 ? (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Suggested for this week (AU)</h2>
            <p className="text-xs text-gray-500 mb-3">
              Click a suggestion to select the topic — still Generate draft, then Approve to publish.
            </p>
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

        {message ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {message}
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-4 mb-6">
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
                placeholder="Paste a short English brief for the post…"
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
              placeholder="https://…&#10;Internal note"
            />
          </div>

          <button
            type="button"
            onClick={() => void generateDraft()}
            disabled={drafting || loadingTopics}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate draft
          </button>
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
                rows={16}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <p className="text-xs text-gray-500">{draft.autonomyNote}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={publishing || !canPublish}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                title={canPublish ? 'Publish to /community' : 'Requires community:write'}
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Approve &amp; publish
              </button>
              {!canPublish ? (
                <span className="text-xs text-amber-800 self-center">
                  You can draft with community:read / agent:read. Publish needs community:write.
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="mt-8 text-[11px] text-gray-400" data-agent-ux="community-wave5-v1">
          Community drafts v1 — template topics only. Cron / LLM optional later.
        </p>
      </div>
    </div>
  )
}
