import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { isValidAuPhone } from '@/lib/phone'

type Body = {
  email?: string
  password?: string
  name?: string
  phone?: string
  address?: string
  marketingConsent?: boolean
}

/**
 * Creates a confirmed Auth user (email_confirm: true) so they can sign in immediately—same UX as typical e-commerce.
 * Client should call signInWithPassword right after; no service role in the browser.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Registration is not available (Supabase not configured).' }, { status: 503 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const marketingConsent = Boolean(body.marketingConsent)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  }
  if (!isValidAuPhone(phone)) {
    return NextResponse.json(
      { error: 'Please enter a valid Australian phone number (e.g. +61 412 345 678).' },
      { status: 400 }
    )
  }

  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        phone: phone,
        address: address || undefined,
        marketing_consent: marketingConsent,
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return NextResponse.json(
          { error: 'This email address is already in use. Try signing in or use a different email.' },
          { status: 409 }
        )
      }
      console.error('[api/auth/register]', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user?.id) {
      return NextResponse.json({ error: 'Registration failed.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, userId: data.user.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Registration failed.'
    console.error('[api/auth/register]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
