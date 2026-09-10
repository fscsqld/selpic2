'use client'

/**
 * HITL product imagery: free Photo brief → prompt → Generate/Edit (OpenAI or Google)
 * → preview → Apply (form only). Save on the product form publishes.
 * W2.5: admin picks image provider per request; Google disabled until Gemini key exists.
 */

import { useEffect, useState } from 'react'
import { Loader2, Camera, Wand2, Check, ImageOff, Download } from 'lucide-react'
import { logAdminActivity } from '@/lib/logAdminActivity'

type Props = {
  productName: string
  category?: string
  imageUrl?: string
  productId?: string
  disabled?: boolean
  onApplyImage: (url: string) => void
}

type BriefDraft = {
  title?: string
  checklist?: string[]
  notes?: string
  source?: string
}

type ImageProviderId = 'openai' | 'google'

type ProviderAvailability = {
  masterKill?: boolean
  defaultProvider?: ImageProviderId
  openai?: { configured?: boolean }
  google?: { configured?: boolean }
  hint?: string | null
}

const LS_PROVIDER_KEY = 'selpic-product-image-provider'

function isHttpsImageUrl(url: string | undefined): boolean {
  return /^https:\/\//i.test((url || '').trim())
}

function readStoredProvider(): ImageProviderId | null {
  try {
    const v = localStorage.getItem(LS_PROVIDER_KEY)
    if (v === 'openai' || v === 'google') return v
  } catch {
    /* ignore */
  }
  return null
}

function storeProvider(id: ImageProviderId) {
  try {
    localStorage.setItem(LS_PROVIDER_KEY, id)
  } catch {
    /* ignore */
  }
}

