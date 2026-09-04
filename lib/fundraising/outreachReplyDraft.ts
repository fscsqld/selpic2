/**
 * HITL follow-up draft copy for fundraising outreach replies (pure helpers).
 */

import type { OutreachReplyIntent } from './outreachReplyClassify'

type DraftReplyInput = {
  subject: string
  organizationName?: string
  targetId?: string
  intent: OutreachReplyIntent
}

const SITE = 'https://www.selpic.com.au'

function applyUrlForTarget(targetId?: string): string {
  if (!targetId) return `${SITE}/fundraising`
  const u = new URL(`${SITE}/fundraising`)
  u.searchParams.set('ref', 'ai_agent')
  u.searchParams.set('target_id', targetId)
  u.searchParams.set('utm_source', 'email')
  u.searchParams.set('utm_medium', 'outreach')
  u.searchParams.set('utm_campaign', 'fundraising_agent')
  return u.toString()
}

/** Short HITL reply draft — human must edit/send; not auto-mailed. */
export function buildOutreachFollowUpDraft(reply: DraftReplyInput): {
  subject: string
  text: string
} {
  const name = reply.organizationName || 'there'
  const applyUrl = applyUrlForTarget(reply.targetId)

  if (reply.intent === 'interested') {
    return {
      subject: `Re: ${reply.subject || 'SELPIC Fundraising'}`,
      text: `Hi,\n\nThank you for your interest in SELPIC Fundraising for ${name}.\n\nYou can review the programme and apply here (no cost to join):\n${applyUrl}\n\nHappy to answer any questions.\n\nKind regards,\nSELPIC Fundraising`,
    }
  }
  if (reply.intent === 'question') {
    return {
      subject: `Re: ${reply.subject || 'SELPIC Fundraising'}`,
      text: `Hi,\n\nThanks for getting back to us about SELPIC Fundraising.\n\nHappy to clarify — the apply page also summarises how it works for centres and families:\n${applyUrl}\n\nIf you tell us what you’d like covered, we’ll reply promptly.\n\nKind regards,\nSELPIC Fundraising`,
    }
  }
  return {
    subject: `Re: ${reply.subject || 'SELPIC Fundraising'}`,
    text: `Hi,\n\nThanks for your email regarding SELPIC Fundraising${reply.organizationName ? ` (${reply.organizationName})` : ''}.\n\nProgramme details and apply link:\n${applyUrl}\n\nKind regards,\nSELPIC Fundraising`,
  }
}
