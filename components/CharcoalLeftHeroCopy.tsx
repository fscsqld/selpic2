import type { ReactNode } from 'react'

/**
 * Left charcoal title + white wash used on Market S /hot-goods and optional
 * homepage hero slides. Heading level differs (h1 on Market S, h2 on home).
 *
 * `fullscreen` is the homepage min-h-screen slider: pin copy with absolute
 * inset (iOS Swiper % height is unreliable) and keep the wash narrower on
 * portrait so the photo is not a white sheet.
 */
export default function CharcoalLeftHeroCopy({
  title,
  subtitle,
  headingLevel = 'h1',
  extra,
  overlayZClassName = 'z-[5]',
  copyZClassName = 'z-10',
  layout = 'banner',
}: {
  title?: string
  subtitle?: string
  headingLevel?: 'h1' | 'h2'
  extra?: ReactNode
  overlayZClassName?: string
  copyZClassName?: string
  layout?: 'banner' | 'fullscreen'
}) {
  const Heading = headingLevel
  const heading = (title || '').trim()
  const sub = (subtitle || '').trim()
  const fullscreen = layout === 'fullscreen'
  const wash = fullscreen
    ? 'bg-gradient-to-r from-white/78 via-white/40 to-transparent to-[38%] sm:from-white/72 sm:via-white/32 sm:to-transparent sm:to-50%'
    : 'bg-gradient-to-r from-white/88 via-white/55 to-transparent to-55% sm:from-white/72 sm:via-white/32 sm:to-transparent sm:to-50%'
  const copyWidth = fullscreen
    ? 'max-w-[11.5rem] sm:max-w-sm lg:max-w-[38%]'
    : 'max-w-[18.5rem] sm:max-w-sm lg:max-w-[38%]'

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 ${overlayZClassName} ${wash}`}
        aria-hidden
      />
      <div
        className={`${fullscreen ? 'absolute inset-0' : 'relative h-full w-full'} ${copyZClassName} flex items-center`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className={`${copyWidth} text-left`}>
            {heading ? (
              <Heading className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1A1A1A] leading-tight">
                {heading}
              </Heading>
            ) : null}
            {sub ? (
              <p className="mt-2 sm:mt-3 text-sm sm:text-base lg:text-lg text-[#2C2C2C] leading-snug">
                {sub}
              </p>
            ) : null}
            {extra}
          </div>
        </div>
      </div>
    </>
  )
}
