import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import {
  adminPermissionDeniedPlain,
  requireAdminPermission,
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

/**
 * POST — HITL product image generate/edit via OpenAI Images API.
 * Uploads result to Supabase Media; does not Save the product catalog.
 * Client must Apply URL into the form, then Save.
 */
export async function POST(req: Request) {
  const gate = await requireAdminPermission('products:write')
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

  const adminKey =
    (typeof gate.user.email === 'string' && gate.user.email) ||
    gate.user.id ||
    'unknown'
  if (!allowRateLimit(`product-image-gen:${adminKey}`, GEN_DAILY_MAX, DAY_MS)) {
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

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    model: result.model,
    publicUrl,
    promptUsed: prompt.slice(0, 500),
    sourceImageUrl: /^https:\/\//i.test(imageUrl) ? imageUrl : null,
    autonomyNote:
      'AI image stored in Media only. Apply on the product form, then Save to publish. No auto catalog write.',
  })
}
