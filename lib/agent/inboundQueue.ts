import {
  bespokeQueueListSubject,
  formatBespokeStickerPayloadSummary,
} from './bespokeRequestSummary'

export type BespokeLogoMeta = {
  fileUrl: string
  mimeType: string
  originalName: string
  size: number
}

export type InboundQueueItem = {
  key: string
  channel: 'message' | 'bespoke'
  id: string
  customerName: string
  customerEmail: string
  subject: string
  excerpt: string
  createdAt: string
  /** Raw bespoke form payload — for draft subject/summary only */
  bespokePayload?: Record<string, unknown>
  /** Customer-uploaded logo for bespoke requests */
  bespokeLogo?: BespokeLogoMeta
  /** When opened via deep-link but outside the default new/read queue */
  deepLinkOnly?: boolean
}

export function contactMessageToQueueItem(m: Record<string, unknown>): InboundQueueItem | null {
  const id = String(m.id || '')
  if (!id) return null
  return {
    key: `message:${id}`,
    channel: 'message',
    id,
    customerName: String(m.name || 'Customer'),
    customerEmail: String(m.email || ''),
    subject: String(m.subject || 'Enquiry'),
    excerpt: String(m.message || m.body || '').slice(0, 2000),
    createdAt: String(m.created_at || m.createdAt || ''),
  }
}

function mapBespokeLogo(raw: unknown): BespokeLogoMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const logo = raw as Record<string, unknown>
  const fileUrl = typeof logo.fileUrl === 'string' ? logo.fileUrl.trim() : ''
  if (!fileUrl) return undefined
  return {
    fileUrl,
    mimeType: typeof logo.mimeType === 'string' ? logo.mimeType : '',
    originalName: typeof logo.originalName === 'string' ? logo.originalName : 'logo',
    size: typeof logo.size === 'number' ? logo.size : 0,
  }
}

export function bespokeRecordToQueueItem(r: Record<string, unknown>): InboundQueueItem | null {
  const id = String(r.id || '')
  if (!id) return null
  const payload = (r.payload || {}) as Record<string, unknown>
  const contact = (payload.contact || {}) as { name?: string; email?: string }
  const summary = formatBespokeStickerPayloadSummary(payload)
  const bespokeLogo = mapBespokeLogo(r.logo)
  return {
    key: `bespoke:${id}`,
    channel: 'bespoke',
    id,
    customerName: String(contact.name || 'Customer'),
    customerEmail: String(contact.email || ''),
    subject: bespokeQueueListSubject(payload, id),
    excerpt: summary || '(no request details)',
    createdAt: String(r.createdAt || r.created_at || ''),
    bespokePayload: payload,
    bespokeLogo,
  }
}

/** Needs-attention queue: actionable statuses only. */
export const INBOUND_MESSAGE_ACTIONABLE_STATUSES = ['new', 'read'] as const
export const INBOUND_BESPOKE_ACTIONABLE_STATUSES = ['new', 'reviewed'] as const

/** Recently handled: replied / closed / decision statuses for follow-up drafts. */
export const INBOUND_MESSAGE_RECENT_STATUSES = ['replied', 'closed'] as const
export const INBOUND_BESPOKE_RECENT_STATUSES = ['replied', 'approved', 'rejected'] as const

export type InboundQueueTab = 'needs_attention' | 'recent'

export function isContactMessageActionableStatus(status: string): boolean {
  return (INBOUND_MESSAGE_ACTIONABLE_STATUSES as readonly string[]).includes(status)
}

export function isBespokeActionableStatus(status: string): boolean {
  return (INBOUND_BESPOKE_ACTIONABLE_STATUSES as readonly string[]).includes(status)
}

export function isContactMessageRecentStatus(status: string): boolean {
  return (INBOUND_MESSAGE_RECENT_STATUSES as readonly string[]).includes(status)
}

export function isBespokeRecentStatus(status: string): boolean {
  return (INBOUND_BESPOKE_RECENT_STATUSES as readonly string[]).includes(status)
}

/**
 * Default Needs attention queue. Deep-link target id is always included when
 * `preselectMessageId` matches (any status — caller may flag deepLinkOnly).
 */
export function includeContactMessageInInboundQueue(
  status: string,
  messageId: string,
  preselectMessageId?: string
): boolean {
  if (preselectMessageId && messageId === preselectMessageId) return true
  return isContactMessageActionableStatus(status)
}

export function includeBespokeInInboundQueue(
  status: string,
  recordId: string,
  preselectId?: string
): boolean {
  if (preselectId && recordId === preselectId) return true
  return isBespokeActionableStatus(status)
}

/** Recently handled list — no deep-link force-include (deep-link uses Needs attention + deepLinkOnly). */
export function includeContactMessageInRecentQueue(status: string): boolean {
  return isContactMessageRecentStatus(status)
}

export function includeBespokeInRecentQueue(status: string): boolean {
  return isBespokeRecentStatus(status)
}
