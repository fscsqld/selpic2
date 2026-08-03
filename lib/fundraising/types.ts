/**
 * SELPIC B2B Fundraising — domain types only.
 * Does not modify promo / checkout / payment engines.
 */

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

export type FundraisingDocumentStatus =
  | 'Draft'
  | 'Generated'
  | 'Sent'
  | 'Archived'
  | 'Failed'

export interface FundraisingSettings {
  parentDisplayRate: number
  donationRate: number
  netSalesDefinitionVersion: string
  landingCopyEnabled: boolean
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
  sampleKitRequested?: boolean
  /** Empty until admin assigns a Promo Code on approval */
  linkedPromoCode: string
  status: FundraisingPartnerStatus
  /** Secret URL token for /fundraising/lookup?token=… (32+ hex chars) */
  lookupToken?: string
  lookupTokenCreatedAt?: string
  bankName?: string
  accountName?: string
  bsb?: string
  accountNumber?: string
  notes?: string
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

export const DEFAULT_FUNDRAISING_SETTINGS: FundraisingSettings = {
  parentDisplayRate: 5,
  donationRate: 15,
  netSalesDefinitionVersion: 'v1-subtotal-minus-refunds-exclude-shipping',
  landingCopyEnabled: true,
  updatedAt: new Date().toISOString(),
}

export const FUNDRAISING_DOCUMENT_LABELS: Record<FundraisingDocumentType, string> = {
  D1: 'Application Acknowledgement',
  D2: 'Welcome & Enrolment Notice',
  D3: 'Terms Summary',
  D4: 'Code Assignment Letter',
  D5: 'Sample Kit Dispatch Note',
  D6: 'Parent Share Kit',
  D7: 'Mid-period Performance Snapshot',
  D8: 'Rate Change Notice',
  D9: 'Monthly Sales & Commission Statement',
  D10: 'Remittance Advice',
  D11: 'Tax Invoice / RCTI (placeholder)',
  D12: 'Suspension / Termination Notice',
  D13: 'Final Settlement Statement',
  D14: 'Internal Payout Checklist',
  D15: 'Settlement Audit Pack',
}
