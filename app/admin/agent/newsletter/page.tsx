'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import type { NewsletterDraftTopic } from '@/lib/agent/newsletterDraft'
import { saveNewsletterAgentDraftToSession } from '@/lib/agent/newsletterAgentDraftBridge'
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Newspaper,
  Sparkles,
  Wand2,
} from 'lucide-react'

type DraftState = {
  topicId: string
  type: 'promotion' | 'announcement' | 'event' | 'newsletter' | 'general'
  subject: string
  message: string
  autonomyNote: string
  source?: 'template' | 'llm'
}

export default function AdminAgentNewsletterPage() {
  return (
    <AdminRoute requiredAnyPermissions={['newsletter:read', 'agent:read']}>
      <NewsletterAssistWorkspace />
    </AdminRoute>
  )
}

function NewsletterAssistWorkspace() {
  const router = useRouter()
  const [topics, setTopics] = useState<NewsletterDraftTopic[]>([])
  const [topicId, setTopicId] = useState('term_start_labels')
  const [sourceNotes, setSourceNotes] = useState('')
  const [customBrief, setCustomBrief] = useState('')
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [llmAvailable, setLlmAvailable] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [busy, setBusy] = useState<null | 'template' | 'llm'>(null)
  const [message, setMessage] = useState('')

  const loadTopics = useCallback(async () => {
    setLoadingTopics(true)
    try {
      const res = await fetch('/api/admin/agent/newsletter/draft', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        topics?: NewsletterDraftTopic[]
        llmAvailable?: boolean
        error?: string
      } | null
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load topics')
      const list = json.topics || []
      setTopics(list)
      setLlmAvailable(Boolean(json.llmAvailable))
      if (list[0] && !list.some((t) => t.id === topicId)) {
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

  const runDraft = async (useLlm: boolean) => {
    setBusy(useLlm ? 'llm' : 'template')
    setMessage('')
    try {
      const res = await fetch('/api/admin/agent/newsletter/draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          sourceNotes: sourceNotes.trim() || undefined,
          customBrief: customBrief.trim() || undefined,
          useLlm,
          existingSubject: useLlm && draft?.subject ? draft.subject : undefined,
          existingMessage: useLlm && draft?.message ? draft.message : undefined,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        draft?: DraftState & { source?: 'template' | 'llm' }
        error?: string
      } | null
      if (!res.ok || !json?.ok || !json.draft) {
        throw new Error(json?.error || 'Failed to build draft')
      }
      setDraft({
        topicId: json.draft.topicId,
        type: json.draft.type,
        subject: json.draft.subject,
        message: json.draft.message,
        autonomyNote: json.draft.autonomyNote,
        source: json.draft.source,
      })
      setMessage(
        json.draft.source === 'llm'
          ? 'Polished with AI — review before Apply.'
          : 'Template draft ready — review before Apply.'
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setBusy(null)
    }
  }

  const applyToNewsletterAdmin = () => {
    if (!draft?.subject.trim() || !draft?.message.trim()) {
      setMessage('Generate a draft first.')
      return
    }
    saveNewsletterAgentDraftToSession({
      subject: draft.subject,
      message: draft.message,
      type: draft.type,
      topicId: draft.topicId,
    })
    router.push('/admin/newsletter?from=agent')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Newsletter assist"
        icon={<Newspaper className="w-7 h-7 text-violet-600" />}
      />
      <div className="max-w-3xl mx-auto p-6">
        <Link
          href="/admin/agent"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to AI Agent hub
        </Link>

        <p className="text-sm text-gray-600 mb-4">
          Suggest campaign subjects and bodies for{' '}
          <strong className="font-medium text-gray-800">newsletter subscribers</strong>. Apply opens
          Newsletter admin — you still choose recipients and Send. Never mixes with fundraising
          school outreach lists.
        </p>

        <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-medium">No auto-send</p>
          <p className="mt-1 text-violet-900/90">
            Edit prices, promo codes, and dates before Send. Do not invent discounts or stock.
          </p>
        </div>

        {loadingTopics ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading topics…
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-800">
              Topic
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.type})
                  </option>
                ))}
              </select>
            </label>
            {topics.find((t) => t.id === topicId)?.blurb ? (
              <p className="text-xs text-gray-500">{topics.find((t) => t.id === topicId)?.blurb}</p>
            ) : null}

            <label className="block text-sm font-medium text-gray-800">
              Verified notes (optional)
              <textarea
                value={sourceNotes}
                onChange={(e) => setSourceNotes(e.target.value)}
                rows={2}
                placeholder="Facts you already verified (product name, real promo code, dates)…"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-gray-800">
              Custom brief (optional)
              <textarea
                value={customBrief}
                onChange={(e) => setCustomBrief(e.target.value)}
                rows={2}
                placeholder="Tone or angle for this send…"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void runDraft(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {busy === 'template' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                Generate template
              </button>
              <button
                type="button"
                disabled={busy !== null || !llmAvailable}
                title={
                  llmAvailable
                    ? 'Opt-in AI polish (falls back to template if unavailable).'
                    : 'Set OPENAI_API_KEY (and do not set AGENT_NEWSLETTER_DRAFT_LLM=0).'
                }
                onClick={() => void runDraft(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
              >
                {busy === 'llm' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Polish with AI
              </button>
            </div>
          </div>
        )}

        {draft ? (
          <div className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Draft · {draft.type}
                {draft.source ? ` · ${draft.source}` : ''}
              </p>
              <button
                type="button"
                onClick={applyToNewsletterAdmin}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Apply to Newsletter admin
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-800">
              Subject
              <input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-800">
              Message
              <textarea
                value={draft.message}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                rows={14}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
              />
            </label>
            <p className="text-xs text-gray-500">{draft.autonomyNote}</p>
          </div>
        ) : null}

        {message ? <p className="mt-4 text-sm text-gray-700">{message}</p> : null}

        <p className="mt-8 text-[11px] text-gray-400" data-agent-ux="newsletter-assist-v1">
          Newsletter assist v1 — HITL drafts only. Send stays on /admin/newsletter.
        </p>
      </div>
    </div>
  )
}
