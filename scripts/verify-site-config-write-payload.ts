/**
 * CMS write payload: unwrap persist wrappers; reject arrays / missing value.
 * Run: npx tsx scripts/verify-site-config-write-payload.ts
 */
import { parseSiteConfigWriteBody, unwrapSiteConfigValue } from '../lib/siteConfigWritePayload'

type Case = { name: string; ok: boolean; detail?: string }
const cases: Case[] = []

function check(name: string, ok: boolean, detail?: string) {
  cases.push({ name, ok, detail })
}

const canonical = unwrapSiteConfigValue({ heroSlides: [], contentItems: [] })
check(
  'plain object stays canonical',
  !!canonical && Array.isArray(canonical.heroSlides) && !('state' in canonical)
)

const nested = unwrapSiteConfigValue({ state: { categoryItems: [{ id: 'c1' }] }, version: 0 })
check(
  'persist { state } unwraps inner CMS',
  nested?.categoryItems !== undefined && !('version' in (nested || {}))
)

check('JSON string unwraps', unwrapSiteConfigValue('{"shippingOptions":[]}')?.shippingOptions !== undefined)

check('array is rejected', unwrapSiteConfigValue([{ id: 1 }]) === null)
check('null is rejected', unwrapSiteConfigValue(null) === null)
check('empty object is allowed', unwrapSiteConfigValue({}) !== null)

const emptyWrite = parseSiteConfigWriteBody({ value: {} })
check('write empty object ok', emptyWrite.ok === true)

const wrappedWrite = parseSiteConfigWriteBody({ value: { state: { promoCodes: [] } } })
check(
  'write unwraps nested state',
  wrappedWrite.ok === true && wrappedWrite.ok && Array.isArray(wrappedWrite.value.promoCodes)
)

const missing = parseSiteConfigWriteBody({})
check('missing value fails', missing.ok === false)

const arrayBody = parseSiteConfigWriteBody({ value: [] })
check('array value fails', arrayBody.ok === false)

const notObject = parseSiteConfigWriteBody(null)
check('null body fails', notObject.ok === false)

const failed = cases.filter((c) => !c.ok)
for (const c of cases) {
  console.log(`${c.ok ? 'ok' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
}
if (failed.length) {
  console.error(`\n${failed.length}/${cases.length} failed`)
  process.exit(1)
}
console.log(`\n${cases.length}/${cases.length} passed`)
