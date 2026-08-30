'use client'

import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import {
  ensureLegalRetention,
  isEndedPartnershipStatus,
} from '@/lib/fundraising/legalRetention'
import { useFundraisingStore } from '@/lib/fundraising/store'
import { DEFAULT_FUNDRAISING_SETTINGS } from '@/lib/fundraising/types'
import { logAdminActivity } from '@/lib/logAdminActivity'
import { HeartHandshake } from 'lucide-react'
import { useState } from 'react'

export default function FundraisingSettingsPage() {
  return (
    <AdminRoute requiredPermissions={['fundraising:read']}>
      <SettingsContent />
    </AdminRoute>
  )
}

function SettingsContent() {
  const settings = useFundraisingStore((s) => s.settings)
  const partners = useFundraisingStore((s) => s.partners)
  const updateSettings = useFundraisingStore((s) => s.updateSettings)
  const upsertPartner = useFundraisingStore((s) => s.upsertPartner)
  const mergeRemote = useFundraisingStore((s) => s.mergeRemote)
  const rateLogs = useFundraisingStore((s) => s.rateLogs)
  const [parentDisplayRate, setParentDisplayRate] = useState(settings.parentDisplayRate)
  const [donationRate, setDonationRate] = useState(settings.donationRate)
  const [partnershipTermMonths, setPartnershipTermMonths] = useState(
    settings.partnershipTermMonths ?? DEFAULT_FUNDRAISING_SETTINGS.partnershipTermMonths
  )
  const [renewalNoticeDays, setRenewalNoticeDays] = useState(
    settings.renewalNoticeDays ?? DEFAULT_FUNDRAISING_SETTINGS.renewalNoticeDays
  )
  const [inactivityMonths, setInactivityMonths] = useState(
    settings.inactivityMonths ?? DEFAULT_FUNDRAISING_SETTINGS.inactivityMonths
  )
  const [legalRetentionYears, setLegalRetentionYears] = useState(
    settings.legalRetentionYears ?? DEFAULT_FUNDRAISING_SETTINGS.legalRetentionYears
  )
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const persistPartnerRow = async (partner: (typeof partners)[number]) => {
    const res = await fetch('/api/admin/fundraising', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(json?.error || 'Save failed')
    if (json.partner) upsertPartner({ ...json.partner })
    return true
  }

  const runDueRenewals = async () => {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/fundraising/renewal-cron', { method: 'POST' })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Renewal batch failed')
      const sync = await fetch('/api/admin/fundraising')
      const syncJson = await sync.json().catch(() => null)
      if (sync.ok && syncJson) {
        mergeRemote({
          partners: syncJson.partners,
          documents: syncJson.documents,
          settlements: syncJson.settlements,
          settings: syncJson.settings,
        })
      }
      setMsg(
        `Renewal batch: checked ${json.checked}, sent ${json.sent}, failed ${json.failed}, skipped ${json.skipped}`
      )
      logAdminActivity({
        action: 'fundraising_maintenance_run',
        target: 'renewal-cron',
        field: 'd19_batch',
        newValue: { checked: json.checked, sent: json.sent, failed: json.failed, skipped: json.skipped },
        description: `Fundraising renewal batch · checked ${json.checked}, sent ${json.sent}, failed ${json.failed}, skipped ${json.skipped}`,
      })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Renewal batch failed')
    } finally {
      setBusy(false)
    }
  }

  const classifyLegalRetentionArchives = async () => {
    setBusy(true)
    setMsg('')
    try {
      let updatedCount = 0
      for (const p of partners) {
        if (!isEndedPartnershipStatus(p.status)) continue
        const next = ensureLegalRetention(p, settings)
        if (
          next.partnershipEndedAt === p.partnershipEndedAt &&
          next.retentionUntil === p.retentionUntil &&
          next.retentionArchiveClass === p.retentionArchiveClass
        ) {
          continue
        }
        upsertPartner(next)
        await persistPartnerRow(next)
        updatedCount += 1
      }
      setMsg(
        updatedCount > 0
          ? `Legal retention archive classified for ${updatedCount} ended partner${updatedCount === 1 ? '' : 's'}.`
          : 'All suspended/terminated partners are already classified for legal retention.'
      )
      logAdminActivity({
        action: 'fundraising_maintenance_run',
        target: 'legal-retention',
        field: 'classify',
        newValue: updatedCount,
        description: `Fundraising legal retention classify · ${updatedCount} partner(s) updated`,
      })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Classification failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Fundraising Settings"
        icon={<HeartHandshake className="w-6 h-6" />}
        showBackButton
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />
      <FundraisingAdminShell
        title="Global defaults"
        subtitle="Landing rates, annual partnership term, renewal notice window, and inactivity flags. Does not change checkout Partner Community Code engine values."
        current="/admin/fundraising/settings"
      >
        <div className="bg-white border rounded-xl p-6 max-w-xl space-y-4">
          {msg && <div className="text-sm text-emerald-700">{msg}</div>}
          <label className="block text-sm">
            <span className="font-medium">Default parent display rate (%)</span>
            <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2" value={parentDisplayRate} onChange={(e) => setParentDisplayRate(Number(e.target.value))} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Default donation / cashback rate (%)</span>
            <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2" value={donationRate} onChange={(e) => setDonationRate(Number(e.target.value))} />
          </label>
          <hr className="border-slate-100" />
          <label className="block text-sm">
            <span className="font-medium">Partnership term (months)</span>
            <input type="number" min={1} className="mt-1 w-full border rounded-lg px-3 py-2" value={partnershipTermMonths} onChange={(e) => setPartnershipTermMonths(Number(e.target.value))} />
            <span className="text-xs text-gray-500">Applied when a partner is first approved as Active (default 12).</span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Renewal notice window (days before term end)</span>
            <input type="number" min={0} className="mt-1 w-full border rounded-lg px-3 py-2" value={renewalNoticeDays} onChange={(e) => setRenewalNoticeDays(Number(e.target.value))} />
            <span className="text-xs text-gray-500">Partners in this window show as “Term ending”; cron or Maintenance → Run due renewals sends D19 once per term.</span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Inactivity flag (months without community-code sales)</span>
            <input type="number" min={1} className="mt-1 w-full border rounded-lg px-3 py-2" value={inactivityMonths} onChange={(e) => setInactivityMonths(Number(e.target.value))} />
            <span className="text-xs text-gray-500">Highlights partners for CS follow-up when no matching orders for this period.</span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Legal retention archive (years)</span>
            <input
              type="number"
              min={1}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={legalRetentionYears}
              onChange={(e) => setLegalRetentionYears(Number(e.target.value))}
            />
            <span className="text-xs text-gray-500">
              When a partnership is suspended or terminated, it is auto-classified into the legal retention archive until
              this many years after the end date (default 7). Admins may delete app rows only after that date; deletion is
              always manual.
            </span>
          </label>
          <p className="text-xs text-gray-500">Net Sales definition: {settings.netSalesDefinitionVersion}</p>
          <p className="text-xs text-gray-500 rounded-lg bg-slate-50 border border-slate-100 p-3">
            Automated D19: Vercel Cron calls GET{' '}
            <code className="text-[11px]">/api/cron/fundraising-renewal</code> once daily at 20:00 UTC
            (morning in Australia). Production must have{' '}
            <code className="text-[11px]">CRON_SECRET</code>. Manual batch is under Maintenance below.
          </p>
          <p className="text-xs text-gray-500 rounded-lg bg-amber-50 border border-amber-100 p-3 leading-relaxed">
            Partnership end emails (D12 / D21) include APP 11.2 + tax retention notice. Suspended/terminated partners are
            auto-filed for legal retention; Partners → Ended / Needs attention → Eligible to delete is for rare manual
            cleanup after the archive years elapse.
          </p>
          <button
            type="button"
            className="rounded-lg bg-emerald-600 text-white px-4 py-2 font-semibold"
            onClick={() => {
              const prev = { ...settings }
              updateSettings({
                parentDisplayRate,
                donationRate,
                partnershipTermMonths,
                renewalNoticeDays,
                inactivityMonths,
                legalRetentionYears,
              })
              const next = {
                ...useFundraisingStore.getState().settings,
                parentDisplayRate,
                donationRate,
                partnershipTermMonths,
                renewalNoticeDays,
                inactivityMonths,
                legalRetentionYears,
                updatedAt: new Date().toISOString(),
              }
              void fetch('/api/admin/fundraising', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: next }),
              })
              logAdminActivity({
                action: 'fundraising_settings_updated',
                target: 'global',
                field: 'fundraising_settings',
                oldValue: {
                  parentDisplayRate: prev.parentDisplayRate,
                  donationRate: prev.donationRate,
                  partnershipTermMonths: prev.partnershipTermMonths,
                  renewalNoticeDays: prev.renewalNoticeDays,
                  inactivityMonths: prev.inactivityMonths,
                  legalRetentionYears: prev.legalRetentionYears,
                },
                newValue: {
                  parentDisplayRate,
                  donationRate,
                  partnershipTermMonths,
                  renewalNoticeDays,
                  inactivityMonths,
                  legalRetentionYears,
                },
                description: `Fundraising settings saved · grant ${prev.donationRate}%→${donationRate}%, parent ${prev.parentDisplayRate}%→${parentDisplayRate}%`,
              })
              setMsg('Settings saved.')
            }}
          >
            Save settings
          </button>
        </div>

        <div className="mt-8 bg-white border rounded-xl p-6 max-w-xl space-y-3">
          <h2 className="font-semibold text-slate-900">Maintenance</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Occasional batch tools — not needed for day-to-day Partner Registry work. Vercel runs D19 daily;
            use this button only if a notice was missed. Classify is for backfilling older ended partners.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="text-sm rounded-lg border border-violet-200 bg-violet-50 text-violet-900 px-3 py-2 font-medium hover:bg-violet-100 disabled:opacity-50"
              onClick={() => void runDueRenewals()}
            >
              Run due renewals (D19)
            </button>
            <button
              type="button"
              disabled={busy}
              className="text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-800 px-3 py-2 font-medium hover:bg-slate-100 disabled:opacity-50"
              onClick={() => void classifyLegalRetentionArchives()}
            >
              Classify legal retention
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Recent rate / bank audit logs</div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {rateLogs.length === 0 && <p className="p-4 text-sm text-gray-500">No changes logged yet.</p>}
            {rateLogs.slice(0, 50).map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <div className="font-medium">{log.field}: {log.oldValue} → {log.newValue}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {new Date(log.changedAt).toLocaleString()} · {log.changedBy} · {log.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </FundraisingAdminShell>
    </div>
  )
}
