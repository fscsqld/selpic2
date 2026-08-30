import { describe, expect, it } from 'vitest'
import {
  FUNDRAISING_OUTREACH_SUBJECT_TEMPLATE,
  messageLooksLikeUnsubscribeRequest,
  renderFundraisingOutreachTemplate,
  resolveFundraisingOutreachTemplateVars,
  buildFundraisingOutreachEmail,
  fundraisingOutreachSenderLocality,
} from './outreachEmail'

describe('fundraising outreach template', () => {
  it('maps variables with defaults', () => {
    const vars = resolveFundraisingOutreachTemplateVars({
      target: { organizationName: '', contactName: '' },
      applyUrl: 'https://www.selpic.com.au/fundraising?ref=ai_agent',
      unsubscribeUrl: 'https://www.selpic.com.au/fundraising/outreach/unsubscribe?token=abc',
    })
    expect(vars.ContactName).toBe('Partner')
    expect(vars.Organisation).toBe('your organisation')
  })

  it('renders subject and body placeholders', () => {
    const vars = resolveFundraisingOutreachTemplateVars({
      target: { organizationName: 'SELPIC&CO', contactName: 'JIM KIM' },
      applyUrl: 'https://example.test/apply',
      unsubscribeUrl: 'https://example.test/unsub',
    })
    const subject = renderFundraisingOutreachTemplate(FUNDRAISING_OUTREACH_SUBJECT_TEMPLATE, vars)
    expect(subject).toContain('SELPIC&CO')
    expect(subject).toContain('Optional Community Fundraising')

    const built = buildFundraisingOutreachEmail({
      target: { id: 't1', organizationName: 'SELPIC&CO', contactName: 'JIM KIM' },
      applyUrl: vars.ApplyUrl,
      unsubscribeUrl: vars.UnsubscribeUrl,
      listUnsubscribeUrl: 'https://example.test/api/unsub?token=abc',
    })
    expect(built.text).toContain('JIM KIM')
    expect(built.text).toContain('https://example.test/apply')
    expect(built.text).toContain('https://example.test/unsub')
    expect(built.text).toContain('ABN')
    expect(built.html).toContain('Unsubscribe')
    expect(built.html).not.toMatch(/Confidentiality Notice/i)
    expect(built.headers['List-Unsubscribe']).toContain('https://example.test/api/unsub')
  })

  it('detects unsubscribe replies', () => {
    expect(messageLooksLikeUnsubscribeRequest('Re: hello', 'Please unsubscribe')).toBe(true)
    expect(messageLooksLikeUnsubscribeRequest('', 'Thanks for the info')).toBe(false)
  })

  it('omits street number from outreach locality (Maps house-photo risk)', () => {
    expect(fundraisingOutreachSenderLocality('7 Harvest St, Mansfield QLD 4122, Australia')).toBe(
      'Mansfield QLD 4122, Australia'
    )
    const built = buildFundraisingOutreachEmail({
      target: { id: 't1', organizationName: 'Org', contactName: 'Pat' },
      applyUrl: 'https://example.test/apply',
      unsubscribeUrl: 'https://example.test/unsub',
    })
    expect(built.text).toContain('Mansfield QLD 4122')
    expect(built.text).not.toMatch(/\b7 Harvest\b/)
    expect(built.html).not.toMatch(/\b7 Harvest\b/)
  })
})
