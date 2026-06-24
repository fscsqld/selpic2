import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { appendTransactionalEmailBrandingHtml } from '@/lib/transactionalEmailBranding'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { notifyAdminsOfNewsletterSignup } from '@/lib/server/adminInboundNotify'

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 5

type RateEntry = {
  count: number
  windowStart: number
}

const rateLimitMap = new Map<string, RateEntry>()

// Legacy: only used when Supabase is not configured (local dev)
const legacySubscribedEmails = new Set<string>()

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const resendApiKey = process.env.RESEND_API_KEY
const resendFrom = process.env.RESEND_FROM || 'onboarding@resend.dev'

const resendClient = resendApiKey ? new Resend(resendApiKey) : null

const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return '127.0.0.1'
}

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  rateLimitMap.set(ip, { count: entry.count + 1, windowStart: entry.windowStart })
  return true
}

async function persistSubscriberToSupabase(normalizedEmail: string): Promise<'created' | 'reactivated' | 'duplicate'> {
  const admin = getSupabaseAdmin()
  const { data: existing, error: selErr } = await admin
    .from('newsletter_subscribers')
    .select('id,is_active')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (selErr) {
    throw new Error(selErr.message)
  }

  const now = new Date().toISOString()

  if (existing) {
    if (existing.is_active) {
      return 'duplicate'
    }
    const { error: upErr } = await admin
      .from('newsletter_subscribers')
      .update({
        is_active: true,
        subscribed_at: now,
        unsubscribed_at: null,
        source: 'website',
      })
      .eq('id', existing.id)
    if (upErr) throw new Error(upErr.message)
    return 'reactivated'
  }

  const { error: insErr } = await admin.from('newsletter_subscribers').insert({
    email: normalizedEmail,
    is_active: true,
    subscribed_at: now,
    source: 'website',
  })
  if (insErr) throw new Error(insErr.message)
  return 'created'
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ success: false, message: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { email, honeypot } = await req.json()

    if (honeypot && typeof honeypot === 'string' && honeypot.trim() !== '') {
      return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 })
    }

    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    let isNewSignup = false

    if (isSupabaseConfigured()) {
      try {
        const outcome = await persistSubscriberToSupabase(normalizedEmail)
        if (outcome === 'duplicate') {
          return NextResponse.json(
            { success: false, message: 'This email is already subscribed.' },
            { status: 409 }
          )
        }
        isNewSignup = outcome === 'created' || outcome === 'reactivated'
      } catch (e) {
        console.error('[newsletter] Supabase persist failed:', e)
        return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.' }, { status: 500 })
      }
    } else {
      if (legacySubscribedEmails.has(normalizedEmail)) {
        return NextResponse.json(
          { success: false, message: 'This email is already subscribed.' },
          { status: 409 }
        )
      }
      legacySubscribedEmails.add(normalizedEmail)
      isNewSignup = true
    }

    if (isNewSignup) {
      void notifyAdminsOfNewsletterSignup(normalizedEmail)
    }

    // Send welcome/confirmation email via Resend (skips if not configured)
    if (resendClient) {
      try {
        const welcomeHtml = appendTransactionalEmailBrandingHtml(
          `<p>Thanks for subscribing! We'll keep you posted with the latest updates.</p>`
        )
        await resendClient.emails.send({
          from: resendFrom,
          to: normalizedEmail,
          subject: 'Thanks for subscribing to Selpic updates',
          html: welcomeHtml,
        })
      } catch (emailError) {
        console.error('Resend send error:', emailError)
        // Do not fail the subscription if email send fails
      }
    } else {
      console.log('Resend not configured. Skipping email send for:', normalizedEmail)
    }

    return NextResponse.json({ success: true, message: 'Thank you for subscribing!' })
  } catch (error) {
    console.error('Newsletter API error:', error)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
