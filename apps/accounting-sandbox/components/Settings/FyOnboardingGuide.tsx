'use client'

import { useState } from 'react'
import {
  BookOpen,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  Landmark,
  Scale,
  Upload,
} from 'lucide-react'

type ScenarioId =
  | 'mid_fy_prior_lodged'
  | 'new_company_first_quarter'
  | 'full_fy_from_start'
  | 'sole_trader_mid_year'
  | 'individual_no_gst'

interface Scenario {
  id: ScenarioId
  title: string
  when: string
  goal: string
  steps: string[]
  warnings: string[]
}

const SCENARIOS: Scenario[] = [
  {
    id: 'mid_fy_prior_lodged',
    title: 'Mid-year start — prior BAS already lodged (your case)',
    when:
      'Company incorporated in an earlier quarter (e.g. Q3 Jan–Mar). That quarter’s BAS was lodged with the ATO outside this app. You uploaded a later quarter first (e.g. Q4 Apr–Jun) because that is when you started using SELPIC A.',
    goal:
      'Build a full FY Income Statement, Balance Sheet, and CTR pack for year-end — without re-lodging or double-counting Q3.',
    steps: [
      'Collect the lodged Q3 BAS figures (G1, 1A, 1B, net GST) and your Q3 bank PDF if available.',
      'Upload the Q3 bank statement (Biz Intel → Smart Data Integration). All quarters merge into one ledger.',
      'Settings → Business Profile: set Director Name, Opening Cash, Opening Capital / Retained Earnings from your accountant if you have them.',
      'Settings → Director\'s Loan: set Opening balance at the start of the earliest uploaded quarter — do not duplicate the same loan as both Opening and a bank transaction.',
      'Categorise every Q3 line. Director credits with LOAN → Director\'s Loan; prior-period repayments → Director Reimbursement (Prior Period); trading → INCOME_* / EXPENSE_*.',
      'ATO Lodgment → select BAS Q3 (Jan–Mar). Compare live figures to your lodged BAS. Save a finalized snapshot using the lodged numbers (record only — do not lodge again).',
      'Settings → Period Management: lock months Jan–Mar after Q3 reconciles to the lodged BAS.',
      'Complete Q4 BAS in the app as usual, then use Reports (full FY) for CTR and Balance Sheet as at 30 June.',
    ],
    warnings: [
      'Do not add Opening Director\'s Loan and the same Q3 "Loan" bank credit — pick one source.',
      'Prior-period director reimbursements in Q4 must not be counted as new Q3/Q4 P&L expenses.',
      'Live Q3 BAS in the app may differ from lodged BAS until every Q3 transaction is uploaded and categorised.',
    ],
  },
  {
    id: 'new_company_first_quarter',
    title: 'New company — first quarter entirely in the app',
    when: 'First bank statement is also your first BAS quarter. Nothing lodged yet.',
    goal: 'Prepare and lodge the first BAS, then year-end when the FY completes.',
    steps: [
      'Complete Business Profile (ABN, GST cycle, opening balances at incorporation).',
      'Upload the quarter’s bank statement and categorise all transactions.',
      'Review Reports → BAS vs ATO Lodgment, then lodge via OSB and save a finalized snapshot.',
      'Lock the quarter’s months in Period Management after lodgment.',
    ],
    warnings: [
      'Incorporation and pre-trading costs may need specific categories — review with your accountant.',
    ],
  },
  {
    id: 'full_fy_from_start',
    title: 'Full financial year from Q1 in the app',
    when: 'You have statements for Jul–Jun (or all four BAS quarters) and use the app for the whole FY.',
    goal: 'Continuous ledger, quarterly BAS, and year-end CTR / Balance Sheet from one source.',
    steps: [
      'Upload each quarter’s statement as it becomes available (oldest first is easier for review).',
      'Lodging each BAS → snapshot → lock that quarter’s months before moving on.',
      'At FY end, Reports uses the full period automatically for Income Statement and Balance Sheet.',
    ],
    warnings: ['Keep snapshots per quarter so drift checks stay meaningful.'],
  },
  {
    id: 'sole_trader_mid_year',
    title: 'Sole trader — started mid-year',
    when: 'ABN as sole trader; some activity before you started using the app.',
    goal: 'Annual myTax summary plus any BAS quarters you are registered for.',
    steps: [
      'Upload all available bank statements for the FY, or enter cash expenses manually.',
      'Set opening balances in Business Profile if the accountant provided them.',
      'Use Personal / business department correctly on mixed accounts.',
      'Reports → Personal Tax Summary or BAS as applicable; ATO Lodgment for copy-out fields.',
    ],
    warnings: [
      'Personal spending must stay out of business P&L unless your accountant treats it otherwise.',
    ],
  },
  {
    id: 'individual_no_gst',
    title: 'Individual (no GST)',
    when: 'Personal tax only — no company, no BAS.',
    goal: 'Payment summaries + bank/cash → Personal Tax Summary → myTax.',
    steps: [
      'Profile → individual. Upload bank CSV/PDF or add cash expenses.',
      'Payment Summary tab for employer income if applicable.',
      'Reports → Personal Tax Summary; ATO Lodgment for individual fields.',
    ],
    warnings: ['BAS and Balance Sheet sections do not apply.'],
  },
]

