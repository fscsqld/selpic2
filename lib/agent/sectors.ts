import {
  adminHasAnyPermission,
  adminHasPermission,
  type AdminLike,
} from '@/lib/adminPermissionCheck'

/**
 * SELPIC Agent Core — sector registry (Wave 2–3).
 * Fundraising + inbound (CS drafts) are live; other sectors are placeholders.
 *
 * =============================================================================
 * AGENT_HUB_PERMISSION_NOTE (do not delete)
 * -----------------------------------------------------------------------------
 * Phase B4 DONE: hub UI/API/dashboard use `agent:read`. Legacy aliases still
 * accept fundraising:read / messages:read / bespoke:read until staff JWTs are
 * updated. Per-sector deep-links keep domain permissions. Before a 3rd live
 * sector, confirm all relevant staff have explicit `agent:read` and trim aliases.
 * See `.cursor/rules/selpic-agent-permissions.mdc` and plan Phase B4.
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
  /** When set, user needs at least one of these instead of requiredPermission alone */
  requiredAnyPermissions?: string[]
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
    status: 'live',
    href: '/admin/agent/inbound',
    requiredPermission: 'messages:read',
    requiredAnyPermissions: ['messages:read', 'bespoke:read', 'agent:read'],
    autonomyNote:
      'Wave 3 — template drafts only. Send uses existing Resend paths; needs messages:write or bespoke:write.',
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

export function adminCanAccessAgentSector(admin: AdminLike, sector: AgentSectorDef): boolean {
  if (sector.requiredAnyPermissions?.length) {
    return adminHasAnyPermission(admin, sector.requiredAnyPermissions)
  }
  return adminHasPermission(admin, sector.requiredPermission)
}
