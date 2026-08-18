/**
 * Personalised sample request: opt-in only, print name required, no generic kit.
 * Run: npx tsx scripts/verify-fundraising-sample-kit.ts
 */
import { generateFundraisingDoc } from '../lib/fundraising/generateDoc'
import { DEFAULT_FUNDRAISING_SETTINGS } from '../lib/fundraising/types'
import { createSampleFundraisingPartner, sampleDocumentExtras } from '../lib/fundraising/samplePartner'
import {
  SAMPLE_STICKER_PRINT_NAME_MAX,
  isSampleKitRequestedFlag,
  normalizeSampleKitRequest,
} from '../lib/fundraising/sampleKitRequest'

type Case = { name: string; ok: boolean; detail?: string }
const cases: Case[] = []

function check(name: string, ok: boolean, detail?: string) {
  cases.push({ name, ok, detail })
}

check('omitted flag is not a request', normalizeSampleKitRequest({}).ok === true && normalizeSampleKitRequest({}).sampleKitRequested === false)
check('JSON false is not a request', normalizeSampleKitRequest({ requested: false }).sampleKitRequested === false)
check('string "false" is not a request (Boolean trap)', !isSampleKitRequestedFlag('false'))
check('unchecked leftover print name is ignored', {
  ...normalizeSampleKitRequest({ requested: false, printName: 'Chloe' }),
}.sampleKitRequested === false)

const missingName = normalizeSampleKitRequest({ requested: true, printName: '   ' })
check('requested without print name fails', missingName.ok === false)

const okReq = normalizeSampleKitRequest({ requested: true, printName: '  Chloe  ' })
check(
  'requested with print name is requested',
  okReq.ok === true && okReq.sampleKitRequested === true && okReq.sampleKitPrintName === 'Chloe'
)

const tooLong = normalizeSampleKitRequest({ requested: true, printName: 'CharlotteX' })
check('print name over sticker max fails', tooLong.ok === false, tooLong.ok === false ? tooLong.error : '')

check('max length matches name-sticker one-line limit', SAMPLE_STICKER_PRINT_NAME_MAX === 9)
const atMax = normalizeSampleKitRequest({ requested: true, printName: 'Alexander' })
check('9-character name is allowed', atMax.ok === true && atMax.ok && atMax.sampleKitPrintName === 'Alexander')

check('yes/true/1 flags count as requested', isSampleKitRequestedFlag('yes') && isSampleKitRequestedFlag(true) && isSampleKitRequestedFlag(1))

const partner = createSampleFundraisingPartner()
const d1No = generateFundraisingDoc('D1', {
  partner: { ...partner, sampleKitRequested: false, sampleKitPrintName: undefined },
  settings: DEFAULT_FUNDRAISING_SETTINGS,
  extra: { sampleKitRequested: 'no' },
})
check('D1 without request does not promise a kit', !/personalised name-sticker sample/i.test(d1No.htmlBody || ''))

const extras = sampleDocumentExtras(partner, DEFAULT_FUNDRAISING_SETTINGS)
const d1Yes = generateFundraisingDoc('D1', { partner, settings: DEFAULT_FUNDRAISING_SETTINGS, extra: extras })
check('D1 with request names the print name', (d1Yes.htmlBody || '').includes('Chloe'))
check('D1 with request does not say Educator Sample Kit', !/Educator Sample Kit/i.test(d1Yes.htmlBody || ''))

const d5 = generateFundraisingDoc('D5', { partner, settings: DEFAULT_FUNDRAISING_SETTINGS, extra: extras })
check('D5 includes print name and address', /Chloe/.test(d5.htmlBody || '') && /Example Street/.test(d5.htmlBody || ''))
check('D5 is a personalised sample not a generic kit', /personalised name-sticker sample/i.test(d5.htmlBody || ''))

const failed = cases.filter((c) => !c.ok)
for (const c of cases) {
  console.log(`${c.ok ? 'ok' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`)
}
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed`)
  process.exit(1)
}
console.log(`\n${cases.length} checks passed`)
