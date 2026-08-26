/**
 * AR/AP subledger and bank reconciliation types.
 */

export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'void'
export type BillStatus = 'draft' | 'received' | 'partial' | 'paid' | 'void'

export interface CustomerInvoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail?: string
  issueDate: string
  dueDate: string
  amount: number
  amountPaid: number
  status: InvoiceStatus
  description?: string
  reference?: string
  createdAt: string
  updatedAt: string
}

export interface VendorBill {
  id: string
  billNumber: string
  vendorName: string
  issueDate: string
  dueDate: string
  amount: number
  amountPaid: number
  status: BillStatus
  description?: string
  reference?: string
  createdAt: string
  updatedAt: string
}

export interface PaymentAllocation {
  id: string
  type: 'ar' | 'ap'
  documentId: string
  transactionId: string
  amount: number
  paymentDate: string
  notes?: string
  createdAt: string
}

export interface BankReconciliationSession {
  id: string
  periodId: string
  statementId?: string
  bankName?: string
  periodStart: string
  periodEnd: string
  statementOpeningBalance: number
  statementClosingBalance: number
  ledgerOpeningBalance: number
  clearedTransactionIds: string[]
  status: 'open' | 'completed'
  difference: number
  notes?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
