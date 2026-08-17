'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_FUNDRAISING_SETTINGS,
  FundraisingDocument,
  FundraisingDocumentStatus,
  FundraisingDocumentType,
  FundraisingPartner,
  FundraisingPartnerRate,
  FundraisingPartnerStatus,
  FundraisingRateLog,
  FundraisingSettings,
  FundraisingSettlement,
  FundraisingSettlementStatus,
  FUNDRAISING_DOCUMENT_LABELS,
} from '@/lib/fundraising/types'
import { maskAccount as maskAccountImpl, maskBsb as maskBsbImpl } from '@/lib/fundraising/mask'
import { newFundraisingId, newPartnerId } from '@/lib/fundraising/ids'
import { resolvePartnerGrantRates } from '@/lib/fundraising/partnerRates'
import { healFundraisingDocument, healFundraisingDocumentHtml } from '@/lib/fundraising/partnerFacingSite'

function id(prefix: string): string {
  return newFundraisingId(prefix)
}

interface FundraisingStore {
  settings: FundraisingSettings
  partners: FundraisingPartner[]
  rates: FundraisingPartnerRate[]
  settlements: FundraisingSettlement[]
  documents: FundraisingDocument[]
  rateLogs: FundraisingRateLog[]

  updateSettings: (patch: Partial<FundraisingSettings>) => void
  upsertPartner: (partner: Omit<FundraisingPartner, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }) => FundraisingPartner
  mergeRemote: (payload: {
    partners?: FundraisingPartner[]
    documents?: FundraisingDocument[]
    settlements?: FundraisingSettlement[]
    settings?: FundraisingSettings
  }) => void
  setPartnerStatus: (partnerId: string, status: FundraisingPartnerStatus) => void
  removePartner: (partnerId: string) => void
  addPartnerRate: (
    rate: Omit<FundraisingPartnerRate, 'id' | 'createdAt'>,
    meta: { reason: string; changedBy: string }
  ) => FundraisingPartnerRate
  logChange: (entry: Omit<FundraisingRateLog, 'id' | 'changedAt'>) => void
  upsertSettlement: (settlement: FundraisingSettlement) => void
  markSettlementPaid: (
    settlementId: string,
    meta: { paidBy: string; paymentReference: string; bankSnapshot: string }
  ) => void
  addDocument: (doc: Omit<FundraisingDocument, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => FundraisingDocument
  updateDocumentStatus: (documentId: string, status: FundraisingDocumentStatus, extra?: Partial<FundraisingDocument>) => void
  getPartnerById: (id: string) => FundraisingPartner | undefined
  getActiveRateForPartner: (partnerId: string, onDateIso?: string) => { donationRate: number; parentDisplayRate: number }
}

