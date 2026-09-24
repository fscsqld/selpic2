'use client'

import CharcoalLeftHeroCopy from '@/components/CharcoalLeftHeroCopy'
import SlidingBackground from '@/components/SlidingBackground'
import type { CategoryHeroSlide } from '@/lib/contentStore'

/** Shared charcoal-left hub hero (Market S, Stickers, Stamp, Phone Cases). */
export default function CategoryCharcoalHero({
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
      <CharcoalLeftHeroCopy title={title} subtitle={subtitle} headingLevel="h1" />
    </div>
  )
}
