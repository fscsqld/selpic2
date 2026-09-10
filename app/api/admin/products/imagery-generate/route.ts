import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import { allowRateLimit } from '@/lib/server/simpleRateLimit'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { SELPIC_CONTENTS_BUCKET } from '@/lib/selpicStorageBucket'
import { buildSelpicStoragePath } from '@/lib/selpicStorageUpload'
import {
  buildImageEditPrompt,
  defaultBriefLinesForPrompt,
  generateOrEditProductImage,
  sanitizeImagePrompt,
} from '@/lib/agent/productImageryGenerate'
import { getProductImageProviderAvailability } from '@/lib/agent/productImage/resolveProductImageProvider'
import { agentAdminLabelFromUser } from '@/lib/agent/agentAdminLabel'
import { buildImageRunRecord } from '@/lib/agent/agentRuns'
import { appendAgentRun } from '@/lib/server/agentRunsStore'
import { readMediaSnapshot, writeMediaSnapshot } from '@/lib/server/mediaStore'
import type { MediaSyncRecord } from '@/lib/mediaSync'
import { encodeStorefrontWebp } from '@/lib/agent/productImage/encodeStorefrontWebp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GEN_DAILY_MAX = 8
const DAY_MS = 86_400_000

type Body = {
  name?: string
  category?: string
  imageUrl?: string
  /** Free-text direction and/or polished brief body. */
  prompt?: string
  /** When true (default), merge Photo brief template lines into the prompt. */
  includeBrief?: boolean
  briefChecklist?: string[]
  /** W2.5: openai | google — omit to use AGENT_IMAGE_PROVIDER / openai. */
  provider?: string
}

async function registerAiImageInMediaLibrary(opts: {
  publicUrl: string
  path: string
  size: number
  productName: string
}): Promise<void> {
  try {
    const snap = await readMediaSnapshot()
    const id = `ai-${randomUUID()}`
    const record: MediaSyncRecord = {
      id,
      name: `AI product — ${opts.productName.slice(0, 60) || 'untitled'}`,
      type: 'image',
      url: opts.publicUrl,
      ...(opts.publicUrl.toLowerCase().includes('.webp')
        ? { webpUrl: opts.publicUrl }
        : {}),
      size: opts.size,
      uploadedAt: new Date().toISOString(),
      category: 'product-media',
      productName: opts.productName || undefined,
      tags: ['ai-generated', 'product-media', 'hitl'],
      description: `AI product image HITL output (${opts.path})`,
      usage: 'product',
      mediaType: 'image',
    }
    const withoutDup = snap.mediaFiles.filter((f) => f.url !== opts.publicUrl)
    await writeMediaSnapshot({
      updatedAt: new Date().toISOString(),
      mediaFiles: [record, ...withoutDup].slice(0, 2000),
    })
  } catch (e) {
    console.warn('[imagery-generate] Media Library register failed:', e)
  }
}

/**
 * GET — provider availability for Admin UI picker (no secrets).
 */
export async function GET() {
  const gate = await requireAdminAnyPermission(['products:write', 'agent:run', 'products:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied
  if (!gate.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const availability = getProductImageProviderAvailability()
  return NextResponse.json({
    ok: true,
    ...availability,
    hint: availability.google.configured
      ? null
      : 'Add GOOGLE_GEMINI_API_KEY (or GEMINI_API_KEY) to enable Google. OpenAI stays available if configured.',
  })
}

/**
 * POST — HITL product image generate/edit.
 * Body.provider overrides env AGENT_IMAGE_PROVIDER (W2.5 A/B). Default OpenAI.
 * Uploads result to Supabase Media; does not Save the product catalog.
 * Client must Apply URL into the form, then Save.
 */
export async function POST(req: Request) {
  const gate = await requireAdminAnyPermission(['products:write', 'agent:run'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied
  if (!gate.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          'Supabase service role required to store AI images. Set SUPABASE_SERVICE_ROLE_KEY.',
      },
      { status: 503 }
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const adminLabel = agentAdminLabelFromUser(gate.user)
  if (!allowRateLimit(`product-image-gen:${adminLabel}`, GEN_DAILY_MAX, DAY_MS)) {
    return NextResponse.json(
      {
        error:
          'Daily product image AI limit reached for this admin (8/day). Try again tomorrow.',
      },
      { status: 429 }
    )
  }

  const name = String(body.name || '').trim()
  const category = body.category ? String(body.category).trim() : undefined
  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : ''
  const includeBrief = body.includeBrief !== false
  const checklist =
    Array.isArray(body.briefChecklist) && body.briefChecklist.length
      ? body.briefChecklist.map((s) => String(s)).filter(Boolean)
      : includeBrief
        ? defaultBriefLinesForPrompt(name || 'product', category)
        : []

  const extra = sanitizeImagePrompt(String(body.prompt || ''))
  const prompt = buildImageEditPrompt({
    name: name || 'product',
    category,
    extraPrompt: extra,
    briefChecklist: checklist,
  })

  const result = await generateOrEditProductImage({
    prompt,
    sourceImageUrl: imageUrl || undefined,
    provider: body.provider,
  })
  if (!result.ok) {
    const status = /needs |disabled|AGENT_PRODUCT_IMAGE_GEN/i.test(result.error || '')
      ? 503
      : 502
    return NextResponse.json(
      { error: result.error, provider: result.provider },
      { status }
    )
  }

  const raw = Buffer.from(result.b64, 'base64')
  if (raw.length < 32) {
    return NextResponse.json({ error: 'Generated image was empty' }, { status: 502 })
  }

  // OpenAI + Google share post-b64 encode — web-ready WebP (no Squoosh pass).
  const encoded = await encodeStorefrontWebp(raw, { usage: 'product' })
  if (encoded.fellBackToOriginal) {
    console.warn(
      '[imagery-generate] WebP encode fell back to original',
      encoded.contentType,
      encoded.bytes
    )
  }

  const path = buildSelpicStoragePath(
    'product-media',
    `ai-${randomUUID()}`,
    `product-ai.${encoded.ext}`
  )
  const supabase = getSupabaseAdmin()
  const { error: upErr } = await supabase.storage
    .from(SELPIC_CONTENTS_BUCKET)
    .upload(path, encoded.buffer, { contentType: encoded.contentType, upsert: true })
  if (upErr) {
    return NextResponse.json(
      { error: upErr.message || 'Failed to store generated image' },
      { status: 500 }
    )
  }
  const { data } = supabase.storage.from(SELPIC_CONTENTS_BUCKET).getPublicUrl(path)
  const publicUrl = data.publicUrl
  if (!publicUrl) {
    return NextResponse.json({ error: 'Missing public URL after upload' }, { status: 500 })
  }

  void appendAgentRun(
    buildImageRunRecord({
      id: randomUUID(),
      sector: 'products',
      action: result.mode === 'edit' ? 'product_image_edit' : 'product_image_generate',
      model: result.model,
      provider: result.provider,
      adminLabel,
      imageUnits: 1,
    })
  )
  void registerAiImageInMediaLibrary({
    publicUrl,
    path,
    size: encoded.bytes,
    productName: name || 'product',
  })

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    model: result.model,
    provider: result.provider,
    publicUrl,
    bytes: encoded.bytes,
    contentType: encoded.contentType,
    compressed: encoded.compressed,
    promptUsed: prompt.slice(0, 500),
    sourceImageUrl: /^https:\/\//i.test(imageUrl) ? imageUrl : null,
    autonomyNote:
      'AI image stored in Media Library as web-ready WebP when possible. Apply on the product form, then Save to publish. No auto catalog write.',
  })
}
