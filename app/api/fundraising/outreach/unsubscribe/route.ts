import { NextResponse } from 'next/server'

import { markFundraisingOutreachTargetOptedOut } from '@/lib/fundraising/persistence'
import { isSupabaseConfigured } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function processUnsubscribe(token: string) {
  const t = String(token || '').trim()
  if (!t) {
    return { status: 400 as const, body: { ok: false, error: 'Missing unsubscribe token.' } }
  }
  if (!isSupabaseConfigured()) {
    return { status: 503 as const, body: { ok: false, error: 'Service unavailable.' } }
  }

  const result = await markFundraisingOutreachTargetOptedOut({
    unsubscribeToken: t,
    source: 'link',
  })

  if (!result.ok) {
    return {
      status: (result.notFound ? 404 : 500) as const,
      body: { ok: false, error: result.error },
    }
  }

  return {
    status: 200 as const,
    body: {
      ok: true,
      already: Boolean(result.already),
      organizationName: result.target.organizationName,
      status: result.target.status,
    },
  }
}

/** Browser + API unsubscribe (token from email link). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || ''
  const result = await processUnsubscribe(token)
  return NextResponse.json(result.body, { status: result.status })
}

/**
 * RFC 8058 one-click unsubscribe (List-Unsubscribe-Post).
 * Also accepts JSON `{ token }` for clients.
 */
export async function POST(req: Request) {
  const url = new URL(req.url)
  let token = url.searchParams.get('token') || ''

  const contentType = req.headers.get('content-type') || ''
  if (!token && contentType.includes('application/json')) {
    const body = (await req.json().catch(() => null)) as { token?: string } | null
    token = String(body?.token || '')
  } else if (!token && contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData().catch(() => null)
    token = String(form?.get('token') || '')
    // Some MUAs POST List-Unsubscribe=One-Click without token in body — token must be in URL.
  }

  const result = await processUnsubscribe(token)
  return NextResponse.json(result.body, { status: result.status })
}
