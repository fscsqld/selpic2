'use client'

import { ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import {
  computeUserJourney,
  type JourneyInput,
} from '@/lib/journey/compute-user-journey'
import type { JourneyNavigateTarget } from '@/lib/journey/types'

interface UserJourneyProgressProps extends JourneyInput {
  onNavigate: (target: JourneyNavigateTarget) => void
}

export function UserJourneyProgress(props: UserJourneyProgressProps) {
  const { onNavigate, ...input } = props
  const journey = computeUserJourney(input)

  if (journey.progressPercent === 100) {
    return (
      <div className="card mb-6 border-green-200 bg-green-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">All preparation steps complete — ready for ATO portal entry</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('ato')}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
          >
            Open ATO Lodgment
          </button>
        </div>
      </div>
    )
  }

  const current = journey.currentStep

  return (
    <div className="card mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50 to-white">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{journey.headline}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Step {journey.steps.filter((s) => s.completed).length + 1} of {journey.steps.length}
            {current ? ` — ${current.label}` : ''}
          </p>

          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${journey.progressPercent}%` }}
            />
          </div>

          <ol className="mt-4 space-y-2">
            {journey.steps.map((step) => (
              <li
                key={step.id}
                className={`flex items-start gap-2 text-sm ${
                  step.current ? 'text-indigo-900 font-medium' : 'text-gray-600'
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                ) : step.current ? (
                  <Circle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 fill-indigo-100" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                )}
                <span>
                  {step.label}
                  <span className="block text-xs font-normal text-gray-500">{step.description}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {current && (
          <div className="lg:w-72 shrink-0 p-4 bg-white border border-indigo-100 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Next action</p>
            <p className="font-semibold text-gray-900 mt-1">{current.label}</p>
            <p className="text-sm text-gray-600 mt-1">{current.description}</p>
            <button
              type="button"
              onClick={() => onNavigate(current.navigateTo)}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
