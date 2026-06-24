import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AdminInboundSummary, InboundSummaryItem } from '@/lib/server/adminInboundSummary'

type AdminInboundStore = {
  summary: AdminInboundSummary
  lastSyncedAt: string | null
  setSummary: (summary: AdminInboundSummary) => void
  getCount: (key: InboundSummaryItem['key']) => number
}

const emptySummary: AdminInboundSummary = { totalCount: 0, items: [] }

export const useAdminInboundStore = create<AdminInboundStore>()(
  persist(
    (set, get) => ({
      summary: emptySummary,
      lastSyncedAt: null,
      setSummary: (summary) =>
        set({
          summary,
          lastSyncedAt: new Date().toISOString(),
        }),
      getCount: (key) => get().summary.items.find((i) => i.key === key)?.count ?? 0,
    }),
    {
      name: 'admin-inbound-summary',
      partialize: (state) => ({
        summary: state.summary,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
)
