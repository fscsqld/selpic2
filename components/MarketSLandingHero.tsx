'use client'

import CategoryCharcoalHero from '@/components/CategoryCharcoalHero'
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
    <CategoryCharcoalHero
      slides={slides}
      title={title}
      subtitle={subtitle}
      onSlideChange={onSlideChange}
    />
  )
}
