import type { LodgmentField, LodgmentValidation } from '@/lib/ato-lodgment/types'

export type LodgmentSnapshotKind = 'bas' | 'annual' | 'ctr'

export interface LodgmentSnapshot {
  id: string
  kind: LodgmentSnapshotKind
  periodKey: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  accountType: 'company' | 'sole_trader'
  fields: LodgmentField[]
  entered: Record<string, boolean>
  validation: LodgmentValidation
  finalizedAt: string | null
  createdAt: string
  updatedAt: string
}
