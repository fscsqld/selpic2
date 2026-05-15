import 'server-only'

/** True when `CRON_SECRET` is set (runtime only — not read at `next build`). */
export function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim())
}

/** Compare `Authorization: Bearer …` to `CRON_SECRET`. */
export function verifyCronBearer(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected) return false
  const auth = request.headers.get('authorization') || request.headers.get('Authorization')
  return auth === `Bearer ${expected}`
}
