'use client'

/**
 * HITL product description assist — Generate template / Polish with AI / Apply.
 * Does not save the catalog; parent form Save remains the write path.
 */

import { useState } from 'react'
import { Loader2, RefreshCw, Sparkles, Check } from 'lucide-react'
import type { ProductDescriptionField } from '@/lib/agent/productDescriptionDraft'

type Props = {
  field: ProductDescriptionField
  productName: string
  category?: string
  currentText: string
  onApply: (text: string) => void
  disabled?: boolean
}

export default function ProductDescriptionAiAssist({
  field,
  productName,
  category,
  currentText,
  onApply,
  disabled,
}: Props) {
  const [busy, setBusy] = useState<null | 'template' | 'llm'>(null)
  const [draft, setDraft] = useState('')
  const [source, setSource] = useState<'template' | 'llm' | ''>('')
  const [message, setMessage] = useState('')

  const run = async (useLlm: boolean) => {
    const mode: 'template' | 'llm' = useLlm ? 'llm' : 'template'
    setBusy(mode)
    setMessage('')
    try {
      const res = await fetch('/api/admin/products/description-llm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          name: productName,
          category: category || undefined,
          existingText: currentText || undefined,
          useLlm,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        draft?: { text?: string; source?: string }
        error?: string
      } | null
      if (!res.ok || !json?.draft?.text) {
        throw new Error(json?.error || 'Draft failed')
      }
      setDraft(json.draft.text)
      setSource(json.draft.source === 'llm' ? 'llm' : 'template')
      if (useLlm && json.draft.source !== 'llm') {
        setMessage('Template kept (AI unavailable or blocked). Review before Apply.')
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5 space-y-2">
      <p className="text-[11px] text-gray-600">
        AI assist — Apply fills this field only; Save the product to publish.
      </p>
      <p className="text-[11px] text-gray-500">
        Note: Prices, stock levels, and shipping dates are automatically synced from live
        product settings. AI Polish will preserve these specs. Generate template output is
        customer-ready copy only.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy !== null}
          title="Free structured template (no OpenAI)."
          onClick={() => void run(false)}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === 'template' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Generate template
        </button>
        <button
          type="button"
          disabled={disabled || busy !== null}
          title="Calls OpenAI once. Uses OPENAI_API_KEY. Max 15/day per admin."
          onClick={() => void run(true)}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
        >
          {busy === 'llm' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Polish with AI
        </button>
        <button
          type="button"
          disabled={disabled || busy !== null || !draft.trim()}
          onClick={() => {
            onApply(draft)
            setMessage('Applied to field — Save the product when ready.')
          }}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Apply to field
        </button>
      </div>
      {source ? (
        <p className="text-[11px] text-gray-500">
          Draft source:{' '}
          <span className="font-medium text-gray-700">
            {source === 'llm' ? 'AI polish' : 'Template (no OpenAI charge)'}
          </span>
        </p>
      ) : null}
      {draft ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={field === 'detailDescription' ? 6 : 3}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-xs"
        />
      ) : null}
      {message ? <p className="text-[11px] text-amber-800">{message}</p> : null}
    </div>
  )
}
