import { describe, expect, it } from 'vitest'
import {
  classifyOutreachReplyIntent,
  outreachReplyNeedsAttention,
} from './outreachReplyClassify'
import { buildOutreachFollowUpDraft } from './outreachReplyDraft'

describe('classifyOutreachReplyIntent', () => {
  it('prioritises unsubscribe over interest', () => {
    expect(
      classifyOutreachReplyIntent('Re: SELPIC', 'Sounds interesting but please unsubscribe')
    ).toBe('unsubscribe')
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
