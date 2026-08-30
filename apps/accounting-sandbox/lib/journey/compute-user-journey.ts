import type { JourneyStep, UserJourneyState } from './types'

export interface JourneyInput {
  accountType: 'individual' | 'company' | 'sole_trader'
  profileComplete: boolean
  transactionCount: number
  uncategorisedCount: number
  paymentSummaryCount?: number
  /** Individual: user has no salary/wage income */
  skipPaymentSummary?: boolean
  /** Business: registered for GST — BAS lodgment applies */
  gstRegistered?: boolean
  hasReviewedReports?: boolean
  allPeriodsLocked?: boolean
  hasLodgmentSnapshot?: boolean
}

function markCurrent(steps: Omit<JourneyStep, 'current'>[]): JourneyStep[] {
  const firstIncomplete = steps.findIndex((s) => !s.completed)
  return steps.map((step, i) => ({
    ...step,
    current: firstIncomplete === -1 ? i === steps.length - 1 : i === firstIncomplete,
  }))
}

function buildIndividualSteps(input: JourneyInput): JourneyStep[] {
  const needsPaymentSummary = !input.skipPaymentSummary
  const paymentDone =
    !needsPaymentSummary || (input.paymentSummaryCount ?? 0) > 0
  const uploadDone = input.transactionCount > 0
  const reviewDone = uploadDone && input.uncategorisedCount === 0

  const steps: Omit<JourneyStep, 'current'>[] = [
    {
      id: 'profile',
      label: 'Profile',
      description: 'Your name in Settings',
      completed: input.profileComplete,
      navigateTo: 'settings',
    },
  ]

  if (needsPaymentSummary) {
    steps.push({
      id: 'payment_summary',
      label: 'Payment summaries',
      description: 'Employer income statements (PAYG)',
      completed: paymentDone,
      navigateTo: 'payment_summary',
    })
  }

  steps.push(
    {
      id: 'upload',
      label: 'Upload statements',
      description: 'Bank CSV or PDF (or add cash expenses manually)',
      completed: uploadDone,
      navigateTo: 'dashboard',
    },
    {
      id: 'review',
      label: 'Review transactions',
      description: 'Categorise all items',
      completed: reviewDone,
      navigateTo: 'dashboard',
    },
    {
      id: 'review_reports',
      label: 'Review tax summary',
      description: 'Personal Tax Summary on Reports tab',
      completed: !!input.hasReviewedReports,
      navigateTo: 'reports',
    },
    {
      id: 'ato_lodgment',
      label: 'ATO Lodgment',
      description: 'Copy values into myTax',
      completed: !!input.hasLodgmentSnapshot,
      navigateTo: 'ato',
    }
  )

  return markCurrent(steps)
}

function buildBusinessSteps(
  input: JourneyInput,
  annualLabel: string
): JourneyStep[] {
  const uploadDone = input.transactionCount > 0
  const reviewDone = uploadDone && input.uncategorisedCount === 0
  const gstRegistered = input.gstRegistered !== false

  const periodLockStep: Omit<JourneyStep, 'current'> = gstRegistered
    ? {
        id: 'period_lock',
        label: 'Lock periods',
        description: 'Close months before lodging BAS',
        completed: !!input.allPeriodsLocked,
        navigateTo: 'settings',
      }
    : {
        id: 'period_lock',
        label: 'Lock periods',
        description: 'Optional — not GST registered',
        completed: true,
        navigateTo: 'settings',
      }

  const raw = markCurrent([
    {
      id: 'profile',
      label: 'Business profile',
      description: 'ABN, GST cycle, opening balances',
      completed: input.profileComplete,
      navigateTo: 'settings',
    },
    {
      id: 'upload',
      label: 'Upload statements',
      description: 'Business bank CSV or PDF',
      completed: uploadDone,
      navigateTo: 'dashboard',
    },
    {
      id: 'review',
      label: 'Review & categorise',
      description: 'Business transactions only',
      completed: reviewDone,
      navigateTo: 'dashboard',
    },
    periodLockStep,
    {
      id: 'review_reports',
      label: 'Review compliance reports',
      description:
        input.accountType === 'company'
          ? 'Trial balance, BAS/GST and financials on Reports'
          : 'Financial summary and BAS on Reports tab',
      completed: !!input.hasReviewedReports,
      navigateTo: 'reports',
    },
    {
      id: 'ato_lodgment',
      label: annualLabel,
      description: gstRegistered
        ? 'Copy fields into OSB / myTax'
        : 'Copy annual return fields into myTax (no BAS required)',
      completed: !!input.hasLodgmentSnapshot,
      navigateTo: 'ato',
    },
  ])
  return raw
}

export function computeUserJourney(input: JourneyInput): UserJourneyState {
  const gstRegistered = input.gstRegistered !== false
  const soleTraderAnnual = gstRegistered ? 'BAS & Annual (myTax)' : 'Annual return (myTax)'
  const companyAnnual = gstRegistered ? 'BAS & CTR' : 'Company return (CTR)'

  const steps =
    input.accountType === 'individual'
      ? buildIndividualSteps(input)
      : buildBusinessSteps(
          input,
          input.accountType === 'company' ? companyAnnual : soleTraderAnnual
        )

  const completed = steps.filter((s) => s.completed).length
  const progressPercent = steps.length
    ? Math.round((completed / steps.length) * 100)
    : 0
  const currentStep = steps.find((s) => s.current) ?? null

  const headlines: Record<string, string> = {
    individual: 'Personal tax return preparation',
    company: gstRegistered
      ? 'Company tax & BAS preparation'
      : 'Company tax return preparation',
    sole_trader: gstRegistered
      ? 'Sole trader tax preparation'
      : 'Sole trader annual return preparation',
  }

  return {
    accountType: input.accountType,
    steps,
    currentStep,
    progressPercent,
    headline: headlines[input.accountType],
  }
}
