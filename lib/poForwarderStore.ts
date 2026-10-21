import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createEmptyForwarderDraft,
  emptyForwarderModeParams,
  type PoForwarderModeParams,
  type PoForwarderRecord,
} from './poForwarderTypes'

interface PoForwarderStoreState {
  forwarders: PoForwarderRecord[]
  upsertForwarder: (
    input: Omit<PoForwarderRecord, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      createdAt?: string
    }
  ) => PoForwarderRecord
  deleteForwarder: (id: string) => void
  getForwarder: (id: string) => PoForwarderRecord | undefined
}

const MAX_FORWARDERS = 50

function createId(): string {
  return `fwd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeMode(
  mode: Partial<PoForwarderModeParams> | undefined,
  fallbackLabel = ''
): PoForwarderModeParams {
  const base = emptyForwarderModeParams(fallbackLabel)
  if (!mode) return base
  const destinationLabel = (mode.destinationLabel || fallbackLabel || '').trim()
  const carton =
    (mode.cartonMarkingTemplate || '').trim() ||
    (destinationLabel ? `SELPIC / ${destinationLabel} / PO No: {PO_NUMBER}` : '')
  return {
    recipientAttn: (mode.recipientAttn || '').trim(),
    hubPhone: (mode.hubPhone || '').trim(),
    domesticAddress: (mode.domesticAddress || '').trim(),
    cartonMarkingTemplate: carton,
    destinationLabel,
  }
}

export const usePoForwarderStore = create<PoForwarderStoreState>()(
  persist(
    (set, get) => ({
      // Empty by design — admins register real hubs (never seed vendor examples).
      forwarders: [],

      upsertForwarder: (input) => {
        const now = new Date().toISOString()
        const existingId = input.id?.trim()
        const prev = existingId ? get().forwarders.find((f) => f.id === existingId) : undefined
        const name = (input.name || '').trim() || 'Untitled forwarder'
        const entry: PoForwarderRecord = {
          id: existingId || createId(),
          name,
          modes: {
            sea: normalizeMode(input.modes?.sea, input.modes?.sea?.destinationLabel || ''),
            air: normalizeMode(input.modes?.air, input.modes?.air?.destinationLabel || ''),
          },
          isActive: input.isActive !== false,
          createdAt: prev?.createdAt || input.createdAt || now,
          updatedAt: now,
        }
        set((state) => {
          const without = state.forwarders.filter((f) => f.id !== entry.id)
          return {
            forwarders: [entry, ...without]
              .sort((a, b) => a.name.localeCompare(b.name, 'en'))
              .slice(0, MAX_FORWARDERS),
          }
        })
        return entry
      },

      deleteForwarder: (id) => {
        set((state) => ({ forwarders: state.forwarders.filter((f) => f.id !== id) }))
      },

      getForwarder: (id) => get().forwarders.find((f) => f.id === id),
    }),
    { name: 'selpic-po-forwarders' }
  )
)

export { createEmptyForwarderDraft }
