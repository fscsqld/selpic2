import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminPermission,
} from '@/lib/supabase/requireAdminPermission'
import { allowRateLimit } from '@/lib/server/simpleRateLimit'
import {
  runProductImageryAssist,
  type ProductImageryAssistMode,
} from '@/lib/agent/productImageryVisionLlm'

export const dynamic = 'force-dynamic'

const LLM_DAILY_MAX = 12
const DAY_MS = 86_400_000

type Body = {
  mode?: string
  name?: string
  category?: string
  imageUrl?: string
  useLlm?: boolean
}

/**
 * POST — HITL product imagery assist (Vision review or photo brief).
 * Never writes the catalog or Media Library — human uploads + Save only.
 */
export async function POST(req: Request) {
  const gate = await requireAdminPermission('products:write')
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied
  if (!gate.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const modeRaw = String(body.mode || '').trim()
  if (modeRaw !== 'vision_review' && modeRaw !== 'photo_brief') {
    return NextResponse.json(
      { error: 'mode must be vision_review or photo_brief' },
      { status: 400 }
    )
  }
  const mode = modeRaw as ProductImageryAssistMode
  const useLlm = body.useLlm === true

  if (useLlm) {
    const adminKey =
      (typeof gate.user.email === 'string' && gate.user.email) ||
      gate.user.id ||
      'unknown'
    const ok = allowRateLimit(`product-imagery-llm:${adminKey}`, LLM_DAILY_MAX, DAY_MS)
    if (!ok) {
      return NextResponse.json(
        {
          error:
            'Daily imagery AI limit reached for this admin (12/day). Use the template photo brief, or try again tomorrow.',
        },
        { status: 429 }
      )
    }
  }

  const draft = await runProductImageryAssist({
    mode,
    name: String(body.name || ''),
    category: body.category ? String(body.category) : undefined,
    imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
    useLlm,
  })

  return NextResponse.json({
    ok: true,
    draft,
    autonomyNote:
      'Brief checklist for the image prompt only. Use Generate / Edit with AI to create a new image, then Apply → Save.',
  })
}
