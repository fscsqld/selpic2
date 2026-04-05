import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Auth password recovery email.
 *
 * **PKCE:** `resetPasswordForEmail` must run in the **browser** so a `code_verifier` is stored in cookies.
 * Calling this route from the server sends an email whose `?code=` cannot be exchanged — the link will always
 * look invalid. The storefront uses `createSupabaseBrowserClient().auth.resetPasswordForEmail` from
 * `/auth/forgot-password` instead.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string } | null
    const email = body?.email?.trim()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (!url || !anon) {
      return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 })
    }

    const originHeader = req.headers.get('origin')
    const referer = req.headers.get('referer')
    let fromReferer: string | null = null
    if (referer) {
      try {
        const u = new URL(referer)
        fromReferer = `${u.protocol}//${u.host}`
      } catch {
        /* ignore */
      }
    }
    const site =
      originHeader ||
      fromReferer ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'http://localhost:3000'
    const base = site.replace(/\/$/, '')

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${base}/auth/reset-password`,
    })

    if (error) {
      console.error('[supabase-forgot-password]', error.message)
    }

    // Always same response (no email enumeration)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[supabase-forgot-password]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
