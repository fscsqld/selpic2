/**
 * Quick verification for fundraising grant math (no test runner required).
 * Run: node scripts/test-fundraising-net-sales.mjs
 *
 * Mirrors lib/fundraising/netSales.ts eligible base:
 *   grant = (subtotal - promoDiscount) × donationRate%
 */

function round2(n) {
  return Math.round(n * 100) / 100
}

function eligible(subtotal, promoDiscount) {
  return round2(Math.max(0, (Number(subtotal) || 0) - Math.max(0, Number(promoDiscount) || 0)))
}

function grant(subtotal, promoDiscount, ratePercent) {
  return round2(eligible(subtotal, promoDiscount) * (ratePercent / 100))
}

const cases = [
  {
    name: '$100 products, 5% OFF, 15% grant',
    subtotal: 100,
    promoDiscount: 5,
    rate: 15,
    expectEligible: 95,
    expectGrant: 14.25,
    wrongOldGrant: 15,
  },
  {
    name: '$80 products, 5% OFF ($4), 15% grant',
    subtotal: 80,
    promoDiscount: 4,
    rate: 15,
    expectEligible: 76,
    expectGrant: 11.4,
    wrongOldGrant: 12,
  },
  {
    name: 'missing promoDiscount (legacy) — falls back to full subtotal',
    subtotal: 100,
    promoDiscount: 0,
    rate: 15,
    expectEligible: 100,
    expectGrant: 15,
    wrongOldGrant: 15,
  },
]

let failed = 0
for (const c of cases) {
  const el = eligible(c.subtotal, c.promoDiscount)
  const g = grant(c.subtotal, c.promoDiscount, c.rate)
  const ok = el === c.expectEligible && g === c.expectGrant
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${c.name}: eligible=${el} (want ${c.expectEligible}), grant=${g} (want ${c.expectGrant}; old-wrong=${c.wrongOldGrant})`
  )
  if (!ok) failed++
}

if (failed) {
  console.error(`\n${failed} case(s) failed`)
  process.exit(1)
}
console.log('\nAll cases passed')
