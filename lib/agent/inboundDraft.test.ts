import { describe, expect, it } from 'vitest'
import { buildInboundReplyDraft } from './inboundDraft'

describe('buildInboundReplyDraft', () => {
  it('builds a message draft with shipping intent', () => {
    const draft = buildInboundReplyDraft({
      channel: 'message',
      customerName: 'Alex',
      customerEmail: 'alex@example.com',
      subject: 'Where is my order?',
      bodyExcerpt: 'Still waiting on tracking for my package',
    })
    expect(draft.intentHint).toBe('shipping')
    expect(draft.subject.toLowerCase()).toContain('re:')
    expect(draft.body).toContain('Dear Alex')
    expect(draft.body).toContain('delivery')
  })

  it('builds a bespoke draft with request id', () => {
    const draft = buildInboundReplyDraft({
      channel: 'bespoke',
      customerName: 'Sam',
      customerEmail: 'sam@school.edu.au',
      bodyExcerpt: 'Roll: Type A\nText: EMMA',
      requestId: 'bsp_1',
      bespokePayload: {
        roll: { variant: 'Hologram Medium (30mm×13mm)' },
        text: { line1: 'EMMA' },
      },
    })
    expect(draft.subject).toContain('Hologram Medium')
    expect(draft.body).toContain('bespoke label request')
    expect(draft.body).toContain('Request summary:')
    expect(draft.body).not.toContain('{')
    expect(draft.intentHint).toBe('bespoke_request')
  })

  it('uses careful wording for payment disputes', () => {
    const draft = buildInboundReplyDraft({
      channel: 'message',
      customerName: 'Pat',
      customerEmail: 'pat@example.com',
      subject: 'Refund request',
      bodyExcerpt: 'I want a refund for a chargeback dispute',
    })
    expect(draft.intentHint).toBe('payment_dispute')
    expect(draft.body).toContain('billing')
    expect(draft.body).toMatch(/card numbers/i)
  })

  it('classifies custom sticker print enquiries as bespoke_product', () => {
    const draft = buildInboundReplyDraft({
      channel: 'message',
      customerName: 'Rachele',
      customerEmail: 'r@example.com',
      subject: 'Can you print large stickers for a bill kart?',
      bodyExcerpt: 'stickers for a billy kart including the face of this image',
    })
    expect(draft.intentHint).toBe('bespoke_product')
    expect(draft.body).toContain('custom stickers or labels')
  })
})
