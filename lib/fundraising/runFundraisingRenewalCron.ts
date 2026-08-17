import 'server-only'

import { buildPartnerLookupUrl, ensurePartnerLookupToken } from '@/lib/fundraising/lookupAuth'
import { issueFundraisingDocuments } from '@/lib/fundraising/issueDocuments'
import {
  listFundraisingPartnersFromDb,
  loadFundraisingSettingsFromDb,
  upsertFundraisingPartnerRow,
} from '@/lib/fundraising/persistence'
import { formatTermDate, shouldSendRenewalNotice } from '@/lib/fundraising/partnershipTerm'
import type { FundraisingPartner } from '@/lib/fundraising/types'

export type FundraisingRenewalCronResult = {
  ok: true
  checked: number
  sent: number
  failed: number
  skipped: number
  details: Array<{
    partnerId: string
    organizationName: string
    action: 'sent' | 'failed' | 'skipped'
    termEndsAt?: string
    error?: string
  }>
}

/**
 * Email D19 renewal notices to active partners in the renewal window
 * who have not already been notified for the current term.
 */
export async function runFundraisingRenewalNotices(): Promise<FundraisingRenewalCronResult> {
  const settings = await loadFundraisingSettingsFromDb()
  const partners = await listFundraisingPartnersFromDb()
  const details: FundraisingRenewalCronResult['details'] = []
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const raw of partners) {
    if (!shouldSendRenewalNotice(raw, settings)) {
      skipped++
      continue
    }

    let partner: FundraisingPartner = ensurePartnerLookupToken(raw)
    if (partner.lookupToken !== raw.lookupToken) {
      await upsertFundraisingPartnerRow(partner)
    }

    const lookupUrl = partner.lookupToken ? buildPartnerLookupUrl(partner.lookupToken) : ''
    const termEndsAt = partner.termEndsAt || ''
    try {
      const docs = await issueFundraisingDocuments({
        types: ['D19'],
        partner,
        settings,
        extra: {
          termEndsAt,
          termEndsAtDisplay: formatTermDate(termEndsAt),
          lookupUrl,
        },
        email: true,
      })
      const doc = docs[0]
      if (doc?.status === 'Sent') {
        partner = {
          ...partner,
          renewalNoticeSentAt: new Date().toISOString(),
          renewalIntent: partner.renewalIntent || 'pending',
          updatedAt: new Date().toISOString(),
        }
        await upsertFundraisingPartnerRow(partner)
        sent++
        details.push({
          partnerId: partner.id,
          organizationName: partner.organizationName,
          action: 'sent',
          termEndsAt,
        })
      } else {
        failed++
        details.push({
          partnerId: partner.id,
          organizationName: partner.organizationName,
          action: 'failed',
          termEndsAt,
          error: 'Email send failed',
        })
      }
    } catch (e) {
      failed++
      details.push({
        partnerId: partner.id,
        organizationName: partner.organizationName,
        action: 'failed',
        termEndsAt,
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  return {
    ok: true,
    checked: partners.length,
    sent,
    failed,
    skipped,
    details,
  }
}
