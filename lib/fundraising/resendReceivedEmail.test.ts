import { describe, expect, it } from 'vitest'
import { textFromResendReceivedEmail } from './resendReceivedEmail'

describe('textFromResendReceivedEmail', () => {
  it('prefers plain text', () => {
    expect(
      textFromResendReceivedEmail({
        text: 'We would like to apply',
        html: '<p>ignored</p>',
      })
    ).toBe('We would like to apply')
  })

  it('strips html when text is null', () => {
    const t = textFromResendReceivedEmail({
      text: null,
      html: '<p>What is the <strong>cashback</strong>?</p>',
    })
    expect(t.toLowerCase()).toContain('cashback')
    expect(t).toContain('?')
  })
})
