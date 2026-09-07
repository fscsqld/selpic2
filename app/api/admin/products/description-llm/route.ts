import { NextResponse } from 'next/server'

import {
  polishProductDescriptionWithLlm,
} from '@/lib/agent/productDescriptionDraftLlm'
import type { ProductDescriptionField } from '@/lib/agent/productDescriptionDraft'
import { agentAdminLabelFromUser } from '@/lib/agent/agentAdminLabel'
import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'

import { allowRateLimit } from '@/lib/server/simpleRateLimit'

export const dynamic = 'force-dynamic'

const LLM_DAILY_MAX = 15
const DAY_MS = 86_400_000

type Body = {
  field?: string
  name?: string
  category?: string
  existingText?: string
  useLlm?: boolean
}

/**
 * POST — HITL product description draft.
 * Template by default; useLlm:true polishes with OpenAI when configured.
 * Never writes the catalog — Apply/Save stays in the product form.
 */
export async function POST(req: Request) {
  const gate = await requireAdminAnyPermission(['products:write', 'agent:run'])
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

  const fieldRaw = String(body.field || '').trim()
  if (fieldRaw !== 'description' && fieldRaw !== 'detailDescription') {
    return NextResponse.json(
      { error: 'field must be description or detailDescription' },
      { status: 400 }
    )
  }
  const field = fieldRaw as ProductDescriptionField
  const useLlm = body.useLlm === true

  if (useLlm) {
    const adminKey = agentAdminLabelFromUser(gate.user)
    const ok = allowRateLimit(
      `product-desc-llm:${adminKey}`,
      LLM_DAILY_MAX,
      DAY_MS
    )
    if (!ok) {
      return NextResponse.json(
        {
          error:
            'Daily AI polish limit reached for this admin (15/day). Try again tomorrow or use Generate template.',
        },
        { status: 429 }
      )
    }
  }

  const draft = await polishProductDescriptionWithLlm({
    input: {
      field,
      name: String(body.name || ''),
      category: body.category ? String(body.category) : undefined,
      existingText: body.existingText ? String(body.existingText) : undefined,
    },
    useLlm,
    usage: useLlm
      ? {
          sector: 'products',
          action: 'polish_product_description',
          adminLabel: agentAdminLabelFromUser(gate.user),
        }
      : undefined,
  })

  return NextResponse.json({ ok: true, draft })
}
