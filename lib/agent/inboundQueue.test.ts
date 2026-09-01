import { describe, expect, it } from 'vitest'
import {
  bespokeRecordToQueueItem,
  contactMessageToQueueItem,
  includeBespokeInInboundQueue,
  includeBespokeInRecentQueue,
  includeContactMessageInInboundQueue,
  includeContactMessageInRecentQueue,
} from './inboundQueue'

describe('inboundQueue', () => {
  it('includes replied message when deep-link id matches', () => {
    expect(includeContactMessageInInboundQueue('replied', 'abc', 'abc')).toBe(true)
    expect(includeContactMessageInInboundQueue('replied', 'abc', 'other')).toBe(false)
  })

  it('keeps Needs attention to new/read only without deep-link', () => {
    expect(includeContactMessageInInboundQueue('new', 'a')).toBe(true)
    expect(includeContactMessageInInboundQueue('read', 'a')).toBe(true)
    expect(includeContactMessageInInboundQueue('replied', 'a')).toBe(false)
    expect(includeContactMessageInInboundQueue('closed', 'a')).toBe(false)
  })

  it('lists replied/closed in Recently handled and not actionable bespoke', () => {
    expect(includeContactMessageInRecentQueue('replied')).toBe(true)
    expect(includeContactMessageInRecentQueue('closed')).toBe(true)
    expect(includeContactMessageInRecentQueue('new')).toBe(false)
    expect(includeBespokeInRecentQueue('replied')).toBe(true)
    expect(includeBespokeInRecentQueue('approved')).toBe(true)
    expect(includeBespokeInRecentQueue('rejected')).toBe(true)
    expect(includeBespokeInRecentQueue('new')).toBe(false)
    expect(includeBespokeInInboundQueue('reviewed', 'x')).toBe(true)
    expect(includeBespokeInInboundQueue('approved', 'x')).toBe(false)
  })

  it('maps contact message body to excerpt', () => {
    const item = contactMessageToQueueItem({
      id: '1',
      name: 'Alex',
      email: 'a@example.com',
      subject: 'Help',
      message: 'Where is my order?',
      created_at: '2026-01-01T00:00:00Z',
    })
    expect(item?.excerpt).toBe('Where is my order?')
    expect(item?.key).toBe('message:1')
  })

  it('maps bespoke record to readable excerpt', () => {
    const item = bespokeRecordToQueueItem({
      id: '4bb08a41-dad1-43d6-a025-3da9684e3b1c',
      createdAt: '2026-05-09T04:50:41Z',
      status: 'new',
      payload: {
        roll: { preset: 'Type A (Hologram)', variant: 'Hologram Medium (30mm×13mm)' },
        text: { line1: 'EMMA', line2: '0466894279', layout: 'two' },
        contact: { name: 'JINSOO KIM', email: 'fscsqld@gmail.com' },
      },
      logo: {
        fileUrl: 'https://example.com/logo.png',
        mimeType: 'image/png',
        originalName: 'company-logo.png',
        size: 2048,
      },
    })
    expect(item?.excerpt).toContain('Roll:')
    expect(item?.excerpt).not.toContain('"roll"')
    expect(item?.bespokePayload).toBeTruthy()
    expect(item?.bespokeLogo?.originalName).toBe('company-logo.png')
  })
})
