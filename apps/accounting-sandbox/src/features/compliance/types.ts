/**
 * Compliance Feature - Type Definitions
 */

export interface WorkCoverPolicy {
  id: string
  policyNumber: string
  insurer: string
  startDate: string
  endDate: string
  certificateOfCurrency?: string // PDF URL or Base64
  premium: number
  renewalDate: string
  status: 'active' | 'expired' | 'pending'
  createdAt: string
  updatedAt: string
}

export interface WorkCoverEstimate {
  totalWages: number
  estimatedPremium: number
  rate: number // 보험료율 (%)
  calculationDate: string
  breakdown?: {
    basePremium: number
    adjustments: Array<{
      description: string
      amount: number
    }>
  }
}

export interface TaxDeadline {
  type: 'BAS' | 'PAYG' | 'FBT' | 'Income Tax'
  period: string
  dueDate: string
  daysRemaining: number
  isUrgent: boolean
  isOverdue: boolean
}

export interface CertificateOfCurrency {
  id: string
  policyId: string
  certificateUrl?: string // PDF URL
  certificateBase64?: string // Base64 encoded PDF
  issueDate: string
  expiryDate: string
  uploadedAt: string
  uploadedBy?: string
}
