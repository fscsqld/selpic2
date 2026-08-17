import { createHash, randomBytes, randomInt } from 'crypto'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import type { FundraisingPartner } from '@/lib/fundraising/types'
import { LOOKUP_SESSION_HOURS } from '@/lib/fundraising/lookupConstants'
import { buildPartnerFacingLookupUrl } from '@/lib/fundraising/partnerFacingSite'
import { listFundraisingPartnersFromDb, upsertFundraisingPartnerRow } from '@/lib/fundraising/persistence'

const OTP_TTL_MS = 10 * 60 * 1000
/** Min gap between verification emails for the same Lookup token (refresh / Strict Mode). */
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
/** Partner Lookup browser session (aligned with welcome-email guide). */
const SESSION_TTL_MS = LOOKUP_SESSION_HOURS * 60 * 60 * 1000
const MAX_OTP_ATTEMPTS = 5

export { LOOKUP_SESSION_HOURS } from '@/lib/fundraising/lookupConstants'

export function generateLookupToken(): string {
  return randomBytes(24).toString('hex') // 48 hex chars (~192 bits)
}

export function generateSixDigitOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashOtp(otp: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${otp}`).digest('hex')
}

export function buildPartnerLookupUrl(token: string): string {
  return buildPartnerFacingLookupUrl(token)
}

export function ensurePartnerLookupToken(partner: FundraisingPartner): FundraisingPartner {
  if (partner.lookupToken && partner.lookupToken.length >= 32) return partner
  const now = new Date().toISOString()
  return {
    ...partner,
    lookupToken: generateLookupToken(),
    lookupTokenCreatedAt: now,
    updatedAt: now,
  }
}

export function rotatePartnerLookupToken(partner: FundraisingPartner): FundraisingPartner {
  const now = new Date().toISOString()
  return {
    ...partner,
    lookupToken: generateLookupToken(),
    lookupTokenCreatedAt: now,
    updatedAt: now,
  }
}

export async function findPartnerByLookupToken(token: string): Promise<FundraisingPartner | null> {
  const t = token.trim()
  if (!t || t.length < 16) return null
  if (!isSupabaseConfigured()) return null
  const partners = await listFundraisingPartnersFromDb()
  return partners.find((p) => p.lookupToken === t && p.status === 'active') || null
}

export async function issueLookupOtpWithCode(token: string): Promise<
  | {
      ok: true
      email: string
      expiresAt: string
      partner: FundraisingPartner
      /** When false, reuse the existing code and skip sending another email. */
      shouldSendEmail: boolean
      otp?: string
    }
  | { ok: false; error: string }
> {
  const partner = await findPartnerByLookupToken(token)
  if (!partner?.contactEmail) return { ok: false, error: 'Invalid or inactive access link.' }
  if (!isSupabaseConfigured()) return { ok: false, error: 'Lookup service is unavailable.' }

  const admin = getSupabaseAdmin()
  const { data: existing } = await admin
    .from('fundraising_lookup_otps')
    .select('expires_at, updated_at, attempts')
    .eq('lookup_token', token)
    .maybeSingle()

  const existingExpires = existing?.expires_at ? new Date(existing.expires_at).getTime() : 0
  const existingUpdated = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0
  const withinCooldown =
    existing &&
    existingExpires > Date.now() &&
    Number(existing.attempts || 0) < MAX_OTP_ATTEMPTS &&
    Date.now() - existingUpdated < OTP_RESEND_COOLDOWN_MS

  if (withinCooldown) {
    return {
      ok: true,
      email: partner.contactEmail,
      expiresAt: String(existing.expires_at),
      partner,
      shouldSendEmail: false,
    }
  }

  const otp = generateSixDigitOtp()
  const salt = randomBytes(8).toString('hex')
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()
  const { error } = await admin.from('fundraising_lookup_otps').upsert({
    lookup_token: token,
    otp_hash: hashOtp(otp, salt),
    otp_salt: salt,
    expires_at: expiresAt,
    attempts: 0,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    email: partner.contactEmail,
    expiresAt,
    otp,
    partner,
    shouldSendEmail: true,
  }
}

export async function verifyLookupOtp(
  token: string,
  otp: string
): Promise<{ ok: true; sessionId: string; partnerId: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Lookup service is unavailable.' }
  const partner = await findPartnerByLookupToken(token)
  if (!partner) return { ok: false, error: 'Invalid or inactive access link.' }

  const admin = getSupabaseAdmin()
  const { data: row, error } = await admin
    .from('fundraising_lookup_otps')
    .select('*')
    .eq('lookup_token', token)
    .maybeSingle()

  if (error || !row) return { ok: false, error: 'No verification code found. Please request a new code.' }
  if (Number(row.attempts || 0) >= MAX_OTP_ATTEMPTS) {
    return { ok: false, error: 'Too many attempts. Please request a new code.' }
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Code expired. Please request a new code.' }
  }

  const expected = hashOtp(String(otp || '').trim(), String(row.otp_salt || ''))
  if (expected !== row.otp_hash) {
    await admin
      .from('fundraising_lookup_otps')
      .update({ attempts: Number(row.attempts || 0) + 1, updated_at: new Date().toISOString() })
      .eq('lookup_token', token)
    return { ok: false, error: 'Incorrect code. Please try again.' }
  }

  const sessionId = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const { error: sessErr } = await admin.from('fundraising_lookup_sessions').upsert({
    id: sessionId,
    partner_id: partner.id,
    lookup_token: token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })
  if (sessErr) return { ok: false, error: sessErr.message }

  await admin.from('fundraising_lookup_otps').delete().eq('lookup_token', token)

  return { ok: true, sessionId, partnerId: partner.id }
}

export async function resolveLookupSession(
  sessionId: string
): Promise<{ partner: FundraisingPartner; sessionExpiresAt: string } | null> {
  if (!sessionId || !isSupabaseConfigured()) return null
  const admin = getSupabaseAdmin()
  const { data: sess } = await admin
    .from('fundraising_lookup_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  if (!sess) return null
  if (new Date(sess.expires_at).getTime() < Date.now()) return null

  const partners = await listFundraisingPartnersFromDb()
  const partner = partners.find((p) => p.id === sess.partner_id && p.status === 'active')
  if (!partner) return null
  if (partner.lookupToken && sess.lookup_token && partner.lookupToken !== sess.lookup_token) {
    // Token was rotated — invalidate old sessions
    return null
  }
  return { partner, sessionExpiresAt: sess.expires_at }
}

export async function persistPartnerWithToken(partner: FundraisingPartner): Promise<FundraisingPartner> {
  const withToken = ensurePartnerLookupToken(partner)
  await upsertFundraisingPartnerRow(withToken)
  return withToken
}

export const LOOKUP_SESSION_COOKIE = 'fr_lookup_sess'
