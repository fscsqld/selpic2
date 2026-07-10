import Link from 'next/link'
import { GAME_PROMO_CUSTOMER_TERMS } from '@/lib/game-promo-constants'

type GamePromoRewardTermsProps = {
  className?: string
  showCheckoutLink?: boolean
}

export default function GamePromoRewardTerms({
  className = '',
  showCheckoutLink = true,
}: GamePromoRewardTermsProps) {
  return (
    <div
      className={`rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 md:p-5 space-y-3 ${className}`}
    >
      <h2 className="text-sm font-semibold text-sky-200 uppercase tracking-wide">
        Final level reward — how to use your code
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {GAME_PROMO_CUSTOMER_TERMS.map((row) => (
          <div key={row.label} className="flex flex-col sm:block">
            <dt className="font-medium text-slate-300">{row.label}</dt>
            <dd className="text-slate-100">{row.value}</dd>
          </div>
        ))}
      </dl>
      {showCheckoutLink && (
        <p className="text-sm text-slate-300 pt-1">
          Copy your code below, then{' '}
          <Link href="/checkout" className="text-sky-300 underline hover:text-sky-200 font-medium">
            go to checkout
          </Link>{' '}
          and paste it in the promo code field.
        </p>
      )}
    </div>
  )
}
