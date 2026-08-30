'use client'

import { HeartPulse } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import {
  buildPhiMedicareGuidance,
  MLS_FAMILY_THRESHOLD,
  MLS_SINGLE_THRESHOLD,
} from '@/lib/ato-lodgment/phi-medicare-hints'

interface PhiMedicareGuideProps {
  taxableIncome: number
  phiRebateAmount: number
  medicareSurchargeAmount: number
}

export function PhiMedicareGuide({
  taxableIncome,
  phiRebateAmount,
  medicareSurchargeAmount,
}: PhiMedicareGuideProps) {
  const guidance = buildPhiMedicareGuidance(taxableIncome)

  return (
    <div className="card border-pink-100 bg-pink-50/40 print:hidden">
      <div className="flex items-start gap-3">
        <HeartPulse className="w-5 h-5 text-pink-600 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2 text-sm">
          <h3 className="font-semibold text-gray-900">Private health & Medicare levy surcharge</h3>
          <p className="text-gray-600">
            Estimated taxable income:{' '}
            <strong className="font-mono">{formatCurrency(taxableIncome)}</strong>
          </p>
          <p className={guidance.mlsMayApply ? 'text-amber-800' : 'text-gray-700'}>
            {guidance.mlsMessage}
          </p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>
              Singles MLS threshold (indicative): {formatCurrency(MLS_SINGLE_THRESHOLD)}
            </li>
            <li>
              Family MLS threshold (indicative): {formatCurrency(MLS_FAMILY_THRESHOLD)}
            </li>
            <li>{guidance.phiRebateMessage}</li>
          </ul>
          {(phiRebateAmount > 0 || medicareSurchargeAmount > 0) && (
            <p className="text-xs text-green-800">
              Entered: PHI rebate {formatCurrency(phiRebateAmount)}
              {medicareSurchargeAmount > 0
                ? ` · MLS ${formatCurrency(medicareSurchargeAmount)}`
                : ''}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Mark PHI rebate and Medicare levy surcharge as entered in myTax after you complete those
            sections.
          </p>
        </div>
      </div>
    </div>
  )
}
