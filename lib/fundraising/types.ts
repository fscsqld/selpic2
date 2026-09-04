/**
 * SELPIC B2B Fundraising — domain types only.
 * Does not modify promo / checkout / payment engines.
 */

import type { FundraisingPartnerAcquisition } from '@/lib/fundraising/acquisition'

export type { FundraisingPartnerAcquisition } from '@/lib/fundraising/acquisition'

/** Outreach target lifecycle for the Fundraising AI Agent (v1). */
export type FundraisingOutreachTargetStatus =
  | 'PENDING'
  | 'CONTACTED'
  | 'CONVERTED'
  | 'FAILED'
  | 'OPTED_OUT'

export interface FundraisingOutreachTarget {
  id: string
  organizationName: string
  contactEmail?: string
  contactName?: string
  orgType?: string
  state?: string
  status: FundraisingOutreachTargetStatus
  lastSentAt?: string
  lastError?: string
  convertedPartnerId?: string
  /** Extra meta (template id, notes, scrape source later — not used in A1). */
  payload?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type FundraisingPartnerStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'terminated'

export type FundraisingOrganizationType =
  | 'daycare'
  | 'kindergarten'
  | 'primary_school'
  | 'high_school'
  | 'university'
  | 'daycare_kindergarten' // legacy applications
  | 'other'

export const FUNDRAISING_ORG_TYPE_LABELS: Record<FundraisingOrganizationType, string> = {
  daycare: 'Daycare / Early Learning Centre',
  kindergarten: 'Kindergarten',
  primary_school: 'Primary School',
  high_school: 'High School',
  university: 'University / Tertiary',
  daycare_kindergarten: 'Daycare / Kindergarten',
  other: 'Other',
}

/** Options shown on the public application form (excludes legacy aliases). */
export const FUNDRAISING_ORG_TYPE_OPTIONS: FundraisingOrganizationType[] = [
  'daycare',
  'kindergarten',
  'primary_school',
  'high_school',
  'university',
  'other',
]

export type FundraisingSettlementStatus = 'Draft' | 'Ready' | 'Paid' | 'Void'

export type FundraisingDocumentType =
  | 'D1'
  | 'D2'
  | 'D3'
  | 'D4'
  | 'D5'
  | 'D6'
  | 'D7'
  | 'D8'
  | 'D9'
  | 'D10'
  | 'D11'
  | 'D12'
  | 'D13'
  | 'D14'
  | 'D15'
  | 'D16'
  | 'D17'
  | 'D18'
  | 'D19'
  | 'D20'
  | 'D21'
  | 'D22'

export type FundraisingDocumentStatus =
  | 'Draft'
  | 'Generated'
  | 'Sent'
  | 'Archived'
  | 'Failed'

export type FundraisingRenewalIntent = 'pending' | 'wants_renew' | 'declines' | null

export interface FundraisingSettings {
  parentDisplayRate: number
  donationRate: number
  netSalesDefinitionVersion: string
  landingCopyEnabled: boolean
  /** Partnership length after approval (months). Default 12. */
  partnershipTermMonths: number
  /** Send renewal intent email when this many days remain. Default 45. */
  renewalNoticeDays: number
  /** Flag partners with no community-code sales for this many months. Default 6. */
  inactivityMonths: number
  /**
   * Years to keep ended (suspended/terminated) partner records in the legal retention archive
   * before admins may delete app rows. Default 7 (ATO ~5 years + company financial records).
   */
  legalRetentionYears: number
  /**
   * When true, daily cron may auto-send up to Sydney remaining slots (≤10) of PENDING targets.
   * Default false — HITL Confirm Send remains the safe path until ops turns this on.
   */
  outreachAutoSendEnabled?: boolean
  /** Last auto-send attempt (cron or admin Run now). */
  outreachAutoSendLastRunAt?: string
  /** Short last auto-send summary for Agent UI. */
  outreachAutoSendLastResult?: string
  updatedAt: string
}

export interface FundraisingPartner {
  id: string
  organizationName: string
  organizationType?: FundraisingOrganizationType
  contactName: string
  contactEmail: string
  phone?: string
  /** Combined postal line for documents / legacy display */
  postalAddress?: string
  streetAddress?: string
  suburb?: string
  state?: string
  postcode?: string
  /** True only when the organisation asked for a personalised name-sticker sample (never auto). */
  sampleKitRequested?: boolean
  /** Name to print on the sample sticker (required when sampleKitRequested). */
  sampleKitPrintName?: string
  /** Personalised sample fulfilment for D5 lifecycle */
  sampleKitStatus?: 'none' | 'requested' | 'dispatched'
  /** When true, D11 RCTI may be issued with Mark Paid */
  enableRcti?: boolean
  /** Empty until admin assigns a Promo Code on approval */
  linkedPromoCode: string
  /**
   * Current Fundraising Cashback Grant % for this partner (cloud-synced on partner payload).
   * When unset, global fundraising_settings.donationRate applies.
   */
  donationRate?: number
  /** Current parent checkout display / flyer % (cloud-synced). */
  parentDisplayRate?: number
  /** Dated rate history synced with the partner row (no separate rates table). */
  rateSchedule?: FundraisingPartnerRate[]
  status: FundraisingPartnerStatus
  /** Secret URL token for /fundraising/lookup?token=… (32+ hex chars) */
  lookupToken?: string
  lookupTokenCreatedAt?: string
  bankName?: string
  accountName?: string
  bsb?: string
  accountNumber?: string
  /** Australian Business Number — 11 digits (Official Grant Account / payee profile) */
  abn?: string
  notes?: string
  /** First approval / activation timestamp */
  approvedAt?: string
  /** Current partnership term window (typically 12 months) */
  termStartsAt?: string
  termEndsAt?: string
  /** When D19 renewal intent notice was last emailed */
  renewalNoticeSentAt?: string
  /** Partner response to renewal (Lookup or admin) */
  renewalIntent?: FundraisingRenewalIntent
  /**
   * When partnership was suspended/terminated (start of legal retention clock).
   * Auto-set on end; used with retentionUntil for archive classification.
   */
  partnershipEndedAt?: string
  /** Auto classification for ended partners held for AU tax/company record-keeping. */
  retentionArchiveClass?: 'legal_retention'
  /** After this ISO date, admin may delete app rows (manual only). */
  retentionUntil?: string
  /** Years applied when retentionUntil was computed (audit). */
  retentionYearsApplied?: number
  /**
   * Optional acquisition attribution (AI agent / UTM).
   * Omit for organic apply — must stay optional forever.
   */
  acquisition?: FundraisingPartnerAcquisition
  createdAt: string
  updatedAt: string
}

export interface FundraisingPartnerRate {
  id: string
  partnerId: string
  donationRate: number
  parentDisplayRate: number
  effectiveFrom: string
  effectiveTo?: string | null
  createdAt: string
}

export interface FundraisingSettlement {
  id: string
  partnerId: string
  promoCode: string
  period: string
  grossSales: number
  netSales: number
  commissionAmount: number
  rateApplied: number
  orderCount: number
  status: FundraisingSettlementStatus
  paidAt?: string
  paidBy?: string
  paymentReference?: string
  bankSnapshot?: string
  createdAt: string
  updatedAt: string
}

export interface FundraisingDocument {
  id: string
  type: FundraisingDocumentType
  partnerId?: string
  period?: string
  status: FundraisingDocumentStatus
  title: string
  htmlBody: string
  snapshotData?: Record<string, unknown>
  sendLogId?: string
  createdAt: string
  updatedAt: string
  sentAt?: string
}

export interface FundraisingRateLog {
  id: string
  partnerId?: string
  field: string
  oldValue: string
  newValue: string
  reason: string
  changedBy: string
  changedAt: string
}

/** Canonical Total Community Support definition — document footers must use this exact string. */
export const TOTAL_COMMUNITY_SUPPORT_DEFINITION_VERSION =
  'v2-discounted-subtotal-minus-refunds-exclude-shipping' as const

export const DEFAULT_FUNDRAISING_SETTINGS: FundraisingSettings = {
  parentDisplayRate: 5,
  donationRate: 15,
  netSalesDefinitionVersion: TOTAL_COMMUNITY_SUPPORT_DEFINITION_VERSION,
  landingCopyEnabled: true,
  partnershipTermMonths: 12,
  renewalNoticeDays: 45,
  inactivityMonths: 6,
  legalRetentionYears: 7,
  outreachAutoSendEnabled: false,
  updatedAt: new Date().toISOString(),
}

export const FUNDRAISING_DOCUMENT_LABELS: Record<FundraisingDocumentType, string> = {
  D1: 'Partnership Application Acknowledgement',
  D2: 'Welcome & Enrolment Notice',
  D3: 'Partnership Terms Summary',
  D4: 'Partner Community Code Letter',
  D5: 'Personalised Name-Sticker Sample Dispatch',
  D6: 'Family Share Kit',
  D7: 'Mid-period Community Impact Snapshot',
  D8: 'Grant Rate Change Notice',
  D9: 'Quarterly Community Support & Grant Statement',
  D10: 'Fundraising Cashback Grant Remittance',
  D11: 'Tax Invoice / RCTI (placeholder)',
  D12: 'Suspension / Termination Notice',
  D13: 'Final Fundraising Cashback Grant Statement',
  D14: 'Internal Grant Transfer Checklist',
  D15: 'Settlement Audit Pack',
  D16: 'Official Grant Account Update Confirmation',
  D17: 'Admin Grant Account Alert',
  D18: 'Partner Community Code Change Notice',
  D19: 'Partnership Renewal Reminder',
  D20: 'Partnership Renewal Confirmation',
  D21: 'Partnership Non-Renewal Acknowledgement',
  D22: 'Partnership Change Request Form',
}

/**
 * Admin Save partner (first activation + welcome pack) emails — send in this order only.
 * D2 welcome → D3 terms → D4 community code (actionable code last among the pack).
 * Do not include D18 here; D18 is for later code changes on an already-active partner.
 */
export const FUNDRAISING_WELCOME_PACK_ORDER = ['D2', 'D3', 'D4'] as const satisfies readonly FundraisingDocumentType[]


export type FundraisingGrantAccountSnapshot = {
  bankName?: string
  accountName?: string
  bsb?: string
  accountNumber?: string
  abn?: string
}

export type FundraisingGrantAccountEmailLog = {
  channel: 'partner_grant_account_confirm' | 'admin_grant_account_alert'
  to: string
  subject: string
  status: 'sent' | 'failed'
  error?: string
  sentAt: string
}

export type FundraisingGrantAccountEvent = {
  id: string
  partnerId: string
  organizationName: string
  kind: 'registered' | 'updated'
  changedBy: 'partner_lookup' | 'admin'
  changedAt: string
  previous: FundraisingGrantAccountSnapshot
  next: FundraisingGrantAccountSnapshot
  emails: FundraisingGrantAccountEmailLog[]
}

/** Partner Lookup change-request intake (admin queue; no auto-apply). */
export type FundraisingChangeRequestKind = 'grant_account' | 'contact' | 'other'

export type FundraisingChangeRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'awaiting_partner'
  | 'partner_replied'
  | 'applied'
  | 'declined'
  | 'closed'

export const FUNDRAISING_CHANGE_REQUEST_OPEN_STATUSES: FundraisingChangeRequestStatus[] = [
  'submitted',
  'under_review',
  'awaiting_partner',
  'partner_replied',
]

export type FundraisingChangeRequestProposed = {
  bankName?: string
  accountName?: string
  abn?: string
  bsb?: string
  accountNumber?: string
  contactName?: string
  contactEmail?: string
  phone?: string
}

export type FundraisingChangeRequestAttachment = {
  id: string
  fileName: string
  contentType: string
  size: number
  storagePath: string
  /** Public or signed URL for admin download when available */
  fileUrl?: string
  uploadedAt: string
}

export type FundraisingChangeRequest = {
  id: string
  partnerId: string
  organizationName: string
  kind: FundraisingChangeRequestKind
  status: FundraisingChangeRequestStatus
  message: string
  /** Optional legacy / admin-prefill only — partners no longer submit bank fields at intake */
  proposed?: FundraisingChangeRequestProposed
  partnerReply?: string
  attachments?: FundraisingChangeRequestAttachment[]
  adminNotes?: string
  documentIds?: string[]
  packSentAt?: string
  submittedBy: 'partner_lookup'
  createdAt: string
  updatedAt: string
  closedAt?: string
  closedBy?: string
}
