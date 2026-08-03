'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { useAdminAuth } from '@/lib/adminAuth'
import { useContentStore } from '@/lib/contentStore'
import {
  maskAccount,
  maskBsb,
  useFundraisingStore,
} from '@/lib/fundraising/store'
import {
  FUNDRAISING_ORG_TYPE_LABELS,
  type FundraisingOrganizationType,
  type FundraisingPartner,
  type FundraisingPartnerStatus,
} from '@/lib/fundraising/types'
import { HeartHandshake } from 'lucide-react'

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
  const setPartnerStatus = useFundraisingStore((s) => s.setPartnerStatus)
  const logChange = useFundraisingStore((s) => s.logChange)
  const mergeRemote = useFundraisingStore((s) => s.mergeRemote)

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
    donationRate: settings.donationRate,
    parentDisplayRate: settings.parentDisplayRate,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    reason: '',
    sendWelcomePack: true,
  })
  const [showSecrets, setShowSecrets] = useState(false)
  const [message, setMessage] = useState('')
  const [syncing, setSyncing] = useState(false)

  const pendingCount = useMemo(() => partners.filter((p) => p.status === 'pending').length, [partners])

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
      setMessage(`Synced from server · ${json.partners?.length || 0} partners`)
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
    opts: { sendWelcomePack?: boolean; resetLookupToken?: boolean; emailAccessLink?: boolean } = {}
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
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Cloud save failed')
      if (json.partner) upsertPartner({ ...json.partner, id: json.partner.id })
      if (json.welcomePack?.length) {
        mergeRemote({ documents: json.welcomePack })
      }
      return { ok: true as const, lookupUrl: json.lookupUrl as string | undefined }
    } catch (e) {
      setMessage(
        `${partner.organizationName} saved locally. Cloud sync note: ${e instanceof Error ? e.message : 'failed'}`
      )
      return { ok: false as const, lookupUrl: undefined }
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
    if (!form.reason.trim() && form.id) {
      setMessage('Reason is required when updating partner/rate/bank details.')
      return
    }
    const reason = form.reason.trim() || 'Initial partner registration'
    const changedBy = adminUser?.username || adminUser?.email || 'Admin'

    const existing = form.id ? partners.find((p) => p.id === form.id) : undefined
    if (existing) {
      if ((existing.bsb || '') !== form.bsb || (existing.accountNumber || '') !== form.accountNumber) {
        logChange({
          partnerId: existing.id,
          field: 'bankDetails',
          oldValue: `${maskBsb(existing.bsb)} / ${maskAccount(existing.accountNumber)}`,
          newValue: `${maskBsb(form.bsb)} / ${maskAccount(form.accountNumber)}`,
          reason,
          changedBy,
        })
      }
    }

    const partner = upsertPartner({
      id: form.id || undefined,
      organizationName: form.organizationName,
      organizationType: form.organizationType,
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      phone: form.phone,
      postalAddress: form.postalAddress,
      linkedPromoCode: form.linkedPromoCode,
      status: form.status,
      bankName: form.bankName,
      accountName: form.accountName,
      bsb: form.bsb,
      accountNumber: form.accountNumber,
    })

    addPartnerRate(
      {
        partnerId: partner.id,
        donationRate: Number(form.donationRate),
        parentDisplayRate: Number(form.parentDisplayRate),
        effectiveFrom: form.effectiveFrom,
        effectiveTo: null,
      },
      { reason, changedBy }
    )

    const sendWelcome =
      form.sendWelcomePack &&
      form.status === 'active' &&
      Boolean(form.linkedPromoCode) &&
      (!existing || existing.status !== 'active' || existing.linkedPromoCode !== form.linkedPromoCode.toUpperCase())

    const result = await persistPartner(partner, { sendWelcomePack: sendWelcome })
    const lookupNote = result.lookupUrl ? ` · Lookup: ${result.lookupUrl}` : ''
    setMessage(
      result.ok
        ? `Saved ${partner.organizationName}${sendWelcome ? ' · Welcome pack (D2/D3/D4) emailed' : ''}${lookupNote}`
        : message || `Saved ${partner.organizationName} locally`
    )
    setForm((f) => ({ ...f, id: partner.id, reason: '' }))
  }

  const resetAccessLink = async (partnerId: string) => {
    const p = partners.find((x) => x.id === partnerId)
    if (!p) return
    const result = await persistPartner(p, { resetLookupToken: true, emailAccessLink: true })
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
      donationRate: rate.donationRate,
      parentDisplayRate: rate.parentDisplayRate,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      reason: 'Approved partnership application',
      sendWelcomePack: true,
    })
    setMessage('Fill linked Promo Code + bank details, then Save partner to activate and email welcome pack.')
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
      donationRate: rate.donationRate,
      parentDisplayRate: rate.parentDisplayRate,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      reason: '',
      sendWelcomePack: false,
    })
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
        subtitle="Approve applications, assign promo codes, capture bank details for monthly payout. Promo discount engine stays read-only."
        current="/admin/fundraising/partners"
      >
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => void syncFromServer()}
            disabled={syncing}
            className="text-sm px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync from server'}
          </button>
          {pendingCount > 0 && (
            <span className="text-sm px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
              {pendingCount} pending application{pendingCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {message && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">{message}</div>}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold">{form.id ? 'Edit / approve partner' : 'New partner'}</h2>
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
              <input className="w-full border rounded-lg px-3 py-2 text-sm uppercase" placeholder="Linked Promo Code (required when Active)" value={form.linkedPromoCode} onChange={(e) => setForm({ ...form, linkedPromoCode: e.target.value.toUpperCase() })} />
              {promoValid && (
                <p className={`text-xs mt-1 ${promoValid.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{promoValid.label}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Create the parent discount code first in Content → Promo Codes (do not change checkout engine here).</p>
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
            <div className="grid grid-cols-3 gap-2">
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Donation %" value={form.donationRate} onChange={(e) => setForm({ ...form, donationRate: Number(e.target.value) })} />
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Parent display %" value={form.parentDisplayRate} onChange={(e) => setForm({ ...form, parentDisplayRate: Number(e.target.value) })} />
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
            </div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Change reason (required on update)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.sendWelcomePack} onChange={(e) => setForm({ ...form, sendWelcomePack: e.target.checked })} />
              Email welcome pack (D2/D3/D4 + lookup link) when saving as Active
            </label>
            <button type="button" onClick={() => void save()} className="w-full rounded-lg bg-emerald-600 text-white py-2 font-semibold hover:bg-emerald-700">Save partner</button>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <h2 className="font-semibold">Partners ({partners.length})</h2>
              <button type="button" className="text-xs text-blue-600" onClick={() => setShowSecrets((v) => !v)}>
                {showSecrets ? 'Hide account numbers' : 'Reveal for edit'}
              </button>
            </div>
            <div className="divide-y max-h-[40rem] overflow-y-auto">
              {partners.length === 0 && <p className="p-4 text-sm text-gray-500">No partners yet. Public applications appear here after Sync (and after running fundraising SQL in Supabase).</p>}
              {partners.map((p) => (
                <div key={p.id} className={`p-4 text-sm ${p.status === 'pending' ? 'bg-amber-50/50' : ''}`}>
                  <div className="font-medium text-gray-900">{p.organizationName}</div>
                  <div className="text-gray-600">{p.contactEmail} · {p.linkedPromoCode || 'No code yet'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.organizationType ? FUNDRAISING_ORG_TYPE_LABELS[p.organizationType] : '—'}
                    {p.sampleKitRequested ? ' · Sample kit requested' : ''}
                  </div>
                  <div className="text-gray-500 mt-1">
                    {showSecrets ? `BSB ${p.bsb || '—'} / Acc ${p.accountNumber || '—'}` : `${maskBsb(p.bsb)} / ${maskAccount(p.accountNumber)}`}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs">{p.status}</span>
                    {p.status === 'pending' && (
                      <button type="button" className="text-xs text-emerald-700 font-semibold" onClick={() => approve(p)}>Approve…</button>
                    )}
                    <button type="button" className="text-xs text-blue-600" onClick={() => edit(p.id)}>Edit</button>
                    {p.status === 'active' && (
                      <button type="button" className="text-xs text-indigo-700" onClick={() => void resetAccessLink(p.id)}>
                        Reset Access Link
                      </button>
                    )}
                    <button type="button" className="text-xs text-amber-700" onClick={() => setPartnerStatus(p.id, 'active')}>Mark active</button>
                    <button type="button" className="text-xs text-red-600" onClick={() => setPartnerStatus(p.id, 'suspended')}>Suspend</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FundraisingAdminShell>
    </div>
  )
}
