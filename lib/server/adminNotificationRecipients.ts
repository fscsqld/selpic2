import { COMPANY_CONTACT } from '../companyLegal'

/**
 * Inbox(es) for admin inbound alerts (Contact, Bespoke, orders, etc.).
 * Env override → legacy env → company public email (info@selpic.com.au).
 */
export function resolveAdminNotificationRecipients(): string[] {
  const fromEnv = (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.CONTACT_ADMIN_EMAIL || '')
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean)
  if (fromEnv.length > 0) return fromEnv
  return [COMPANY_CONTACT.email]
}
