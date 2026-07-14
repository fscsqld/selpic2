'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useStore } from '@/lib/store'
import { listSydneyDaysInclusive, toSydneyDay } from '@/lib/analytics/sydney-day'

type DailyTraffic = {
  day: string
  pageviews: number
  uniqueVisitors: number
}

type TrafficResponse = {
  ok: boolean
  timezone?: string
  from?: string
  to?: string
  today?: DailyTraffic
  yesterday?: DailyTraffic
  daily?: DailyTraffic[]
  error?: string
  details?: string
}

function sydneyDayFromOrderIso(iso: string): string {
  return toSydneyDay(iso)
}

export default function AdminTrafficPage() {
  return (
    <AdminRoute requiredPermissions={['analytics:read']}>
      <AdminTrafficPageContent />
    </AdminRoute>
  )
}

function AdminTrafficPageContent() {
  const router = useRouter()
  const { orders } = useStore()
  const [daysBack, setDaysBack] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<TrafficResponse | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics/traffic?days=${daysBack}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const data = (await res.json().catch(() => ({}))) as TrafficResponse
      if (!res.ok || !data?.ok) {
        setPayload(null)
        setError(
          typeof data?.details === 'string'
            ? data.details
            : typeof data?.error === 'string'
              ? data.error
              : 'Failed to load traffic'
        )
        return
      }
      setPayload(data)
    } catch {
      setPayload(null)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [daysBack])

  useEffect(() => {
    void load()
  }, [load])

  const chartRows = useMemo(() => {
    const daily = payload?.daily || []
    const from = payload?.from
    const to = payload?.to
    const dayList =
      from && to ? listSydneyDaysInclusive(from, to) : daily.map((d) => d.day)

    const trafficByDay = new Map(daily.map((d) => [d.day, d]))
    const ordersByDay = new Map<string, { orders: number; revenue: number }>()

    for (const order of orders || []) {
      if (!order || order.status === 'cancelled') continue
      const day = sydneyDayFromOrderIso(order.createdAtIso || '')
      if (!day) continue
      if (from && day < from) continue
      if (to && day > to) continue
      const prev = ordersByDay.get(day) || { orders: 0, revenue: 0 }
      prev.orders += 1
      prev.revenue += Number(order.total) || 0
      ordersByDay.set(day, prev)
    }

    return dayList.map((day) => {
      const t = trafficByDay.get(day)
      const o = ordersByDay.get(day)
      const uniqueVisitors = t?.uniqueVisitors || 0
      const orderCount = o?.orders || 0
      return {
        day,
        uniqueVisitors,
        pageviews: t?.pageviews || 0,
        orders: orderCount,
        revenue: Number((o?.revenue || 0).toFixed(2)),
        conversionPct:
          uniqueVisitors > 0
            ? Number(((orderCount / uniqueVisitors) * 100).toFixed(2))
            : 0,
      }
    })
  }, [orders, payload])

  const totals = useMemo(() => {
    return chartRows.reduce(
      (acc, row) => {
        acc.uniqueVisitors += row.uniqueVisitors
        acc.pageviews += row.pageviews
        acc.orders += row.orders
        acc.revenue += row.revenue
        return acc
      },
      { uniqueVisitors: 0, pageviews: 0, orders: 0, revenue: 0 }
    )
  }, [chartRows])

  const periodConversion =
    totals.uniqueVisitors > 0
      ? Number(((totals.orders / totals.uniqueVisitors) * 100).toFixed(2))
      : 0

  const today = payload?.today
  const yesterday = payload?.yesterday

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-indigo-600" />
              Traffic &amp; Conversion
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Daily unique visitors (Australia/Sydney) vs storefront orders for marketing.
              Tracking starts after deploy + Supabase table setup.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              Today (UV)
            </div>
            <div className="text-2xl font-bold text-indigo-700">
              {today?.uniqueVisitors ?? '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Pageviews: {today?.pageviews ?? '—'}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              Yesterday (UV)
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {yesterday?.uniqueVisitors ?? '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Pageviews: {yesterday?.pageviews ?? '—'}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <ShoppingCart className="w-4 h-4" />
              Period orders
            </div>
            <div className="text-2xl font-bold text-emerald-700">{totals.orders}</div>
            <div className="text-xs text-gray-500 mt-1">
              Revenue: ${totals.revenue.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Period conversion
            </div>
            <div className="text-2xl font-bold text-violet-700">{periodConversion}%</div>
            <div className="text-xs text-gray-500 mt-1">
              Orders ÷ unique visitors (period UV: {totals.uniqueVisitors})
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Daily visitors vs orders
          </h2>
          {loading && !payload ? (
            <div className="h-72 flex items-center justify-center text-sm text-gray-500">
              Loading…
            </div>
          ) : chartRows.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-gray-500">
              No traffic data yet for this range.
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="uniqueVisitors"
                    name="Unique visitors"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Daily detail</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2">Day (Sydney)</th>
                  <th className="px-4 py-2">Unique visitors</th>
                  <th className="px-4 py-2">Pageviews</th>
                  <th className="px-4 py-2">Orders</th>
                  <th className="px-4 py-2">Revenue</th>
                  <th className="px-4 py-2">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {[...chartRows].reverse().map((row) => (
                  <tr key={row.day} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-2 font-medium text-gray-900">{row.day}</td>
                    <td className="px-4 py-2 text-indigo-700 font-semibold">
                      {row.uniqueVisitors}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{row.pageviews}</td>
                    <td className="px-4 py-2 text-emerald-700 font-semibold">{row.orders}</td>
                    <td className="px-4 py-2 text-gray-700">${row.revenue.toFixed(2)}</td>
                    <td className="px-4 py-2 text-violet-700">{row.conversionPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Unique visitors use an anonymous browser ID (no name/email). Admin routes, bots,
          localhost, and Vercel preview hosts are excluded. Run{' '}
          <code className="bg-gray-100 px-1 rounded">docs/site-pageviews-supabase.sql</code>{' '}
          in Supabase before production traffic can be stored.
        </p>
      </div>
    </div>
  )
}
