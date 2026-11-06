'use client'

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import {
  getActiveMarketSAuthorisedBrands,
  MARKET_S_AUTHORISED_TRUST_HEADING,
  MARKET_S_AUTHORISED_TRUST_SUB,
  type MarketSAuthorisedBrand,
} from '@/lib/marketSAuthorisedBrands'
import { resolveStorefrontImageSrc } from '@/lib/optimizeStorefrontImageUrl'

type Props = {
  brands: MarketSAuthorisedBrand[] | null | undefined
  className?: string
}

export default function MarketSAuthorisedBrandsTrust({ brands, className = '' }: Props) {
  const active = getActiveMarketSAuthorisedBrands(brands)
  if (active.length === 0) return null

  return (
    <section
      className={`rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-stone-50 px-5 py-5 sm:px-6 sm:py-6 ${className}`}
      aria-label={MARKET_S_AUTHORISED_TRUST_HEADING}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-800">
          <ShieldCheck className="w-5 h-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-stone-900 tracking-tight">
            {MARKET_S_AUTHORISED_TRUST_HEADING}
          </h2>
          <p className="mt-0.5 text-sm text-stone-600">{MARKET_S_AUTHORISED_TRUST_SUB}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-3">
        {active.map((brand) => {
          const logoSrc = brand.logoUrl
            ? resolveStorefrontImageSrc(brand.logoUrl) || brand.logoUrl
            : ''
          const inner = (
            <>
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt=""
                  className="h-8 w-8 object-contain rounded bg-white border border-stone-100"
                />
              ) : (
                <span className="h-8 w-8 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                  {brand.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-stone-900 truncate">
                  {brand.name}
                </span>
                {brand.tagline ? (
                  <span className="block text-xs text-stone-500 line-clamp-1">{brand.tagline}</span>
                ) : null}
              </span>
            </>
          )
          const chipClass =
            'inline-flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-white/90 px-3 py-2 shadow-sm max-w-full hover:border-emerald-300 transition-colors'
          if (brand.linkUrl) {
            const external = /^https?:\/\//i.test(brand.linkUrl)
            if (external) {
              return (
                <li key={brand.id}>
                  <a
                    href={brand.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={chipClass}
                  >
                    {inner}
                  </a>
                </li>
              )
            }
            return (
              <li key={brand.id}>
                <Link href={brand.linkUrl} className={chipClass}>
                  {inner}
                </Link>
              </li>
            )
          }
          return (
            <li key={brand.id}>
              <div className={chipClass}>{inner}</div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
