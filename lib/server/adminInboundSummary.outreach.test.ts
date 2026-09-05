import { describe, expect, it } from 'vitest'
import { outreachReplyNeedsAttention } from '../fundraising/outreachReplyClassify'

/**
 * Dashboard inbound badge for outreach must match Needs reply (open + attention intents).
 * Cousins: unsubscribe/not_now/wrong_person stay closed and must not inflate AI Agent badge;
 * Partner Registry fundraising key stays separate (applications ≠ email replies).
 */
describe('fundraising outreach dashboard attention invariant', () => {
  it('only interested/question/other need open queue attention', () => {
    expect(outreachReplyNeedsAttention('interested')).toBe(true)
    expect(outreachReplyNeedsAttention('question')).toBe(true)
    expect(outreachReplyNeedsAttention('other')).toBe(true)
    expect(outreachReplyNeedsAttention('unsubscribe')).toBe(false)
    expect(outreachReplyNeedsAttention('not_now')).toBe(false)
    expect(outreachReplyNeedsAttention('wrong_person')).toBe(false)
  })
})
