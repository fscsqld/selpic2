/**
 * System journal entries for AR/AP subledger (accrual basis).
 */

import { createJournalEntry } from '@/lib/journal/journal-service'
import { COA } from '@/lib/journal/chart-of-accounts'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { getAccountingSettings } from '@/lib/journal/accounting-basis'
import type { CustomerInvoice, PaymentAllocation, VendorBill } from '@/src/shared/types/subledger'

export async function shouldAutoPostArApJournals(): Promise<boolean> {
  const settings = await getAccountingSettings()
  return settings.basis === 'accrual' && settings.autoPostArApJournals
}

export async function postCustomerInvoiceJournal(invoice: CustomerInvoice): Promise<void> {
  if (!(await shouldAutoPostArApJournals())) return

  const existing = await indexedDBStorage.getAllJournalEntries()
  const ref = `AR-INV-${invoice.invoiceNumber}`
  if (existing.some((e) => e.reference === ref && e.status === 'posted')) return

  await createJournalEntry({
    date: invoice.issueDate,
    description: `Customer invoice ${invoice.invoiceNumber} — ${invoice.customerName}`,
    reference: ref,
    source: 'ar_ap',
    lines: [
      {
        account: COA.ACCOUNTS_RECEIVABLE,
        debit: invoice.amount,
        credit: 0,
        description: invoice.description,
      },
      {
        account: COA.DEFAULT_SALES,
        debit: 0,
        credit: invoice.amount,
        description: invoice.description,
      },
    ],
  })
}

export async function postVendorBillJournal(bill: VendorBill): Promise<void> {
  if (!(await shouldAutoPostArApJournals())) return

  const existing = await indexedDBStorage.getAllJournalEntries()
  const ref = `AP-BILL-${bill.billNumber}`
  if (existing.some((e) => e.reference === ref && e.status === 'posted')) return

  await createJournalEntry({
    date: bill.issueDate,
    description: `Vendor bill ${bill.billNumber} — ${bill.vendorName}`,
    reference: ref,
    source: 'ar_ap',
    lines: [
      {
        account: COA.DEFAULT_EXPENSE,
        debit: bill.amount,
        credit: 0,
        description: bill.description,
      },
      {
        account: COA.ACCOUNTS_PAYABLE,
        debit: 0,
        credit: bill.amount,
        description: bill.description,
      },
    ],
  })
}

export async function postARPaymentJournal(
  allocation: PaymentAllocation,
  invoice: CustomerInvoice
): Promise<void> {
  if (!(await shouldAutoPostArApJournals())) return

  const ref = `AR-PAY-${allocation.id}`
  const existing = await indexedDBStorage.getAllJournalEntries()
  if (existing.some((e) => e.reference === ref)) return

  await createJournalEntry({
    date: allocation.paymentDate,
    description: `AR payment — invoice ${invoice.invoiceNumber}`,
    reference: ref,
    source: 'ar_ap',
    lines: [
      {
        account: COA.CASH,
        debit: allocation.amount,
        credit: 0,
      },
      {
        account: COA.ACCOUNTS_RECEIVABLE,
        debit: 0,
        credit: allocation.amount,
      },
    ],
  })
}

export async function postAPPaymentJournal(
  allocation: PaymentAllocation,
  bill: VendorBill
): Promise<void> {
  if (!(await shouldAutoPostArApJournals())) return

  const ref = `AP-PAY-${allocation.id}`
  const existing = await indexedDBStorage.getAllJournalEntries()
  if (existing.some((e) => e.reference === ref)) return

  await createJournalEntry({
    date: allocation.paymentDate,
    description: `AP payment — bill ${bill.billNumber}`,
    reference: ref,
    source: 'ar_ap',
    lines: [
      {
        account: COA.ACCOUNTS_PAYABLE,
        debit: allocation.amount,
        credit: 0,
      },
      {
        account: COA.CASH,
        debit: 0,
        credit: allocation.amount,
      },
    ],
  })
}
