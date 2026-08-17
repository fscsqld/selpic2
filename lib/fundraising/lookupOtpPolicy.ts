/** Auto page-load / Strict Mode: do not mint another OTP email this often. */
export const LOOKUP_OTP_AUTO_COOLDOWN_MS = 60 * 1000
/** Manual Resend: only debounce double-clicks — must still email a new code. */
export const LOOKUP_OTP_MANUAL_COOLDOWN_MS = 12 * 1000
export const MAX_LOOKUP_OTP_ATTEMPTS = 5

export type LookupOtpIssueReason = 'auto' | 'manual'

export function parseLookupOtpIssueReason(raw: unknown): LookupOtpIssueReason {
  return raw === 'manual' ? 'manual' : 'auto'
}

/**
 * Skip minting/sending only to stop refresh spam — never because the partner typed a wrong code.
 * `lastIssuedAtMs` must be the last OTP *issue* time, not failed-verify `updated_at`.
 */
export function shouldSkipLookupOtpEmail(input: {
  reason: LookupOtpIssueReason
  nowMs: number
  existingExpiresAtMs: number
  lastIssuedAtMs: number
  attempts: number
}): boolean {
  if (!input.existingExpiresAtMs || input.existingExpiresAtMs <= input.nowMs) return false
  if (Number(input.attempts || 0) >= MAX_LOOKUP_OTP_ATTEMPTS) return false
  const sinceIssue = input.nowMs - input.lastIssuedAtMs
  if (!Number.isFinite(sinceIssue) || sinceIssue < 0) return false
  const cooldown =
    input.reason === 'manual' ? LOOKUP_OTP_MANUAL_COOLDOWN_MS : LOOKUP_OTP_AUTO_COOLDOWN_MS
  return sinceIssue < cooldown
}
