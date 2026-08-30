/**
 * AR/AP subledger service — invoices, bills, and payment allocations.
 */

import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { assertDateNotInLockedPeriod } from '@/lib/period-management/storage-guard'
import type {
  BillStatus,
  CustomerInvoice,
  InvoiceStatus,
  PaymentAllocation,
  VendorBill,
} from '@/src/shared/types/subledger'

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function deriveInvoiceStatus(amount: number, amountPaid: number): InvoiceStatus {
  if (amountPaid <= 0) return 'issued'
  if (amountPaid + 0.01 >= amount) return 'paid'
  return 'partial'
}

function deriveBillStatus(amount: number, amountPaid: number): BillStatus {
  if (amountPaid <= 0) return 'received'
  if (amountPaid + 0.01 >= amount) return 'paid'
  return 'partial'
}

export async function createCustomerInvoice(input: {
  invoiceNumber: string
  customerName: string
  customerEmail?: string
  issueDate: string
  dueDate: string
  amount: number
  description?: string
  reference?: string
}): Promise<CustomerInvoice> {
  await assertDateNotInLockedPeriod(input.issueDate)

  const now = new Date().toISOString()
  const invoice: CustomerInvoice = {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    invoiceNumber: input.invoiceNumber.trim(),
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail?.trim(),
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    amount: roundMoney(input.amount),
    amountPaid: 0,
    status: 'issued',
    description: input.description?.trim(),
    reference: input.reference?.trim(),
    createdAt: now,
    updatedAt: now,
  }

  await indexedDBStorage.saveCustomerInvoice(invoice)
  return invoice
}

export async function createVendorBill(input: {
  billNumber: string
  vendorName: string
  issueDate: string
  dueDate: string
  amount: number
  description?: string
  reference?: string
}): Promise<VendorBill> {
  await assertDateNotInLockedPeriod(input.issueDate)

  const now = new Date().toISOString()
  const bill: VendorBill = {
    id: `bill_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    billNumber: input.billNumber.trim(),
    vendorName: input.vendorName.trim(),
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    amount: roundMoney(input.amount),
    amountPaid: 0,
    status: 'received',
    description: input.description?.trim(),
    reference: input.reference?.trim(),
    createdAt: now,
    updatedAt: now,
  }

  await indexedDBStorage.saveVendorBill(bill)
  return bill
}

async function refreshDocumentPayments(
  type: 'ar' | 'ap',
  documentId: string
): Promise<void> {
  const allocations = await indexedDBStorage.getPaymentAllocationsForDocument(type, documentId)
  const amountPaid = roundMoney(allocations.reduce((sum, row) => sum + row.amount, 0))

  if (type === 'ar') {
    const invoice = await indexedDBStorage.getCustomerInvoice(documentId)
    if (!invoice) return
    const updated: CustomerInvoice = {
      ...invoice,
      amountPaid,
      status: deriveInvoiceStatus(invoice.amount, amountPaid),
      updatedAt: new Date().toISOString(),
    }
    await indexedDBStorage.saveCustomerInvoice(updated)
    return
  }

  const bill = await indexedDBStorage.getVendorBill(documentId)
  if (!bill) return
  const updated: VendorBill = {
    ...bill,
    amountPaid,
    status: deriveBillStatus(bill.amount, amountPaid),
    updatedAt: new Date().toISOString(),
  }
  await indexedDBStorage.saveVendorBill(updated)
}

export async function recordARPayment(input: {
  invoiceId: string
  transactionId: string
  amount: number
  paymentDate: string
  notes?: string
}): Promise<PaymentAllocation> {
  await assertDateNotInLockedPeriod(input.paymentDate)

  const invoice = await indexedDBStorage.getCustomerInvoice(input.invoiceId)
  if (!invoice) throw new Error('Invoice not found.')

  const remaining = roundMoney(invoice.amount - invoice.amountPaid)
  if (input.amount > remaining + 0.01) {
    throw new Error(`Payment exceeds open balance (${remaining.toFixed(2)}).`)
  }

  const allocation: PaymentAllocation = {
    id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: 'ar',
    documentId: input.invoiceId,
    transactionId: input.transactionId,
    amount: roundMoney(input.amount),
    paymentDate: input.paymentDate,
    notes: input.notes?.trim(),
    createdAt: new Date().toISOString(),
  }

  await indexedDBStorage.savePaymentAllocation(allocation)
  await refreshDocumentPayments('ar', input.invoiceId)
  return allocation
}

export async function recordAPPayment(input: {
  billId: string
  transactionId: string
  amount: number
  paymentDate: string
  notes?: string
}): Promise<PaymentAllocation> {
  await assertDateNotInLockedPeriod(input.paymentDate)

  const bill = await indexedDBStorage.getVendorBill(input.billId)
  if (!bill) throw new Error('Bill not found.')

  const remaining = roundMoney(bill.amount - bill.amountPaid)
  if (input.amount > remaining + 0.01) {
    throw new Error(`Payment exceeds open balance (${remaining.toFixed(2)}).`)
  }

  const allocation: PaymentAllocation = {
    id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: 'ap',
    documentId: input.billId,
    transactionId: input.transactionId,
    amount: roundMoney(input.amount),
    paymentDate: input.paymentDate,
    notes: input.notes?.trim(),
    createdAt: new Date().toISOString(),
  }

  await indexedDBStorage.savePaymentAllocation(allocation)
  await refreshDocumentPayments('ap', input.billId)
  return allocation
}

export async function getSubledgerBalances(): Promise<{
  openAR: number
  openAP: number
  overdueAR: number
  overdueAP: number
}> {
  const [invoices, bills] = await Promise.all([
    indexedDBStorage.getAllCustomerInvoices(),
    indexedDBStorage.getAllVendorBills(),
  ])

  const today = new Date().toISOString().split('T')[0]

  let openAR = 0
  let overdueAR = 0
  for (const invoice of invoices) {
    if (invoice.status === 'void' || invoice.status === 'paid') continue
    const open = roundMoney(invoice.amount - invoice.amountPaid)
    openAR += open
    if (invoice.dueDate < today && open > 0) overdueAR += open
  }

  let openAP = 0
  let overdueAP = 0
  for (const bill of bills) {
    if (bill.status === 'void' || bill.status === 'paid') continue
    const open = roundMoney(bill.amount - bill.amountPaid)
    openAP += open
    if (bill.dueDate < today && open > 0) overdueAP += open
  }

  return {
    openAR: roundMoney(openAR),
    openAP: roundMoney(openAP),
    overdueAR: roundMoney(overdueAR),
    overdueAP: roundMoney(overdueAP),
  }
}
