'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  createCustomerInvoice,
  createVendorBill,
  getSubledgerBalances,
  recordAPPayment,
  recordARPayment,
} from '@/lib/subledger/ar-ap-service'
import type { CustomerInvoice, VendorBill } from '@/src/shared/types/subledger'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { PeriodLockedError } from '@/lib/period-management/storage-guard'

interface TransactionOption {
  id?: string
  date: string
  description: string
  debit?: number | null
  credit?: number | null
}

interface ARAPManagerProps {
  transactions: TransactionOption[]
  onChanged?: () => void
}

type Tab = 'ar' | 'ap'

function txKey(tx: TransactionOption, index: number): string {
  return tx.id || `${tx.date}_${index}_${tx.description}`
}

export function ARAPManager({ transactions, onChanged }: ARAPManagerProps) {
  const [tab, setTab] = useState<Tab>('ar')
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([])
  const [bills, setBills] = useState<VendorBill[]>([])
  const [balances, setBalances] = useState({ openAR: 0, openAP: 0, overdueAR: 0, overdueAP: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    customerName: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    amount: '',
    description: '',
  })

  const [billForm, setBillForm] = useState({
    billNumber: '',
    vendorName: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    amount: '',
    description: '',
  })

  const [paymentDocId, setPaymentDocId] = useState('')
  const [paymentTxId, setPaymentTxId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])

  const creditTransactions = useMemo(
    () =>
      transactions
        .map((tx, index) => ({ tx, key: txKey(tx, index) }))
        .filter(({ tx }) => (tx.credit || 0) > 0),
    [transactions]
  )

  const debitTransactions = useMemo(
    () =>
      transactions
        .map((tx, index) => ({ tx, key: txKey(tx, index) }))
        .filter(({ tx }) => (tx.debit || 0) > 0),
    [transactions]
  )

  const loadData = async () => {
    setIsLoading(true)
    try {
      await indexedDBStorage.init()
      const [invoiceRows, billRows, balanceRows] = await Promise.all([
        indexedDBStorage.getAllCustomerInvoices(),
        indexedDBStorage.getAllVendorBills(),
        getSubledgerBalances(),
      ])
      setInvoices(invoiceRows)
      setBills(billRows)
      setBalances(balanceRows)
    } catch (err) {
      console.error('Failed to load AR/AP data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleCreateInvoice = async () => {
    setError(null)
    setSuccess(null)
    try {
      await createCustomerInvoice({
        invoiceNumber: invoiceForm.invoiceNumber,
        customerName: invoiceForm.customerName,
        issueDate: invoiceForm.issueDate,
        dueDate: invoiceForm.dueDate || invoiceForm.issueDate,
        amount: Number(invoiceForm.amount),
        description: invoiceForm.description,
      })
      setInvoiceForm({
        invoiceNumber: '',
        customerName: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        amount: '',
        description: '',
      })
      setSuccess('Customer invoice created.')
      await loadData()
      onChanged?.()
    } catch (err) {
      setError(err instanceof PeriodLockedError ? err.message : (err as Error).message)
    }
  }

  const handleCreateBill = async () => {
    setError(null)
    setSuccess(null)
    try {
      await createVendorBill({
        billNumber: billForm.billNumber,
        vendorName: billForm.vendorName,
        issueDate: billForm.issueDate,
        dueDate: billForm.dueDate || billForm.issueDate,
        amount: Number(billForm.amount),
        description: billForm.description,
      })
      setBillForm({
        billNumber: '',
        vendorName: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        amount: '',
        description: '',
      })
      setSuccess('Vendor bill created.')
      await loadData()
      onChanged?.()
    } catch (err) {
      setError(err instanceof PeriodLockedError ? err.message : (err as Error).message)
    }
  }

  const handleRecordPayment = async () => {
    setError(null)
    setSuccess(null)
    try {
      const amount = Number(paymentAmount)
      if (tab === 'ar') {
        await recordARPayment({
          invoiceId: paymentDocId,
          transactionId: paymentTxId,
          amount,
          paymentDate,
        })
      } else {
        await recordAPPayment({
          billId: paymentDocId,
          transactionId: paymentTxId,
          amount,
          paymentDate,
        })
      }
      setPaymentAmount('')
      setSuccess('Payment recorded.')
      await loadData()
      onChanged?.()
    } catch (err) {
      setError(err instanceof PeriodLockedError ? err.message : (err as Error).message)
    }
  }

  const openDocuments = tab === 'ar' ? invoices.filter((row) => row.status !== 'paid' && row.status !== 'void') : bills.filter((row) => row.status !== 'paid' && row.status !== 'void')

  return (
    <div className="card space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Accounts Receivable & Payable
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track customer invoices, vendor bills, and allocate bank payments.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div className="text-emerald-700 font-medium">Open AR</div>
            <div className="text-lg font-semibold tabular-nums">{formatCurrency(balances.openAR)}</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <div className="text-amber-700 font-medium">Open AP</div>
            <div className="text-lg font-semibold tabular-nums">{formatCurrency(balances.openAP)}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('ar')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'ar' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'
          }`}
        >
          Receivables
        </button>
        <button
          type="button"
          onClick={() => setTab('ap')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'ap' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'
          }`}
        >
          Payables
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {tab === 'ar' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">New customer invoice</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder="Invoice #" value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm((p) => ({ ...p, invoiceNumber: e.target.value }))} />
              <input className="input" placeholder="Customer name" value={invoiceForm.customerName} onChange={(e) => setInvoiceForm((p) => ({ ...p, customerName: e.target.value }))} />
              <input type="date" className="input" value={invoiceForm.issueDate} onChange={(e) => setInvoiceForm((p) => ({ ...p, issueDate: e.target.value }))} />
              <input type="date" className="input" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((p) => ({ ...p, dueDate: e.target.value }))} />
              <input type="number" step="0.01" className="input sm:col-span-2" placeholder="Amount" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))} />
              <input className="input sm:col-span-2" placeholder="Description" value={invoiceForm.description} onChange={(e) => setInvoiceForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <button type="button" onClick={() => void handleCreateInvoice()} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create invoice
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Record customer payment</h3>
            <select className="input" value={paymentDocId} onChange={(e) => setPaymentDocId(e.target.value)}>
              <option value="">Select open invoice</option>
              {openDocuments.map((row) => (
                <option key={row.id} value={row.id}>
                  {(row as CustomerInvoice).invoiceNumber} · {(row as CustomerInvoice).customerName} · {formatCurrency((row as CustomerInvoice).amount - (row as CustomerInvoice).amountPaid)} open
                </option>
              ))}
            </select>
            <select className="input" value={paymentTxId} onChange={(e) => setPaymentTxId(e.target.value)}>
              <option value="">Link bank receipt</option>
              {creditTransactions.map(({ tx, key }) => (
                <option key={key} value={key}>
                  {formatDateAustralian(tx.date)} · {tx.description.slice(0, 40)} · {formatCurrency(tx.credit || 0)}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="number" step="0.01" className="input" placeholder="Payment amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              <input type="date" className="input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <button type="button" onClick={() => void handleRecordPayment()} className="btn-secondary inline-flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Record payment
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">New vendor bill</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder="Bill #" value={billForm.billNumber} onChange={(e) => setBillForm((p) => ({ ...p, billNumber: e.target.value }))} />
              <input className="input" placeholder="Vendor name" value={billForm.vendorName} onChange={(e) => setBillForm((p) => ({ ...p, vendorName: e.target.value }))} />
              <input type="date" className="input" value={billForm.issueDate} onChange={(e) => setBillForm((p) => ({ ...p, issueDate: e.target.value }))} />
              <input type="date" className="input" value={billForm.dueDate} onChange={(e) => setBillForm((p) => ({ ...p, dueDate: e.target.value }))} />
              <input type="number" step="0.01" className="input sm:col-span-2" placeholder="Amount" value={billForm.amount} onChange={(e) => setBillForm((p) => ({ ...p, amount: e.target.value }))} />
              <input className="input sm:col-span-2" placeholder="Description" value={billForm.description} onChange={(e) => setBillForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <button type="button" onClick={() => void handleCreateBill()} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create bill
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Record vendor payment</h3>
            <select className="input" value={paymentDocId} onChange={(e) => setPaymentDocId(e.target.value)}>
              <option value="">Select open bill</option>
              {openDocuments.map((row) => (
                <option key={row.id} value={row.id}>
                  {(row as VendorBill).billNumber} · {(row as VendorBill).vendorName} · {formatCurrency((row as VendorBill).amount - (row as VendorBill).amountPaid)} open
                </option>
              ))}
            </select>
            <select className="input" value={paymentTxId} onChange={(e) => setPaymentTxId(e.target.value)}>
              <option value="">Link bank payment</option>
              {debitTransactions.map(({ tx, key }) => (
                <option key={key} value={key}>
                  {formatDateAustralian(tx.date)} · {tx.description.slice(0, 40)} · {formatCurrency(tx.debit || 0)}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="number" step="0.01" className="input" placeholder="Payment amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              <input type="date" className="input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <button type="button" onClick={() => void handleRecordPayment()} className="btn-secondary inline-flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Record payment
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">Number</th>
              <th className="py-2 pr-4">{tab === 'ar' ? 'Customer' : 'Vendor'}</th>
              <th className="py-2 pr-4">Due</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Open</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(tab === 'ar' ? invoices : bills).map((row) => {
              const open = row.amount - row.amountPaid
              return (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium">
                    {tab === 'ar' ? (row as CustomerInvoice).invoiceNumber : (row as VendorBill).billNumber}
                  </td>
                  <td className="py-2 pr-4">
                    {tab === 'ar' ? (row as CustomerInvoice).customerName : (row as VendorBill).vendorName}
                  </td>
                  <td className="py-2 pr-4">{formatDateAustralian(row.dueDate)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(row.amount)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(open)}</td>
                  <td className="py-2 capitalize">{row.status}</td>
                </tr>
              )
            })}
            {!isLoading && (tab === 'ar' ? invoices : bills).length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No {tab === 'ar' ? 'invoices' : 'bills'} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
