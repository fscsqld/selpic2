/**
 * Partner-facing fundraising URLs must be the live storefront, never localhost.
 * Run: npx tsx scripts/verify-fundraising-partner-facing-urls.ts
 */
import {
  getPartnerFacingSiteUrl,
  getPublicSiteUrl,
  rewriteHtmlUnsuitableOriginsToPublicSite,
} from '../lib/publicSiteUrl'
import {
  buildPartnerFacingLookupUrl,
  canonicalizePartnerFacingLookupUrl,
  healFundraisingDocumentHtml,
} from '../lib/fundraising/partnerFacingSite'
import { generateFundraisingDoc } from '../lib/fundraising/generateDoc'
import { createSampleFundraisingPartner, sampleDocumentExtras } from '../lib/fundraising/samplePartner'
import { DEFAULT_FUNDRAISING_SETTINGS } from '../lib/fundraising/types'

type Case = { name: string; ok: boolean; detail?: string }

const PUBLIC = 'https://www.selpic.com.au'
const TOKEN = 'samplepreviewtoken00000000000000000001'
const cases: Case[] = []

function check(name: string, ok: boolean, detail?: string) {
  cases.push({ name, ok, detail })
}

const prevSite = process.env.NEXT_PUBLIC_SITE_URL
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3005'

check('partner-facing origin ignores localhost env', getPartnerFacingSiteUrl() === PUBLIC)
check(
  'getPublicSiteUrl rejects localhost env',
  getPublicSiteUrl() === PUBLIC,
  getPublicSiteUrl()
)
check(
  'lookup URL is production + token',
  buildPartnerFacingLookupUrl(TOKEN) === `${PUBLIC}/fundraising/lookup?token=${TOKEN}`
)

const extras = sampleDocumentExtras(createSampleFundraisingPartner(), DEFAULT_FUNDRAISING_SETTINGS)
check(
  'sample extras lookupUrl is production',
  String(extras.lookupUrl).startsWith(`${PUBLIC}/fundraising/lookup?token=`) &&
    !/localhost/i.test(String(extras.lookupUrl)),
  String(extras.lookupUrl)
)
check(
  'sample extras admin URLs are production',
  String(extras.partnersUrl).startsWith(`${PUBLIC}/admin/`) &&
    String(extras.payoutUrl).startsWith(`${PUBLIC}/admin/`)
)

const healed = rewriteHtmlUnsuitableOriginsToPublicSite(
  [
    'Or copy this link:',
    'http://localhost:3005/fundraising/lookup?token=abc',
    'http://127.0.0.1:3005/fundraising/lookup?token=abc',
    'http://192.168.1.10:3005/fundraising/lookup?token=abc',
    'https://selpic-git-preview.vercel.app/fundraising/lookup?token=abc',
    'http://selpic.com.au/fundraising/lookup?token=abc',
    'https://js.stripe.com/v3',
  ].join('\n')
)
check('rewrite localhost:3005', healed.includes(`${PUBLIC}/fundraising/lookup?token=abc`) && !healed.includes('localhost'))
check('rewrite LAN IP', !healed.includes('192.168.1.10'))
check('rewrite vercel preview', !healed.includes('vercel.app'))
check('rewrite apex selpic.com.au to www https', healed.includes(`${PUBLIC}/fundraising/lookup?token=abc`))
check('leave Stripe CDN alone', healed.includes('https://js.stripe.com/v3'))

check(
  'canonicalize localhost lookup extra',
  canonicalizePartnerFacingLookupUrl(
    'http://localhost:3005/fundraising/lookup?token=tokentokentokentoken12'
  ) === `${PUBLIC}/fundraising/lookup?token=tokentokentokentoken12`
)

const partner = createSampleFundraisingPartner()
const leaked = generateFundraisingDoc('D2', {
  partner,
  settings: DEFAULT_FUNDRAISING_SETTINGS,
  extra: {
    lookupUrl: `http://localhost:3005/fundraising/lookup?token=${partner.lookupToken}`,
  },
})
check(
  'D2 html never contains localhost even if extras do',
  !/localhost|127\.0\.0\.1/i.test(leaked.htmlBody) &&
    leaked.htmlBody.includes(`${PUBLIC}/fundraising/lookup?token=${partner.lookupToken}`),
  leaked.htmlBody.includes('localhost') ? 'still has localhost' : 'ok'
)

const stored = healFundraisingDocumentHtml(
  `Or copy this link:<br/>http://localhost:3005/fundraising/lookup?token=${TOKEN}`
)
check('heal stored htmlBody', stored.includes(`${PUBLIC}/fundraising/lookup?token=${TOKEN}`) && !stored.includes('localhost'))

if (prevSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
else process.env.NEXT_PUBLIC_SITE_URL = prevSite

const fail = cases.filter((c) => !c.ok)
console.log(JSON.stringify({ total: cases.length, passed: cases.filter((c) => c.ok).length, failed: fail }, null, 2))
if (fail.length) process.exit(1)
