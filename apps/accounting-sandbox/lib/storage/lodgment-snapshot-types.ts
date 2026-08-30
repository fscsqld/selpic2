import type { LodgmentField, LodgmentValidation } from '@/lib/ato-lodgment/types'

export type LodgmentSnapshotKind = 'bas' | 'annual' | 'ctr' | 'individual'

export interface LodgmentSnapshot {
  id: string
  kind: LodgmentSnapshotKind
  periodKey: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  accountType: 'individual' | 'company' | 'sole_trader'
  fields: LodgmentField[]
  entered: Record<string, boolean>
  validation: LodgmentValidation
  finalizedAt: string | null
  createdAt: string
  updatedAt: string
  /** Optional pre-lodge checklist snapshot (BAS / annual / individual). */
  preLodge?: import('@/lib/ato-lodgment/pre-lodge-checklist').LodgmentSnapshotPreLodge
}
