import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 5

type RateEntry = {
  count: number
  windowStart: number
}

// In-memory stores (resets on server restart). Replace with persistent storage in production.
const rateLimitMap = new Map<string, RateEntry>()
const subscribedEmails = new Set<string>()

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

    const normalizedEmail = email.toLowerCase()
    if (subscribedEmails.has(normalizedEmail)) {
      return NextResponse.json({ success: false, message: 'This email is already subscribed.' }, { status: 409 })
    }

    subscribedEmails.add(normalizedEmail)

    // Send welcome/confirmation email via Resend (skips if not configured)
    if (resendClient) {
      try {
        await resendClient.emails.send({
          from: resendFrom,
          to: normalizedEmail,
          subject: 'Thanks for subscribing to SELPIC updates',
          html: `<p>Thanks for subscribing! We'll keep you posted with the latest updates.</p>`
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

