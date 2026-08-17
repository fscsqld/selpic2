import { generateFundraisingDoc } from '../lib/fundraising/generateDoc'
import {
  FUNDRAISING_DOCUMENT_LABELS,
  DEFAULT_FUNDRAISING_SETTINGS,
  TOTAL_COMMUNITY_SUPPORT_DEFINITION_VERSION,
  type FundraisingDocumentType,
} from '../lib/fundraising/types'
import { createSampleFundraisingPartner, sampleDocumentExtras } from '../lib/fundraising/samplePartner'
import { maskedBsbValue, maskedAccountValue } from '../lib/fundraising/mask'

const partner = createSampleFundraisingPartner()
const settings = DEFAULT_FUNDRAISING_SETTINGS
const extras = sampleDocumentExtras(partner, settings, '2026-07')
const types = Object.keys(FUNDRAISING_DOCUMENT_LABELS) as FundraisingDocumentType[]
const footerNeedle =
  'Grant Policy: Total Community Support definition version: ' + TOTAL_COMMUNITY_SUPPORT_DEFINITION_VERSION
const expectedMask = `BSB ${maskedBsbValue(partner.bsb)} / Acc ${maskedAccountValue(partner.accountNumber)}`
const abnNeedle = 'Partner ABN: 51 824 753 556'

type Row = {
  type: string
  ok: boolean
  len?: number
  hasFooter?: boolean
  hasMaskLine?: boolean | null
  hasAbn?: boolean | null
  d21Ack?: boolean | null
  d18CodeChange?: boolean | null
  d17ShowsFullAcc?: boolean | null
  partnerFacingLeak?: boolean
  error?: string
}

const results: Row[] = []

for (const type of types) {
  try {
    const doc = generateFundraisingDoc(type, {
      partner,
      settings,
      period: '2026-07',
      extra: extras,
      status: 'Generated',
    })
    const html = doc.htmlBody || ''
    const checks: Row = {
      type,
      ok: true,
      len: html.length,
      hasFooter: html.includes(footerNeedle),
      hasMaskLine:
        type === 'D9' || type === 'D10' || type === 'D13' || type === 'D16'
          ? html.includes(expectedMask)
          : null,
      hasAbn:
        type === 'D9' || type === 'D10' || type === 'D13' || type === 'D16'
          ? html.includes(abnNeedle)
          : null,
      d21Ack: type === 'D21' ? html.includes('We acknowledge receipt of your preference') : null,
      d18CodeChange:
        type === 'D18'
          ? html.includes('Partner Community Code') && html.includes('has been updated')
          : null,
      d17ShowsFullAcc: type === 'D17' ? html.includes('12345678') : null,
      partnerFacingLeak:
        (type === 'D9' || type === 'D10' || type === 'D13' || type === 'D16') &&
        (html.includes('>000-000<') || html.includes('>12345678<')),
    }
    if (!checks.hasFooter || html.length < 200) checks.ok = false
    if (checks.hasMaskLine === false || checks.hasAbn === false) checks.ok = false
    if (checks.d21Ack === false || checks.d18CodeChange === false) checks.ok = false
    if (checks.partnerFacingLeak) checks.ok = false
    results.push(checks)
  } catch (e) {
    results.push({ type, ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}

const fail = results.filter((r) => !r.ok)
console.log(
  JSON.stringify(
    {
      total: results.length,
      passed: results.filter((r) => r.ok).length,
      failed: fail,
      sampleMask: expectedMask,
      footer: footerNeedle,
      labelD19: FUNDRAISING_DOCUMENT_LABELS.D19,
      results,
    },
    null,
    2
  )
)
if (fail.length) process.exit(1)