export const useFundraisingStore = create<FundraisingStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_FUNDRAISING_SETTINGS,
      partners: [],
      rates: [],
      settlements: [],
      documents: [],
      rateLogs: [],

      updateSettings: (patch) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        }))
      },

      upsertPartner: (input) => {
        const now = new Date().toISOString()
        const existing = input.id ? get().partners.find((p) => p.id === input.id) : undefined
        const partner: FundraisingPartner = existing
          ? {
              ...existing,
              ...input,
              id: existing.id,
              linkedPromoCode: String(input.linkedPromoCode ?? existing.linkedPromoCode).trim().toUpperCase(),
              updatedAt: now,
            }
          : {
              organizationName: input.organizationName,
              organizationType: input.organizationType,
              contactName: input.contactName,
              contactEmail: input.contactEmail,
              phone: input.phone,
              postalAddress: input.postalAddress,
              streetAddress: input.streetAddress,
              suburb: input.suburb,
              state: input.state,
              postcode: input.postcode,
              sampleKitRequested: input.sampleKitRequested,
              sampleKitStatus: input.sampleKitStatus,
              enableRcti: input.enableRcti,
              linkedPromoCode: String(input.linkedPromoCode || '').trim().toUpperCase(),
              status: input.status || 'pending',
              lookupToken: input.lookupToken,
              lookupTokenCreatedAt: input.lookupTokenCreatedAt,
              bankName: input.bankName,
              accountName: input.accountName,
              bsb: input.bsb,
              accountNumber: input.accountNumber,
              abn: input.abn,
              notes: input.notes,
              approvedAt: input.approvedAt,
              termStartsAt: input.termStartsAt,
              termEndsAt: input.termEndsAt,
              renewalNoticeSentAt: input.renewalNoticeSentAt,
              renewalIntent: input.renewalIntent,
              partnershipEndedAt: input.partnershipEndedAt,
              retentionArchiveClass: input.retentionArchiveClass,
              retentionUntil: input.retentionUntil,
              retentionYearsApplied: input.retentionYearsApplied,
              id: input.id || newPartnerId(input.organizationName || 'ORG'),
              createdAt: input.createdAt || now,
              updatedAt: now,
            }

        set((state) => ({
          partners: existing
            ? state.partners.map((p) => (p.id === partner.id ? partner : p))
            : [partner, ...state.partners.filter((p) => p.id !== partner.id)],
        }))
        return partner
      },

      mergeRemote: (payload) => {
        set((state) => {
          const byId = <T extends { id: string }>(local: T[], remote?: T[]) => {
            if (!remote?.length) return local
            const map = new Map<string, T>()
            for (const row of local) map.set(row.id, row)
            for (const row of remote) map.set(row.id, row)
            return Array.from(map.values())
          }
          const partners = byId(state.partners, payload.partners)
          // Hydrate local rate index from cloud partner.rateSchedule so Grant Tracker matches other devices.
          const rateMap = new Map<string, FundraisingPartnerRate>()
          for (const r of state.rates) rateMap.set(r.id, r)
          for (const p of partners) {
            for (const r of p.rateSchedule || []) {
              rateMap.set(r.id, { ...r, partnerId: r.partnerId || p.id })
            }
          }
          return {
            settings: payload.settings ? { ...state.settings, ...payload.settings } : state.settings,
            partners,
            documents: byId(state.documents, payload.documents).map((d) => healFundraisingDocument(d)),
            settlements: byId(state.settlements, payload.settlements),
            rates: Array.from(rateMap.values()),
          }
        })
      },

      setPartnerStatus: (partnerId, status) => {
        set((state) => ({
          partners: state.partners.map((p) =>
            p.id === partnerId ? { ...p, status, updatedAt: new Date().toISOString() } : p
          ),
        }))
      },

      removePartner: (partnerId) => {
        set((state) => ({
          partners: state.partners.filter((p) => p.id !== partnerId),
          rates: state.rates.filter((r) => r.partnerId !== partnerId),
          settlements: state.settlements.filter((s) => s.partnerId !== partnerId),
          documents: state.documents.filter((d) => d.partnerId !== partnerId),
          rateLogs: state.rateLogs.filter((l) => l.partnerId !== partnerId),
        }))
      },

      addPartnerRate: (rate, meta) => {
        const row: FundraisingPartnerRate = {
          ...rate,
          id: id('fr'),
          createdAt: new Date().toISOString(),
        }
        const prev = get().getActiveRateForPartner(rate.partnerId, rate.effectiveFrom)
        get().logChange({
          partnerId: rate.partnerId,
          field: 'donationRate',
          oldValue: String(prev.donationRate),
          newValue: String(rate.donationRate),
          reason: meta.reason,
          changedBy: meta.changedBy,
        })
        if (prev.parentDisplayRate !== rate.parentDisplayRate) {
          get().logChange({
            partnerId: rate.partnerId,
            field: 'parentDisplayRate',
            oldValue: String(prev.parentDisplayRate),
            newValue: String(rate.parentDisplayRate),
            reason: meta.reason,
            changedBy: meta.changedBy,
          })
        }
        set((state) => ({ rates: [row, ...state.rates] }))
        return row
      },

      logChange: (entry) => {
        const row: FundraisingRateLog = {
          ...entry,
          id: id('flog'),
          changedAt: new Date().toISOString(),
        }
        set((state) => ({ rateLogs: [row, ...state.rateLogs].slice(0, 500) }))
      },

      upsertSettlement: (settlement) => {
        set((state) => {
          const idx = state.settlements.findIndex((s) => s.id === settlement.id)
          if (idx >= 0) {
            const next = [...state.settlements]
            next[idx] = settlement
            return { settlements: next }
          }
          return { settlements: [settlement, ...state.settlements] }
        })
      },

      markSettlementPaid: (settlementId, meta) => {
        const now = new Date().toISOString()
        set((state) => ({
          settlements: state.settlements.map((s) =>
            s.id === settlementId
              ? {
                  ...s,
                  status: 'Paid' as FundraisingSettlementStatus,
                  paidAt: now,
                  paidBy: meta.paidBy,
                  paymentReference: meta.paymentReference,
                  bankSnapshot: meta.bankSnapshot,
                  updatedAt: now,
                }
              : s
          ),
        }))
      },

      addDocument: (input) => {
        const now = new Date().toISOString()
        const doc: FundraisingDocument = {
          type: input.type,
          partnerId: input.partnerId,
          period: input.period,
          status: input.status,
          title: input.title || FUNDRAISING_DOCUMENT_LABELS[input.type],
          htmlBody: healFundraisingDocumentHtml(input.htmlBody),
          snapshotData: input.snapshotData,
          sendLogId: input.sendLogId,
          id: input.id || id('fdoc'),
          createdAt: now,
          updatedAt: now,
          sentAt: input.sentAt,
        }
        set((state) => ({ documents: [doc, ...state.documents] }))
        return doc
      },

      updateDocumentStatus: (documentId, status, extra) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === documentId
              ? {
                  ...d,
                  ...extra,
                  ...(extra?.htmlBody ? { htmlBody: healFundraisingDocumentHtml(extra.htmlBody) } : {}),
                  status,
                  updatedAt: new Date().toISOString(),
                  sentAt: status === 'Sent' ? new Date().toISOString() : d.sentAt,
                }
              : d
          ),
        }))
      },

      getPartnerById: (partnerId) => get().partners.find((p) => p.id === partnerId),

      getActiveRateForPartner: (partnerId, onDateIso) => {
        const partner = get().partners.find((p) => p.id === partnerId)
        return resolvePartnerGrantRates(partner, get().settings, {
          onDateIso,
          partnerId,
          localRates: get().rates,
        })
      },
    }),
    {
      name: 'fundraising-store',
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { documents?: FundraisingDocument[] } | undefined
        if (!state?.documents?.length) return persisted as never
        return {
          ...state,
          documents: state.documents.map((d) => healFundraisingDocument(d)),
        } as never
      },
    }
  )
)

export function maskBsb(bsb?: string): string {
  return maskBsbImpl(bsb)
}

export function maskAccount(accountNumber?: string): string {
  return maskAccountImpl(accountNumber)
}

export function createDraftDocument(input: {
  type: FundraisingDocumentType
  partnerId?: string
  period?: string
  htmlBody: string
  title?: string
  snapshotData?: Record<string, unknown>
}): FundraisingDocument {
  return useFundraisingStore.getState().addDocument({
    type: input.type,
    partnerId: input.partnerId,
    period: input.period,
    status: 'Draft',
    title: input.title || FUNDRAISING_DOCUMENT_LABELS[input.type],
    htmlBody: input.htmlBody,
    snapshotData: input.snapshotData,
  })
}
