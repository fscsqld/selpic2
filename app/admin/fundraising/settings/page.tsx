'use client'

import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { useFundraisingStore } from '@/lib/fundraising/store'
import { HeartHandshake } from 'lucide-react'
import { useState } from 'react'

export default function FundraisingSettingsPage() {
  return (
    <AdminRoute requiredPermissions={['analytics:read']}>
      <SettingsContent />
    </AdminRoute>
  )
}

function SettingsContent() {
  const settings = useFundraisingStore((s) => s.settings)
  const updateSettings = useFundraisingStore((s) => s.updateSettings)
  const rateLogs = useFundraisingStore((s) => s.rateLogs)
  const [parentDisplayRate, setParentDisplayRate] = useState(settings.parentDisplayRate)
  const [donationRate, setDonationRate] = useState(settings.donationRate)
  const [msg, setMsg] = useState('')

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
        subtitle="Landing page display rates and Net Sales definition. Does not change checkout promo engine values."
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
          <p className="text-xs text-gray-500">Net Sales definition: {settings.netSalesDefinitionVersion}</p>
          <button
            type="button"
            className="rounded-lg bg-emerald-600 text-white px-4 py-2 font-semibold"
            onClick={() => {
              updateSettings({ parentDisplayRate, donationRate })
              const next = {
                ...useFundraisingStore.getState().settings,
                parentDisplayRate,
                donationRate,
                updatedAt: new Date().toISOString(),
              }
              void fetch('/api/admin/fundraising', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: next }),
              })
              setMsg('Settings saved.')
            }}
          >
            Save settings
          </button>
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
