import { afterEach, describe, expect, it } from 'vitest'
import {
  signResendWebhookPayloadForTest,
  verifyResendInboundWebhookRequest,
} from './verifyResendInboundWebhook'

const TEST_SECRET = `whsec_${Buffer.from('testsecretfortests12').toString('base64')}`

afterEach(() => {
  delete process.env.RESEND_WEBHOOK_SECRET
  delete process.env.RESEND_INBOUND_WEBHOOK_SECRET
})

describe('verifyResendInboundWebhookRequest', () => {
  it('accepts a valid Svix-signed Resend payload', async () => {
    process.env.RESEND_WEBHOOK_SECRET = TEST_SECRET
    const payload = JSON.stringify({
      type: 'email.received',
      data: { email_id: 'abc', from: 'a@b.com' },
    })
    const signed = signResendWebhookPayloadForTest(TEST_SECRET, payload)
    const req = new Request('https://example.com/api/webhooks/resend/inbound', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'svix-id': signed.id,
        'svix-timestamp': signed.timestamp,
        'svix-signature': signed.signature,
      },
      body: payload,
    })
    const result = await verifyResendInboundWebhookRequest(req)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.body.type).toBe('email.received')
    }
  })

  it('rejects tampered body when Svix secret is set', async () => {
    process.env.RESEND_WEBHOOK_SECRET = TEST_SECRET
    const payload = JSON.stringify({ type: 'email.received', data: {} })
    const signed = signResendWebhookPayloadForTest(TEST_SECRET, payload)
    const req = new Request('https://example.com/hook', {
      method: 'POST',
      headers: {
        'svix-id': signed.id,
        'svix-timestamp': signed.timestamp,
        'svix-signature': signed.signature,
      },
      body: JSON.stringify({ type: 'email.received', data: { hacked: true } }),
    })
    const result = await verifyResendInboundWebhookRequest(req)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(400)
  })

  it('rejects missing Svix headers when secret is set', async () => {
    process.env.RESEND_WEBHOOK_SECRET = TEST_SECRET
    const req = new Request('https://example.com/hook', {
      method: 'POST',
      body: JSON.stringify({ type: 'email.received' }),
    })
    const result = await verifyResendInboundWebhookRequest(req)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Missing Svix/i)
  })

  it('allows unsigned JSON when no secrets configured (local/dev)', async () => {
    const req = new Request('https://example.com/hook', {
      method: 'POST',
      body: JSON.stringify({ type: 'email.received', from: 'x@y.com' }),
    })
    const result = await verifyResendInboundWebhookRequest(req)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.body.from).toBe('x@y.com')
  })
})