export default function ProductImageryAiAssist({
  productName,
  category,
  imageUrl,
  productId,
  disabled,
  onApplyImage,
}: Props) {
  const [busy, setBusy] = useState<null | 'brief' | 'generate'>(null)
  const [message, setMessage] = useState('')
  const [brief, setBrief] = useState<BriefDraft | null>(null)
  const [prompt, setPrompt] = useState('')
  const [includeBrief, setIncludeBrief] = useState(true)
  const [aiUrl, setAiUrl] = useState('')
  const [genMeta, setGenMeta] = useState<{
    mode?: string
    model?: string
    provider?: string
  } | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [availability, setAvailability] = useState<ProviderAvailability | null>(null)
  const [provider, setProvider] = useState<ImageProviderId>('openai')

  const httpsReady = isHttpsImageUrl(imageUrl)
  const trimmedImage = (imageUrl || '').trim()

  const openaiOk = Boolean(availability?.openai?.configured)
  const googleOk = Boolean(availability?.google?.configured)
  const masterKill = Boolean(availability?.masterKill)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/admin/products/imagery-generate', {
          method: 'GET',
          credentials: 'include',
        })
        const json = (await res.json().catch(() => null)) as ProviderAvailability | null
        if (cancelled || !res.ok || !json) return
        setAvailability(json)

        const stored = readStoredProvider()
        const fallback =
          (json.defaultProvider === 'google' || json.defaultProvider === 'openai'
            ? json.defaultProvider
            : 'openai') as ImageProviderId
        let next: ImageProviderId = stored || fallback
        if (next === 'google' && !json.google?.configured) next = 'openai'
        if (next === 'openai' && !json.openai?.configured && json.google?.configured) {
          next = 'google'
        }
        setProvider(next)
      } catch {
        /* keep openai default */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selectProvider = (id: ImageProviderId) => {
    if (id === 'google' && !googleOk) return
    if (id === 'openai' && !openaiOk) return
    setProvider(id)
    storeProvider(id)
  }

  const runBrief = async () => {
    setBusy('brief')
    setMessage('')
    try {
      const res = await fetch('/api/admin/products/imagery-llm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'photo_brief',
          name: productName,
          category: category || undefined,
          imageUrl: trimmedImage || undefined,
          useLlm: false,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        draft?: BriefDraft
        error?: string
      } | null
      if (!res.ok || !json?.draft?.checklist?.length) {
        throw new Error(json?.error || 'Photo brief failed')
      }
      setBrief(json.draft)
      setPrompt(json.draft.checklist.join('\n'))
      setMessage(
        'Free template brief loaded into the prompt. Edit if needed, then Generate / Edit with AI.'
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Photo brief failed')
    } finally {
      setBusy(null)
    }
  }

  const runGenerate = async () => {
    setBusy('generate')
    setMessage('')
    setAiUrl('')
    setGenMeta(null)
    try {
      const res = await fetch('/api/admin/products/imagery-generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          category: category || undefined,
          imageUrl: httpsReady ? trimmedImage : undefined,
          prompt: prompt.trim() || undefined,
          includeBrief,
          briefChecklist: brief?.checklist,
          provider,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        publicUrl?: string
        mode?: string
        model?: string
        provider?: string
        error?: string
      } | null
      if (!res.ok || !json?.publicUrl) {
        throw new Error(json?.error || 'Image generate/edit failed')
      }
      setAiUrl(json.publicUrl)
      setGenMeta({ mode: json.mode, model: json.model, provider: json.provider })
      setMessage(
        json.mode === 'edit'
          ? 'AI edited your primary image. Compare below, then Apply → Save.'
          : 'AI generated a new image (no https source). Compare below, then Apply → Save.'
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Image generate/edit failed')
    } finally {
      setBusy(null)
    }
  }

  const downloadAiImage = async () => {
    if (!aiUrl) return
    setDownloading(true)
    try {
      const res = await fetch(aiUrl)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${(productName || 'product').replace(/[^\w.-]+/g, '_').slice(0, 40)}-ai.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(aiUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  const applyImage = () => {
    if (!aiUrl) return
    const prev = trimmedImage
    onApplyImage(aiUrl)
    void logAdminActivity({
      action: 'agent_product_image_applied',
      target: productId || productName || 'product',
      field: 'image',
      oldValue: prev || null,
      newValue: aiUrl,
      description: `Applied AI product image (${genMeta?.provider || 'ai'}/${genMeta?.mode || 'ai'}) — Save still required to publish`,
    })
    setMessage('Applied to the product form. Click Save to publish on the storefront.')
  }

  const generateDisabled =
    disabled ||
    busy !== null ||
    masterKill ||
    (provider === 'openai' && availability !== null && !openaiOk) ||
    (provider === 'google' && !googleOk)

  return (
    <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/50 p-2.5 space-y-2">
      <p className="text-[11px] font-medium text-gray-800">AI product image (HITL)</p>
      <p className="text-[11px] text-gray-600">
        1) <span className="font-medium">Photo brief</span> (free) fills the prompt · 2){' '}
        <span className="font-medium">Generate / Edit with AI</span> creates a new image (billable) ·
        3) Apply · 4) Save. Nothing auto-replaces the catalog.
      </p>

      <div className="rounded-md border border-sky-100 bg-white/80 px-2.5 py-2 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Image provider
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || busy !== null || (availability !== null && !openaiOk)}
            onClick={() => selectProvider('openai')}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${
              provider === 'openai'
                ? 'border-violet-500 bg-violet-50 text-violet-950'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            OpenAI
            {availability !== null && !openaiOk ? ' (unavailable)' : ''}
          </button>
          <button
            type="button"
            disabled={disabled || busy !== null || !googleOk}
            onClick={() => selectProvider('google')}
            title={
              googleOk
                ? 'Google Gemini Flash Image'
                : 'Add GOOGLE_GEMINI_API_KEY (or GEMINI_API_KEY) to enable'
            }
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${
              provider === 'google'
                ? 'border-violet-500 bg-violet-50 text-violet-950'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Google
            {!googleOk ? ' (add API key)' : ''}
          </button>
        </div>
        {!googleOk ? (
          <p className="text-[10px] text-gray-500">
            {availability?.hint ||
              'Google needs GOOGLE_GEMINI_API_KEY. You can keep using OpenAI until the key is set.'}
          </p>
        ) : null}
        {masterKill ? (
          <p className="text-[10px] text-amber-800">
            Product image AI is disabled (AGENT_PRODUCT_IMAGE_GEN=0).
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-3 rounded-md border border-sky-100 bg-white/80 p-2">
        {httpsReady ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmedImage}
            alt={productName ? `${productName} current` : 'Current primary'}
            className="h-20 w-20 rounded-md border border-gray-200 object-cover bg-gray-50"
          />
        ) : (
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-400">
            <ImageOff className="h-5 w-5" />
            <span className="mt-1 px-1 text-center text-[9px]">No https — will generate new</span>
          </div>
        )}
        <div className="min-w-0 flex-1 text-[11px] text-gray-600">
          <p className="font-medium text-gray-800">Current primary</p>
          <p className="mt-0.5 text-gray-500">
            {httpsReady
              ? 'Generate / Edit will transform this image (edit mode).'
              : 'Upload https first to edit, or generate a new shot from the prompt alone.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void runBrief()}
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
          disabled={generateDisabled}
          onClick={() => void runGenerate()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400 bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {busy === 'generate' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          Generate / Edit with AI
        </button>
      </div>

      <label className="inline-flex items-center gap-2 text-[11px] text-gray-700">
        <input
          type="checkbox"
          checked={includeBrief}
          onChange={(e) => setIncludeBrief(e.target.checked)}
          className="rounded border-gray-300"
        />
        Include standard photo brief in the AI image prompt
      </label>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
          Image prompt (from Photo brief — editable)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="Click Photo brief to fill (free), or type directions, then Generate / Edit with AI."
          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-800"
          disabled={disabled || busy !== null}
        />
      </div>

      {message ? <p className="text-[11px] text-amber-900">{message}</p> : null}

      {brief?.checklist?.length ? (
        <details className="rounded-md border border-sky-100 bg-white px-2.5 py-2 text-xs text-gray-700">
          <summary className="cursor-pointer font-medium text-gray-800">
            Last brief (free template)
          </summary>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {brief.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {aiUrl ? (
        <div className="rounded-md border border-violet-200 bg-white p-2.5 space-y-2">
          <p className="text-xs font-semibold text-gray-900">
            AI result
            {genMeta?.mode ? (
              <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-violet-700">
                {genMeta.mode}
                {genMeta.provider ? ` · ${genMeta.provider}` : ''}
                {genMeta.model ? ` · ${genMeta.model}` : ''}
              </span>
            ) : null}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase text-gray-500">Before</p>
              {httpsReady ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={trimmedImage}
                  alt="Before"
                  className="h-36 w-full rounded-md border border-gray-200 object-contain bg-gray-50"
                />
              ) : (
                <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-gray-300 text-[11px] text-gray-400">
                  No prior https image
                </div>
              )}
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase text-violet-700">After (AI)</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={aiUrl}
                alt="AI result"
                className="h-36 w-full rounded-md border border-violet-200 object-contain bg-violet-50/40"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={downloading}
              onClick={() => void downloadAiImage()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download AI image
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={applyImage}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              Apply to product image
            </button>
          </div>
          <p className="text-[10px] text-gray-500 break-all">
            File is already in cloud Media when Generate finishes. Use Download for a local archive.
            URL: {aiUrl}
          </p>
          <p className="text-[10px] text-gray-500">
            Apply updates this form only. Click Save on the product to publish.
          </p>
        </div>
      ) : null}
    </div>
  )
}
