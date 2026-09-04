import type { ActivityLog } from '@/lib/adminActivityLog'

/**
 * Dashboard "Recent Activities" shows a curated high-signal subset only.
 * Routine login/logout noise stays in Admin Settings → Activity Log.
 */
export const DASHBOARD_IMPORTANT_ACTIONS = [
  'admin_created',
  'admin_deleted',
  'permissions_updated',
  'password_changed',
  'status_toggled',
  'username_changed',
  'product_created',
  'product_updated',
  'product_deleted',
  'product_stock_adjusted',
  'cms_content_created',
  'cms_content_updated',
  'cms_content_deleted',
  'promo_code_created',
  'promo_code_updated',
  'promo_code_deleted',
  'media_uploaded',
  'media_deleted',
  'fundraising_partner_updated',
  'fundraising_partner_deleted',
  'fundraising_settings_updated',
  'fundraising_settlement_paid',
  'fundraising_document_sent',
  'fundraising_maintenance_run',
  'fundraising_agent_targets_imported',
  'fundraising_agent_outreach_sent',
  'fundraising_agent_collect_run',
  'fundraising_agent_reply_handled',
  'agent_inbound_draft_sent',
  'agent_community_draft_published',
] as const satisfies ReadonlyArray<ActivityLog['action']>

export type DashboardImportantAction = (typeof DASHBOARD_IMPORTANT_ACTIONS)[number]

export const DASHBOARD_RECENT_ACTIVITY_LIMIT = 8

const IMPORTANT_SET = new Set<string>(DASHBOARD_IMPORTANT_ACTIONS)

export type DashboardActivityTone = 'success' | 'warning' | 'info' | 'danger'

export type DashboardRecentActivityItem = {
  id: string
  action: DashboardImportantAction
  title: string
  detail: string
  timeLabel: string
  timestamp: string
  tone: DashboardActivityTone
}

export function isDashboardImportantActivity(log: ActivityLog): boolean {
  return IMPORTANT_SET.has(log.action)
}

export function getDashboardImportantActivities(
  logs: ActivityLog[],
  limit = DASHBOARD_RECENT_ACTIVITY_LIMIT
): DashboardRecentActivityItem[] {
  return logs
    .filter(isDashboardImportantActivity)
    .slice(0, Math.max(0, limit))
    .map((log) => ({
      id: log.id,
      action: log.action as DashboardImportantAction,
      title: formatImportantActivityTitle(log),
      detail: formatImportantActivityDetail(log),
      timeLabel: formatActivityRelativeTime(log.timestamp),
      timestamp: log.timestamp,
      tone: importantActivityTone(log.action),
    }))
}

export function formatImportantActivityTitle(log: ActivityLog): string {
  switch (log.action) {
    case 'admin_created':
      return 'Admin account created'
    case 'admin_deleted':
      return 'Admin account deleted'
    case 'permissions_updated':
      return 'Permissions updated'
    case 'password_changed':
      return 'Password changed'
    case 'status_toggled':
      return 'Admin status changed'
    case 'username_changed':
      return 'Username changed'
    case 'product_created':
      return 'Product created'
    case 'product_updated':
      return 'Product updated'
    case 'product_deleted':
      return 'Product deleted'
    case 'product_stock_adjusted':
      return 'Stock adjusted'
    case 'cms_content_created':
      return 'CMS content created'
    case 'cms_content_updated':
      return 'CMS content updated'
    case 'cms_content_deleted':
      return 'CMS content deleted'
    case 'promo_code_created':
      return 'Promo code created'
    case 'promo_code_updated':
      return 'Promo code updated'
    case 'promo_code_deleted':
      return 'Promo code deleted'
    case 'media_uploaded':
      return 'Media uploaded'
    case 'media_deleted':
      return 'Media deleted'
    case 'fundraising_partner_updated':
      return 'Fundraising partner updated'
    case 'fundraising_partner_deleted':
      return 'Fundraising partner deleted'
    case 'fundraising_settings_updated':
      return 'Fundraising settings updated'
    case 'fundraising_settlement_paid':
      return 'Fundraising settlement marked paid'
    case 'fundraising_document_sent':
      return 'Fundraising document emailed'
    case 'fundraising_maintenance_run':
      return 'Fundraising maintenance run'
    case 'fundraising_agent_targets_imported':
      return 'Fundraising agent targets imported'
    case 'fundraising_agent_outreach_sent':
      return 'Fundraising agent outreach sent'
    case 'fundraising_agent_collect_run':
      return 'Fundraising agent collect run'
    case 'fundraising_agent_reply_handled':
      return 'Fundraising agent reply handled'
    case 'agent_inbound_draft_sent':
      return 'Agent inbound draft sent'
    case 'agent_community_draft_published':
      return 'Agent community draft published'
    default:
      return 'Admin activity'
  }
}

export function formatImportantActivityDetail(log: ActivityLog): string {
  const by = log.performedBy || 'Unknown'
  const target = log.targetAdmin?.trim()
  const desc = log.details?.description?.trim()

  if (desc) return desc

  switch (log.action) {
    case 'admin_created':
      return target ? `${by} created ${target}` : `Created by ${by}`
    case 'admin_deleted':
      return target ? `${by} deleted ${target}` : `Deleted by ${by}`
    case 'permissions_updated':
      return target ? `${by} updated permissions for ${target}` : `Updated by ${by}`
    case 'password_changed':
      return target && target !== by ? `${by} changed password for ${target}` : `Changed by ${by}`
    case 'status_toggled': {
      const next = log.details?.newValue
      const status =
        typeof next === 'boolean' ? (next ? 'active' : 'inactive') : typeof next === 'string' ? next : null
      if (target && status) return `${by} set ${target} to ${status}`
      if (target) return `${by} changed status for ${target}`
      return `Changed by ${by}`
    }
    case 'username_changed': {
      const from = log.details?.oldValue
      const to = log.details?.newValue
      if (typeof from === 'string' && typeof to === 'string') {
        return `${by}: ${from} → ${to}`
      }
      return target ? `${by} renamed to ${target}` : `Changed by ${by}`
    }
    default:
      return target ? `${by} · ${target}` : by
  }
}

export function importantActivityTone(action: ActivityLog['action']): DashboardActivityTone {
  switch (action) {
    case 'admin_deleted':
    case 'product_deleted':
    case 'cms_content_deleted':
    case 'promo_code_deleted':
    case 'media_deleted':
    case 'fundraising_partner_deleted':
      return 'danger'
    case 'password_changed':
    case 'permissions_updated':
    case 'status_toggled':
    case 'username_changed':
    case 'product_stock_adjusted':
    case 'product_updated':
    case 'cms_content_updated':
    case 'promo_code_updated':
    case 'fundraising_partner_updated':
    case 'fundraising_settings_updated':
    case 'fundraising_settlement_paid':
    case 'fundraising_maintenance_run':
    case 'fundraising_agent_targets_imported':
    case 'fundraising_agent_outreach_sent':
    case 'fundraising_agent_collect_run':
    case 'fundraising_agent_reply_handled':
    case 'agent_inbound_draft_sent':
      return 'warning'
    case 'agent_community_draft_published':
      return 'success'
    case 'admin_created':
    case 'product_created':
    case 'cms_content_created':
    case 'promo_code_created':
    case 'media_uploaded':
    case 'fundraising_document_sent':
      return 'success'
    default:
      return 'info'
  }
}

/** Compact relative time for dashboard rows (English). */
export function formatActivityRelativeTime(iso: string, nowMs = Date.now()): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 'Unknown time'

  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000))
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleString()
}
