'use client'

import SlidingBackground from '@/components/SlidingBackground'
import type { CategoryHeroSlide } from '@/lib/contentStore'

export default function MarketSLandingHero({
  slides,
  title,
  subtitle,
  onSlideChange,
}: {
  slides: CategoryHeroSlide[]
  title: string
  subtitle: string
  onSlideChange: (index: number) => void
}) {
  return (
    <div className="relative min-h-[300px] sm:min-h-[360px] lg:min-h-[420px] flex items-center overflow-hidden">
      <SlidingBackground slides={slides} onSlideChange={onSlideChange} />
      <div
        className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-r from-white/88 via-white/55 to-transparent to-55% sm:from-white/72 sm:via-white/32 sm:to-transparent sm:to-50%"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="max-w-[18.5rem] sm:max-w-sm lg:max-w-[38%] text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1A1A1A] leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 sm:mt-3 text-sm sm:text-base lg:text-lg text-[#2C2C2C] leading-snug">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
