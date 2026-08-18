'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { useAdminAuth } from '@/lib/adminAuth'
import { logAdminActivity } from '@/lib/logAdminActivity'
import { useContentStore } from '@/lib/contentStore'
import {
  maskAccount,
  maskBsb,
  useFundraisingStore,
} from '@/lib/fundraising/store'
import {
  FUNDRAISING_ORG_TYPE_LABELS,
  type FundraisingChangeRequest,
  type FundraisingGrantAccountEvent,
  type FundraisingOrganizationType,
  type FundraisingPartner,
  type FundraisingPartnerStatus,
} from '@/lib/fundraising/types'
import {
  extendPartnershipTerm,
  formatTermDate,
  isInactivePartner,
  isTermExpired,
  isTermExpiringSoon,
  lastCommunitySaleAt,
  startPartnershipTerm,
} from '@/lib/fundraising/partnershipTerm'
import {
  applyStatusWithLegalRetention,
  ensureLegalRetention,
  formatRetentionUntil,
  isEligibleForAppDeletion,
  isEndedPartnershipStatus,
  legalRetentionPhase,
  retentionDaysRemaining,
} from '@/lib/fundraising/legalRetention'
import {
  PARTNER_REGISTRY_PAGE_SIZE,
  buildPartnersCsv,
  downloadTextFile,
  filterPartnersForRegistry,
  findDuplicatePromoPartner,
  partnerHasOfficialGrantAccount,
  sortPartnersForRegistry,
  type PartnerRegistryAttentionFilter,
  type PartnerRegistrySort,
  type PartnerRegistryStatusFilter,
} from '@/lib/fundraising/partnerRegistryUi'
import { FUNDRAISING_COPY } from '@/lib/fundraising/copy'
import { useStore } from '@/lib/store'
import { HeartHandshake } from 'lucide-react'
import FundraisingChangeRequestsPanel from '@/components/admin/FundraisingChangeRequestsPanel'

export default function FundraisingPartnersPage() {
  return (
    <AdminRoute requiredPermissions={['analytics:read']}>
      <PartnersContent />
    </AdminRoute>
  )
}

