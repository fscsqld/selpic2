/**
 * Hobby Vercel only allows cron expressions that run at most once per day.
 * Etsy every-10-minutes in vercel.json blocked production deploys (855b126).
 * Run: npx tsx scripts/verify-vercel-crons-hobby.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Case = { name: string; ok: boolean; detail?: string }
const cases: Case[] = []

function check(name: string, ok: boolean, detail?: string) {
  cases.push({ name, ok, detail })
}

/** True when a 5-field cron cannot fire more than once in 24 hours. */
function isVercelHobbySafeCronSchedule(expr: string): boolean {
  const fields = String(expr || '')
    .trim()
    .split(/\s+/)
  if (fields.length !== 5) return false
  const [minute, hour] = fields
  const single = (field: string, max: number) => {
    if (!/^\d+$/.test(field)) return false
    const n = Number(field)
    return n >= 0 && n <= max
  }
  return single(minute, 59) && single(hour, 23)
}

check('daily D19 20:00 UTC is Hobby-safe', isVercelHobbySafeCronSchedule('0 20 * * *'))
check('weekly still Hobby-safe (not more than once/day)', isVercelHobbySafeCronSchedule('0 20 * * 1'))
check('Etsy every-10-minutes is not Hobby-safe', !isVercelHobbySafeCronSchedule('*/10 * * * *'))
check('hourly 0 * * * * is not Hobby-safe', !isVercelHobbySafeCronSchedule('0 * * * *'))
check('twice-daily 0 0,12 * * * is not Hobby-safe', !isVercelHobbySafeCronSchedule('0 0,12 * * *'))

const vercel = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
  crons?: Array<{ path?: string; schedule?: string }>
}
const crons = Array.isArray(vercel.crons) ? vercel.crons : []

for (const job of crons) {
  const path = String(job.path || '')
  const schedule = String(job.schedule || '')
  check(
    `vercel.json ${path || '(missing path)'} is Hobby-safe daily`,
    isVercelHobbySafeCronSchedule(schedule),
    schedule
  )
  check(
    `vercel.json ${path || '(missing path)'} is not Etsy 10-minute sync`,
    path !== '/api/cron/etsy-sync',
    path
  )
}

check(
  'D19 renewal is registered in vercel.json crons',
  crons.some((j) => j.path === '/api/cron/fundraising-renewal'),
  JSON.stringify(crons)
)

check(
  'Outreach daily auto-send is registered in vercel.json crons',
  crons.some((j) => j.path === '/api/cron/fundraising-outreach-daily'),
  JSON.stringify(crons)
)

check(
  'Outreach licensed-feed collect is registered in vercel.json crons',
  crons.some((j) => j.path === '/api/cron/fundraising-outreach-collect'),
  JSON.stringify(crons)
)

const failed = cases.filter((c) => !c.ok)
for (const c of cases) {
  console.log(`${c.ok ? 'ok' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`)
}
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed`)
  process.exit(1)
}
console.log(`\n${cases.length} checks passed`)
