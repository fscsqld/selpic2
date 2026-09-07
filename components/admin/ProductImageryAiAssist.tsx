'use client'

/**
 * HITL product imagery assist — photo brief + optional Vision review.
 * Does not upload or save images; MediaUpload + product Save remain the write path.
 */

import { useState } from 'react'
import { Loader2, Camera, Eye } from 'lucide-react'

type Props = {
  productName: string
  category?: string
  imageUrl?: string
  disabled?: boolean
}

type Draft = {
  mode?: string
  source?: string
  title?: string
  checklist?: string[]
  notes?: string
}

export default function ProductImageryAiAssist({
  productName,
  category,
  imageUrl,
  disabled,
}: Props) {
  const [busy, setBusy] = useState<null | 'brief' | 'vision'>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [message, setMessage] = useState('')

  const run = async (mode: 'photo_brief' | 'vision_review', useLlm: boolean) => {
    setBusy(mode === 'photo_brief' ? 'brief' : 'vision')
    setMessage('')
    try {
      const res = await fetch('/api/admin/products/imagery-llm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          name: productName,
          category: category || undefined,
          imageUrl: imageUrl || undefined,
          useLlm,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        draft?: Draft
        error?: string
      } | null
      if (!res.ok || !json?.draft?.checklist?.length) {
        throw new Error(json?.error || 'Imagery assist failed')
      }
      setDraft(json.draft)
      if (useLlm && json.draft.source !== 'llm') {
        setMessage('Template kept (AI unavailable or blocked). Review before shooting/uploading.')
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Imagery assist failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/50 p-2.5 space-y-2">
      <p className="text-[11px] text-gray-600">
        Imagery assist — checklist only. Upload via Media Library above, then Save the product.
        Nothing auto-replaces storefront images.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void run('photo_brief', false)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-medium text-sky-950 hover:bg-sky-50 disabled:opacity-60"
        >
          {busy === 'brief' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          Photo brief
        </button>
        <button
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void run('photo_brief', true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-100 px-2.5 py-1.5 text-xs font-medium text-sky-950 hover:bg-sky-200 disabled:opacity-60"
        >
          {busy === 'brief' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          Polish brief with AI
        </button>
        <button
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void run('vision_review', true)}
          title="Needs an https:// product image URL"
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-950 hover:bg-violet-100 disabled:opacity-60"
        >
          {busy === 'vision' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          Review with Vision
        </button>
      </div>
      {message ? <p className="text-[11px] text-amber-800">{message}</p> : null}
      {draft ? (
        <div className="rounded-md border border-sky-100 bg-white px-2.5 py-2">
          <p className="text-xs font-semibold text-gray-900">
            {draft.title || 'Imagery checklist'}
            {draft.source ? (
              <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-gray-500">
                {draft.source}
              </span>
            ) : null}
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-gray-700">
            {(draft.checklist || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {draft.notes ? <p className="mt-2 text-[11px] text-gray-500">{draft.notes}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
