/**
 * SELPIC Agent Core — sector registry (Wave 2–5 + Newsletter assist).
 * Phase B2: OpenAI usage via site_configs `agent_openai_runs`.
 *
 * =============================================================================
 * AGENT_HUB_PERMISSION_NOTE (do not delete)
 * -----------------------------------------------------------------------------
 * Hub uses `agent:read` (legacy fundraising/messages/bespoke read aliases).
 * `agent:run` also gates opt-in OpenAI polish/image routes.
 * See `.cursor/rules/selpic-agent-permissions.mdc`.
 * =============================================================================
 */

import {
  adminHasAnyPermission,
  adminHasPermission,
  type AdminLike,
} from '@/lib/adminPermissionCheck'

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
  /** One short line for the hub card. */
  description: string
  status: AgentSectorStatus
  href?: string
  requiredPermission: string
  requiredAnyPermissions?: string[]
  /** Extra detail — hub shows only when the card is expanded. */
  autonomyNote: string
}

export const AGENT_SECTORS: AgentSectorDef[] = [
  {
    id: 'fundraising',
    label: 'Fundraising',
    description: 'School outreach emails and conversion tracking.',
    status: 'live',
    href: '/admin/fundraising/agent',
    requiredPermission: 'fundraising:read',
    autonomyNote: 'You confirm each send (max 10). Needs-reply drafts stay HITL.',
  },
  {
    id: 'inbound',
    label: 'Customer care',
    description: 'Draft replies for Messages and Bespoke.',
    status: 'live',
    href: '/admin/agent/inbound',
    requiredPermission: 'messages:read',
    requiredAnyPermissions: ['messages:read', 'bespoke:read', 'agent:read'],
    autonomyNote: 'You send the email — never auto-reply.',
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Opportunity cards (products, inbound, fundraising).',
    status: 'live',
    href: '/admin/agent/performance',
    requiredPermission: 'analytics:read',
    requiredAnyPermissions: ['analytics:read', 'agent:read'],
    autonomyNote: 'Suggestions only — no auto Mark Paid or price changes.',
  },
  {
    id: 'community',
    label: 'Community',
    description: 'Draft SELPIC N news posts for Approve → publish.',
    status: 'live',
    href: '/admin/agent/community',
    requiredPermission: 'community:read',
    requiredAnyPermissions: ['community:read', 'agent:read'],
    autonomyNote: 'Publish needs Approve. Never edits the homepage Hero.',
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    description: 'Draft campaign subject/body for subscribers.',
    status: 'live',
    href: '/admin/agent/newsletter',
    requiredPermission: 'newsletter:read',
    requiredAnyPermissions: ['newsletter:read', 'agent:read'],
    autonomyNote: 'Apply then send in Newsletter admin — never auto-send.',
  },
]

export function liveAgentSectors(): AgentSectorDef[] {
  return AGENT_SECTORS.filter((s) => s.status === 'live')
}

export function adminCanAccessAgentSector(admin: AdminLike, sector: AgentSectorDef): boolean {
  if (sector.requiredAnyPermissions?.length) {
    return adminHasAnyPermission(admin, sector.requiredAnyPermissions)
  }
  return adminHasPermission(admin, sector.requiredPermission)
}
