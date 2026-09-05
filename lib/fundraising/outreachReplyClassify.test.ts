import { describe, expect, it } from 'vitest'
import {
  classifyOutreachReplyIntent,
  extractNewReplyText,
  outreachReplyNeedsAttention,
} from './outreachReplyClassify'
import { buildOutreachFollowUpDraft } from './outreachReplyDraft'

describe('extractNewReplyText', () => {
  it('strips Gmail KO quoted original', () => {
    const raw = [
      'I WOULD like to apply',
      '',
      'jim.',
      '',
      '2026년 9월 5일 (토) 오전 11:46, JIMMY KIM <a@gmail.com>님이 작성:',
      '',
      '> TEST',
      '>',
      '> reply with the single word "unsubscribe"',
    ].join('\n')
    const extracted = extractNewReplyText(raw)
    expect(extracted.toLowerCase()).toContain('would like to apply')
    expect(extracted.toLowerCase()).not.toContain('unsubscribe')
  })
})

describe('classifyOutreachReplyIntent', () => {
  it('prioritises unsubscribe over interest', () => {
    expect(
      classifyOutreachReplyIntent('Re: SELPIC', 'Sounds interesting but please unsubscribe')
    ).toBe('unsubscribe')
  })

  it('does not opt-out from quoted outreach footer', () => {
    const quoted = [
      'I WOULD like to apply',
      '',
      '2026년 9월 5일 (토) 오전 11:45, SELPIC <info@selpic.com.au>님이 작성:',
      '',
      '> reply with the single word "unsubscribe" and we will update our records',
    ].join('\n')
    expect(classifyOutreachReplyIntent('Re: Optional Community Fundraising', quoted)).toBe(
      'interested'
    )
  })

  it('detects interested, question, not_now, wrong_person', () => {
    expect(classifyOutreachReplyIntent('', 'We would like to apply next week')).toBe('interested')
    expect(classifyOutreachReplyIntent('Question', 'What is the cashback %?')).toBe('question')
    expect(classifyOutreachReplyIntent('', 'Not interested right now, too busy')).toBe('not_now')
    expect(classifyOutreachReplyIntent('', 'Wrong person — I left the school')).toBe('wrong_person')
  })

  it('falls back to other for vague thanks', () => {
    expect(classifyOutreachReplyIntent('Thanks', 'Cheers')).toBe('other')
  })

  it('needs-attention flags', () => {
    expect(outreachReplyNeedsAttention('interested')).toBe(true)
    expect(outreachReplyNeedsAttention('question')).toBe(true)
    expect(outreachReplyNeedsAttention('unsubscribe')).toBe(false)
    expect(outreachReplyNeedsAttention('not_now')).toBe(false)
  })
})

describe('buildOutreachFollowUpDraft', () => {
  it('includes apply url for interested', () => {
    const draft = buildOutreachFollowUpDraft({
      subject: 'Re: hello',
      organizationName: 'Test Kinder',
      targetId: 'OT-TEST-1',
      intent: 'interested',
    })
    expect(draft.subject).toMatch(/^Re:/)
    expect(draft.text).toContain('target_id=OT-TEST-1')
  })
})
