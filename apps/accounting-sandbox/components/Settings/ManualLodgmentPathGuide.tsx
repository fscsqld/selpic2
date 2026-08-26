'use client'

import { FileSpreadsheet, Keyboard, Sparkles } from 'lucide-react'

export function ManualLodgmentPathGuide() {
  return (
    <div className="card border border-slate-200 bg-slate-50">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-slate-600" />
        Manual lodgment path (no API key)
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        You can prepare your tax return without an OpenAI API key. SELPIC A does not lodge
        electronically — you copy figures into myTax or Online services for business.
      </p>
      <ol className="space-y-3 text-sm text-gray-700">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold">
            1
          </span>
          <span>
            On <strong>Biz Intel</strong>, choose <strong>Rules only (no API key)</strong> when
            uploading a bank <strong>CSV or PDF</strong>. Transactions import as uncategorised or
            rule-matched — you categorise each line in the table.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold">
            2
          </span>
          <span className="flex items-start gap-2">
            <Keyboard className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
            <span>
              Add cash expenses with <strong>Add Cash Expense</strong> (receipt OCR optional if you
              add an API key later).
            </span>
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold">
            3
          </span>
          <span>
            Complete the journey on Biz Intel (profile → upload → categorise → Reports → ATO
            Lodgment).
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold">
            4
          </span>
          <span className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>
              Optional: add an OpenAI API key below for AI classification on upload (faster, but not
              required for manual lodgment).
            </span>
          </span>
        </li>
      </ol>
    </div>
  )
}
