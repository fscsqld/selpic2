/**
 * Partner Registry list helpers — search, filter, sort, CSV (admin UX at scale).
 */

import {
  isInactivePartner,
  isTermExpired,
  isTermExpiringSoon,
} from '@/lib/fundraising/partnershipTerm'
import {
  isEndedPartnershipStatus,
  legalRetentionPhase,
} from '@/lib/fundraising/legalRetention'
import type { FundraisingPartner, FundraisingSettings } from '@/lib/fundraising/types'
import type { OrderRecord } from '@/lib/store'

export type PartnerRegistryStatusFilter = 'all' | 'pending' | 'active' | 'ended'

/** Operational “needs attention” overlays — optional, not primary status. */
export type PartnerRegistryAttentionFilter =
  | 'none'
  | 'expiring'
  | 'inactive'
  | 'missing_grant'
  | 'eligible_delete'

/** @deprecated Prefer status + attention; kept for CSV/history compatibility in callers. */
export type PartnerRegistryFilter =
  | PartnerRegistryStatusFilter
  | PartnerRegistryAttentionFilter
  | 'suspended'
  | 'terminated'
  | 'retention'

export type PartnerRegistrySort = 'updated' | 'name' | 'termEnd' | 'status'

export const PARTNER_REGISTRY_PAGE_SIZE = 25

export function partnerHasOfficialGrantAccount(partner: FundraisingPartner): boolean {
  return Boolean(
    String(partner.accountName || '').trim() &&
      String(partner.bsb || '').replace(/\D/g, '').length >= 6 &&
      String(partner.accountNumber || '').replace(/\D/g, '').length >= 4
  )
}

export function partnerMatchesSearch(partner: FundraisingPartner, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const hay = [
    partner.organizationName,
    partner.contactName,
    partner.contactEmail,
    partner.linkedPromoCode,
    partner.phone,
    partner.id,
    partner.abn,
    partner.postalAddress,
    partner.suburb,
    partner.state,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

function matchesStatusFilter(
  partner: FundraisingPartner,
  status: PartnerRegistryStatusFilter
): boolean {
  switch (status) {
    case 'pending':
      return partner.status === 'pending'
    case 'active':
      return partner.status === 'active'
    case 'ended':
      return isEndedPartnershipStatus(partner.status)
    default:
      return true
  }
}

function matchesAttentionFilter(
  partner: FundraisingPartner,
  attention: PartnerRegistryAttentionFilter,
  settings: FundraisingSettings,
  orders: OrderRecord[]
): boolean {
  switch (attention) {
    case 'expiring':
      return isTermExpiringSoon(partner, settings) || (partner.status === 'active' && isTermExpired(partner))
    case 'inactive':
      return isInactivePartner(partner, orders, settings)
    case 'missing_grant':
      return partner.status === 'active' && !partnerHasOfficialGrantAccount(partner)
    case 'eligible_delete':
      return (
        isEndedPartnershipStatus(partner.status) &&
        legalRetentionPhase(partner, settings) === 'eligible_delete'
      )
    default:
      return true
  }
}

export function filterPartnersForRegistry(input: {
  partners: FundraisingPartner[]
  statusFilter: PartnerRegistryStatusFilter
  attentionFilter: PartnerRegistryAttentionFilter
  search: string
  settings: FundraisingSettings
  orders: OrderRecord[]
}): FundraisingPartner[] {
  const { partners, statusFilter, attentionFilter, search, settings, orders } = input
  return partners.filter((p) => {
    if (!partnerMatchesSearch(p, search)) return false
    if (!matchesStatusFilter(p, statusFilter)) return false
    if (!matchesAttentionFilter(p, attentionFilter, settings, orders)) return false
    return true
  })
}

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  active: 1,
  suspended: 2,
  terminated: 3,
}

export function sortPartnersForRegistry(
  partners: FundraisingPartner[],
  sort: PartnerRegistrySort
): FundraisingPartner[] {
  const list = [...partners]
  list.sort((a, b) => {
    if (sort === 'name') {
      return a.organizationName.localeCompare(b.organizationName, 'en', { sensitivity: 'base' })
    }
    if (sort === 'status') {
      const d = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      if (d !== 0) return d
      return a.organizationName.localeCompare(b.organizationName, 'en', { sensitivity: 'base' })
    }
    if (sort === 'termEnd') {
      const ta = a.termEndsAt ? new Date(a.termEndsAt).getTime() : Number.POSITIVE_INFINITY
      const tb = b.termEndsAt ? new Date(b.termEndsAt).getTime() : Number.POSITIVE_INFINITY
      if (ta !== tb) return ta - tb
      return a.organizationName.localeCompare(b.organizationName, 'en', { sensitivity: 'base' })
    }
    // updated (newest first)
    const ua = new Date(a.updatedAt || a.createdAt || 0).getTime()
    const ub = new Date(b.updatedAt || b.createdAt || 0).getTime()
    return ub - ua
  })
  return list
}

/** Another active/pending partner already using this community code. */
export function findDuplicatePromoPartner(
  partners: FundraisingPartner[],
  code: string,
  excludePartnerId?: string
): FundraisingPartner | null {
  const normalized = String(code || '')
    .trim()
    .toUpperCase()
  if (!normalized) return null
  return (
    partners.find(
      (p) =>
        p.id !== excludePartnerId &&
        String(p.linkedPromoCode || '')
          .trim()
          .toUpperCase() === normalized &&
        (p.status === 'active' || p.status === 'pending')
    ) || null
  )
}

export function buildPartnersCsv(partners: FundraisingPartner[]): string {
  const headers = [
    'id',
    'organizationName',
    'organizationType',
    'status',
    'contactName',
    'contactEmail',
    'phone',
    'linkedPromoCode',
    'termStartsAt',
    'termEndsAt',
    'renewalIntent',
    'hasOfficialGrantAccount',
    'abn',
    'partnershipEndedAt',
    'retentionUntil',
    'updatedAt',
  ]
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const rows = partners.map((p) =>
    [
      p.id,
      p.organizationName,
      p.organizationType || '',
      p.status,
      p.contactName,
      p.contactEmail,
      p.phone || '',
      p.linkedPromoCode || '',
      p.termStartsAt || '',
      p.termEndsAt || '',
      p.renewalIntent || '',
      partnerHasOfficialGrantAccount(p) ? 'yes' : 'no',
      p.abn || '',
      p.partnershipEndedAt || '',
      p.retentionUntil || '',
      p.updatedAt || '',
    ]
      .map(escape)
      .join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
