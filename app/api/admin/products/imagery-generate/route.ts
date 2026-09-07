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
import { agentAdminLabelFromUser } from '@/lib/agent/agentAdminLabel'
import { buildImageRunRecord } from '@/lib/agent/agentRuns'
import { appendAgentRun } from '@/lib/server/agentRunsStore'
import { readMediaSnapshot, writeMediaSnapshot } from '@/lib/server/mediaStore'
import type { MediaSyncRecord } from '@/lib/mediaSync'

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
      size: opts.size,
      uploadedAt: new Date().toISOString(),
      category: 'product-media',
      productName: opts.productName || undefined,
      tags: ['ai-generated', 'product-media', 'hitl'],
      description: `OpenAI Images HITL output (${opts.path})`,
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
 * POST — HITL product image generate/edit via OpenAI Images API.
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
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  const buffer = Buffer.from(result.b64, 'base64')
  if (buffer.length < 32) {
    return NextResponse.json({ error: 'Generated image was empty' }, { status: 502 })
  }

  const path = buildSelpicStoragePath(
    'product-media',
    `ai-${randomUUID()}`,
    'product-ai.png'
  )
  const supabase = getSupabaseAdmin()
  const { error: upErr } = await supabase.storage
    .from(SELPIC_CONTENTS_BUCKET)
    .upload(path, buffer, { contentType: 'image/png', upsert: true })
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
      adminLabel,
      imageUnits: 1,
    })
  )
  void registerAiImageInMediaLibrary({
    publicUrl,
    path,
    size: buffer.length,
    productName: name || 'product',
  })

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    model: result.model,
    publicUrl,
    promptUsed: prompt.slice(0, 500),
    sourceImageUrl: /^https:\/\//i.test(imageUrl) ? imageUrl : null,
    autonomyNote:
      'AI image stored in Media Library. Apply on the product form, then Save to publish. No auto catalog write.',
  })
}