function PartnersContent() {
  const { adminUser } = useAdminAuth()
  const promoCodes = useContentStore((s) => s.promoCodes)
  const partners = useFundraisingStore((s) => s.partners)
  const settings = useFundraisingStore((s) => s.settings)
  const upsertPartner = useFundraisingStore((s) => s.upsertPartner)
  const addPartnerRate = useFundraisingStore((s) => s.addPartnerRate)
  const removePartner = useFundraisingStore((s) => s.removePartner)
  const logChange = useFundraisingStore((s) => s.logChange)
  const mergeRemote = useFundraisingStore((s) => s.mergeRemote)
  const orders = useStore((s) => s.orders)
  const [statusFilter, setStatusFilter] = useState<PartnerRegistryStatusFilter>('all')
  const [attentionFilter, setAttentionFilter] = useState<PartnerRegistryAttentionFilter>('none')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<PartnerRegistrySort>('updated')
  const [page, setPage] = useState(1)

  const [form, setForm] = useState({
    id: '',
    organizationName: '',
    organizationType: 'primary_school' as FundraisingOrganizationType,
    contactName: '',
    contactEmail: '',
    phone: '',
    postalAddress: '',
    linkedPromoCode: '',
    status: 'pending' as FundraisingPartnerStatus,
    bankName: '',
    accountName: '',
    bsb: '',
    accountNumber: '',
    abn: '',
    donationRate: settings.donationRate,
    parentDisplayRate: settings.parentDisplayRate,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    reason: '',
    sendWelcomePack: true,
  })
  const [showSecrets, setShowSecrets] = useState(false)
  const [message, setMessage] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [grantAccountEvents, setGrantAccountEvents] = useState<FundraisingGrantAccountEvent[]>([])
  const [changeRequests, setChangeRequests] = useState<FundraisingChangeRequest[]>([])

  const pendingCount = useMemo(() => partners.filter((p) => p.status === 'pending').length, [partners])
  const openChangeRequestCount = useMemo(
    () =>
      changeRequests.filter((r) =>
        ['submitted', 'under_review', 'awaiting_partner', 'partner_replied'].includes(r.status)
      ).length,
    [changeRequests]
  )
  const openChangeRequestCountByPartner = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of changeRequests) {
      if (!['submitted', 'under_review', 'awaiting_partner', 'partner_replied'].includes(r.status)) continue
      map.set(r.partnerId, (map.get(r.partnerId) || 0) + 1)
    }
    return map
  }, [changeRequests])
  const scopedGrantAccountEvents = useMemo(() => {
    if (!form.id) return grantAccountEvents
    return grantAccountEvents.filter((ev) => ev.partnerId === form.id)
  }, [form.id, grantAccountEvents])
  const activeCount = useMemo(() => partners.filter((p) => p.status === 'active').length, [partners])
  const missingGrantCount = useMemo(
    () => partners.filter((p) => p.status === 'active' && !partnerHasOfficialGrantAccount(p)).length,
    [partners]
  )

  const duplicatePromo = useMemo(
    () => findDuplicatePromoPartner(partners, form.linkedPromoCode, form.id || undefined),
    [partners, form.linkedPromoCode, form.id]
  )

  const syncFromServer = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/fundraising')
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Sync failed')
      mergeRemote({
        partners: json.partners,
        documents: json.documents,
        settlements: json.settlements,
        settings: json.settings,
      })
      setGrantAccountEvents(Array.isArray(json.grantAccountEvents) ? json.grantAccountEvents : [])
      setChangeRequests(Array.isArray(json.changeRequests) ? json.changeRequests : [])
      setMessage(
        `Synced from server · ${json.partners?.length || 0} partners · ${
          Array.isArray(json.changeRequests) ? json.changeRequests.length : 0
        } change requests · ${json.grantAccountEvents?.length || 0} grant-account events`
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Sync failed (local data still available)')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    void syncFromServer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const promoValid = useMemo(() => {
    const code = form.linkedPromoCode.trim().toUpperCase()
    if (!code) return null
    const hit = promoCodes.find((p) => p.code.toUpperCase() === code)
    if (!hit) return { ok: false, label: 'Code not found in Promo Codes — create it under Content → Promo Codes first' }
    if (!hit.isActive) return { ok: false, label: 'Code exists but inactive' }
    return { ok: true, label: `Valid · ${hit.discountType} ${hit.discountValue}` }
  }, [form.linkedPromoCode, promoCodes])

  const persistPartner = async (
    partner: FundraisingPartner,
    opts: {
      sendWelcomePack?: boolean
      resetLookupToken?: boolean
      emailAccessLink?: boolean
      lifecycle?: Record<string, unknown>
      changeReason?: string
      changedByLabel?: string
    } = {}
  ) => {
    try {
      const res = await fetch('/api/admin/fundraising', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner,
          sendWelcomePack: Boolean(opts.sendWelcomePack && partner.status === 'active'),
          resetLookupToken: Boolean(opts.resetLookupToken),
          emailAccessLink: Boolean(opts.emailAccessLink),
          lifecycle: opts.lifecycle,
          changeReason: opts.changeReason,
          changedByLabel: opts.changedByLabel,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Cloud save failed')
      if (json.partner) upsertPartner({ ...json.partner, id: json.partner.id })
      const docs = [...(json.welcomePack || []), ...(json.lifecycleDocs || [])]
      if (docs.length) mergeRemote({ documents: docs })
      if (json.resend) mergeRemote({ documents: [json.resend] })
      return { ok: true as const, lookupUrl: json.lookupUrl as string | undefined, json }
    } catch (e) {
      setMessage(
        `${partner.organizationName} saved locally. Cloud sync note: ${e instanceof Error ? e.message : 'failed'}`
      )
      return { ok: false as const, lookupUrl: undefined, json: null }
    }
  }

  const save = async () => {
    if (!form.organizationName || !form.contactEmail) {
      setMessage('Organization and email are required.')
      return
    }
    if (form.status === 'active' && !form.linkedPromoCode.trim()) {
      setMessage('Assign a linked Promo Code before activating a partner.')
      return
    }
    if (form.status === 'active' && promoValid && !promoValid.ok) {
      setMessage('Linked Promo Code must exist and be active in Content → Promo Codes.')
      return
    }
    if (
      (form.status === 'active' || form.status === 'pending') &&
      form.linkedPromoCode.trim() &&
      duplicatePromo
    ) {
      setMessage(
        `Partner Community Code “${form.linkedPromoCode.trim().toUpperCase()}” is already linked to ${duplicatePromo.organizationName}. Use a unique code.`
      )
      return
    }
    if (!form.reason.trim() && form.id) {
      setMessage('Reason is required when updating partner/rate/bank details.')
      return
    }
    const reason = form.reason.trim() || 'Initial partner registration'
    const changedBy = adminUser?.username || adminUser?.email || 'Admin'

    const existing = form.id ? partners.find((p) => p.id === form.id) : undefined
    // Bank/ABN: prefer form input. If blank, keep existing Official Grant Account only when this
    // partner is already active and has a complete grant account — never inherit stale local
    // leftovers onto pending / re-registered rows. Partners cannot edit bank in Lookup; admins set it here.
    const formHasBank =
      Boolean(form.accountName.trim()) ||
      Boolean(String(form.bsb || '').replace(/\D/g, '')) ||
      Boolean(String(form.accountNumber || '').replace(/\D/g, '')) ||
      Boolean(String(form.abn || '').replace(/\D/g, ''))
    const keepExistingGrantAccount =
      !formHasBank &&
      Boolean(existing) &&
      existing!.status === 'active' &&
      partnerHasOfficialGrantAccount(existing!)
    const bankFields = keepExistingGrantAccount
      ? {
          bankName: existing!.bankName || '',
          accountName: existing!.accountName || '',
          bsb: existing!.bsb || '',
          accountNumber: existing!.accountNumber || '',
          abn: existing!.abn || '',
        }
      : formHasBank
        ? {
            bankName: form.bankName,
            accountName: form.accountName,
            bsb: form.bsb,
            accountNumber: form.accountNumber,
            abn: form.abn,
          }
        : {
            bankName: '',
            accountName: '',
            bsb: '',
            accountNumber: '',
            abn: '',
          }

    if (existing) {
      if (
        (existing.bsb || '') !== (bankFields.bsb || '') ||
        (existing.accountNumber || '') !== (bankFields.accountNumber || '')
      ) {
        logChange({
          partnerId: existing.id,
          field: 'bankDetails',
          oldValue: `${maskBsb(existing.bsb)} / ${maskAccount(existing.accountNumber)}`,
          newValue: `${maskBsb(bankFields.bsb)} / ${maskAccount(bankFields.accountNumber)}`,
          reason,
          changedBy,
        })
      }
    }

    const activating =
      form.status === 'active' &&
      Boolean(form.linkedPromoCode.trim()) &&
      (!existing || existing.status !== 'active')

    const needsTermBootstrap =
      form.status === 'active' &&
      Boolean(form.linkedPromoCode.trim()) &&
      (!existing?.termEndsAt || activating)

    const termFields = needsTermBootstrap
      ? startPartnershipTerm(settings)
      : {
          approvedAt: existing?.approvedAt,
          termStartsAt: existing?.termStartsAt,
          termEndsAt: existing?.termEndsAt,
          renewalIntent: existing?.renewalIntent ?? null,
          renewalNoticeSentAt: existing?.renewalNoticeSentAt,
        }

    const basePartner = {
      id: form.id || undefined,
      organizationName: form.organizationName,
      organizationType: form.organizationType,
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      phone: form.phone,
      postalAddress: form.postalAddress,
      linkedPromoCode: form.linkedPromoCode,
      status: form.status,
      bankName: bankFields.bankName,
      accountName: bankFields.accountName,
      bsb: bankFields.bsb,
      accountNumber: bankFields.accountNumber,
      abn: bankFields.abn,
      approvedAt: termFields.approvedAt,
      termStartsAt: termFields.termStartsAt,
      termEndsAt: termFields.termEndsAt,
      renewalIntent: termFields.renewalIntent,
      renewalNoticeSentAt: termFields.renewalNoticeSentAt,
      partnershipEndedAt: existing?.partnershipEndedAt,
      retentionArchiveClass: existing?.retentionArchiveClass,
      retentionUntil: existing?.retentionUntil,
      retentionYearsApplied: existing?.retentionYearsApplied,
    }

    const withRetention = applyStatusWithLegalRetention(
      {
        ...(existing || {
          id: form.id || 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          linkedPromoCode: form.linkedPromoCode,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          organizationName: form.organizationName,
          status: form.status,
        }),
        ...basePartner,
        id: existing?.id || form.id || 'new',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        linkedPromoCode: form.linkedPromoCode,
      } as FundraisingPartner,
      form.status,
      settings
    )

    // Detect rate / code changes BEFORE mutating local rates (otherwise rateChanged is always false).
    const prevRate = existing
      ? useFundraisingStore.getState().getActiveRateForPartner(existing.id)
      : null
    const rateChanged =
      Boolean(existing) &&
      existing?.status === 'active' &&
      form.status === 'active' &&
      prevRate &&
      (prevRate.donationRate !== Number(form.donationRate) ||
        prevRate.parentDisplayRate !== Number(form.parentDisplayRate))

    const newCode = form.linkedPromoCode.trim().toUpperCase()
    const oldCode = (existing?.linkedPromoCode || '').trim().toUpperCase()
    // D18 is for changing an already-active partner's community code — not first activation.
    const codeChanged =
      Boolean(existing) &&
      existing?.status === 'active' &&
      form.status === 'active' &&
      Boolean(newCode) &&
      oldCode !== newCode

    if (existing && codeChanged) {
      logChange({
        partnerId: existing.id,
        field: 'linkedPromoCode',
        oldValue: oldCode || '(none)',
        newValue: newCode,
        reason,
        changedBy,
      })
    }

    const partner = upsertPartner({
      ...basePartner,
      status: withRetention.status,
      partnershipEndedAt: withRetention.partnershipEndedAt,
      retentionArchiveClass: withRetention.retentionArchiveClass,
      retentionUntil: withRetention.retentionUntil,
      retentionYearsApplied: withRetention.retentionYearsApplied,
      donationRate: Number(form.donationRate),
      parentDisplayRate: Number(form.parentDisplayRate),
    })

    const rateRow = addPartnerRate(
      {
        partnerId: partner.id,
        donationRate: Number(form.donationRate),
        parentDisplayRate: Number(form.parentDisplayRate),
        effectiveFrom: form.effectiveFrom,
        effectiveTo: null,
      },
      { reason, changedBy }
    )

    const priorSchedule = (existing?.rateSchedule || []).map((r) => {
      if (r.effectiveTo) return r
      if (r.effectiveFrom.slice(0, 10) >= form.effectiveFrom.slice(0, 10)) {
        return { ...r, effectiveTo: form.effectiveFrom.slice(0, 10) }
      }
      return r
    })

    // Persist current rates + schedule on the partner cloud payload (no separate rates table).
    const partnerWithRates = upsertPartner({
      ...partner,
      donationRate: Number(form.donationRate),
      parentDisplayRate: Number(form.parentDisplayRate),
      rateSchedule: [rateRow, ...priorSchedule.filter((r) => r.id !== rateRow.id)].slice(0, 40),
    })

    // Welcome pack only on first activation — never when re-saving an already-active partner.
    const sendWelcome =
      form.sendWelcomePack &&
      form.status === 'active' &&
      Boolean(form.linkedPromoCode) &&
      (!existing || existing.status !== 'active')

    const statusLifecycle =
      existing &&
      (form.status === 'suspended' || form.status === 'terminated') &&
      existing.status !== form.status
        ? { kind: 'd12_status' as const }
        : codeChanged
          ? { kind: 'd18_code' as const, oldPromoCode: oldCode || '(none)' }
          : rateChanged
            ? { kind: 'd8_rate' as const, oldDonationRate: prevRate!.donationRate }
            : undefined

    const result = await persistPartner(partnerWithRates, {
      sendWelcomePack: sendWelcome,
      lifecycle: statusLifecycle,
      changeReason: reason,
      changedByLabel: changedBy,
    })

    // If code and rate both changed, also send D8 (D18 already sent above).
    if (result.ok && codeChanged && rateChanged) {
      await persistPartner(partnerWithRates, {
        lifecycle: { kind: 'd8_rate', oldDonationRate: prevRate!.donationRate },
      })
    }

    const lookupNote = result.lookupUrl ? ` · Lookup: ${result.lookupUrl}` : ''
    const lifeNote = statusLifecycle
      ? statusLifecycle.kind === 'd18_code'
        ? ' · D18 code change notice emailed'
        : statusLifecycle.kind === 'd8_rate'
          ? ' · D8 rate notice emailed'
          : ' · D12/D13 status notice emailed'
      : ''
    const rateNote = codeChanged && rateChanged ? ' · D8 rate notice emailed' : ''
    const welcomeDocs = Array.isArray(result.json?.welcomePack) ? result.json.welcomePack : []
    const welcomeFailed =
      sendWelcome &&
      welcomeDocs.length > 0 &&
      welcomeDocs.some((d: { status?: string }) => d.status === 'Failed')
    const welcomeNote = !sendWelcome
      ? ''
      : welcomeFailed
        ? ' · Welcome pack save OK but one or more emails failed — check Document send history'
        : welcomeDocs.length
          ? ' · Welcome pack (D2/D3/D4) emailed'
          : result.ok
            ? ' · Welcome pack requested'
            : ''
    setMessage(
      result.ok
        ? `Saved ${partnerWithRates.organizationName}${welcomeNote}${lifeNote}${rateNote}${lookupNote}`
        : message || `Saved ${partnerWithRates.organizationName} locally`
    )
    if (result.ok) {
      const changeParts: string[] = []
      if (!existing) changeParts.push('created')
      if (rateChanged && prevRate) {
        changeParts.push(
          `grant ${prevRate.donationRate}%→${form.donationRate}% / parent ${prevRate.parentDisplayRate}%→${form.parentDisplayRate}%`
        )
      }
      if (codeChanged) changeParts.push(`code ${oldCode || '(none)'}→${newCode}`)
      if (existing && existing.status !== form.status) {
        changeParts.push(`status ${existing.status}→${form.status}`)
      }
      if (changeParts.length === 0) changeParts.push('saved')
      logAdminActivity({
        action: 'fundraising_partner_updated',
        target: partnerWithRates.id,
        field: rateChanged ? 'donationRate' : codeChanged ? 'linkedPromoCode' : 'partner',
        oldValue: rateChanged && prevRate ? prevRate.donationRate : existing?.status,
        newValue: rateChanged ? Number(form.donationRate) : form.status,
        description: `${changedBy} · ${partnerWithRates.organizationName} (${partnerWithRates.id}): ${changeParts.join('; ')}${reason ? ` · ${reason}` : ''}`,
      })
    }
    setForm((f) => ({ ...f, id: partnerWithRates.id, reason: '' }))
  }

  const dispatchSampleKit = async (partnerId: string) => {
    const p = partners.find((x) => x.id === partnerId)
    if (!p) return
    const updated = upsertPartner({ ...p, sampleKitStatus: 'dispatched', sampleKitRequested: true })
    const result = await persistPartner(updated, { lifecycle: { kind: 'd5_dispatch' } })
    if (result.ok) {
      logAdminActivity({
        action: 'fundraising_partner_updated',
        target: partnerId,
        field: 'sampleKitStatus',
        oldValue: p.sampleKitStatus,
        newValue: 'dispatched',
        description: `${adminUser?.username || adminUser?.email || 'Admin'} dispatched personalised name-sticker sample for ${p.organizationName} (${partnerId})${p.sampleKitPrintName ? ` · print ${p.sampleKitPrintName}` : ''}`,
      })
    }
    setMessage(result.ok ? `D5 personalised sample dispatch emailed to ${p.contactEmail}` : message || 'D5 failed')
  }

  const markSuspended = async (partnerId: string, status: 'suspended' | 'terminated') => {
    const p = partners.find((x) => x.id === partnerId)
    if (!p) return
    const ok = window.confirm(
      status === 'terminated'
        ? FUNDRAISING_COPY.adminTerminateConfirm
        : FUNDRAISING_COPY.adminSuspendConfirm
    )
    if (!ok) return
    const updated = applyStatusWithLegalRetention(p, status, settings)
    upsertPartner(updated)
    const result = await persistPartner(updated, { lifecycle: { kind: 'd12_status' } })
    if (result.ok) {
      logAdminActivity({
        action: 'fundraising_partner_updated',
        target: partnerId,
        field: 'status',
        oldValue: p.status,
        newValue: status,
        description: `${adminUser?.username || adminUser?.email || 'Admin'} set ${p.organizationName} (${partnerId}) ${p.status}→${status}`,
      })
    }
    setMessage(
      result.ok
        ? `${status === 'terminated' ? 'D12+D13' : 'D12'} sent for ${p.organizationName} · legal retention until ${formatRetentionUntil(updated.retentionUntil)}`
        : message || 'Status notice failed'
    )
  }

  const deletePartner = async (partnerId: string) => {
    const p = partners.find((x) => x.id === partnerId)
    if (!p) return
    const classified = ensureLegalRetention(p, settings)
    if (isEndedPartnershipStatus(classified.status) && !isEligibleForAppDeletion(classified, settings)) {
      setMessage(
        `Cannot delete “${p.organizationName}” yet — legal retention until ${formatRetentionUntil(classified.retentionUntil)} (${retentionDaysRemaining(classified) ?? '—'} days remaining). Classify under Legal retention filter.`
      )
      return
    }
    const ok = window.confirm(
      isEndedPartnershipStatus(p.status)
        ? `Legal retention has elapsed for “${p.organizationName}”.\n\nPermanently delete app rows (partner, documents, settlements, lookup sessions, Official Grant Account history)? Promo codes in Content are not deleted.`
        : `Permanently delete “${p.organizationName}” (${p.id})?\n\nThis removes the partner row and related documents, settlements, lookup sessions, and Official Grant Account history from the cloud and this browser. Promo codes in Content are not deleted.\n\nImportant: Australian tax and company record-keeping may still require SELPIC to keep grant remittance and financial evidence outside this delete (typically at least 5 years, and longer where company rules apply). Do not use Delete to destroy legally required business records.`
    )
    if (!ok) return
    try {
      const res = await fetch(`/api/admin/fundraising?partnerId=${encodeURIComponent(partnerId)}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Delete failed')
      removePartner(partnerId)
      setGrantAccountEvents((prev) => prev.filter((ev) => ev.partnerId !== partnerId))
      logAdminActivity({
        action: 'fundraising_partner_deleted',
        target: partnerId,
        field: 'partner',
        oldValue: p.organizationName,
        newValue: null,
        description: `${adminUser?.username || adminUser?.email || 'Admin'} deleted fundraising partner ${p.organizationName} (${partnerId})`,
      })
      if (form.id === partnerId) {
        setForm((f) => ({
          ...f,
          id: '',
          organizationName: '',
          contactName: '',
          contactEmail: '',
          linkedPromoCode: '',
          status: 'pending',
          reason: '',
        }))
      }
      setMessage(`Deleted ${p.organizationName}`)
    } catch (e) {
      // Still remove locally so test data can be cleared if cloud fails
      removePartner(partnerId)
      setGrantAccountEvents((prev) => prev.filter((ev) => ev.partnerId !== partnerId))
      logAdminActivity({
        action: 'fundraising_partner_deleted',
        target: partnerId,
        field: 'partner',
        oldValue: p.organizationName,
        newValue: null,
        description: `${adminUser?.username || adminUser?.email || 'Admin'} deleted fundraising partner ${p.organizationName} (${partnerId}) · local-only (cloud delete failed)`,
      })
      setMessage(
        e instanceof Error
          ? `Removed locally. Cloud delete note: ${e.message}`
          : 'Removed locally; cloud delete failed'
      )
    }
  }

  const sendRenewalNotice = async (partnerId: string) => {
    const p = partners.find((x) => x.id === partnerId)
    if (!p || p.status !== 'active') return
    if (!p.termEndsAt) {
      setMessage('Set a partnership term first (re-save as Active to bootstrap a 12-month term).')
      return
    }
    const result = await persistPartner(p, { lifecycle: { kind: 'd19_renewal' } })
    if (result.ok && result.json?.partner) {
      upsertPartner({ ...result.json.partner })
    }
    if (result.ok) {
      logAdminActivity({
        action: 'fundraising_partner_updated',
        target: partnerId,
        field: 'renewalNotice',
        description: `${adminUser?.username || adminUser?.email || 'Admin'} sent D19 renewal notice for ${p.organizationName} (${partnerId})`,
      })
    }
    setMessage(result.ok ? `D19 renewal notice emailed to ${p.contactEmail}` : message || 'D19 failed')
  }

  const extendTermYear = async (partnerId: string) => {
    const p = partners.find((x) => x.id === partnerId)
    if (!p) return
    const patch = extendPartnershipTerm(p, settings)
    const updated = upsertPartner({
      ...p,
      ...patch,
      renewalIntent: 'wants_renew',
    })
    const result = await persistPartner(updated, { lifecycle: { kind: 'd20_renewed' } })
    if (result.ok) {
      logAdminActivity({
        action: 'fundraising_partner_updated',
        target: partnerId,
        field: 'termEndsAt',
        oldValue: p.termEndsAt,
        newValue: patch.termEndsAt,
        description: `${adminUser?.username || adminUser?.email || 'Admin'} extended term for ${p.organizationName} (${partnerId}) → ${formatTermDate(patch.termEndsAt)}`,
      })
    }
    setMessage(
      result.ok
        ? `Extended ${p.organizationName} to ${formatTermDate(patch.termEndsAt)} · D20 confirmation emailed`
        : message || 'Extend saved locally'
    )
  }

  const sendNonRenewalAck = async (partnerId: string) => {
    const p = partners.find((x) => x.id === partnerId)
    if (!p) return
    const updated = upsertPartner({
      ...p,
      renewalIntent: 'declines',
      updatedAt: new Date().toISOString(),
    })
    const result = await persistPartner(updated, { lifecycle: { kind: 'd21_declined' } })
    if (result.ok) {
      logAdminActivity({
        action: 'fundraising_partner_updated',
        target: partnerId,
        field: 'renewalIntent',
        oldValue: p.renewalIntent,
        newValue: 'declines',
        description: `${adminUser?.username || adminUser?.email || 'Admin'} sent D21 non-renewal ack for ${p.organizationName} (${partnerId})`,
      })
    }
    setMessage(
      result.ok
        ? `D21 non-renewal acknowledgement emailed to ${p.contactEmail}`
        : message || 'D21 failed'
    )
  }

  const reactivatePartner = async (partnerId: string) => {
    const p = partners.find((x) => x.id === partnerId)
    if (!p) return
    const updated = applyStatusWithLegalRetention(p, 'active', settings)
    upsertPartner(updated)
    const result = await persistPartner(updated)
    setMessage(
      result.ok
        ? `Reactivated ${p.organizationName} (cleared legal retention archive classification)`
        : message || 'Reactivate saved locally'
    )
  }

  const filteredPartners = useMemo(() => {
    const filtered = filterPartnersForRegistry({
      partners,
      statusFilter,
      attentionFilter,
      search: searchQuery,
      settings,
      orders,
    })
    return sortPartnersForRegistry(filtered, sortKey)
  }, [partners, statusFilter, attentionFilter, searchQuery, sortKey, settings, orders])

  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / PARTNER_REGISTRY_PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const pagedPartners = useMemo(() => {
    const start = (pageSafe - 1) * PARTNER_REGISTRY_PAGE_SIZE
    return filteredPartners.slice(start, start + PARTNER_REGISTRY_PAGE_SIZE)
  }, [filteredPartners, pageSafe])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, attentionFilter, searchQuery, sortKey])

  const expiringCount = useMemo(
    () => partners.filter((p) => isTermExpiringSoon(p, settings) || isTermExpired(p)).length,
    [partners, settings]
  )
  const inactiveCount = useMemo(
    () => partners.filter((p) => isInactivePartner(p, orders, settings)).length,
    [partners, orders, settings]
  )
  const endedCount = useMemo(
    () => partners.filter((p) => isEndedPartnershipStatus(p.status)).length,
    [partners]
  )
  const eligibleDeleteCount = useMemo(
    () =>
      partners.filter(
        (p) => isEndedPartnershipStatus(p.status) && legalRetentionPhase(p, settings) === 'eligible_delete'
      ).length,
    [partners, settings]
  )

  const exportVisibleCsv = () => {
    const csv = buildPartnersCsv(filteredPartners)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadTextFile(`fundraising-partners-${statusFilter}-${attentionFilter}-${stamp}.csv`, csv)
    setMessage(`Exported ${filteredPartners.length} partner row${filteredPartners.length === 1 ? '' : 's'} to CSV.`)
  }

  const resetForm = () => {
    setForm({
      id: '',
      organizationName: '',
      organizationType: 'primary_school',
      contactName: '',
      contactEmail: '',
      phone: '',
      postalAddress: '',
      linkedPromoCode: '',
      status: 'pending',
      bankName: '',
      accountName: '',
      bsb: '',
      accountNumber: '',
      abn: '',
      donationRate: settings.donationRate,
      parentDisplayRate: settings.parentDisplayRate,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      reason: '',
      sendWelcomePack: true,
    })
  }

  const scrollToEditor = () => {
    document.getElementById('partner-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToPartnerWorkspace = () => {
    scrollToEditor()
    window.setTimeout(() => {
      document
        .getElementById('partner-change-requests')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 80)
  }

  const resetAccessLink = async (partnerId: string) => {
    const p = partners.find((x) => x.id === partnerId)
    if (!p) return
    const result = await persistPartner(p, { resetLookupToken: true, emailAccessLink: true })
    if (result.ok) {
      logAdminActivity({
        action: 'fundraising_partner_updated',
        target: partnerId,
        field: 'lookupToken',
        description: `${adminUser?.username || adminUser?.email || 'Admin'} reset Lookup access link for ${p.organizationName} (${partnerId})`,
      })
    }
    setMessage(
      result.ok
        ? `Access link reset and emailed${result.lookupUrl ? `: ${result.lookupUrl}` : ''}`
        : message || 'Failed to reset access link'
    )
  }

  const approve = (p: FundraisingPartner) => {
    const rate = useFundraisingStore.getState().getActiveRateForPartner(p.id)
    setForm({
      id: p.id,
      organizationName: p.organizationName,
      organizationType: p.organizationType || 'primary_school',
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      phone: p.phone || '',
      postalAddress: p.postalAddress || '',
      linkedPromoCode: p.linkedPromoCode || '',
      status: 'active',
      bankName: p.bankName || '',
      accountName: p.accountName || '',
      bsb: p.bsb || '',
      accountNumber: p.accountNumber || '',
      abn: p.abn || '',
      donationRate: rate.donationRate,
      parentDisplayRate: rate.parentDisplayRate,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      reason: 'Approved partnership application',
      sendWelcomePack: true,
    })
    setMessage('Fill Partner Community Code and Official Grant Account (ABN/BSB/account) as needed, then Save as Active to email welcome pack.')
    scrollToEditor()
  }

  const edit = (id: string) => {
    const p = partners.find((x) => x.id === id)
    if (!p) return
    const rate = useFundraisingStore.getState().getActiveRateForPartner(p.id)
    setForm({
      id: p.id,
      organizationName: p.organizationName,
      organizationType: p.organizationType || 'primary_school',
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      phone: p.phone || '',
      postalAddress: p.postalAddress || '',
      linkedPromoCode: p.linkedPromoCode,
      status: p.status,
      bankName: p.bankName || '',
      accountName: p.accountName || '',
      bsb: p.bsb || '',
      accountNumber: p.accountNumber || '',
      abn: p.abn || '',
      donationRate: rate.donationRate,
      parentDisplayRate: rate.parentDisplayRate,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      reason: '',
      sendWelcomePack: false,
    })
    scrollToEditor()
  }

  const loadPartnerFromChangeRequest = (
    partnerId: string,
    proposed?: FundraisingChangeRequest['proposed']
  ) => {
    edit(partnerId)
    if (proposed) {
      setForm((f) => ({
        ...f,
        bankName: proposed.bankName || f.bankName,
        accountName: proposed.accountName || f.accountName,
        abn: proposed.abn || f.abn,
        bsb: proposed.bsb || f.bsb,
        accountNumber: proposed.accountNumber || f.accountNumber,
        contactName: proposed.contactName || f.contactName,
        contactEmail: proposed.contactEmail || f.contactEmail,
        phone: proposed.phone || f.phone,
        reason: f.reason || `Change request for ${partnerId}`,
      }))
    }
    setMessage(
      "Partner workspace open. Review this partner's change requests below, verify attachments, Save with a reason, then Mark applied."
    )
    scrollToPartnerWorkspace()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Fundraising Partners"
        icon={<HeartHandshake className="w-6 h-6" />}
        showBackButton
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />
      <FundraisingAdminShell
        title="Partner Registry"
        subtitle={FUNDRAISING_COPY.adminPartnersSubtitle}
        current="/admin/fundraising/partners"
      >
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <button
            type="button"
            onClick={() => void syncFromServer()}
            disabled={syncing}
            className="text-sm px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync from server'}
          </button>
          <button
            type="button"
            onClick={exportVisibleCsv}
            className="text-sm px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
            title="Export the current filtered list to CSV"
          >
            Export CSV ({filteredPartners.length})
          </button>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2 py-1 rounded-lg bg-white border text-slate-700">{partners.length} total</span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('active')
                setAttentionFilter('none')
              }}
              className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900"
            >
              {activeCount} active
            </button>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('pending')
                  setAttentionFilter('none')
                }}
                className="px-2 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 font-medium"
              >
                {pendingCount} pending
              </button>
            )}
            {openChangeRequestCount > 0 && (
              <a
                href="#change-requests"
                className="px-2 py-1 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 font-medium"
              >
                {openChangeRequestCount} change request{openChangeRequestCount === 1 ? '' : 's'}
              </a>
            )}
            {missingGrantCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('active')
                  setAttentionFilter('missing_grant')
                }}
                className="px-2 py-1 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 font-medium"
              >
                {missingGrantCount} missing grant account
              </button>
            )}
            {expiringCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('active')
                  setAttentionFilter('expiring')
                }}
                className="px-2 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200"
              >
                {expiringCount} term ending
              </button>
            )}
          </div>
        </div>

        {message && (
          <div
            className={
              /fail|error|required|unauthorized|not found|could not|invalid/i.test(message)
                ? 'mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-950'
                : 'mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-950'
            }
          >
            {message}
          </div>
        )}

        <div className="mb-6">
          <FundraisingChangeRequestsPanel
            mode="inbox"
            requests={changeRequests}
            partners={partners}
            onRefresh={syncFromServer}
            onMessage={setMessage}
            onLoadPartner={loadPartnerFromChangeRequest}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
          <div id="partner-editor" className="bg-white border rounded-xl p-4 space-y-3 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{form.id ? 'Edit / approve partner' : 'New partner'}</h2>
              {form.id && (
                <button type="button" className="text-xs text-slate-600 underline" onClick={resetForm}>
                  Clear · new partner
                </button>
              )}
            </div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Organization" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.organizationType} onChange={(e) => setForm({ ...form, organizationType: e.target.value as FundraisingOrganizationType })}>
              {Object.entries(FUNDRAISING_ORG_TYPE_LABELS)
                .filter(([k]) => k !== 'daycare_kindergarten')
                .map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Contact email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Postal address" value={form.postalAddress} onChange={(e) => setForm({ ...form, postalAddress: e.target.value })} />
            <div>
              <input className="w-full border rounded-lg px-3 py-2 text-sm uppercase" placeholder="Partner Community Code (required when Active)" value={form.linkedPromoCode} onChange={(e) => setForm({ ...form, linkedPromoCode: e.target.value.toUpperCase() })} />
              {promoValid && (
                <p className={`text-xs mt-1 ${promoValid.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{promoValid.label}</p>
              )}
              {duplicatePromo && (
                <p className="text-xs mt-1 text-red-700 font-medium">
                  Already linked to {duplicatePromo.organizationName} ({duplicatePromo.status}). Choose a unique Partner
                  Community Code.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Create the family discount code first in Content → Promo Codes (do not change checkout engine here). Changing an active partner&apos;s code emails a D18 notice (not the full D2/D3/D4 welcome pack). Official Grant Account is registered and updated only by SELPIC in this form (partners request changes from Lookup).</p>
            </div>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FundraisingPartnerStatus })}>
              <option value="pending">pending</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="terminated">terminated</option>
            </select>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Account name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="BSB" value={form.bsb} onChange={(e) => setForm({ ...form, bsb: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
            </div>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="ABN (Australian Business Number)"
              value={form.abn}
              onChange={(e) => setForm({ ...form, abn: e.target.value })}
            />
            <p className="text-xs text-gray-500 -mt-1">SELPIC registers Official Grant Account here after verifying the organisation. ABN is required for completeness. Partners can only request changes from Lookup.</p>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs">
                <span className="font-medium text-gray-700">Fundraising Cashback Grant %</span>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 10"
                  value={form.donationRate}
                  onChange={(e) => setForm({ ...form, donationRate: Number(e.target.value) })}
                />
              </label>
              <label className="block text-xs">
                <span className="font-medium text-gray-700">Family discount display %</span>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 10"
                  value={form.parentDisplayRate}
                  onChange={(e) => setForm({ ...form, parentDisplayRate: Number(e.target.value) })}
                />
              </label>
              <label className="block text-xs">
                <span className="font-medium text-gray-700">Rate effective from</span>
                <input
                  type="date"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </label>
            </div>
            <label className="block text-xs">
              <span className="font-medium text-gray-700">Change reason</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Required when updating partner / rates / bank"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.sendWelcomePack} onChange={(e) => setForm({ ...form, sendWelcomePack: e.target.checked })} />
              Email welcome pack (D2/D3/D4 + lookup link) only on first activation (not when re-saving Active)
            </label>
            <button type="button" onClick={() => void save()} className="w-full rounded-lg bg-emerald-600 text-white py-2 font-semibold hover:bg-emerald-700">Save partner</button>
          </div>

          <FundraisingChangeRequestsPanel
            mode="partner"
            partnerId={form.id || null}
            partnerLabel={form.organizationName || undefined}
            requests={changeRequests}
            partners={partners}
            onRefresh={syncFromServer}
            onMessage={setMessage}
            onLoadPartner={loadPartnerFromChangeRequest}
          />
          </div>

          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="font-semibold">
                  Partners ({filteredPartners.length}
                  {statusFilter !== 'all' || attentionFilter !== 'none' || searchQuery.trim()
                    ? ` / ${partners.length}`
                    : ''}
                  )
                </h2>
                <button type="button" className="text-xs text-blue-600" onClick={() => setShowSecrets((v) => !v)}>
                  {showSecrets ? 'Hide bank details' : 'Show bank details'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, email, code, ABN, phone…"
                  className="flex-1 min-w-[12rem] border rounded-lg px-3 py-1.5 text-sm"
                  aria-label="Search partners"
                />
                <label className="text-xs text-slate-600 flex items-center gap-1.5">
                  Sort
                  <select
                    className="border rounded-lg px-2 py-1.5 text-xs bg-white"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as PartnerRegistrySort)}
                  >
                    <option value="updated">Updated (newest)</option>
                    <option value="name">Organisation A–Z</option>
                    <option value="termEnd">Term end (soonest)</option>
                    <option value="status">Status</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex flex-wrap rounded-lg border overflow-hidden text-xs">
                  {(
                    [
                      ['all', 'All'],
                      ['pending', `Pending (${pendingCount})`],
                      ['active', `Active (${activeCount})`],
                      ['ended', `Ended (${endedCount})`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`px-2.5 py-1.5 ${statusFilter === key ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => setStatusFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="text-xs text-slate-600 flex items-center gap-1.5">
                  Needs attention
                  <select
                    className="border rounded-lg px-2 py-1.5 text-xs bg-white min-w-[11rem]"
                    value={attentionFilter}
                    onChange={(e) => setAttentionFilter(e.target.value as PartnerRegistryAttentionFilter)}
                  >
                    <option value="none">None</option>
                    <option value="expiring">Term ending ({expiringCount})</option>
                    <option value="inactive">No sales ({inactiveCount})</option>
                    <option value="missing_grant">Missing grant a/c ({missingGrantCount})</option>
                    <option value="eligible_delete">Eligible to delete ({eligibleDeleteCount})</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="divide-y max-h-[40rem] overflow-y-auto">
              {filteredPartners.length === 0 && (
                <p className="p-4 text-sm text-gray-500">
                  {partners.length === 0
                    ? 'No partners yet. Public applications appear here after Sync (and after running fundraising SQL in Supabase).'
                    : 'No partners match this search / filter.'}
                </p>
              )}
              {pagedPartners.map((p) => {
                const inactive = isInactivePartner(p, orders, settings)
                const expiring = isTermExpiringSoon(p, settings)
                const expired = isTermExpired(p)
                const lastSale = lastCommunitySaleAt(p, orders)
                const hasGrant = partnerHasOfficialGrantAccount(p)
                const retentionPartner = isEndedPartnershipStatus(p.status)
                  ? ensureLegalRetention(p, settings)
                  : p
                const phase = legalRetentionPhase(p, settings)
                const canDeleteApp =
                  !isEndedPartnershipStatus(p.status) || isEligibleForAppDeletion(retentionPartner, settings)
                return (
                <div
                  key={p.id}
                  className={`p-4 text-sm ${
                    form.id === p.id
                      ? 'ring-2 ring-inset ring-sky-400 bg-sky-50/40'
                      : p.status === 'pending'
                      ? 'bg-amber-50/50'
                      : phase === 'eligible_delete'
                        ? 'bg-emerald-50/50'
                        : phase === 'retaining'
                          ? 'bg-slate-50'
                          : inactive
                            ? 'bg-orange-50/40'
                            : ''
                  }`}
                >
                  <div className="font-medium text-gray-900 flex flex-wrap items-center gap-2">
                    <span>{p.organizationName}</span>
                    {(openChangeRequestCountByPartner.get(p.id) || 0) > 0 && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-900">
                        {openChangeRequestCountByPartner.get(p.id)} open request
                        {openChangeRequestCountByPartner.get(p.id) === 1 ? '' : 's'}
                      </span>
                    )}
                    {expiring && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                        Term ending
                      </span>
                    )}
                    {expired && p.status === 'active' && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                        Term expired
                      </span>
                    )}
                    {inactive && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-900">
                        No sales {settings.inactivityMonths || 6}mo+
                      </span>
                    )}
                    {p.status === 'active' && !hasGrant && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900">
                        Missing grant account
                      </span>
                    )}
                    {phase === 'retaining' && (
                      <span
                        className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-white"
                        title={`Keep until ${formatRetentionUntil(retentionPartner.retentionUntil)}`}
                      >
                        Legal retention
                      </span>
                    )}
                    {phase === 'eligible_delete' && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                        Eligible for deletion
                      </span>
                    )}
                    {p.renewalIntent === 'wants_renew' && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                        Wants renew
                      </span>
                    )}
                    {p.renewalIntent === 'declines' && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        Declined renew
                      </span>
                    )}
                  </div>
                  <div className="text-gray-600">{p.contactEmail} · {p.linkedPromoCode || 'No code yet'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.termStartsAt || p.termEndsAt
                      ? `Term: ${formatTermDate(p.termStartsAt)} → ${formatTermDate(p.termEndsAt)}`
                      : 'Term: not set (re-save as Active to start a 12-month term)'}
                    {lastSale
                      ? ` · Last sale ${formatTermDate(lastSale)}`
                      : p.status === 'active' && p.linkedPromoCode
                        ? ' · No sales yet'
                        : ''}
                  </div>
                  {isEndedPartnershipStatus(p.status) && (
                    <div className="text-xs text-slate-600 mt-0.5">
                      Legal archive · ended {formatRetentionUntil(retentionPartner.partnershipEndedAt)} · retain until{' '}
                      <strong>{formatRetentionUntil(retentionPartner.retentionUntil)}</strong>
                      {phase === 'retaining' && retentionDaysRemaining(retentionPartner) != null
                        ? ` · ${retentionDaysRemaining(retentionPartner)} days left`
                        : ''}
                      {phase === 'eligible_delete' ? ' · retention elapsed — manual delete allowed' : ''}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.organizationType ? FUNDRAISING_ORG_TYPE_LABELS[p.organizationType] : '—'}
                    {p.sampleKitRequested || p.sampleKitStatus === 'requested'
                      ? p.sampleKitPrintName
                        ? ` · Personalised sample requested (print: ${p.sampleKitPrintName})`
                        : ' · Personalised sample requested'
                      : ''}
                    {p.sampleKitStatus === 'dispatched' ? ' · Personalised sample dispatched' : ''}
                    {p.enableRcti ? ' · RCTI enabled' : ''}
                  </div>
                  <div className="text-gray-500 mt-1">
                    {p.bsb || p.accountNumber || p.abn
                      ? showSecrets
                        ? `ABN ${p.abn || '—'} · BSB ${p.bsb || '—'} / Acc ${p.accountNumber || '—'}`
                        : `ABN ${p.abn || '—'} · ${maskBsb(p.bsb)} / ${maskAccount(p.accountNumber)}`
                      : 'Official Grant Account: not registered yet'}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs">{p.status}</span>
                    {p.status === 'pending' && (
                      <button type="button" className="text-xs text-emerald-700 font-semibold" onClick={() => approve(p)}>
                        Approve…
                      </button>
                    )}
                    <button type="button" className="text-xs text-blue-600 font-medium" onClick={() => edit(p.id)}>
                      Edit
                    </button>
                    {p.status === 'active' && (
                      <button
                        type="button"
                        className="text-xs text-red-600 font-medium"
                        onClick={() => void markSuspended(p.id, 'suspended')}
                      >
                        Suspend
                      </button>
                    )}
                    {p.status === 'suspended' && (
                      <button
                        type="button"
                        className="text-xs text-amber-700 font-medium"
                        onClick={() => void reactivatePartner(p.id)}
                      >
                        Reactivate
                      </button>
                    )}
                    {(p.status === 'active' ||
                      p.status === 'suspended' ||
                      p.status === 'terminated' ||
                      canDeleteApp) && (
                      <select
                        className="text-xs border rounded-lg px-2 py-1 bg-white text-slate-700"
                        defaultValue=""
                        aria-label={`More actions for ${p.organizationName}`}
                        onChange={(e) => {
                          const action = e.target.value
                          e.target.value = ''
                          if (!action) return
                          if (action === 'reset_link') void resetAccessLink(p.id)
                          else if (action === 'd19') void sendRenewalNotice(p.id)
                          else if (action === 'extend') void extendTermYear(p.id)
                          else if (action === 'd5') void dispatchSampleKit(p.id)
                          else if (action === 'd21') void sendNonRenewalAck(p.id)
                          else if (action === 'terminate') void markSuspended(p.id, 'terminated')
                          else if (action === 'reactivate') void reactivatePartner(p.id)
                          else if (action === 'delete') void deletePartner(p.id)
                        }}
                      >
                        <option value="">More…</option>
                        {p.status === 'active' && (
                          <>
                            <option value="reset_link">Reset access link</option>
                            <option value="d19">Send renewal (D19)</option>
                            <option value="extend">Extend +1 year</option>
                            {(p.sampleKitRequested || p.sampleKitStatus === 'requested') &&
                              p.sampleKitStatus !== 'dispatched' && (
                                <option value="d5">Dispatch personalised sample (D5)</option>
                              )}
                            {p.renewalIntent !== 'declines' && (
                              <option value="d21">Send non-renewal (D21)</option>
                            )}
                            <option value="terminate">Terminate (D12+D13)</option>
                          </>
                        )}
                        {p.status === 'suspended' && (
                          <option value="terminate">Terminate (D12+D13)</option>
                        )}
                        {p.status === 'terminated' && (
                          <option value="reactivate">Reactivate</option>
                        )}
                        {canDeleteApp ? (
                          <option value="delete">
                            {phase === 'eligible_delete' ? 'Delete (retention elapsed)' : 'Delete'}
                          </option>
                        ) : (
                          <option value="" disabled>
                            Delete locked until {formatRetentionUntil(retentionPartner.retentionUntil)}
                          </option>
                        )}
                      </select>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
            {filteredPartners.length > PARTNER_REGISTRY_PAGE_SIZE && (
              <div className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  Page {pageSafe} of {totalPages} · showing {(pageSafe - 1) * PARTNER_REGISTRY_PAGE_SIZE + 1}–
                  {Math.min(pageSafe * PARTNER_REGISTRY_PAGE_SIZE, filteredPartners.length)} of{' '}
                  {filteredPartners.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pageSafe <= 1}
                    className="px-2.5 py-1 rounded border bg-white disabled:opacity-40"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pageSafe >= totalPages}
                    className="px-2.5 py-1 rounded border bg-white disabled:opacity-40"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">
                Official Grant Account history
                {form.id && form.organizationName ? (
                  <span className="font-normal text-slate-600"> · {form.organizationName}</span>
                ) : null}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {form.id
                  ? 'Showing events for the partner open in the editor. Clear the form to see all partners.'
                  : 'All partners. Open a partner in the editor to focus history on one organization.'}
              </p>
            </div>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {scopedGrantAccountEvents.length === 0 && (
              <p className="p-4 text-sm text-gray-500">
                {form.id
                  ? 'No grant-account events for this partner yet.'
                  : (
                    <>
                      No grant-account events yet. After Sync, Lookup register/update events appear here. Run{' '}
                      <code className="text-xs bg-gray-100 px-1 rounded">docs/fundraising-grant-account-events.sql</code>{' '}
                      in Supabase if the table is missing.
                    </>
                  )}
              </p>
            )}
            {scopedGrantAccountEvents.map((ev) => (
              <div key={ev.id} className="p-4 text-sm space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium text-gray-900">
                    {form.id ? (
                      <span className="text-xs font-normal text-gray-500">{ev.partnerId}</span>
                    ) : (
                      <>
                        {ev.organizationName}{' '}
                        <span className="text-xs font-normal text-gray-500">({ev.partnerId})</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(ev.changedAt).toLocaleString()} · {ev.kind} · {ev.changedBy}
                  </div>
                </div>
                <div className="text-xs text-gray-700 font-mono">
                  {showSecrets
                    ? `${ev.previous.bsb || '—'} / ${ev.previous.accountNumber || '—'} → ${ev.next.bsb || '—'} / ${ev.next.accountNumber || '—'}`
                    : `${maskBsb(ev.previous.bsb)} / ${maskAccount(ev.previous.accountNumber)} → ${maskBsb(ev.next.bsb)} / ${maskAccount(ev.next.accountNumber)}`}
                </div>
                <div className="text-xs text-gray-600">
                  ABN: {ev.previous.abn || '—'} → {ev.next.abn || '—'}
                  <br />
                  Account name: {ev.previous.accountName || '—'} → {ev.next.accountName || '—'}
                  {ev.next.bankName ? ` · Bank: ${ev.next.bankName}` : ''}
                </div>
                <ul className="text-xs space-y-1">
                  {(ev.emails || []).map((mail, idx) => (
                    <li key={`${ev.id}-${mail.channel}-${idx}`}>
                      <span
                        className={
                          mail.status === 'sent' ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'
                        }
                      >
                        {mail.status.toUpperCase()}
                      </span>{' '}
                      {mail.channel.replace(/_/g, ' ')} → {mail.to}
                      <span className="text-gray-500"> · {mail.subject}</span>
                      {mail.error ? <span className="text-red-600"> · {mail.error}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </FundraisingAdminShell>
    </div>
  )
}
