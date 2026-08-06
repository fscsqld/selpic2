/**
 * Smoke checks for dashboard important-activity curation (incl. operational actions).
 * Run: npx tsx scripts/verify-admin-dashboard-recent-activities.ts
 */
import type { ActivityLog } from '../lib/adminActivityLog'
import {
  DASHBOARD_RECENT_ACTIVITY_LIMIT,
  getDashboardImportantActivities,
  isDashboardImportantActivity,
} from '../lib/adminDashboardRecentActivities'

function log(
  partial: Partial<ActivityLog> & Pick<ActivityLog, 'id' | 'action' | 'performedBy' | 'timestamp'>
): ActivityLog {
  return partial as ActivityLog
}

const sample: ActivityLog[] = [
  log({
    id: '1',
    action: 'login',
    performedBy: 'jimmy-CEO',
    timestamp: new Date(Date.now() - 60_000).toISOString(),
  }),
  log({
    id: '2',
    action: 'product_deleted',
    performedBy: 'staff1',
    targetAdmin: 'prod-1',
    timestamp: new Date(Date.now() - 120_000).toISOString(),
    details: { description: 'Deleted product “Sticker A”' },
  }),
  log({
    id: '3',
    action: 'logout',
    performedBy: 'jimmy-CEO',
    timestamp: new Date(Date.now() - 180_000).toISOString(),
  }),
  log({
    id: '4',
    action: 'cms_content_updated',
    performedBy: 'staff1',
    timestamp: new Date(Date.now() - 240_000).toISOString(),
  }),
  log({
    id: '5',
    action: 'permissions_updated',
    performedBy: 'jimmy-CEO',
    targetAdmin: 'staff1',
    timestamp: new Date(Date.now() - 300_000).toISOString(),
  }),
]

const cases: Array<{ name: string; ok: boolean }> = []

cases.push({
  name: 'login is not important',
  ok: !isDashboardImportantActivity(sample[0]),
})

cases.push({
  name: 'product_deleted is important',
  ok: isDashboardImportantActivity(sample[1]),
})

const curated = getDashboardImportantActivities(sample, DASHBOARD_RECENT_ACTIVITY_LIMIT)
cases.push({
  name: 'curated excludes login/logout',
  ok: curated.length === 3 && !['1', '3'].some((id) => curated.some((a) => a.id === id)),
})

cases.push({
  name: 'order preserves newest-first among important',
  ok: curated.map((a) => a.id).join(',') === '2,4,5',
})

cases.push({
  name: 'uses description when present',
  ok: curated[0]?.detail.includes('Sticker A'),
})

let failed = 0
for (const c of cases) {
  const mark = c.ok ? 'PASS' : 'FAIL'
  if (!c.ok) failed += 1
  console.log(`${mark}  ${c.name}`)
}

if (failed > 0) {
  console.error(`\n${failed}/${cases.length} failed`)
  process.exit(1)
}
console.log(`\n${cases.length}/${cases.length} passed`)
