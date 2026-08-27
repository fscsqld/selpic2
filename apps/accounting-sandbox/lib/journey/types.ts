export type JourneyStepId =
  | 'profile'
  | 'payment_summary'
  | 'upload'
  | 'review'
  | 'period_lock'
  | 'ato_lodgment'
  | 'review_reports'

export type JourneyNavigateTarget =
  | 'settings'
  | 'dashboard'
  | 'ato'
  | 'reports'
  | 'payment_summary'

export interface JourneyStep {
  id: JourneyStepId
  label: string
  description: string
  completed: boolean
  current: boolean
  navigateTo: JourneyNavigateTarget
}

export interface UserJourneyState {
  accountType: 'individual' | 'company' | 'sole_trader'
  steps: JourneyStep[]
  currentStep: JourneyStep | null
  progressPercent: number
  headline: string
}
