/**
 * Browser bridge: Agent Newsletter draft → /admin/newsletter compose modal.
 * Never touches fundraising outreach lists.
 */

export const NEWSLETTER_AGENT_DRAFT_STORAGE_KEY = 'selpic-agent-newsletter-draft'

export type NewsletterAgentDraftPayload = {
  subject: string
  message: string
  type: 'promotion' | 'announcement' | 'event' | 'newsletter' | 'general'
  topicId?: string
  savedAt: string
}

export function saveNewsletterAgentDraftToSession(
  draft: Omit<NewsletterAgentDraftPayload, 'savedAt'> & { savedAt?: string }
): void {
  if (typeof window === 'undefined') return
  const payload: NewsletterAgentDraftPayload = {
    subject: String(draft.subject || '').trim(),
    message: String(draft.message || '').trim(),
    type: draft.type,
    topicId: draft.topicId,
    savedAt: draft.savedAt || new Date().toISOString(),
  }
  sessionStorage.setItem(NEWSLETTER_AGENT_DRAFT_STORAGE_KEY, JSON.stringify(payload))
}

export function consumeNewsletterAgentDraftFromSession(): NewsletterAgentDraftPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(NEWSLETTER_AGENT_DRAFT_STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(NEWSLETTER_AGENT_DRAFT_STORAGE_KEY)
    const parsed = JSON.parse(raw) as NewsletterAgentDraftPayload
    if (!parsed?.subject || !parsed?.message) return null
    return parsed
  } catch {
    return null
  }
}
