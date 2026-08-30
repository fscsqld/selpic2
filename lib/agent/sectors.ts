/**
 * SELPIC Agent Core — sector registry (Wave 2).
 * Fundraising is live; other sectors are placeholders until later waves.
 *
 * =============================================================================
 * AGENT_HUB_PERMISSION_NOTE (do not delete)
 * -----------------------------------------------------------------------------
 * Wave 2 hub UI/API uses `fundraising:read` as a temporary gate while only
 * Fundraising is live. BEFORE setting any other sector below to `status: 'live'`,
 * you MUST add `agent:read` (+ optional `agent:run`) to the permission catalog,
 * switch `/admin/agent` + dashboard Quick Action + `/api/admin/agent/*` to that
 * gate, and tell the user. See `.cursor/rules/selpic-agent-permissions.mdc` and
 * `docs/selpic-unified-ai-agent-plan.md` Phase B4.
 * =============================================================================
 */

export type AgentSectorStatus = 'live' | 'coming_soon'

export type AgentSectorId =
  | 'fundraising'
  | 'inbound'
  | 'performance'
  | 'community'
  | 'newsletter'

export type AgentSectorDef = {
  id: AgentSectorId
  label: string
  description: string
  status: AgentSectorStatus
  /** Deep-link when live */
  href?: string
  /** Permission to open / use this sector */
  requiredPermission: string
  autonomyNote: string
}

export const AGENT_SECTORS: AgentSectorDef[] = [
  {
    id: 'fundraising',
    label: 'Fundraising outreach',
    description:
      'Register school/org targets, send capped B2B introduction emails, track CONTACTED → CONVERTED, honour OPTED_OUT.',
    status: 'live',
    href: '/admin/fundraising/agent',
    requiredPermission: 'fundraising:read',
    autonomyNote: 'Send requires fundraising:write. Max 10 emails per send. No auto-scrape / daily blast.',
  },
  {
    id: 'inbound',
    label: 'Customer care drafts',
    description: 'Draft first-line replies for Messages and Bespoke (human Approve → Send).',
    status: 'coming_soon',
    requiredPermission: 'messages:read',
    autonomyNote: 'Wave 3 — draft only by default.',
  },
  {
    id: 'performance',
    label: 'Performance coach',
    description: 'Opportunity cards from Sales, Traffic, and Fundraising Impact.',
    status: 'coming_soon',
    requiredPermission: 'analytics:read',
    autonomyNote: 'Wave 4 — suggestions only; no auto Mark Paid or price changes.',
  },
  {
    id: 'community',
    label: 'SELPIC N / Community',
    description: 'Draft community news posts for admin Approve → publish.',
    status: 'coming_soon',
    requiredPermission: 'community:read',
    autonomyNote: 'Wave 5 — never auto-edit homepage Hero.',
  },
  {
    id: 'newsletter',
    label: 'Newsletter assist',
    description: 'Suggest campaign subjects/bodies; separate from school outreach lists.',
    status: 'coming_soon',
    requiredPermission: 'newsletter:read',
    autonomyNote: 'Later — do not mix with fundraising outreach_targets.',
  },
]

export function liveAgentSectors(): AgentSectorDef[] {
  return AGENT_SECTORS.filter((s) => s.status === 'live')
}
