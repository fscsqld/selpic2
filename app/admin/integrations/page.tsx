'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { Plug, RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'

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
    loadStatus()
    const sp = new URLSearchParams(window.location.search)
    const etsy = sp.get('etsy')
    if (etsy === 'connected') setMessage('Etsy connected successfully.')
    if (etsy === 'denied') setMessage('Etsy authorization was cancelled or denied.')
    if (etsy === 'invalid_state') setMessage('OAuth state mismatch — try connecting again.')
    if (etsy === 'error') {
      const d = sp.get('detail')
      setMessage(d ? `Etsy error: ${decodeURIComponent(d)}` : 'Etsy connection failed.')
    }
    if (etsy === 'missing_env') setMessage('Server missing Etsy OAuth environment variables.')
    if (etsy === 'no_db') setMessage('Supabase is not configured.')
  }, [loadStatus])

  const startOAuth = () => {
    window.location.href = '/api/admin/integrations/etsy/oauth/start'
  }

  const runSync = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/integrations/etsy/sync', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sinceDays: 90, openOnly: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(typeof data.error === 'string' ? data.error : 'Sync failed.')
        return
      }
      setMessage(`Synced ${data.imported ?? 0} orders (${data.scanned ?? 0} receipts scanned).`)
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
              Connect your Etsy seller account (OAuth 2.0 + PKCE). After approval you return to the admin dashboard;
              you can also manage the connection here. Sync imports paid receipts that are not yet shipped (open for
              fulfillment), maps <code className="text-xs">formatted_address</code> for shipping labels, and maps
              personalization into each line item.
            </p>
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1 mb-4">
              <li>
                Set <code className="text-xs">ETSY_CLIENT_ID</code>, <code className="text-xs">ETSY_CLIENT_SECRET</code>{' '}
                (if issued), and <code className="text-xs">ETSY_OAUTH_REDIRECT_URI</code> in <code className="text-xs">.env</code>{' '}
                (see <code className="text-xs">.env.example</code>). Run <code className="text-xs">docs/etsy-oauth-supabase.sql</code>{' '}
                in Supabase.
              </li>
              <li>Etsy requires HTTPS callback URLs registered on the app; use a tunnel for local OAuth if needed.</li>
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
              <button
                type="button"
                onClick={startOAuth}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700"
              >
                <ExternalLink className="w-4 h-4" />
                Connect Etsy
              </button>
              <button
                type="button"
                disabled={!status?.connected || syncing}
                onClick={runSync}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync Etsy orders'}
              </button>
              <button type="button" onClick={loadStatus} className="text-sm text-blue-600 hover:underline">
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
