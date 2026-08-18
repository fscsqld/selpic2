/**
 * Partner Registry editor must keep visible English labels (not placeholder-only).
 * Run: npx tsx scripts/verify-fundraising-admin-form-labels.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Case = { name: string; ok: boolean; detail?: string }
const cases: Case[] = []

function check(name: string, ok: boolean, detail?: string) {
  cases.push({ name, ok, detail })
}

const page = readFileSync(join(process.cwd(), 'app/admin/fundraising/partners/page.tsx'), 'utf8')
const start = page.indexOf('id="partner-editor"')
const end = page.indexOf('Save partner')
check('partner editor block exists', start >= 0 && end > start)
const editor = start >= 0 && end > start ? page.slice(start, end) : ''

const requiredLabels = [
  'Organisation name',
  'Organisation type',
  'Contact name',
  'Contact email',
  'Contact phone',
  'Postal / delivery address',
  'Partner Community Code',
  'Partnership status',
  'Official Grant Account',
  'Bank name',
  'Account name',
  'BSB',
  'Account number',
  'ABN (Australian Business Number)',
  'Fundraising Cashback Grant %',
  'Family discount display %',
  'Rate effective from',
  'Change reason',
]

for (const label of requiredLabels) {
  check(`visible label: ${label}`, editor.includes(`>${label}<`) || editor.includes(`>${label}</span>`), label)
}

const bannedPlaceholders = [
  'placeholder="Organization"',
  'placeholder="Contact name"',
  'placeholder="Contact email"',
  'placeholder="Phone"',
  'placeholder="Postal address"',
  'placeholder="Bank name"',
  'placeholder="Account name"',
  'placeholder="BSB"',
  'placeholder="Account number"',
  'placeholder="ABN (Australian Business Number)"',
  'placeholder="Partner Community Code (required when Active)"',
]
for (const banned of bannedPlaceholders) {
  check(`no placeholder-as-label: ${banned}`, !editor.includes(banned))
}

check(
  'rate % fields are wrapped in labels',
  /Fundraising Cashback Grant %[\s\S]{0,400}<input\s+type="number"/.test(editor) &&
    /Family discount display %[\s\S]{0,400}<input\s+type="number"/.test(editor)
)

const failed = cases.filter((c) => !c.ok)
for (const c of cases) {
  console.log(`${c.ok ? 'ok' : 'FAIL'}  ${c.name}${c.detail && !c.ok ? `  (${c.detail})` : ''}`)
}
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed`)
  process.exit(1)
}
console.log(`\n${cases.length} checks passed`)
