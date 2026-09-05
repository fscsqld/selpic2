import { describe, expect, it } from 'vitest'
import {
  classifyOutreachReplyIntent,
  extractNewReplyText,
  formatOutreachReplyAdminExcerpt,
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

  it('keeps only customer text from production-like Gmail KO thread', () => {
    const raw = [
      'i would like to apply',
      '',
      'thanks.',
      '',
      '2026년 9월 5일 (토) 오후 12:29, SELPIC <info@selpic.com.au>님이 작성:',
      '',
      '> SELPIC Community Fundraising',
      '>',
      '> Hello JIMMY,',
      '>',
      '> About the programme',
      '>    - No partnership fee charged by SELPIC to join',
    ].join('\n')
    const extracted = extractNewReplyText(raw)
    expect(extracted).toBe('i would like to apply\n\nthanks.')
    expect(extracted).not.toMatch(/programme|partnership fee|SELPIC Community/i)
  })
})

describe('formatOutreachReplyAdminExcerpt', () => {
  it('does not surface quoted outreach body to admins', () => {
    const raw = [
      'i would like to apply',
      '',
      'thanks.',
      '',
      '2026년 9월 5일 (토) 오후 12:29, SELPIC <info@selpic.com.au>님이 작성:',
      '',
      '> SELPIC Community Fundraising',
      '> Hello JIMMY,',
    ].join('\n')
    const excerpt = formatOutreachReplyAdminExcerpt(raw)
    expect(excerpt).toBe('i would like to apply\n\nthanks.')
    expect(excerpt).not.toContain('Hello JIMMY')
  })

  it('flags quote-only bodies instead of dumping the thread', () => {
    const raw = [
      '2026년 9월 5일 (토) 오후 12:29, SELPIC <info@selpic.com.au>님이 작성:',
      '',
      '> Hello only',
      '> About the programme',
    ].join('\n')
    const excerpt = formatOutreachReplyAdminExcerpt(raw)
    expect(excerpt).toBe('(Quoted thread only — no new customer text detected)')
    expect(excerpt).not.toContain('Hello only')
    expect(excerpt).not.toContain('programme')
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
