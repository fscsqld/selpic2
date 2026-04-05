import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * OAuth / email PKCE return handler. Exchanges `?code=` using cookies (incl. PKCE verifier written by the browser client).
 * `resetPasswordForEmail` must run in the browser so the verifier exists before the user opens the email link.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextRaw = requestUrl.searchParams.get('next') || '/auth/reset-password'

  let nextPath = '/auth/reset-password'
  try {
    const n = new URL(nextRaw, requestUrl.origin)
    if (n.origin === requestUrl.origin) {
      nextPath = `${n.pathname}${n.search}` || '/auth/reset-password'
    }
  } catch {
    /* use default */
  }

  if (code) {
    try {
      const supabase = await createSupabaseServerClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        const errUrl = new URL('/auth/reset-password', requestUrl.origin)
        errUrl.searchParams.set('auth_error', error.message)
        return NextResponse.redirect(errUrl)
      }
    } catch {
      const errUrl = new URL('/auth/reset-password', requestUrl.origin)
      errUrl.searchParams.set('auth_error', 'Could not complete sign-in. Try the link again or request a new email.')
      return NextResponse.redirect(errUrl)
    }
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
}
