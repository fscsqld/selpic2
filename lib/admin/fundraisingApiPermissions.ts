/** Which admin permissions a fundraising admin API mutation requires. */

export type FundraisingPutBodyLike = {
  partner?: unknown
  document?: unknown
  settlement?: unknown
  settings?: unknown
  sendWelcomePack?: boolean
  emailAccessLink?: boolean
  resetLookupToken?: boolean
  lifecycle?: unknown
}

export function permissionsForFundraisingPut(body: FundraisingPutBodyLike | null | undefined): string[] {
  if (!body || typeof body !== 'object') return []

  const required = new Set<string>()

  if (body.settlement) {
    required.add('fundraising:finance')
  }

  const needsWrite =
    body.partner ||
    body.document ||
    body.settings ||
    body.sendWelcomePack ||
    body.emailAccessLink ||
    body.resetLookupToken ||
    body.lifecycle

  if (needsWrite) {
    required.add('fundraising:write')
  }

  return [...required]
}
