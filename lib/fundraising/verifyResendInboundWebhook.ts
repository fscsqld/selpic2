/**
 * Verify Resend inbound webhooks (Svix signatures).
 * Cousins: missing headers, wrong secret, re-serialized JSON body, legacy x-selpic header,
 * local/dev without RESEND_WEBHOOK_SECRET, production with secret unset.
 */

import { Webhook } from 'svix'

export type ResendWebhookVerifyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; error: string }

/**
 * Prefer RESEND_WEBHOOK_SECRET (Svix). Falls back to optional legacy shared secret
 * (x-selpic-webhook-secret / Bearer) only when Svix secret is unset — not SELPIC-X.
 */
export async function verifyResendInboundWebhookRequest(
  req: Request
): Promise<ResendWebhookVerifyResult & { raw?: string }> {
  const svixSecret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (svixSecret) {
    const raw = await req.text()
    const id = req.headers.get('svix-id')?.trim() || ''
    const timestamp = req.headers.get('svix-timestamp')?.trim() || ''
    const signature = req.headers.get('svix-signature')?.trim() || ''
    if (!id || !timestamp || !signature) {
      return { ok: false, status: 400, error: 'Missing Svix signature headers' }
    }
    try {
      const wh = new Webhook(svixSecret)
      // Svix 1.x returned the parsed object; 2.x returns void on success and throws on failure.
      wh.verify(raw, {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      })
      const parsed = JSON.parse(raw) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, status: 400, error: 'Invalid JSON' }
      }
      return { ok: true, body: parsed as Record<string, unknown>, raw }
    } catch {
      return { ok: false, status: 400, error: 'Invalid webhook signature' }
    }
  }

  const legacy = process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim()
  if (legacy) {
    const headerSecret = req.headers.get('x-selpic-webhook-secret')?.trim()
    const auth = req.headers.get('authorization')?.trim() || ''
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
    if (headerSecret !== legacy && bearer !== legacy) {
      return { ok: false, status: 401, error: 'Unauthorized' }
    }
  }

  const raw = await req.text()
  try {
    const body = JSON.parse(raw || 'null') as unknown
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { ok: false, status: 400, error: 'Invalid JSON' }
    }
    return { ok: true, body: body as Record<string, unknown>, raw }
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' }
  }
}

/** Test helper — builds Svix headers for a payload with the given whsec secret. */
export function signResendWebhookPayloadForTest(
  secret: string,
  payload: string,
  opts?: { id?: string; timestamp?: string }
): { id: string; timestamp: string; signature: string } {
  const id = opts?.id || `msg_test_${Date.now()}`
  const timestamp = opts?.timestamp || String(Math.floor(Date.now() / 1000))
  const wh = new Webhook(secret)
  const signature = wh.sign(id, new Date(Number(timestamp) * 1000), payload)
  return { id, timestamp, signature }
}
