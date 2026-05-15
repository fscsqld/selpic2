'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { Plug, RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { startEtsyOAuth, formatEtsySyncSuccessMessage, runEtsyOrderSync } from '@/lib/admin/etsyAdminUi'
import { useEtsyOAuthReturn } from '@/components/admin/useEtsyOAuthReturn'

export default function AdminIntegrationsPage() {
  const [status, setStatus] = useState<{ connected: boolean; shopName?: string | null; shopId?: string } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/integrations/etsy/status', { credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setStatus(data)
    } catch {
      setStatus({ connected: false })
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEtsyOAuthReturn({
    enabled: true,
    onBanner: setMessage,
    afterConnected: loadStatus,
  })

  const runSync = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      const result = await runEtsyOrderSync()
      if (!result.ok) {
        setMessage(result.error ?? 'Sync failed.')
        return
      }
      setMessage(formatEtsySyncSuccessMessage(result.imported, result.scanned, result.sinceDays))
      await loadStatus()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminPageHeader
          title="Integrations"
          icon={<Plug className="w-6 h-6" />}
          showBackButton
          backUrl="/admin/dashboard"
          backLabel="Dashboard"
          showHomepageLink={false}
          showLanguageSelector={false}
        />
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Plug className="w-5 h-5 text-orange-600" />
              Etsy Open API v3
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Connect your Etsy seller account (OAuth 2.0 + PKCE). After approval you return to this page (or the page
              where you started Connect). Sync imports paid receipts that are not yet shipped (open for fulfillment),
              maps <code className="text-xs">formatted_address</code> for shipping labels, and maps personalization
              into each line item.
            </p>
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1 mb-4">
              <li>
                Set <code className="text-xs">ETSY_CLIENT_ID</code>, <code className="text-xs">ETSY_CLIENT_SECRET</code>{' '}
                (if issued), and <code className="text-xs">ETSY_OAUTH_REDIRECT_URI</code> in <code className="text-xs">.env</code>{' '}
                (see <code className="text-xs">.env.example</code>). Run <code className="text-xs">docs/etsy-oauth-supabase.sql</code>{' '}
                in Supabase.
              </li>
              <li>Etsy requires HTTPS callback URLs registered on the app; use a tunnel for local OAuth if needed.</li>
              <li>
                <strong>Connect Etsy</strong> requests order-sync scopes only:{' '}
                <code className="text-xs">shops_r</code>, <code className="text-xs">transactions_r</code>,{' '}
                <code className="text-xs">address_r</code>.
              </li>
              <li>
                Optional automated import: set <code className="text-xs">CRON_SECRET</code> in Vercel, then call{' '}
                <code className="text-xs">GET /api/cron/etsy-sync</code> with{' '}
                <code className="text-xs">Authorization: Bearer &lt;CRON_SECRET&gt;</code> from an external scheduler (Vercel
                Hobby cannot use 10-minute <code className="text-xs">vercel.json</code> crons). Use{' '}
                <strong>Sync Etsy orders</strong> below for manual import anytime.
              </li>
            </ul>

            {message && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              {status?.connected ? (
                <span className="inline-flex items-center gap-1 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected{status.shopName ? ` · ${status.shopName}` : ''}
                  {status.shopId ? ` (shop ${status.shopId})` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4" />
                  Not connected
                </span>
              )}
              {!status?.connected ? (
                <button
                  type="button"
                  onClick={() => startEtsyOAuth('/admin/integrations')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  Connect Etsy
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startEtsyOAuth('/admin/integrations')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 bg-white text-sm font-medium text-orange-900 hover:bg-orange-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  Reconnect Etsy
                </button>
              )}
              <button
                type="button"
                disabled={!status?.connected || syncing}
                onClick={() => void runSync()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync Etsy orders'}
              </button>
              <button type="button" onClick={() => void loadStatus()} className="text-sm text-blue-600 hover:underline">
                Refresh status
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-600">
            <h3 className="font-semibold text-gray-900 mb-2">Extensibility</h3>
            <p>
              Additional marketplaces implement <code className="text-xs">MarketplaceOrderAdapter</code> in{' '}
              <code className="text-xs">lib/orderSources/</code> and register in{' '}
              <code className="text-xs">lib/orderSources/registry.ts</code>. The{' '}
              <code className="text-xs">platform_source</code> column distinguishes channels for reporting and filters.
            </p>
          </section>
        </div>
      </div>
    </AdminRoute>
  )
}