function ScenarioBlock({ scenario, defaultOpen }: { scenario: Scenario; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-left"
      >
        <div>
          <p className="font-semibold text-gray-900">{scenario.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{scenario.when}</p>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 shrink-0 text-gray-400" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/80 space-y-3 text-sm text-gray-700">
          <p>
            <strong className="text-gray-900">Goal:</strong> {scenario.goal}
          </p>
          <div>
            <p className="font-medium text-gray-900 mb-1">Steps</p>
            <ol className="list-decimal list-inside space-y-1.5">
              {scenario.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          {scenario.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs">
              <p className="font-semibold mb-1">Watch out</p>
              <ul className="list-disc list-inside space-y-0.5">
                {scenario.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FyOnboardingGuide() {
  return (
    <div className="card border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-indigo-600" />
        Financial year onboarding — prior quarters &amp; year-end
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Use this when you started SELPIC A after your first BAS quarter, when BAS was already lodged
        with the ATO elsewhere, or when you need a full-year Balance Sheet and company return (CTR)
        after your latest BAS quarter.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
        <div className="flex gap-2 p-3 bg-white border border-gray-200 rounded-lg">
          <Upload className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Bank statements</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Each upload merges into one ledger. Older quarters fill FY reports; they do not replace
              newer quarters.
            </p>
          </div>
        </div>
        <div className="flex gap-2 p-3 bg-white border border-gray-200 rounded-lg">
          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Lodged BAS (record only)</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Save a finalized ATO Lodgment snapshot for quarters already lodged — audit trail, not
              a new lodgment.
            </p>
          </div>
        </div>
        <div className="flex gap-2 p-3 bg-white border border-gray-200 rounded-lg">
          <Scale className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Balance Sheet</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Needs full FY context: cash from statements, Director&apos;s Loan, GST payable, and
              opening balances in Settings.
            </p>
          </div>
        </div>
        <div className="flex gap-2 p-3 bg-white border border-gray-200 rounded-lg">
          <Landmark className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">CTR / year-end</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Reports Income Statement uses the full FY. CTR fields on ATO Lodgment should match
              after all quarters are in the ledger.
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        Choose your situation
      </p>
      <div className="space-y-2">
        {SCENARIOS.map((s) => (
          <ScenarioBlock
            key={s.id}
            scenario={s}
            defaultOpen={s.id === 'mid_fy_prior_lodged'}
          />
        ))}
      </div>

      <div className="mt-4 p-3 bg-indigo-100/60 border border-indigo-200 rounded-lg text-sm text-indigo-950">
        <p className="font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Incorporation in Q3, Q4 BAS next, then CTR + Balance Sheet
        </p>
        <p className="mt-1 text-indigo-900/90 text-xs leading-relaxed">
          Yes — upload Q3 when you are ready for year-end. Q3 is already lodged with the ATO, so
          reconcile and snapshot Q3; use the app to prepare Q4 BAS and the full FY CTR / Balance
          Sheet. If Q3 PDF is unavailable, ask your accountant for Q3 totals and opening balances,
          then upload Q4 only and enter openings manually (less precise for transaction detail).
        </p>
      </div>
    </div>
  )
}
