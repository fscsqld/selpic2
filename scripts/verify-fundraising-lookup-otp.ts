/**
 * Lookup OTP cooldown: auto refresh must not spam; Resend must still email.
 * Run: npx tsx scripts/verify-fundraising-lookup-otp.ts
 */
import {
  LOOKUP_OTP_AUTO_COOLDOWN_MS,
  LOOKUP_OTP_MANUAL_COOLDOWN_MS,
  MAX_LOOKUP_OTP_ATTEMPTS,
  parseLookupOtpIssueReason,
  shouldSkipLookupOtpEmail,
} from '../lib/fundraising/lookupOtpPolicy'

type Case = { name: string; ok: boolean; detail?: string }
const cases: Case[] = []

function check(name: string, ok: boolean, detail?: string) {
  cases.push({ name, ok, detail })
}

const now = 1_700_000_000_000
const expires = now + 10 * 60 * 1000

check('parse unknown reason as auto', parseLookupOtpIssueReason('refresh') === 'auto')
check('parse manual reason', parseLookupOtpIssueReason('manual') === 'manual')

check(
  'auto skips within 60s of issue',
  shouldSkipLookupOtpEmail({
    reason: 'auto',
    nowMs: now + LOOKUP_OTP_AUTO_COOLDOWN_MS - 1,
    existingExpiresAtMs: expires,
    lastIssuedAtMs: now,
    attempts: 0,
  }) === true
)

check(
  'auto sends after 60s',
  shouldSkipLookupOtpEmail({
    reason: 'auto',
    nowMs: now + LOOKUP_OTP_AUTO_COOLDOWN_MS,
    existingExpiresAtMs: expires,
    lastIssuedAtMs: now,
    attempts: 0,
  }) === false
)

check(
  'manual sends 15s after auto issue (Resend must email)',
  shouldSkipLookupOtpEmail({
    reason: 'manual',
    nowMs: now + 15_000,
    existingExpiresAtMs: expires,
    lastIssuedAtMs: now,
    attempts: 1,
  }) === false
)

check(
  'manual still debounces double-click',
  shouldSkipLookupOtpEmail({
    reason: 'manual',
    nowMs: now + LOOKUP_OTP_MANUAL_COOLDOWN_MS - 1,
    existingExpiresAtMs: expires,
    lastIssuedAtMs: now,
    attempts: 0,
  }) === true
)

check(
  'wrong-code attempts do not skip Resend after 15s',
  shouldSkipLookupOtpEmail({
    reason: 'manual',
    nowMs: now + 15_000,
    existingExpiresAtMs: expires,
    lastIssuedAtMs: now,
    attempts: 3,
  }) === false
)

check(
  'max attempts always allows a new code',
  shouldSkipLookupOtpEmail({
    reason: 'auto',
    nowMs: now + 5_000,
    existingExpiresAtMs: expires,
    lastIssuedAtMs: now,
    attempts: MAX_LOOKUP_OTP_ATTEMPTS,
  }) === false
)

check(
  'expired OTP always allows a new code',
  shouldSkipLookupOtpEmail({
    reason: 'auto',
    nowMs: now + 5_000,
    existingExpiresAtMs: now,
    lastIssuedAtMs: now,
    attempts: 0,
  }) === false
)

const fail = cases.filter((c) => !c.ok)
console.log(JSON.stringify({ total: cases.length, passed: cases.filter((c) => c.ok).length, failed: fail }, null, 2))
if (fail.length) process.exit(1)
